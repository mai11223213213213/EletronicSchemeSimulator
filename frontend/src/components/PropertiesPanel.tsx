import { REGISTRY } from '../model/registry'
import { useCircuitStore } from '../store/circuitStore'

/** Edit the numbers of the selected part (resistance, voltage, ...). Hidden when nothing is selected. */
export function PropertiesPanel() {
  const element = useCircuitStore((s) =>
    s.selection?.kind === 'element' ? s.elements.find((e) => e.id === s.selection!.id) : undefined)
  const setProp = useCircuitStore((s) => s.setProp)
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch)
  if (!element) return null

  const def = REGISTRY[element.type]
  return (
    <div
      className="absolute right-4 top-14 z-20 w-56 rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="mb-2 text-sm font-semibold text-gray-800">{def.label}</h3>

      {element.type === 'switch' && (
        <button
          type="button"
          onClick={() => toggleSwitch(element.id)}
          className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
        >
          {element.props.closed ? 'Closed — click to open' : 'Open — click to close'}
        </button>
      )}

      {def.fields.map((f) => {
        const value = Number(element.props[f.key])
        return (
          <label key={f.key} className="mb-1 flex items-center justify-between gap-2 text-sm text-gray-700">
            <span>{f.label}</span>
            <span className="flex items-center gap-1">
              {/* uncontrolled + keyed by value: applies on blur/Enter (one undo step), resets after undo */}
              <input
                key={`${element.id}:${f.key}:${value}`}
                type="number"
                min={f.min}
                step="any"
                defaultValue={value}
                onBlur={(e) => {
                  commit(e.currentTarget.value, f.min, value, (v) => setProp(element.id, f.key, v))
                  e.currentTarget.value = String(value) // invalid input snaps back (a valid one remounts via the key)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-right text-sm"
              />
              <span className="w-7 text-xs text-gray-500">{f.unit}</span>
            </span>
          </label>
        )
      })}
      <p className="mt-2 text-xs text-gray-400">R — rotate · Del — delete</p>
    </div>
  )
}

/** Accept only finite numbers >= min; otherwise ignore the edit (the field snaps back). */
function commit(raw: string, min: number, current: number, apply: (v: number) => void) {
  const v = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(v) || v < min || v === current) return
  apply(v)
}
