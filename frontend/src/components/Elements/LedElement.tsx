import { useId } from 'react'

interface Props {
  /** Colour of the light: 0 red, 60 yellow, 120 green, 220 blue (CSS hue angle). */
  hue?: number
  /** 0 (dark) … 1 (rated current or more). */
  level?: number
  burned?: boolean
}

/** Light-emitting diode: a diode symbol in a circle with two arrows. Lights up in its own colour. */
export function LedElement({ hue = 0, level = 0, burned = false }: Props) {
  const glowId = `led-glow-${useId().replace(/[^\w-]/g, '')}` // one gradient per LED: its colour differs
  const glow = burned ? 0 : Math.sqrt(Math.min(1, Math.max(0, level)))
  const color = `hsl(${hue}, 100%, 50%)`
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5" strokeLinejoin="round">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={`hsl(${hue}, 100%, 60%)`} stopOpacity="0.95" />
          <stop offset="45%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="-30" y1="0" x2="-16" y2="0" />
      <line x1="16" y1="0" x2="30" y2="0" />
      {glow > 0 && <circle r={16 + glow * 24} fill={`url(#${glowId})`} stroke="none" opacity={glow} pointerEvents="none" />}
      <circle r="16" fill={glow > 0 ? `hsla(${hue}, 100%, 60%, ${0.25 + 0.75 * glow})` : '#ffffff'} />
      <path d="M-7 -9 L-7 9 L7 0 Z" fill={burned ? '#374151' : 'none'} />
      <line x1="7" y1="-9" x2="7" y2="9" />
      {burned ? (
        <path d="M-3 -3 L3 3 M-3 3 L3 -3" stroke="#9ca3af" strokeWidth="1.5" />
      ) : (
        // two small arrows leaving the LED: the light
        <g stroke={glow > 0 ? color : '#6b7280'} strokeWidth="2">
          <path d="M3 -13 L11 -21 M7 -21 L11 -21 L11 -17" />
          <path d="M9 -9 L17 -17 M13 -17 L17 -17 L17 -13" />
        </g>
      )}
    </g>
  )
}
