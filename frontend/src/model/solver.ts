import { capacitance, capacitorEsr } from './capacitor'
import { elementNames } from './naming'
import { buildNets, pinKey } from './netlist'
import { REGISTRY } from './registry'
import { isSource, sourceVoltage } from './sources'
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

const MIN_R = 1e-3 // Ω, stops 1/0 for "0 Ω" parts and is the "zero" internal resistance of an ideal source
const FUSE_R = 5e-3 // Ω, a healthy fuse is almost a wire
const GMIN = 1e-12 // S, tiny leak on every node / junction so the matrix never becomes singular
const SHORT_CIRCUIT_A = 20
const THERMAL_VOLTAGE = 0.02585 // V, kT/q at room temperature: sets how sharply a diode switches on

/** Length of one simulation tick in seconds (the clock of the app). DC circuits take one step of this size per tick. */
export const TICK_SECONDS = 1 / 30

const NEWTON_MAX = 200 // iterations for the diodes
const NEWTON_TOL = 1e-7 // V
const NEWTON_STEP = 0.1 // V, the most a junction voltage may RISE in one iteration (keeps exp() from blowing up)

/**
 * The two physics models the user can choose between.
 *  - IDEAL: textbook parts. Sources have no internal resistance, wires/switches/ammeter have ~0 Ω, the voltmeter has
 *    ~∞ Ω, capacitors and inductors have no ESR / winding resistance, a diode drops almost nothing.
 *  - REAL: the parasitics that real parts have (the numbers are editable per part where it makes sense).
 */
interface Physics {
  switchR: number
  ammeterR: number
  voltmeterR: number // also the oscilloscope probe
  diodeDrop: number // forward drop of a silicon diode, V
  diodeKnee: number // nVt of a silicon diode, V: the smaller, the sharper the on/off switch (an ideal diode is a perfect switch)
  parasitics: boolean // source internal resistance, capacitor ESR, inductor winding resistance
}
const IDEAL: Physics = { switchR: 1e-3, ammeterR: 1e-3, voltmeterR: 1e9, diodeDrop: 0.05, diodeKnee: 0.003, parasitics: false }
const REAL: Physics = { switchR: 0.05, ammeterR: 0.1, voltmeterR: 1e6, diodeDrop: 0.7, diodeKnee: THERMAL_VOLTAGE, parasitics: true }

/** Memory key holding the step size the history was recorded with (BDF2 is only valid for a constant step). */
const DT_KEY = '~dt'
const PREV_SUFFIX = '~' // the value from TWO steps ago is stored under `${id}~`

export type Status = 'ok' | 'burned' | 'open'

export interface ElementResult {
  status: Status
  /** Resistance in Ω; null = infinite or not a plain resistance (open switch, burned part, diode, capacitor ...). */
  R: number | null
  /** Voltage across the part (V) and current through it (A): effective (RMS) values. Equal to the DC value in a DC circuit. */
  I: number
  U: number
  /** Average power in W and temperature in °C. */
  P: number
  T: number
  /** Largest voltage / current seen in the last few cycles (equal to U / I in DC), and the average of |current|. */
  Upeak: number
  Ipeak: number
  Iavg: number
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
  /** AC circuits only: the last few cycles of voltage for every oscilloscope, and the time between two samples (s). */
  traces?: Record<string, number[]>
  traceDt?: number
  /** True when the circuit has an AC source (U and I are then RMS values and the readout shows peaks too). */
  ac?: boolean
}

export interface SimOutput {
  result: SimResult
  /** id -> temperature at the moment it burned. Feed it back into the next call so burned parts stay burned. */
  burned: Record<string, number>
  /**
   * What the parts "remember" after this step: capacitor voltage (V), inductor current (A) — and the one before
   * that (for the 2nd-order integrator) — and, only as a starting guess, a diode's junction voltage. Feed it back.
   */
  memory: Record<string, number>
  /** The instantaneous (signed) voltage and current of every part in this step. */
  samples: Record<string, { u: number; i: number }>
}

