interface Props {
  /** 0 … 1: strength of the magnetic field, which grows with the current. */
  level?: number
}

/** Four loops of wire. A soft blue halo around it shows the magnetic field while current flows. */
export function InductorElement({ level = 0 }: Props) {
  const t = Math.min(1, Math.max(0, level))
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <line x1="-30" y1="0" x2="-16" y2="0" />
      <line x1="16" y1="0" x2="30" y2="0" />
      {t > 0 && <ellipse rx={24} ry={8 + t * 10} cy="-2" fill="#60a5fa" stroke="none" opacity={t * 0.4} pointerEvents="none" />}
      {/* each "a 4 4 0 0 1 8 0" is one half-circle hump, drawn left to right */}
      <path d="M-16 0 a4 4 0 0 1 8 0 a4 4 0 0 1 8 0 a4 4 0 0 1 8 0 a4 4 0 0 1 8 0" />
    </g>
  )
}
