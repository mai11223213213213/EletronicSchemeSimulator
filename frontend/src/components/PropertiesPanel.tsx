import { useState } from 'react'
import { REGISTRY } from '../model/registry'
import { useCircuitStore } from '../store/circuitStore'

/** Edit the numbers of the selected part (resistance, voltage, ...). Hidden when nothing is selected. */
export function PropertiesPanel() {
  const element = useCircuitStore((s) =>
    s.selection?.kind === 'element' ? s.elements.find((e) => e.id === s.selection!.id) : undefined)
  const notice = useCircuitStore((s) => s.notice)
  const setProp = useCircuitStore((s) => s.setProp)
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch)
  if (!element) return null

  const def = REGISTRY[element.type]
  const notes = notice?.elementId === element.id ? notice.notes : []
  return (
    <div
      className="pointer-events-auto max-h-[70%] shrink-0 overflow-y-auto rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
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

      {def.fields.filter((f) => f.show?.(element.props) ?? true).map((f) => {
        // parts created before a newer property existed do not have it yet: show the default
        const value = Number(element.props[f.key] ?? def.defaults[f.key])
        return (
          <label key={f.key} className="mb-1 flex items-center justify-between gap-2 text-sm text-gray-700">
            <span>{f.label}</span>
            <span className="flex items-center gap-1">
              {f.options ? (
                <select
                  value={value} onChange={(e) => setProp(element.id, f.key, Number(e.target.value))}
                  className="w-32 rounded border border-gray-300 bg-white px-1 py-0.5 text-sm"
                >
                  {f.options.map((name, i) => (
                    <option key={name} value={i}>{name}</option>
                  ))}
                </select>
              ) : (
                <>
                  <NumberField value={value} min={f.min} onCommit={(v) => setProp(element.id, f.key, v)} />
                  <span className="w-7 text-xs text-gray-500">{f.unit}</span>
                </>
              )}
            </span>
          </label>
        )
      })}

      {/* values the app calculates from the inputs above: read-only */}
      {def.readouts && (
        <dl className="mt-2 space-y-0.5 rounded bg-gray-50 p-2 text-xs text-gray-600">
          {def.readouts(element.props).map(([label, v]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt>{label}</dt>
              <dd className="font-mono text-gray-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* the app changed something the user typed: say what and why */}
      {notes.map((note) => (
        <p key={note} role="status" className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ {note}
        </p>
      ))}

      {def.help && <p className="mt-2 text-xs leading-snug text-gray-500">{def.help(element.props)}</p>}
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