export interface StepOptions {
  /** Simulated time at the END of this step, seconds. Matters for AC sources. Default 0. */
  time?: number
  /** Use the ideal physics (see `Physics`). Default false = real. */
  ideal?: boolean
  /** Burn overloaded parts right here and re-solve. The AC engine turns this off: it judges burning over a whole window. */
  autoBurn?: boolean
}

const prop = (el: CircuitElement, key: string) => {
  const v = el.props[key]
  return typeof v === 'number' ? v : Number(REGISTRY[el.type].defaults[key]) // old parts lack newer props
}
const ratedPower = (el: CircuitElement) => prop(el, el.type === 'resistor' ? 'maxPower' : 'ratedPower')
const isJunction = (el: CircuitElement) => el.type === 'diode' || el.type === 'led'

export const hasTemperature = (type: ComponentType) => HOT[type] !== undefined
/** Parts whose answer changes over time, so the simulation has to keep stepping while one is on the canvas. */
export const isDynamic = (el: CircuitElement) => el.type === 'capacitor' || el.type === 'inductor' || el.type === 'acsource'

/** Resistance a plain resistive part presents to the circuit, or null if it carries no current at all. */
function resistanceOf(el: CircuitElement, isBurned: boolean, physics: Physics): number | null {
  switch (el.type) {
    case 'resistor':
    case 'lamp':
    case 'motor': return isBurned ? null : Math.max(prop(el, 'resistance'), MIN_R)
    case 'fuse': return isBurned ? null : FUSE_R
    case 'switch': return el.props.closed === true ? physics.switchR : null
    case 'ammeter': return physics.ammeterR
    case 'voltmeter':
    case 'scope': return physics.voltmeterR
    default: return null // sources, diode, LED, capacitor, inductor have their own models
  }
}

type LoadStats = Pick<ElementResult, 'U' | 'I' | 'P' | 'Upeak' | 'Iavg'>

/** How loaded a part is relative to its rating: 1 = exactly at the rating. Which quantity counts depends on the part. */
export function loadRatio(el: CircuitElement, r: LoadStats): number {
  switch (el.type) {
    case 'lamp':
    case 'resistor':
    case 'motor': return r.P / ratedPower(el) // average power heats a part
    case 'led':
    case 'diode': return r.Iavg / prop(el, 'ratedCurrent') // rated "average forward current"
    case 'fuse': return r.I / prop(el, 'ratedCurrent') // melts by RMS current
    case 'capacitor': return r.Upeak / prop(el, 'maxVoltage') // the dielectric feels the peak voltage
    default: return 0
  }
}

/** Temperature and drawing level of a part, from how loaded it is. */
export function derive(el: CircuitElement, r: LoadStats): { T: number; level: number } {
  const ratio = loadRatio(el, r)
  const hot = HOT[el.type]
  return {
    T: hot === undefined ? AMBIENT : AMBIENT + ratio * (hot - AMBIENT),
    level: el.type === 'inductor' ? r.I / (r.I + 0.5) : Math.min(1, ratio), // inductor: field grows with current, saturates
  }
}

/** The not-yet-burned part that is most over its limit (ratio above 1), or null if nothing is overloaded. */
export function findOverloaded(
  elements: CircuitElement[],
  results: Record<string, ElementResult>,
  burned: Record<string, number>,
): string | null {
  let worst: { id: string; ratio: number } | null = null
  for (const el of elements) {
    const limit = BURN_AT[el.type]
    if (limit === undefined || el.id in burned) continue
    const ratio = loadRatio(el, results[el.id]) / limit
    if (ratio > 1 && (!worst || ratio > worst.ratio)) worst = { id: el.id, ratio }
  }
  return worst?.id ?? null
}

