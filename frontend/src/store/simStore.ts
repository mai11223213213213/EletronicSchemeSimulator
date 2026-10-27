import { create } from 'zustand'
import { checkCircuit, type Problem } from '../model/circuitCheck'
import { simulate, type SimResult } from '../model/solver'
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
}

interface SimState extends Snapshot {
  /** Is the readout card expanded? The user can close it without stopping the simulation. */
  consoleOpen: boolean
  start: () => void
  stop: () => void
  setConsoleOpen: (open: boolean) => void
}

const IDLE: Snapshot = { running: false, problems: [], warnings: [], result: null, burned: {} }

export const useSimStore = create<SimState>((set) => ({
  ...IDLE,
  consoleOpen: true,
  start: () => {
    set({ consoleOpen: true }) // pressing Start always brings the readout back
    run({})
  },
  stop: () => set({ ...IDLE }),
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

/** Check the circuit, then solve it. Used by Start, and again on every edit while running. */
function run(burnedBefore: Record<string, number>) {
  const data = circuitData()
  const check = checkCircuit(data)
  if (check.errors.length) {
    useSimStore.setState({ ...IDLE, problems: check.errors })
    return
  }
  const { result, burned } = simulate(data, burnedBefore)
  useSimStore.setState({ running: true, problems: [], warnings: [...check.warnings, ...result.events], result, burned })
}

// Live simulation: change a value, move a part or rewire while it runs and the numbers follow.
// Burned parts stay burned until Stop (their state lives in the sim store, not in the circuit).
useCircuitStore.subscribe((s, prev) => {
  const sim = useSimStore.getState()
  if (!sim.running) return
  if (s.elements === prev.elements && s.wires === prev.wires && s.junctions === prev.junctions) return
  run(sim.burned)
})
