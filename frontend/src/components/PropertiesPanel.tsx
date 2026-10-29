import { useState } from 'react'
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
      className="pointer-events-auto shrink-0 rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
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
              <NumberField value={value} min={f.min} onCommit={(v) => setProp(element.id, f.key, v)} />
              <span className="w-7 text-xs text-gray-500">{f.unit}</span>
            </span>
          </label>
        )
      })}
      <p className="mt-2 text-xs text-gray-400">R — rotate · Del — delete</p>
    </div>
  )
}

/**
 * Number input that edits a local text draft while focused and only talks to the store on blur/Enter
 * (so typing "12" does not create undo steps for "1" and "12"). Not focused = it just shows the store
 * value, so undo/redo and an invalid entry snap back by themselves — no remounting, no DOM mutation.
 */
function NumberField({ value, min, onCommit }: { value: number; min: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null) // null = not editing
  const finish = () => {
    const v = Number(draft)
    // accept only finite numbers >= min that actually change something; anything else is dropped
    if (draft !== null && draft.trim() !== '' && Number.isFinite(v) && v >= min && v !== value) onCommit(v)
    setDraft(null)
  }
  return (
    <input
      type="number" min={min} step="any"
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-right text-sm"
    />
  )
}
