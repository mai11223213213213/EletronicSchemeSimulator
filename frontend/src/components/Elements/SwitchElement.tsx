export function SwitchElement({ closed }: { closed: boolean }) {
  return (
    <g stroke="#1f2937" fill="none" strokeWidth="2.5" strokeLinecap="round">
      <line x1="-30" y1="0" x2="-15" y2="0" />
      <line x1="15" y1="0" x2="30" y2="0" />
      <circle cx="-15" cy="0" r="3" fill="#1f2937" />
      <circle cx="15" cy="0" r="3" fill="#1f2937" />
      {/* moving contact: lies on the wire when closed, raised when open */}
      <line x1="-15" y1="0" x2={closed ? 15 : 11} y2={closed ? 0 : -12} />
    </g>
  )
}
