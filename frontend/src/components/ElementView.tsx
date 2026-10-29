import type { PointerEvent as ReactPointerEvent } from 'react'
import { rotatePoint } from '../model/geometry'
import { REGISTRY } from '../model/registry'
import { AMBIENT, RESISTOR_HOT } from '../model/solver'
import type { CircuitElement } from '../model/types'
import { formatSI } from '../model/units'
import { useSimStore } from '../store/simStore'
import { BatteryElement } from './Elements/BatteryElement'
import { LampElement } from './Elements/LampElement'
import { MeterElement } from './Elements/MeterElement'
import { ResistorElement } from './Elements/ResistorElement'
import { SwitchElement } from './Elements/SwitchElement'

interface Props {
  element: CircuitElement
  selected: boolean
  onPointerDown: (e: ReactPointerEvent<SVGGElement>, el: CircuitElement) => void
  onPointerMove: (e: ReactPointerEvent<SVGGElement>, el: CircuitElement) => void
  onPointerUp: (e: ReactPointerEvent<SVGGElement>) => void
  onToggle: (el: CircuitElement) => void
}

/** One placed component. Rotation is around its centre because the symbol is drawn around (0,0). */
export function ElementView({ element: el, selected, onPointerDown, onPointerMove, onPointerUp, onToggle }: Props) {
  const def = REGISTRY[el.type]
  // Live numbers from the simulation (undefined while it is not running) and "this part breaks the circuit" marker.
  const sim = useSimStore((s) => s.result?.elements[el.id])
  const problem = useSimStore((s) => s.problems.some((p) => p.elementId === el.id))
  const burned = sim?.status === 'burned'

  // A meter's label is its reading while the simulation runs.
  let text = def.format(el.props)
  if (sim && el.type === 'ammeter') text = formatSI(sim.I, 'A')
  if (sim && el.type === 'voltmeter') text = formatSI(sim.U, 'V')

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
        onPointerDown={(e) => onPointerDown(e, el)}
        onPointerMove={(e) => onPointerMove(e, el)}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
        {problem && (
          <rect
            x={-def.halfW - 3} y={-def.halfH - 3} width={def.halfW * 2 + 6} height={def.halfH * 2 + 6}
            fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4" rx="5"
          />
        )}
        {el.type === 'resistor' && (
          <ResistorElement heat={sim ? (sim.T - AMBIENT) / (RESISTOR_HOT - AMBIENT) : 0} burned={burned} />
        )}
        {el.type === 'battery' && <BatteryElement rotation={el.rotation} />}
        {el.type === 'lamp' && <LampElement brightness={sim?.brightness} burned={burned} />}
        {el.type === 'switch' && <SwitchElement closed={el.props.closed === true} />}
        {el.type === 'ammeter' && <MeterElement letter="A" rotation={el.rotation} />}
        {el.type === 'voltmeter' && <MeterElement letter="V" rotation={el.rotation} />}
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
