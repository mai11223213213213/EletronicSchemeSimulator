interface Props {
  /** The last few periods of the measured voltage (volts), from the simulation. Empty = nothing to draw yet. */
  trace?: number[]
}

const W = 30 // drawn trace width, in the symbol's own units
const H = 9 // half of the drawn trace height

/** A small oscilloscope: a dark screen with the voltage drawn as a green line. The probe goes across a part. */
export function ScopeElement({ trace }: Props) {
  let d = 'M-15 0 L15 0' // no data: a flat line
  if (trace && trace.length > 1) {
    const peak = Math.max(...trace.map(Math.abs), 1e-9) // auto range: the biggest value touches the edge of the screen
    d = trace
      .map((v, k) => `${k ? 'L' : 'M'}${(-W / 2 + (W * k) / (trace.length - 1)).toFixed(2)} ${(-(v / peak) * H).toFixed(2)}`)
      .join(' ')
  }
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5">
      <line x1="-30" y1="0" x2="-18" y2="0" />
      <line x1="18" y1="0" x2="30" y2="0" />
      <rect x="-18" y="-14" width="36" height="28" rx="4" fill="#111827" />
      {/* graticule: the zero line and a faint centre mark */}
      <path d="M-15 0 L15 0 M0 -11 L0 11" stroke="#374151" strokeWidth="0.6" />
      <path d={d} stroke="#4ade80" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
}
