import { rotatePoint } from '../model/geometry'
import { REGISTRY } from '../model/registry'
import type { CircuitElement } from '../model/types'
import { BatteryElement } from './Elements/BatteryElement'
import { LampElement } from './Elements/LampElement'
import { ResistorElement } from './Elements/ResistorElement'
import { SwitchElement } from './Elements/SwitchElement'

interface Props {
  element: CircuitElement
  selected: boolean
  onMouseDown: (e: React.MouseEvent, el: CircuitElement) => void
  onToggle: (el: CircuitElement) => void
}

/** One placed component. Rotation is around its centre because the symbol is drawn around (0,0). */
export function ElementView({ element: el, selected, onMouseDown, onToggle }: Props) {
  const def = REGISTRY[el.type]
  const text = def.format(el.props)

  // The value label sits on the "top" side of the part and follows it when rotated,
  // but the text itself always stays horizontal and readable.
  const at = rotatePoint({ x: 0, y: -(def.halfH + 3) }, el.rotation)
  const anchor = at.x > 0 ? 'start' : at.x < 0 ? 'end' : 'middle'
  const baseline = at.y > 0 ? 'hanging' : at.y < 0 ? 'auto' : 'middle'

  return (
    <g transform={`translate(${el.x} ${el.y})`}>
      <g
        transform={`rotate(${el.rotation})`}
        className="cursor-move"
        onMouseDown={(e) => onMouseDown(e, el)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={() => onToggle(el)}
      >
        {/* invisible body so the whole part is easy to grab */}
        <rect x={-def.halfW} y={-def.halfH} width={def.halfW * 2} height={def.halfH * 2} fill="transparent" />
        {selected && (
          <rect
            x={-def.halfW} y={-def.halfH} width={def.halfW * 2} height={def.halfH * 2}
            fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" rx="4"
          />
        )}
        {el.type === 'resistor' && <ResistorElement />}
        {el.type === 'battery' && <BatteryElement rotation={el.rotation} />}
        {el.type === 'lamp' && <LampElement />}
        {el.type === 'switch' && <SwitchElement closed={el.props.closed === true} />}
      </g>
      {text && (
        <text
          x={at.x} y={at.y} fontSize="9" fill="#475569"
          textAnchor={anchor} dominantBaseline={baseline} pointerEvents="none"
        >
          {text}
        </text>
      )}
    </g>
  )
}
