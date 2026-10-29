import { useCircuitStore } from '../store/circuitStore'

/**
 * Wire style card. Shown while a wire is being drawn (sets the style of that wire and of the next ones)
 * and while a wire is selected (sets that wire's style). The same switch is the `D` key.
 */
export function WirePanel() {
  const drawing = useCircuitStore((s) => s.draft !== null)
  const selected = useCircuitStore((s) =>
    s.selection?.kind === 'wire' ? s.wires.find((w) => w.id === s.selection!.id) : undefined)
  const diagonalWires = useCircuitStore((s) => s.diagonalWires)
  const setWireStyle = useCircuitStore((s) => s.setWireStyle)
  if (!drawing && !selected) return null

  // While drawing, the card edits the "new wires" style; otherwise it edits the selected wire.
  const diagonal = drawing || !selected ? diagonalWires : selected.diagonal === true
  const button = (isDiagonal: boolean, label: string) => (
    <button
      type="button" onClick={() => setWireStyle(isDiagonal)} aria-pressed={diagonal === isDiagonal}
      className={`flex-1 rounded border px-2 py-1.5 text-sm ${
        diagonal === isDiagonal
          ? 'border-blue-400 bg-blue-50 font-medium text-blue-700'
          : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className="pointer-events-auto shrink-0 rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="mb-2 text-sm font-semibold text-gray-800">{drawing ? 'New wire' : 'Wire'}</h3>
      <div className="flex gap-2">
        {button(false, 'Straight')}
        {button(true, 'Diagonal')}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        D — switch style · drag the dots to move a bend · double-click a dot to remove it
        {!drawing && ' · double-click a diagonal wire to add a bend'}
      </p>
    </div>
  )
}
