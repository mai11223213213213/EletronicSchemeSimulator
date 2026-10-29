interface Props {
  rotation: number
}

/** A circle with a sine wave inside: the symbol of an alternating voltage source. Pins: "plus" left, "minus" right. */
export function AcSourceElement({ rotation }: Props) {
  // Counter-rotate the "+" so it never ends up upside down (same trick as the battery).
  const upright = (x: number, y: number) => `rotate(${-rotation} ${x} ${y})`
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5">
      <line x1="-30" y1="0" x2="-15" y2="0" />
      <line x1="15" y1="0" x2="30" y2="0" />
      <circle r="15" fill="#ffffff" />
      {/* one period of a sine: "C" draws the hump up, "S" continues it smoothly as the hump down */}
      <path d="M-9 0 C-6 -10 -3 -10 0 0 S6 10 9 0" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
      <g stroke="none" fill="#374151" fontSize="9" fontWeight="bold" textAnchor="middle">
        <text x="-21" y="-6" transform={upright(-21, -6)}>+</text>
      </g>
    </g>
  )
}
