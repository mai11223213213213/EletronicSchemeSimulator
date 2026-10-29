import { X } from 'lucide-react'
import { capacitance } from '../model/capacitor'
import { elementNames } from '../model/naming'
import { REGISTRY } from '../model/registry'
import { isDynamic, type ElementResult } from '../model/solver'
import { acFrequency } from '../model/sources'
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

/** Frequency of a recorded waveform from the distance between its rising crossings of the mean level, or 0. */
function estimateFrequency(trace: number[], dt: number): number {
  const mean = trace.reduce((a, b) => a + b, 0) / trace.length
  const crossings: number[] = []
  for (let k = 1; k < trace.length; k++) if (trace[k - 1] < mean && trace[k] >= mean) crossings.push(k)
  if (crossings.length < 2) return 0
  return (crossings.length - 1) / ((crossings[crossings.length - 1] - crossings[0]) * dt)
}

/** What each part reports: meters only show the quantity they measure, others show what matters for them. */
function rows(el: CircuitElement, r: ElementResult, ac: boolean, trace?: number[], traceDt?: number): [label: string, value: string][] {
  const R: [string, string] = ['R', r.R === null ? '∞' : formatSI(r.R, 'Ω')]
  const I: [string, string] = ['I', formatSI(r.I, 'A')]
  const U: [string, string] = ['U', formatSI(r.U, 'V')]
  const P: [string, string] = ['P', formatSI(r.P, 'W')]
  const T: [string, string] = ['t', formatTemp(r.T)]
  let out: [string, string][]
  switch (el.type) {
    case 'ammeter': out = [I, U]; break
    case 'voltmeter': out = [U, I]; break
    case 'resistor':
    case 'lamp': out = [R, I, U, P, T]; break
    case 'motor': out = [R, I, U, P, T, ['n', `${Math.round(r.level * 100)} %`]]; break // n = speed
    case 'diode':
    case 'led': out = [I, U, P, T]; break
    case 'fuse': out = [R, I, U, T]; break
    case 'capacitor': {
      const c = capacitance(el.props)
      out = [['C', formatSI(c, 'F')], U, I, ['E', formatSI(0.5 * c * r.Upeak * r.Upeak, 'J')]] // E = ½·C·U² at the peak
      break
    }
    case 'inductor': {
      const l = numberProp(el, 'inductance') * 1e-3
      out = [['L', formatSI(l, 'H')], I, U, ['E', formatSI(0.5 * l * r.Ipeak * r.Ipeak, 'J')]] // E = ½·L·I² at the peak
      break
    }
    case 'acsource': out = [['f', formatSI(acFrequency(el.props), 'Hz')], U, I, P]; break
    case 'scope': {
      const f = trace && traceDt ? estimateFrequency(trace, traceDt) : 0
      const vpp = trace && trace.length ? Math.max(...trace) - Math.min(...trace) : 0
      return [U, ['pp', formatSI(vpp, 'V')], ['f', f > 0 ? formatSI(f, 'Hz') : '—']]
    }
    default: out = [R, I, U, P]
  }
  // In an AC circuit U and I are RMS values; the peaks are the other half of the story.
  if (ac && el.type !== 'ammeter' && el.type !== 'voltmeter') out.push(['Up', formatSI(r.Upeak, 'V')], ['Ip', formatSI(r.Ipeak, 'A')])
  else if (ac) out.push(['pk', formatSI(el.type === 'ammeter' ? r.Ipeak : r.Upeak, el.type === 'ammeter' ? 'A' : 'V')])
  return out
}

/** The recorded voltage of an oscilloscope as a line chart, with a zero line. Auto-scaled to its own peak. */
function Waveform({ trace }: { trace: number[] }) {
  const W = 220
  const H = 56
  const peak = Math.max(...trace.map(Math.abs), 1e-9)
  const points = trace
    .map((v, k) => `${((k / Math.max(trace.length - 1, 1)) * W).toFixed(1)},${(H / 2 - (v / peak) * (H / 2 - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mb-1 w-full rounded bg-gray-900" role="img" aria-label="Measured voltage">
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#374151" strokeWidth="1" />
      <polyline points={points} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="4" y="10" fontSize="8" fill="#9ca3af">±{formatSI(peak, 'V')}</text>
    </svg>
  )
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
  const time = useSimStore((s) => s.engine.time)
  const ideal = useSimStore((s) => s.ideal)
  const dynamic = elements.some(isDynamic) // only then does time mean anything
  const ac = result?.ac === true
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
        {running && (
          <p className="text-gray-500">
            Model: <b className="text-gray-700">{ideal ? 'ideal' : 'real'}</b>
            {ac && ' · U, I, P are RMS / average values; Up, Ip are peaks'}
          </p>
        )}

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
          const trace = result.traces?.[el.id]
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
              {el.type === 'scope' && trace && trace.length > 1 && <Waveform trace={trace} />}
              <dl className="grid grid-cols-[2rem_1fr] gap-x-2 font-mono text-gray-700">
                {rows(el, r, ac, trace, result.traceDt).map(([label, value]) => (
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
