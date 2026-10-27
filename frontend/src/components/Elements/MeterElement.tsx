interface Props {
  letter: 'A' | 'V'
  rotation: number
}

/** Circle with a letter: A = ammeter (wire it in series), V = voltmeter (wire it across a part). */
export function MeterElement({ letter, rotation }: Props) {
  const color = letter === 'A' ? '#2563eb' : '#dc2626'
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5">
      <line x1="-30" y1="0" x2="-14" y2="0" />
      <line x1="14" y1="0" x2="30" y2="0" />
      <circle cx="0" cy="0" r="14" fill="#ffffff" />
      {/* counter-rotate so the letter never ends up sideways */}
      <text
        x="0" y="0" transform={`rotate(${-rotation})`} stroke="none" fill={color}
        fontSize="16" fontWeight="bold" textAnchor="middle" dominantBaseline="central"
      >
        {letter}
      </text>
    </g>
  )
}
