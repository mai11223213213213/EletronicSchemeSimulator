import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { wirePath } from '../model/wires'
import { toPathData } from '../model/routing'
import type { CircuitData, Point, Selection } from '../model/types'

const WIRE = '#2563eb'

interface Props {
  data: CircuitData
  selection: Selection | null
  onWireClick: (e: ReactMouseEvent, wireId: string) => void
  onWireDoubleClick: (e: ReactMouseEvent, wireId: string) => void
  onJunctionClick: (e: ReactMouseEvent, junctionId: string) => void
  /** Dragging a bend handle of the selected wire (index = position in wire.bends). */
  onBendPointerDown: (e: ReactPointerEvent<SVGCircleElement>, wireId: string, index: number) => void
  onBendPointerMove: (e: ReactPointerEvent<SVGCircleElement>, wireId: string, index: number) => void
  onBendPointerUp: (e: ReactPointerEvent<SVGCircleElement>) => void
  onBendRemove: (wireId: string, index: number) => void
}

/** All finished wires (orthogonal or diagonal paths), their junction dots, and the bend handles of the selected wire. */
export function WireLayer({
  data, selection, onWireClick, onWireDoubleClick, onJunctionClick,
  onBendPointerDown, onBendPointerMove, onBendPointerUp, onBendRemove,
}: Props) {
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
              onDoubleClick={(e) => onWireDoubleClick(e, w.id)}
            />
            {/* the "nodes": one handle per stored bend; drag to move, double-click to delete */}
            {selected && w.bends.map((b, i) => (
              <circle
                key={i} cx={b.x} cy={b.y} r="5" fill="#ffffff" stroke={WIRE} strokeWidth="2" className="cursor-move"
                onPointerDown={(e) => onBendPointerDown(e, w.id, i)}
                onPointerMove={(e) => onBendPointerMove(e, w.id, i)}
                onPointerUp={onBendPointerUp}
                onPointerCancel={onBendPointerUp}
                onClick={(e) => e.stopPropagation()} // otherwise the click that ends a drag would deselect the wire
                onDoubleClick={(e) => { e.stopPropagation(); onBendRemove(w.id, i) }}
              />
            ))}
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
