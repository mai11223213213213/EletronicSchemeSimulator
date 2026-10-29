import { capacitance } from './capacitor'
import { elementNames } from './naming'
import { buildNets, pinKey } from './netlist'
import { REGISTRY } from './registry'
import type { CircuitData, CircuitElement, ComponentType } from './types'

// ---- physical constants of the simplified model ----------------------------------------------
export const AMBIENT = 25 // °C
export const RESISTOR_HOT = 200 // °C of a resistor running at exactly its rated power
/** °C of a part running exactly at its rating. A part without an entry does not get warm in this model. */
const HOT: Partial<Record<ComponentType, number>> = {
  lamp: 2500, resistor: RESISTOR_HOT, motor: 90, led: 90, diode: 120, fuse: 160,
}
/** A part is destroyed when (load / rating) goes above this number. */
const BURN_AT: Partial<Record<ComponentType, number>> = {
  lamp: 1.5, resistor: 1.5, motor: 1.5, led: 1.5, diode: 1.5, fuse: 1, capacitor: 1,
}
const BURN_VERB: Partial<Record<ComponentType, string>> = { fuse: 'blew', capacitor: 'burst' } // default: "burned out"

const MIN_R = 1e-3 // Ω, stops 1/0 for "0 Ω" parts
const SWITCH_R = 1e-3 // Ω, a closed switch is almost a wire
const AMMETER_R = 1e-3 // Ω, an ideal ammeter has ~0 Ω
const VOLTMETER_R = 1e7 // Ω, an ideal voltmeter has ~∞ Ω
const FUSE_R = 5e-3 // Ω, a healthy fuse is almost a wire
const GMIN = 1e-12 // S, tiny leak on every node / junction so the matrix never becomes singular
const SHORT_CIRCUIT_A = 20
const THERMAL_VOLTAGE = 0.02585 // V, kT/q at room temperature: sets how sharply a diode switches on

/** Length of one simulation step in seconds. Capacitors and inductors advance by this much per step. */
export const TICK_SECONDS = 1 / 30

const NEWTON_MAX = 200 // iterations for the diodes
const NEWTON_TOL = 1e-7 // V
const NEWTON_STEP = 0.1 // V, the most a junction voltage may RISE in one iteration (keeps exp() from blowing up)

export type Status = 'ok' | 'burned' | 'open'

export interface ElementResult {
  status: Status
  /** Resistance in Ω; null = infinite or not a plain resistance (open switch, burned part, diode, capacitor ...). */
  R: number | null
  /** Current through the part (A) and voltage across it (V). Both are magnitudes. */
  I: number
  U: number
  /** Power in W and temperature in °C. */
  P: number
  T: number
  /**
   * How "active" the part is, 0 … 1, used by the drawings:
   * lamp/LED brightness, motor speed, capacitor charge, fuse/diode load, inductor magnetic field.
   */
  level: number
}

export interface SimResult {
  elements: Record<string, ElementResult>
  /** Plain-English remarks: burned parts, short circuit, ... */
  events: string[]
}

export interface SimOutput {
  result: SimResult
  /** id -> temperature at the moment it burned. Feed it back into the next call so burned parts stay burned. */
  burned: Record<string, number>
  /**
   * What the parts "remember" after this step: capacitor voltage (V), inductor current (A),
   * and (only as a starting guess for the next solve) a diode's junction voltage. Feed it into the next step.
   */
  memory: Record<string, number>
}

const prop = (el: CircuitElement, key: string) => {
  const v = el.props[key]
  return typeof v === 'number' ? v : Number(REGISTRY[el.type].defaults[key]) // old parts lack newer props
}
const ratedPower = (el: CircuitElement) => prop(el, el.type === 'resistor' ? 'maxPower' : 'ratedPower')
const isJunction = (el: CircuitElement) => el.type === 'diode' || el.type === 'led'

