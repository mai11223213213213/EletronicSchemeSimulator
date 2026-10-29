interface Props {
  /** 0 (stopped) … 1 (full speed) */
  level?: number
  burned?: boolean
}

/**
 * A fan on a motor. The blades are a group turned by a CSS animation (`motor-spin`, see index.css);
 * the faster the motor, the shorter one revolution takes. `transform-origin: 0 0` is the centre of the part,
 * because everything in an element is drawn around (0,0).
 */
export function MotorElement({ level = 0, burned = false }: Props) {
  const spinning = !burned && level > 0.01
  const seconds = Math.min(4, 0.2 / level) // full speed ≈ 5 turns per second, 5 % ≈ 4 s per turn
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none">
      <line x1="-30" y1="0" x2="-16" y2="0" />
      <line x1="16" y1="0" x2="30" y2="0" />
      <circle r="16" fill="#ffffff" />
      <g
        stroke="none" fill={burned ? '#6b7280' : '#2563eb'}
        style={spinning ? { animation: `motor-spin ${seconds}s linear infinite`, transformOrigin: '0 0' } : undefined}
      >
        {[0, 120, 240].map((angle) => (
          <path key={angle} d="M0 0 C5 -3 6 -10 0 -12 C-6 -10 -5 -3 0 0 Z" transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle r="2.5" fill="#1f2937" stroke="none" />
    </g>
  )
}
