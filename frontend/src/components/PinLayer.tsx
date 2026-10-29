import type { MouseEvent as ReactMouseEvent } from 'react'
import { elementPins } from '../model/geometry'
import type { CircuitData } from '../model/types'

interface Props {
  data: CircuitData
  drawing: boolean
  /** Current zoom (screen px per world unit), so the click area can keep a constant size on screen. */
  scale: number
  onPinClick: (e: ReactMouseEvent, elementId: string, pinId: string) => void
}

/** Radius of the invisible click area around a pin, in SCREEN pixels. The visible ring is only 3–4.5 px. */
const HIT_RADIUS_PX = 14

/** Clickable connection points. Rings show where a wire can start or end. */
export function PinLayer({ data, drawing, scale, onPinClick }: Props) {
  // This layer sits inside the zoomed group, so a radius in world units shrinks when zooming out.
  // Dividing by the zoom gives the same on-screen size at every zoom level.
  const hitRadius = HIT_RADIUS_PX / scale
  // how many wire ends touch each pin
  const wiresAt = new Map<string, number>()
  for (const w of data.wires)
    for (const e of [w.from, w.to])
      if (e.kind === 'pin') {
        const key = `${e.elementId}:${e.pinId}`
        wiresAt.set(key, (wiresAt.get(key) ?? 0) + 1)
      }

  return (
    <g>
      {data.elements.flatMap((el) =>
        elementPins(el).map(({ pin, x, y }) => {
          const count = wiresAt.get(`${el.id}:${pin.id}`) ?? 0
          return (
            <g key={`${el.id}:${pin.id}`} className="cursor-crosshair group" onClick={(e) => onPinClick(e, el.id, pin.id)}>
              <circle cx={x} cy={y} r={hitRadius} fill="transparent" />
              {count === 0 && (
                <circle
                  cx={x} cy={y} r={drawing ? 4.5 : 3}
                  className={drawing ? 'fill-blue-100 stroke-blue-500' : 'fill-white stroke-slate-500 group-hover:stroke-blue-500'}
                  strokeWidth="1.5"
                />
              )}
              {count >= 1 && (
                <circle cx={x} cy={y} r="4" className="fill-transparent stroke-transparent group-hover:stroke-blue-500" strokeWidth="1.5" />
              )}
              {/* two or more wires on one pin = a real junction, so draw the dot */}
              {count >= 2 && <circle cx={x} cy={y} r="4" fill="#2563eb" pointerEvents="none" />}
            </g>
          )
        }),
      )}
    </g>
  )
}