export const hasTemperature = (type: ComponentType) => HOT[type] !== undefined
/** Capacitors and inductors change over time, so the simulation has to keep stepping while one is on the canvas. */
export const isDynamic = (el: CircuitElement) => el.type === 'capacitor' || el.type === 'inductor'

/** Resistance a plain resistive part presents to the circuit, or null if it carries no current at all. */
function resistanceOf(el: CircuitElement, isBurned: boolean): number | null {
  switch (el.type) {
    case 'resistor':
    case 'lamp':
    case 'motor': return isBurned ? null : Math.max(prop(el, 'resistance'), MIN_R)
    case 'fuse': return isBurned ? null : FUSE_R
    case 'switch': return el.props.closed === true ? SWITCH_R : null
    case 'ammeter': return AMMETER_R
    case 'voltmeter': return VOLTMETER_R
    default: return null // battery, diode, LED, capacitor, inductor have their own models
  }
}

/** How loaded a part is relative to its rating: 1 = exactly at the rating. Which quantity counts depends on the part. */
function loadRatio(el: CircuitElement, P: number, I: number, U: number): number {
  switch (el.type) {
    case 'lamp':
    case 'resistor':
    case 'motor': return P / ratedPower(el)
    case 'led':
    case 'diode':
    case 'fuse': return I / prop(el, 'ratedCurrent')
    case 'capacitor': return U / prop(el, 'maxVoltage')
    default: return 0
  }
}

/**
 * Diode law (Shockley):  i = Is·(e^(v/nVt) − 1).  Returns the current i and the slope g = di/dv at voltage v.
 * Past 40·nVt the exponential is continued as a straight line, so a wild guess cannot overflow to Infinity.
 */
function junction(v: number, Is: number, nVt: number) {
  const limit = 40 * nVt
  const e = Math.exp(Math.min(v, limit) / nVt)
  const g = (Is * e) / nVt
  const i = Is * (e - 1) + (v > limit ? g * (v - limit) : 0)
  return { i, g }
}

/** Diode / LED constants. `Is` is chosen so the part drops exactly Vf at its rated current. */
function junctionParams(el: CircuitElement) {
  const led = el.type === 'led'
  const nVt = (led ? 2 : 1) * THERMAL_VOLTAGE // LEDs have a "softer" knee than silicon diodes
  const vf = Math.min(led ? prop(el, 'forwardVoltage') : 0.7, 20) // 20 V cap keeps exp() finite
  return { nVt, Is: prop(el, 'ratedCurrent') / Math.exp(vf / nVt) }
}

/** Solve A·x = z by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], z: number[]): number[] {
  const n = z.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    if (Math.abs(A[p][c]) < 1e-18) continue
    ;[A[c], A[p]] = [A[p], A[c]]
    ;[z[c], z[p]] = [z[p], z[c]]
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c]
      if (!f) continue
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      z[r] -= f * z[c]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = z[i]
    for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k]
    x[i] = Math.abs(A[i][i]) < 1e-18 ? 0 : s / A[i][i]
  }
  return x
}

/**
 * One simulation step. Nodal analysis: Kirchhoff's current law at every node gives  G·V = I
 *  - G[i][i] = sum of conductances (1/R) touching node i, G[i][j] = −conductance between i and j
 *  - I[i]    = current pushed into node i by sources
 * Every part is turned into "a conductance plus a current source" (its companion model):
 *  - resistive parts: just 1/R
 *  - battery: a current source V/r in parallel with 1/r (Norton form of "V in series with r")
 *  - capacitor (backward Euler):  i = C·(v − vPrev)/dt   → conductance C/dt plus a source C/dt·vPrev
 *  - inductor  (backward Euler):  i = iPrev + dt/L·v     → conductance dt/L   plus a source iPrev
 *  - diode / LED: not a straight line, so it is replaced by its tangent at the current guess; the guess is
 *    improved over and over (Newton's method) until the voltages stop changing.
 * The node under the first battery's "minus" pin is the 0 V reference (ground).
 */
