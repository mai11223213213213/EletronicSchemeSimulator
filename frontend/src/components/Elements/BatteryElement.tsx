// Pins: "plus" at (-30,0), "minus" at (30,0). Long plate = plus.
export function BatteryElement({ rotation }: { rotation: number }) {
  // Counter-rotate the labels so + / - never end up upside down.
  const upright = (x: number, y: number) => `rotate(${-rotation} ${x} ${y})`
  return (
    <g stroke="#1f2937" fill="none">
      <line x1="-30" y1="0" x2="-6" y2="0" strokeWidth="2.5" />
      <line x1="6" y1="0" x2="30" y2="0" strokeWidth="2.5" />
      <line x1="-6" y1="-12" x2="-6" y2="12" strokeWidth="3" />
      <line x1="6" y1="-6" x2="6" y2="6" strokeWidth="5" />
      <g stroke="none" fill="#374151" fontSize="10" fontWeight="bold" textAnchor="middle">
        <text x="-14" y="-8" transform={upright(-14, -8)}>+</text>
        <text x="14" y="-8" transform={upright(14, -8)}>−</text>
      </g>
    </g>
  )
}
