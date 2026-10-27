import { elementNames } from './naming'
import { buildNets, pinKey } from './netlist'
import { REGISTRY } from './registry'
import type { CircuitData, CircuitElement } from './types'

// ---- physical constants of the simplified model (DC only) -----------------------------------
export const AMBIENT = 25 // °C
const BURN_FACTOR = 1.5 // a lamp/resistor burns out above 150 % of its rated power
const LAMP_HOT = 2500 // °C of a filament running at exactly its rated power
export const RESISTOR_HOT = 200 // °C of a resistor running at exactly its rated power
const MIN_R = 1e-3 // Ω, stops 1/0 for "0 Ω" parts
const SWITCH_R = 1e-3 // Ω, a closed switch is almost a wire
const AMMETER_R = 1e-3 // Ω, an ideal ammeter has ~0 Ω
const VOLTMETER_R = 1e7 // Ω, an ideal voltmeter has ~∞ Ω
const GMIN = 1e-12 // S, tiny leak to ground on every node so floating nodes never make the matrix singular
const SHORT_CIRCUIT_A = 20

export type Status = 'ok' | 'burned' | 'open'

export interface ElementResult {
  status: Status
  /** Resistance in Ω; null = infinite (open switch, burned part). */
  R: number | null
  /** Current through the part (A) and voltage across it (V). Both are magnitudes. */
  I: number
  U: number
  /** Power in W and temperature in °C. */
  P: number
  T: number
  /** Lamps only: 0 (dark) … 1 (full brightness). */
  brightness: number
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
}

const prop = (el: CircuitElement, key: string) => {
  const v = el.props[key]
  return typeof v === 'number' ? v : Number(REGISTRY[el.type].defaults[key]) // old parts lack newer props
}
const ratedPower = (el: CircuitElement) => prop(el, el.type === 'lamp' ? 'ratedPower' : 'maxPower')

/** Resistance a part presents to the circuit, or null if it carries no current at all. */
function resistanceOf(el: CircuitElement, isBurned: boolean): number | null {
  switch (el.type) {
    case 'resistor':
    case 'lamp': return isBurned ? null : Math.max(prop(el, 'resistance'), MIN_R)
    case 'switch': return el.props.closed === true ? SWITCH_R : null
    case 'ammeter': return AMMETER_R
    case 'voltmeter': return VOLTMETER_R
    default: return null // battery has its own model
  }
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
 * Nodal analysis: Kirchhoff's current law at every node gives  G·V = I
 *  - G[i][i] = sum of conductances (1/R) touching node i, G[i][j] = −conductance between i and j
 *  - I[i]    = current pushed into node i by sources
 * A battery is an ideal source V in series with its internal resistance r. Its Norton twin is a
 * current source V/r in parallel with 1/r — so the battery needs no extra unknowns.
 * The node under the first battery's "minus" pin is the 0 V reference (ground).
 */
export function simulate(data: CircuitData, burnedIn: Record<string, number> = {}): SimOutput {
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

  /** One linear solve with the current set of burned parts. */
  const solveOnce = () => {
    const n = rows.size
    const A = Array.from({ length: n }, () => new Array<number>(n).fill(0))
    const z = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) A[i][i] += GMIN
    const stamp = (i: number, j: number, g: number) => {
      if (i >= 0) A[i][i] += g
      if (j >= 0) A[j][j] += g
      if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g }
    }
    for (const el of elements) {
      const a = rowOf(el, 0)
      const b = rowOf(el, 1)
      if (el.type === 'battery') {
        const r = Math.max(prop(el, 'internalResistance'), MIN_R)
        stamp(a, b, 1 / r)
        const i = prop(el, 'voltage') / r
        if (a >= 0) z[a] += i // pushed into "plus"
        if (b >= 0) z[b] -= i // pulled out of "minus"
      } else {
        const r = resistanceOf(el, el.id in burned)
        if (r !== null) stamp(a, b, 1 / r)
      }
    }
    const v = solveLinear(A, z)
    const volt = (row: number) => (row < 0 ? 0 : v[row])

    const out: Record<string, ElementResult> = {}
    for (const el of elements) {
      const isBurned = el.id in burned
      const heats = el.type === 'lamp' || el.type === 'resistor'
      const r = el.type === 'battery' ? Math.max(prop(el, 'internalResistance'), MIN_R) : resistanceOf(el, isBurned)
      const u = volt(rowOf(el, 0)) - volt(rowOf(el, 1))
      const i = el.type === 'battery' ? (prop(el, 'voltage') - u) / r! : r === null ? 0 : u / r
      const p = Math.abs(u * i)
      const frac = heats ? p / ratedPower(el) : 0
      const hot = el.type === 'lamp' ? LAMP_HOT : RESISTOR_HOT
      out[el.id] = {
        status: isBurned ? 'burned' : el.type === 'switch' && r === null ? 'open' : 'ok',
        R: r,
        I: Math.abs(i),
        U: Math.abs(u),
        P: p,
        T: isBurned ? burned[el.id] : AMBIENT + frac * (hot - AMBIENT),
        brightness: el.type === 'lamp' && !isBurned ? Math.min(1, frac) : 0,
      }
    }
    return out
  }

  // Burning changes the circuit (the part stops conducting), so burn the single worst offender,
  // solve again, and repeat until nothing is overloaded any more.
  let results = solveOnce()
  for (;;) {
    let worst: { id: string; ratio: number } | null = null
    for (const el of elements) {
      if ((el.type !== 'lamp' && el.type !== 'resistor') || el.id in burned) continue
      const ratio = results[el.id].P / (ratedPower(el) * BURN_FACTOR)
      if (ratio > 1 && (!worst || ratio > worst.ratio)) worst = { id: el.id, ratio }
    }
    if (!worst) break
    burned[worst.id] = results[worst.id].T
    results = solveOnce()
  }

  const events: string[] = []
  for (const el of elements) if (el.id in burned) events.push(`${names[el.id]} burned out.`)
  for (const el of elements) {
    if (el.type === 'battery' && results[el.id].I > SHORT_CIRCUIT_A) {
      events.push(`Short circuit! ${names[el.id]} delivers ${results[el.id].I.toFixed(0)} A.`)
    }
  }
  const batteries = elements.filter((e) => e.type === 'battery')
  if (batteries.every((b) => results[b.id].I < 1e-9) && events.length === 0) {
    events.push('No current flows. Is a switch open or a meter wired in the wrong way?')
  }
  return { result: { elements: results, events }, burned }
}
