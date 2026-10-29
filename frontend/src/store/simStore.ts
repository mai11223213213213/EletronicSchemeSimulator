import { create } from 'zustand'
import { checkCircuit, type Problem } from '../model/circuitCheck'
import { isDynamic, TICK_SECONDS, type SimResult } from '../model/solver'
import { emptyEngine, tick, type EngineState } from '../model/transient'
import type { CircuitData } from '../model/types'
import { useCircuitStore } from './circuitStore'

/** Everything that Stop wipes. Kept apart from the actions so `idle()` can be spread back in one go. */
interface Snapshot {
  running: boolean
  /** Why the last Start was refused (empty when it worked). */
  problems: Problem[]
  /** Heads-up messages: open switch, burned parts, short circuit ... */
  warnings: string[]
  result: SimResult | null
  /** What the simulation remembers between ticks: capacitor charge, burned parts, the clock, recent samples. */
  engine: EngineState
}

interface SimState extends Snapshot {
  /** Is the readout card expanded? The user can close it without stopping the simulation. */
  consoleOpen: boolean
  /** Which physics: true = ideal textbook parts, false = real parts with internal resistance, ESR, diode drop ... */
  ideal: boolean
  start: () => void
  stop: () => void
  setConsoleOpen: (open: boolean) => void
  setIdeal: (ideal: boolean) => void
}

/** A fresh "nothing is running" state. A function, because the engine holds arrays that are updated in place. */
const idle = (): Snapshot => ({ running: false, problems: [], warnings: [], result: null, engine: emptyEngine() })

export const useSimStore = create<SimState>((set, get) => ({
  ...idle(),
  consoleOpen: true,
  ideal: false,
  start: () => {
    set({ ...idle(), consoleOpen: true }) // a fresh run: nothing burned, nothing charged; the readout comes back
    if (solve(false)) startClock()
  },
  stop: () => {
    stopClock()
    set({ ...idle() })
  },
  setConsoleOpen: (consoleOpen) => set({ consoleOpen }),
  setIdeal: (ideal) => {
    set({ ideal })
    if (get().running) {
      // The measured window (RMS, peaks) was recorded with the other physics: start measuring again.
      set((s) => ({ engine: { ...s.engine, history: {}, dt: 0 } }))
      solve(false)
    }
  },
}))

/** Is there anything to show in the readout card right now (a running simulation or start-up problems)? */
export const useHasReadout = () => useSimStore((s) => s.running || s.problems.length > 0)
/** Is the card actually on screen? Other overlays use this to step aside. */
export const useConsoleVisible = () =>
  useSimStore((s) => s.consoleOpen && (s.running || s.problems.length > 0))

const circuitData = (): CircuitData => {
  const { elements, wires, junctions } = useCircuitStore.getState()
  return { elements, wires, junctions }
}

/**
 * Check the circuit, then run one tick. Returns false (and shows the problems) if the circuit is unfinished.
 * `advance` = true: this is a clock tick, so keep the new capacitor/inductor state and move time forward.
 * `advance` = false: only the circuit changed (Start, or the user edited something): re-solve from the same
 * state, so editing a value mid-run does not make a capacitor charge faster.
 */
function solve(advance: boolean): boolean {
  const data = circuitData()
  const check = checkCircuit(data)
  if (check.errors.length) {
    stopClock()
    useSimStore.setState({ ...idle(), problems: check.errors })
    return false
  }
  const sim = useSimStore.getState()
  const out = tick(data, sim.engine, sim.ideal, advance)
  useSimStore.setState({
    running: true,
    problems: [],
    warnings: [...check.warnings, ...out.result.events],
    result: out.result,
    engine: out.engine,
  })
  return true
}

// ---- the clock -------------------------------------------------------------------------------
// A circuit with only resistors has one fixed answer, so it needs no clock. With a capacitor, an inductor or an AC
// source the answer changes over time, so a timer calls solve(true) 30 times a second and the numbers (and the
// drawings) move.
let timer: ReturnType<typeof setInterval> | null = null
function startClock() {
  stopClock()
  timer = setInterval(() => {
    if (useCircuitStore.getState().elements.some(isDynamic)) solve(true)
  }, TICK_SECONDS * 1000)
}
function stopClock() {
  if (timer !== null) clearInterval(timer)
  timer = null
}

// Live simulation: change a value, move a part or rewire while it runs and the numbers follow.
// Burned parts stay burned until Stop (their state lives in the sim store, not in the circuit).
useCircuitStore.subscribe((s, prev) => {
  if (!useSimStore.getState().running) return
  if (s.elements === prev.elements && s.wires === prev.wires && s.junctions === prev.junctions) return
  solve(false)
})
