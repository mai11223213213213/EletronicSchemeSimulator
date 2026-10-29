import { X } from 'lucide-react'
import { capacitance } from '../model/capacitor'
import { elementNames } from '../model/naming'
import { REGISTRY } from '../model/registry'
import { isDynamic, type ElementResult } from '../model/solver'
import type { CircuitElement, ComponentType } from '../model/types'
import { formatSI, formatTemp } from '../model/units'
import { useCircuitStore } from '../store/circuitStore'
import { useSimStore } from '../store/simStore'

const STATUS_STYLE = {
  ok: 'text-emerald-600',
  burned: 'text-red-600',
  open: 'text-amber-600',
} as const
/** What a destroyed part is called: a fuse "blows", a capacitor "bursts", the rest "burn". */
const burnedLabel = (type: ComponentType) => (type === 'fuse' ? 'BLOWN' : type === 'capacitor' ? 'BURST' : 'BURNED')
const statusLabel = (el: CircuitElement, status: ElementResult['status']) =>
  status === 'burned' ? burnedLabel(el.type) : status === 'open' ? 'OPEN' : 'OK'

const numberProp = (el: CircuitElement, key: string) => Number(el.props[key] ?? REGISTRY[el.type].defaults[key])

/** What each part reports: meters only show the quantity they measure, others show what matters for them. */
function rows(el: CircuitElement, r: ElementResult): [label: string, value: string][] {
  const R: [string, string] = ['R', r.R === null ? '∞' : formatSI(r.R, 'Ω')]
  const I: [string, string] = ['I', formatSI(r.I, 'A')]
  const U: [string, string] = ['U', formatSI(r.U, 'V')]
  const P: [string, string] = ['P', formatSI(r.P, 'W')]
  const T: [string, string] = ['t', formatTemp(r.T)]
  switch (el.type) {
    case 'ammeter': return [I, U]
    case 'voltmeter': return [U, I]
    case 'resistor':
    case 'lamp': return [R, I, U, P, T]
    case 'motor': return [R, I, U, P, T, ['n', `${Math.round(r.level * 100)} %`]] // n = speed
    case 'diode':
    case 'led': return [I, U, P, T]
    case 'fuse': return [R, I, U, T]
    case 'capacitor': {
      const c = capacitance(el.props)
      return [['C', formatSI(c, 'F')], U, I, ['E', formatSI(0.5 * c * r.U * r.U, 'J')]] // E = ½·C·U²
    }
    case 'inductor': {
      const l = numberProp(el, 'inductance') * 1e-3
      return [['L', formatSI(l, 'H')], I, U, ['E', formatSI(0.5 * l * r.I * r.I, 'J')]] // E = ½·L·I²
    }
    default: return [R, I, U, P]
  }
}

/**
 * Floating readout card (same look as the components list). One mini-card per part;
 * clicking a mini-card selects that part on the canvas, and the selected part's card is highlighted.
 */
export function SimulationConsole() {
  const elements = useCircuitStore((s) => s.elements)
  const selection = useCircuitStore((s) => s.selection)
  const select = useCircuitStore((s) => s.select)
  const problems = useSimStore((s) => s.problems)
  const warnings = useSimStore((s) => s.warnings)
  const result = useSimStore((s) => s.result)
  const running = useSimStore((s) => s.running)
  const time = useSimStore((s) => s.time)
  const dynamic = elements.some(isDynamic) // only then does time mean anything
  const setConsoleOpen = useSimStore((s) => s.setConsoleOpen)
  const names = elementNames(elements)

  return (
    <aside className="flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800">
          Simulation <span className={`ml-1 text-xs font-medium ${running ? 'text-emerald-600' : 'text-red-600'}`}>
            ● {running ? 'running' : 'stopped'}
          </span>
          {running && dynamic && <span className="ml-2 font-mono text-xs font-normal text-gray-500">t = {time.toFixed(2)} s</span>}
        </h2>
        <button
          type="button" onClick={() => setConsoleOpen(false)} title="Hide readout" aria-label="Hide readout"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-xs">
        {problems.length > 0 && (
          <section className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
            <p className="mb-1 font-semibold">Cannot start — the circuit is not finished:</p>
            <ul className="space-y-1">
              {problems.map((p, i) => (
                <li key={i}>
                  {p.elementId ? (
                    <button
                      type="button" onClick={() => select({ kind: 'element', id: p.elementId! })}
                      className="text-left underline decoration-dotted hover:text-red-900"
                    >
                      ✗ {p.message}
                    </button>
                  ) : (
                    <>✗ {p.message}</>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2 text-amber-800">
            {warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        )}

        {result && elements.map((el) => {
          const r = result.elements[el.id]
          if (!r) return null
          const selected = selection?.kind === 'element' && selection.id === el.id
          return (
            <button
              key={el.id} type="button" onClick={() => select({ kind: 'element', id: el.id })}
              className={`block w-full rounded border p-2 text-left transition ${
                selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{names[el.id]}</span>
                <span className={`font-mono font-semibold ${STATUS_STYLE[r.status]}`}>{statusLabel(el, r.status)}</span>
              </div>
              <dl className="grid grid-cols-[1.5rem_1fr] gap-x-2 font-mono text-gray-700">
                {rows(el, r).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-gray-400">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
