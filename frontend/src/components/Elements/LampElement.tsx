interface Props {
  /** 0 (dark) … 1 (full brightness), from the simulation. */
  brightness?: number
  burned?: boolean
}

export function LampElement({ brightness = 0, burned = false }: Props) {
  // Eyes see brightness roughly on a square-root scale: a lamp at 10 % power still looks clearly lit.
  const glow = Math.sqrt(brightness)
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5">
      <defs>
        {/* same definition in every lamp, so sharing the id is harmless */}
        <radialGradient id="lamp-glow">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#facc15" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="-30" y1="0" x2="-14" y2="0" />
      <line x1="14" y1="0" x2="30" y2="0" />
      {glow > 0 && (
        <circle r={14 + glow * 26} fill="url(#lamp-glow)" stroke="none" opacity={glow} pointerEvents="none" />
      )}
      <circle cx="0" cy="0" r="14" fill={glow > 0 ? `rgba(253, 224, 71, ${0.35 + 0.65 * glow})` : '#ffffff'} />
      {burned ? (
        // broken filament: one half of the cross is gone, the other is dark and cracked
        <>
          <line x1="-10" y1="-10" x2="-2" y2="-2" strokeWidth="2" stroke="#6b7280" />
          <line x1="10" y1="-10" x2="2" y2="-2" strokeWidth="2" stroke="#6b7280" />
        </>
      ) : (
        <>
          <line x1="-10" y1="-10" x2="10" y2="10" strokeWidth="2" />
          <line x1="10" y1="-10" x2="-10" y2="10" strokeWidth="2" />
        </>
      )}
    </g>
  )
}
