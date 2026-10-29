interface Props {
  /** 0 … 1: how much of its rated current flows (forward direction). Tints the triangle blue while it conducts. */
  level?: number
  burned?: boolean
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)

/** Anode (pin "a") on the left, cathode (pin "b") on the right: current flows the way the triangle points. */
export function DiodeElement({ level = 0, burned = false }: Props) {
  // sqrt: even a small current should visibly "switch the diode on"
  const t = Math.sqrt(Math.min(1, Math.max(0, level)))
  const fill = burned ? '#374151' : `rgb(${lerp(255, 96, t)}, ${lerp(255, 165, t)}, ${lerp(255, 250, t)})`
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinejoin="round">
      <line x1="-30" y1="0" x2="-10" y2="0" />
      <line x1="10" y1="0" x2="30" y2="0" />
      <path d="M-10 -11 L-10 11 L10 0 Z" fill={fill} />
      <line x1="10" y1="-11" x2="10" y2="11" />
      {burned && <path d="M-4 -4 L4 4 M-4 4 L4 -4" stroke="#9ca3af" strokeWidth="1.5" />}
    </g>
  )
}