export function simulate(
  data: CircuitData,
  burnedIn: Record<string, number> = {},
  memoryIn: Record<string, number> = {},
  dt: number = TICK_SECONDS,
): SimOutput {
  const { elements } = data
  const names = elementNames(elements)
  const { net } = buildNets(data)

  const first = elements.find((e) => e.type === 'battery')
  const ground = first ? net(pinKey(first.id, 'minus')) : null
  const rows = new Map<string, number>() // net -> matrix row
  for (const el of elements) {
    for (const pin of REGISTRY[el.type].pins) {
      const n = net(pinKey(el.id, pin.id))
      if (n !== ground && !rows.has(n)) rows.set(n, rows.size)
    }
  }
  const rowOf = (el: CircuitElement, i: 0 | 1) => {
    const n = net(pinKey(el.id, REGISTRY[el.type].pins[i].id))
    return n === ground ? -1 : rows.get(n)!
  }

  const ids = new Set(elements.map((e) => e.id))
  const burned: Record<string, number> = Object.fromEntries(
    Object.entries(burnedIn).filter(([id]) => ids.has(id)),
  )

  /** One full solve (with Newton iterations if there are diodes) for the current set of burned parts. */
  const solveOnce = () => {
    const n = rows.size
    const live = elements.filter((el) => isJunction(el) && !(el.id in burned))
    const vd: Record<string, number> = {} // current guess of each junction's voltage
    for (const el of live) vd[el.id] = memoryIn[el.id] ?? 0 // warm start from the previous step
    const lin: Record<string, { g: number; ieq: number }> = {} // tangent line of each junction, from the last iteration
    let volt: (row: number) => number = () => 0

    for (let iter = 0; iter < NEWTON_MAX; iter++) {
      const A = Array.from({ length: n }, () => new Array<number>(n).fill(0))
      const z = new Array<number>(n).fill(0)
      for (let i = 0; i < n; i++) A[i][i] += GMIN
      const stamp = (i: number, j: number, g: number) => {
        if (i >= 0) A[i][i] += g
        if (j >= 0) A[j][j] += g
        if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g }
      }
      /** A current `amount` flowing from a to b THROUGH the part. */
      const through = (a: number, b: number, amount: number) => {
        if (a >= 0) z[a] -= amount
        if (b >= 0) z[b] += amount
      }

      for (const el of elements) {
        const a = rowOf(el, 0)
        const b = rowOf(el, 1)
        const dead = el.id in burned
        if (el.type === 'battery') {
          const r = Math.max(prop(el, 'internalResistance'), MIN_R)
          stamp(a, b, 1 / r)
          through(a, b, -prop(el, 'voltage') / r) // pushes V/r into "plus"
        } else if (el.type === 'capacitor') {
          if (dead) continue
          const g = capacitance(el.props) / dt
          stamp(a, b, g)
          through(a, b, -g * (memoryIn[el.id] ?? 0)) // the charge it already holds keeps pushing current
        } else if (el.type === 'inductor') {
          const g = dt / (prop(el, 'inductance') * 1e-3)
          stamp(a, b, g)
          through(a, b, memoryIn[el.id] ?? 0) // the current it already carries wants to continue
        } else if (isJunction(el)) {
          if (dead) continue
          const { Is, nVt } = junctionParams(el)
          const { i, g } = junction(vd[el.id], Is, nVt)
          const gg = Math.max(g, GMIN) // a reverse-biased diode still leaks a little
          const ieq = i - g * vd[el.id] // tangent line: i(v) ≈ g·v + ieq
          stamp(a, b, gg)
          through(a, b, ieq)
          lin[el.id] = { g: gg, ieq }
        } else {
          const r = resistanceOf(el, dead)
          if (r !== null) stamp(a, b, 1 / r)
        }
      }

      const v = solveLinear(A, z)
      volt = (row) => (row < 0 ? 0 : v[row])

      // Did the junction voltages settle? If not, take the next guess (rising by at most NEWTON_STEP).
      let worst = 0
      for (const el of live) {
        const vNew = volt(rowOf(el, 0)) - volt(rowOf(el, 1))
        const delta = vNew - vd[el.id]
        worst = Math.max(worst, Math.abs(delta))
        vd[el.id] = delta > NEWTON_STEP ? vd[el.id] + NEWTON_STEP : vNew
      }
      if (!(worst >= NEWTON_TOL)) break // converged (or NaN: stop rather than loop forever)
    }

    // Turn the node voltages into per-part numbers.
    const out: Record<string, ElementResult> = {}
    const memory: Record<string, number> = {}
    for (const el of elements) {
      const isBurned = el.id in burned
      const u = volt(rowOf(el, 0)) - volt(rowOf(el, 1))
      let r: number | null = null
      let i: number
      switch (el.type) {
        case 'battery':
          r = Math.max(prop(el, 'internalResistance'), MIN_R)
          i = (prop(el, 'voltage') - u) / r
          break
        case 'capacitor': {
          const prev = memoryIn[el.id] ?? 0
          i = isBurned ? 0 : (capacitance(el.props) / dt) * (u - prev)
          memory[el.id] = isBurned ? prev : u
          break
        }
        case 'inductor': {
          const prev = memoryIn[el.id] ?? 0
          i = (dt / (prop(el, 'inductance') * 1e-3)) * u + prev
          memory[el.id] = i
          break
        }
        case 'diode':
        case 'led':
          i = isBurned ? 0 : lin[el.id].g * u + lin[el.id].ieq
          memory[el.id] = isBurned ? 0 : vd[el.id]
          break
        default:
          r = resistanceOf(el, isBurned)
          i = r === null ? 0 : u / r
      }
      const p = Math.abs(u * i)
      const ratio = loadRatio(el, p, Math.abs(i), Math.abs(u))
      const hot = HOT[el.type]
      out[el.id] = {
        status: isBurned ? 'burned' : el.type === 'switch' && r === null ? 'open' : 'ok',
        R: r,
        I: Math.abs(i),
        U: Math.abs(u),
        P: p,
        T: isBurned ? burned[el.id] : hot === undefined ? AMBIENT : AMBIENT + ratio * (hot - AMBIENT),
        level: isBurned ? 0
          : el.type === 'inductor' ? Math.abs(i) / (Math.abs(i) + 0.5) // magnetic field: grows with current, saturates
          : Math.min(1, ratio),
      }
    }
    return { out, memory }
  }

  // Burning changes the circuit (the part stops conducting), so burn the single worst offender,
  // solve again, and repeat until nothing is overloaded any more.
  let { out: results, memory } = solveOnce()
  for (;;) {
    let worst: { id: string; ratio: number } | null = null
    for (const el of elements) {
      const limit = BURN_AT[el.type]
      if (limit === undefined || el.id in burned) continue
      const res = results[el.id]
      const ratio = loadRatio(el, res.P, res.I, res.U) / limit
      if (ratio > 1 && (!worst || ratio > worst.ratio)) worst = { id: el.id, ratio }
    }
    if (!worst) break
    burned[worst.id] = results[worst.id].T
    ;({ out: results, memory } = solveOnce())
  }

  const events: string[] = []
  for (const el of elements) {
    if (el.id in burned) events.push(`${names[el.id]} ${BURN_VERB[el.type] ?? 'burned out'}.`)
  }
  for (const el of elements) {
    if (el.type === 'battery' && results[el.id].I > SHORT_CIRCUIT_A) {
      events.push(`Short circuit! ${names[el.id]} delivers ${results[el.id].I.toFixed(0)} A.`)
    }
  }
  const batteries = elements.filter((e) => e.type === 'battery')
  if (batteries.every((b) => results[b.id].I < 1e-9) && events.length === 0) {
    events.push('No current flows. Open switch, reversed diode, charged capacitor or a wrongly wired meter?')
  }
  return { result: { elements: results, events }, burned, memory }
}
