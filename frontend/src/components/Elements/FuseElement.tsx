interface Props {
  /** 0 … 1: current relative to the rating. The wire inside turns orange as it nears 1. */
  level?: number
  burned?: boolean
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)

/** A glass tube with a thin wire inside. Too much current melts the wire: the fuse is blown and the circuit opens. */
export function FuseElement({ level = 0, burned = false }: Props) {
  const t = Math.min(1, Math.max(0, level))
  const wire = `rgb(${lerp(31, 249, t)}, ${lerp(41, 115, t)}, ${lerp(55, 22, t)})` // dark grey → orange
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <line x1="-30" y1="0" x2="-16" y2="0" />
      <line x1="16" y1="0" x2="30" y2="0" />
      <rect x="-16" y="-7" width="32" height="14" rx="3" fill={burned ? '#e5e7eb' : '#ffffff'} />
      {burned ? (
        <>
          <path d="M-16 0 L-5 0 M5 0 L16 0" strokeWidth="1.5" stroke="#6b7280" />
          <ellipse cx="0" cy="0" rx="5" ry="4" fill="#4b5563" stroke="none" opacity="0.7" /> {/* soot */}
        </>
      ) : (
        <line x1="-16" y1="0" x2="16" y2="0" strokeWidth="1.8" stroke={wire} />
      )}
    </g>
  )
}
