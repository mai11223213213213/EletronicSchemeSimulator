import { elementNames } from './naming'
import {
  derive, describeEvents, findOverloaded, simulate, TICK_SECONDS,
  type ElementResult, type SimOutput, type SimResult,
} from './solver'
import { acFrequency } from './sources'
import type { CircuitData } from './types'

/** Samples per period of the fastest AC source. More = more accurate phase, but proportionally more work. */
export const SAMPLES_PER_PERIOD = 64
/** Cap on how many small steps one tick may take (a 1 kHz source would otherwise need 2000). Higher frequencies get fewer samples. */
const MAX_STEPS_PER_TICK = 400
/** RMS and peaks are measured over this many periods of the SLOWEST AC source, so whole periods are always averaged. */
const WINDOW_PERIODS = 3
const MAX_WINDOW = 4096 // samples

interface History {
  u: number[]
  i: number[]
}

/** Everything the simulation remembers from one tick to the next. */
export interface EngineState {
  /** What capacitors / inductors / diodes remember (see `SimOutput.memory`). */
  memory: Record<string, number>
  /** Parts that have burned this run: id -> temperature at that moment. */
  burned: Record<string, number>
  /** Simulated seconds since Start. */
  time: number
  /** Length of one small step (s) the history was recorded with; if it changes the history is thrown away. */
  dt: number
  /** The last samples of every part's voltage and current: the window that RMS values and scope traces are read from. */
  history: Record<string, History>
}

export const emptyEngine = (): EngineState => ({ memory: {}, burned: {}, time: 0, dt: 0, history: {} })

const cloneHistory = (h: Record<string, History>): Record<string, History> =>
  Object.fromEntries(Object.entries(h).map(([id, x]) => [id, { u: x.u.slice(), i: x.i.slice() }]))

/** RMS, peak and average of the last `n` samples. */
function statsOf(h: History, n: number) {
  let su = 0, si = 0, sp = 0, pu = 0, pi = 0, sa = 0
  for (let k = h.u.length - n; k < h.u.length; k++) {
    const u = h.u[k]
    const i = h.i[k]
    su += u * u
    si += i * i
    sp += u * i
    pu = Math.max(pu, Math.abs(u))
    pi = Math.max(pi, Math.abs(i))
    sa += Math.abs(i)
  }
  // RMS = sqrt(mean of the squares); average power = mean of (u·i)
  return { U: Math.sqrt(su / n), I: Math.sqrt(si / n), P: Math.abs(sp / n), Upeak: pu, Ipeak: pi, Iavg: sa / n }
}

/**
 * One tick of the clock (1/30 s of real time).
 *  - Without an AC source: one step of TICK_SECONDS, solved exactly like before.
 *  - With an AC source: many small steps (64 per period), because the voltage changes far faster than 1/30 s.
 *    The numbers shown are measured over the last few periods, the way real meters do.
 * `advance` = false means "only the circuit changed, do not move time": the work is done on a copy and only the
 * list of burned parts is kept.
 */
export function tick(
  data: CircuitData,
  engine: EngineState,
  ideal: boolean,
  advance: boolean,
): { engine: EngineState; result: SimResult } {
  const work: EngineState = {
    memory: { ...engine.memory },
    burned: { ...engine.burned },
    time: engine.time,
    dt: engine.dt,
    history: advance ? engine.history : cloneHistory(engine.history),
  }
  const acs = data.elements.filter((e) => e.type === 'acsource' && acFrequency(e.props) > 0)
  const result = acs.length ? acTick(data, work, acs.map((e) => acFrequency(e.props)), ideal) : dcTick(data, work, ideal)
  return { engine: advance ? work : { ...engine, burned: work.burned }, result }
}

function dcTick(data: CircuitData, work: EngineState, ideal: boolean): SimResult {
  work.time += TICK_SECONDS
  const out = simulate(data, work.burned, work.memory, TICK_SECONDS, { time: work.time, ideal, autoBurn: true })
  work.memory = out.memory
  work.burned = out.burned
  work.history = {}
  work.dt = TICK_SECONDS
  return { ...out.result, traces: {}, ac: false }
}

function acTick(data: CircuitData, work: EngineState, freqs: number[], ideal: boolean): SimResult {
  const { elements } = data
  const fMax = Math.max(...freqs)
  const fMin = Math.min(...freqs)

  // How small a step, how many steps per tick, how many samples to average over:
  const dt = Math.min(TICK_SECONDS, Math.max(1 / (fMax * SAMPLES_PER_PERIOD), TICK_SECONDS / MAX_STEPS_PER_TICK))
  const steps = Math.max(1, Math.round(TICK_SECONDS / dt))
  const window = Math.min(MAX_WINDOW, Math.max(steps, Math.round(WINDOW_PERIODS / (fMin * dt))))
  const scopeCount = Math.min(MAX_WINDOW, Math.round(WINDOW_PERIODS / (fMax * dt)))
  const keep = Math.max(window, scopeCount)
  if (work.dt !== dt) { // another frequency: the old samples are on a different time grid
    work.history = {}
    work.dt = dt
  }

  // 1. run the small steps and record the instantaneous voltage and current of every part
  let last: SimOutput | null = null
  for (let k = 0; k < steps; k++) {
    work.time += dt
    last = simulate(data, work.burned, work.memory, dt, { time: work.time, ideal, autoBurn: false })
    work.memory = last.memory
    for (const el of elements) {
      const s = last.samples[el.id]
      const h = (work.history[el.id] ??= { u: [], i: [] })
      h.u.push(s.u)
      h.i.push(s.i)
    }
  }
  for (const h of Object.values(work.history)) {
    if (h.u.length > keep) {
      h.u.splice(0, h.u.length - keep)
      h.i.splice(0, h.i.length - keep)
    }
  }

  // 2. replace the instantaneous numbers by RMS / average / peak over the window
  const results: Record<string, ElementResult> = {}
  for (const el of elements) {
    const base = last!.result.elements[el.id]
    const agg = statsOf(work.history[el.id], Math.min(window, work.history[el.id].u.length))
    const dead = el.id in work.burned
    const { T, level } = derive(el, agg)
    results[el.id] = dead
      ? { ...base, ...agg, I: 0, P: 0, Ipeak: 0, Iavg: 0, T: work.burned[el.id], level: 0, status: 'burned' }
      : { ...base, ...agg, T, level }
  }

  // 3. burning is judged on those averaged numbers (an AC peak alone must not destroy a part); one part per tick
  const doomed = findOverloaded(elements, results, work.burned)
  if (doomed !== null) {
    work.burned[doomed] = results[doomed].T
    results[doomed] = { ...results[doomed], I: 0, P: 0, Ipeak: 0, Iavg: 0, level: 0, status: 'burned' }
  }

  // 4. what the oscilloscopes draw: the last few periods of their voltage
  const traces: Record<string, number[]> = {}
  for (const el of elements) if (el.type === 'scope') traces[el.id] = work.history[el.id].u.slice(-scopeCount)

  return {
    elements: results,
    events: describeEvents(elements, results, work.burned, elementNames(elements)),
    traces,
    traceDt: dt,
    ac: true,
  }
}
