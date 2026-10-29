import type { MouseEvent as ReactMouseEvent } from 'react'
import { wirePath } from '../model/wires'
import { toPathData } from '../model/routing'
import type { CircuitData, Point, Selection } from '../model/types'

const WIRE = '#2563eb'

interface Props {
  data: CircuitData
  selection: Selection | null
  onWireClick: (e: ReactMouseEvent, wireId: string) => void
  onJunctionClick: (e: ReactMouseEvent, junctionId: string) => void
}

/** All finished wires (orthogonal paths) and their junction dots. */
export function WireLayer({ data, selection, onWireClick, onJunctionClick }: Props) {
  // Like a drawn schematic: a dot only where 3+ wires meet (2 wires is just a bend).
  const degree = new Map<string, number>()
  for (const w of data.wires)
    for (const e of [w.from, w.to])
      if (e.kind === 'junction') degree.set(e.junctionId, (degree.get(e.junctionId) ?? 0) + 1)

  return (
    <g>
      {data.wires.map((w) => {
        const pts: Point[] | null = wirePath(w, data)
        if (!pts) return null
        const d = toPathData(pts)
        const selected = selection?.kind === 'wire' && selection.id === w.id
        return (
          <g key={w.id}>
            {selected && <path d={d} stroke="#93c5fd" strokeWidth="7" fill="none" strokeLinejoin="round" />}
            <path d={d} stroke={WIRE} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {/* wide invisible stroke = easy to click */}
            <path
              d={d} stroke="transparent" strokeWidth="10" fill="none"
              className="cursor-pointer" onClick={(e) => onWireClick(e, w.id)}
            />
          </g>
        )
      })}
      {data.junctions.filter((j) => (degree.get(j.id) ?? 0) >= 3).map((j) => (
        <g key={j.id} className="cursor-pointer" onClick={(e) => onJunctionClick(e, j.id)}>
          <circle cx={j.x} cy={j.y} r="8" fill="transparent" />
          <circle cx={j.x} cy={j.y} r="4" fill={WIRE} />
        </g>
      ))}
    </g>
  )
}
