// Symbol drawn around the component centre (0,0). Pins are at (-30,0) and (30,0).
interface Props {
  /** Temperature relative to its rating: 0 = cold, 1 = running at rated power. */
  heat?: number
  burned?: boolean
}

// white -> orange as the part heats up
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)

export function ResistorElement({ heat = 0, burned = false }: Props) {
  const t = Math.min(1, Math.max(0, heat))
  const fill = burned ? '#374151' : `rgb(${lerp(255, 249, t)}, ${lerp(255, 115, t)}, ${lerp(255, 22, t)})`
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none">
      <line x1="-30" y1="0" x2="-15" y2="0" />
      <line x1="15" y1="0" x2="30" y2="0" />
      <rect x="-15" y="-8" width="30" height="16" rx="2" fill={fill} />
      {burned && <path d="M-6 -3 L6 3 M-6 3 L6 -3" stroke="#9ca3af" strokeWidth="1.5" />}
    </g>
  )
}
