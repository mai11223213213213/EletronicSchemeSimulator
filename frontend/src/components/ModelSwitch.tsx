import { useSimStore } from '../store/simStore'

/**
 * Chooses the physics of the simulation: ideal textbook parts or real ones. It can be changed while the simulation
 * runs; the numbers jump to the new model at once.
 */
export function ModelSwitch() {
  const ideal = useSimStore((s) => s.ideal)
  const setIdeal = useSimStore((s) => s.setIdeal)
  const option = (value: boolean, label: string, hint: string) => (
    <button
      type="button" onClick={() => setIdeal(value)} aria-pressed={ideal === value} title={hint}
      className={`px-3 py-2 text-sm font-medium transition ${
        ideal === value ? 'bg-blue-600 text-white' : 'bg-white/95 text-gray-700 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label="Physics model" className="flex overflow-hidden rounded-md border border-gray-200 shadow-lg">
      {option(true, 'Ideal', 'Perfect sources, wires and instruments; no ESR or winding resistance; a diode drops almost nothing')}
      {option(false, 'Real', 'Internal resistance of sources, ESR of capacitors, winding resistance of inductors, 0.7 V diode drop, real meters')}
    </div>
  )
}