/** Plain-English remarks about the state of the circuit. */
export function describeEvents(
  elements: CircuitElement[],
  results: Record<string, ElementResult>,
  burned: Record<string, number>,
  names: Record<string, string>,
): string[] {
  const events: string[] = []
  for (const el of elements) {
    if (el.id in burned) events.push(`${names[el.id]} ${BURN_VERB[el.type] ?? 'burned out'}.`)
  }
  const sources = elements.filter(isSource)
  for (const el of sources) {
    if (results[el.id].I > SHORT_CIRCUIT_A) {
      events.push(`Short circuit! ${names[el.id]} delivers ${results[el.id].I.toFixed(0)} A.`)
    }
  }
  if (sources.every((s) => results[s.id].I < 1e-9) && events.length === 0) {
    events.push('No current flows. Open switch, reversed diode, charged capacitor or a wrongly wired meter?')
  }
  return events
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
function junctionParams(el: CircuitElement, physics: Physics) {
  const led = el.type === 'led'
  // LEDs have a "softer" knee than silicon diodes. A sharp knee also makes the reverse leakage (≈ Is) negligible:
  // with a small drop AND a soft knee Is would be huge and an "ideal" diode would conduct backwards.
  const nVt = led ? 2 * THERMAL_VOLTAGE : physics.diodeKnee
  const vf = Math.min(led ? prop(el, 'forwardVoltage') : physics.diodeDrop, 20) // 20 V cap keeps exp() finite
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
 * One simulation step of length `dt`. Nodal analysis: Kirchhoff's current law at every node gives  G·V = I
 *  - G[i][i] = sum of conductances (1/R) touching node i, G[i][j] = −conductance between i and j
 *  - I[i]    = current pushed into node i by sources
 * Every part is turned into "a conductance plus a current source" (its companion model):
 *  - resistive parts: just 1/R
 *  - battery / AC source: a current source V(t)/r in parallel with 1/r (Norton form of "V in series with r")
 *  - capacitor and inductor: their derivative is replaced by a formula over the last two steps (BDF2, 2nd order),
 *    which turns  i = C·dv/dt  /  v = L·di/dt  into a conductance plus a source made of the remembered values.
 *    A series resistance (ESR / winding resistance) is folded into the same two numbers.
 *  - diode / LED: not a straight line, so it is replaced by its tangent at the current guess; the guess is
 *    improved over and over (Newton's method) until the voltages stop changing.
 * The node under the first source's "minus" pin is the 0 V reference (ground).
 */
export function simulate(
  data: CircuitData,
  burnedIn: Record<string, number> = {},
  memoryIn: Record<string, number> = {},
  dt: number = TICK_SECONDS,
  opts: StepOptions = {},
): SimOutput {
  const { elements } = data
  const time = opts.time ?? 0
  const physics = opts.ideal ? IDEAL : REAL
  const names = elementNames(elements)
  const { net } = buildNets(data)

  const first = elements.find(isSource)
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

  // --- time integration -------------------------------------------------------------------------
  // x'(t) is approximated from the values at the previous steps. With only one old value we have to use the
  // 1st-order formula (backward Euler); with two old values and the same dt as before, BDF2 is more accurate.
  //   BE:   x' ≈ (x − x1) / dt                    BDF2: x' ≈ (3x − 4·x1 + x2) / (2·dt)
  // Both read  x' ≈ a·x − mix,  so a part only needs `a` (-> conductance) and `mix` (-> remembered source).
  const second = memoryIn[DT_KEY] === dt
  const co = second ? { a: 1.5 / dt, c1: 2 / dt, c2: -0.5 / dt } : { a: 1 / dt, c1: 1 / dt, c2: 0 }
  const past = (id: string) => {
    const x1 = memoryIn[id] ?? 0
    const x2 = second ? (memoryIn[id + PREV_SUFFIX] ?? x1) : x1
    return { x1, mix: co.c1 * x1 + co.c2 * x2 }
  }
  /** Capacitor i = C·v' with a series ESR R: terminal current i = g·v + ieq. */
  const capModel = (el: CircuitElement) => {
    const C = capacitance(el.props)
    const gc = C * co.a
    const R = physics.parasitics ? capacitorEsr(el.props) : 0
    const den = 1 + gc * R // folding R in series:  i = (gc·v − C·mix) / (1 + gc·R)
    return { g: gc / den, ieq: (-C * past(el.id).mix) / den, R }
  }
  /** Inductor v = L·i' with a series winding resistance R: terminal current i = g·v + ieq. */
  const indModel = (el: CircuitElement) => {
    const L = Math.max(prop(el, 'inductance') * 1e-3, 1e-9)
    const gl = 1 / (L * co.a)
    const R = physics.parasitics ? Math.max(0, prop(el, 'dcr')) : 0
    const den = 1 + gl * R // i = gl·(v − R·i) + mix/a   →   i = (gl·v + mix/a) / (1 + gl·R)
    return { g: gl / den, ieq: past(el.id).mix / co.a / den, R }
  }
  const sourceR = (el: CircuitElement) => (physics.parasitics ? Math.max(prop(el, 'internalResistance'), MIN_R) : MIN_R)

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
        if (isSource(el)) {
          const r = sourceR(el)
          stamp(a, b, 1 / r)
          through(a, b, -sourceVoltage(el, time) / r) // pushes V(t)/r into "plus"
        } else if (el.type === 'capacitor') {
          if (dead) continue
          const m = capModel(el)
          stamp(a, b, m.g)
          through(a, b, m.ieq)
        } else if (el.type === 'inductor') {
          const m = indModel(el)
          stamp(a, b, m.g)
          through(a, b, m.ieq)
        } else if (isJunction(el)) {
          if (dead) continue
          const { Is, nVt } = junctionParams(el, physics)
          const { i, g } = junction(vd[el.id], Is, nVt)
          const gg = Math.max(g, GMIN) // a reverse-biased diode still leaks a little
          const ieq = i - g * vd[el.id] // tangent line: i(v) ≈ g·v + ieq
          stamp(a, b, gg)
          through(a, b, ieq)
          lin[el.id] = { g: gg, ieq }
        } else {
          const r = resistanceOf(el, dead, physics)
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
    const memory: Record<string, number> = { [DT_KEY]: dt }
    const samples: Record<string, { u: number; i: number }> = {}
    for (const el of elements) {
      const isBurned = el.id in burned
      const u = volt(rowOf(el, 0)) - volt(rowOf(el, 1))
      let r: number | null = null
      let i: number
      if (isSource(el)) {
        r = sourceR(el)
        i = (sourceVoltage(el, time) - u) / r
      } else if (el.type === 'capacitor') {
        const m = capModel(el)
        const x1 = past(el.id).x1
        i = isBurned ? 0 : m.g * u + m.ieq
        memory[el.id] = isBurned ? x1 : u - m.R * i // the voltage ON the capacitor, without the drop across its ESR
        memory[el.id + PREV_SUFFIX] = x1
      } else if (el.type === 'inductor') {
        const m = indModel(el)
        i = m.g * u + m.ieq
        memory[el.id] = i
        memory[el.id + PREV_SUFFIX] = past(el.id).x1
      } else if (isJunction(el)) {
        i = isBurned ? 0 : lin[el.id].g * u + lin[el.id].ieq
        memory[el.id] = isBurned ? 0 : vd[el.id]
      } else {
        r = resistanceOf(el, isBurned, physics)
        i = r === null ? 0 : u / r
      }
      const base = { U: Math.abs(u), I: Math.abs(i), P: Math.abs(u * i), Upeak: Math.abs(u), Ipeak: Math.abs(i), Iavg: Math.abs(i) }
      const { T, level } = derive(el, base)
      out[el.id] = {
        status: isBurned ? 'burned' : el.type === 'switch' && r === null ? 'open' : 'ok',
        R: r,
        ...base,
        T: isBurned ? burned[el.id] : T,
        level: isBurned ? 0 : level,
      }
      samples[el.id] = { u, i }
    }
    return { out, memory, samples }
  }

  // Burning changes the circuit (the part stops conducting), so burn the single worst offender,
  // solve again, and repeat until nothing is overloaded any more.
  let { out: results, memory, samples } = solveOnce()
  while (opts.autoBurn ?? true) {
    const id = findOverloaded(elements, results, burned)
    if (id === null) break
    burned[id] = results[id].T
    ;({ out: results, memory, samples } = solveOnce())
  }

  return {
    result: { elements: results, events: describeEvents(elements, results, burned, names) },
    burned,
    memory,
    samples,
  }
}
