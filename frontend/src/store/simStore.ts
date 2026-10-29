import { create } from 'zustand'
import { checkCircuit, type Problem } from '../model/circuitCheck'
import { isDynamic, simulate, TICK_SECONDS, type SimResult } from '../model/solver'
import type { CircuitData } from '../model/types'
import { useCircuitStore } from './circuitStore'

/** Everything that Stop wipes. Kept apart from the actions so `IDLE` can be spread back in one go. */
interface Snapshot {
  running: boolean
  /** Why the last Start was refused (empty when it worked). */
  problems: Problem[]
  /** Heads-up messages: open switch, burned parts, short circuit ... */
  warnings: string[]
  result: SimResult | null
  /** Parts that have burned this run (id -> temperature when it happened). Cleared on Stop. */
  burned: Record<string, number>
  /** What capacitors (voltage) and inductors (current) hold right now. Cleared on Stop, so every run starts uncharged. */
  memory: Record<string, number>
  /** Simulated seconds since Start. Only advances while a capacitor or inductor is on the canvas. */
  time: number
}

interface SimState extends Snapshot {
  /** Is the readout card expanded? The user can close it without stopping the simulation. */
  consoleOpen: boolean
  start: () => void
  stop: () => void
  setConsoleOpen: (open: boolean) => void
}

const IDLE: Snapshot = { running: false, problems: [], warnings: [], result: null, burned: {}, memory: {}, time: 0 }

export const useSimStore = create<SimState>((set) => ({
  ...IDLE,
  consoleOpen: true,
  start: () => {
    set({ ...IDLE, consoleOpen: true }) // a fresh run: nothing burned, nothing charged; the readout comes back
    if (solve(false)) startClock()
  },
  stop: () => {
    stopClock()
    set({ ...IDLE })
  },
  setConsoleOpen: (consoleOpen) => set({ consoleOpen }),
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
 * Check the circuit, then solve one step. Returns false (and shows the problems) if the circuit is unfinished.
 * `advance` = true: this is a clock tick, so keep the new capacitor/inductor state and move time forward.
 * `advance` = false: only the circuit changed (Start, or the user edited something): re-solve from the same
 * state, so editing a value mid-run does not make a capacitor charge faster.
 */
function solve(advance: boolean): boolean {
  const data = circuitData()
  const check = checkCircuit(data)
  if (check.errors.length) {
    stopClock()
    useSimStore.setState({ ...IDLE, problems: check.errors })
    return false
  }
  const sim = useSimStore.getState()
  const out = simulate(data, sim.burned, sim.memory, TICK_SECONDS)
  useSimStore.setState({
    running: true,
    problems: [],
    warnings: [...check.warnings, ...out.result.events],
    result: out.result,
    burned: out.burned,
    ...(advance ? { memory: out.memory, time: sim.time + TICK_SECONDS } : {}),
  })
  return true
}

// ---- the clock -------------------------------------------------------------------------------
// A circuit with only resistors has one fixed answer, so it needs no clock. With a capacitor or an inductor the
// answer changes over time, so a timer calls solve(true) 30 times a second and the numbers (and the drawings) move.
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
