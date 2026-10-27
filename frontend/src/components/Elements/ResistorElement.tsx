// Symbol drawn around the component centre (0,0). Pins are at (-30,0) and (30,0).
export function ResistorElement() {
  return (
    <g stroke="#1f2937" strokeWidth="2.5" fill="none">
      <line x1="-30" y1="0" x2="-15" y2="0" />
      <line x1="15" y1="0" x2="30" y2="0" />
      <rect x="-15" y="-8" width="30" height="16" rx="2" fill="#ffffff" />
    </g>
  )
}
