import { HelpCircle } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { endpointPos, snapPoint } from '../model/geometry'
import { GRID, isComponentType } from '../model/registry'
import { routeOrthogonal, toPathData } from '../model/routing'
import type { CircuitElement, Point } from '../model/types'
import { useCircuitStore } from '../store/circuitStore'
import { ElementView } from './ElementView'
import { GridSettings } from './GridSettings'
import { PinLayer } from './PinLayer'
import { PropertiesPanel } from './PropertiesPanel'
import { WireLayer } from './WireLayer'

export function Canvas() {
  const elements = useCircuitStore((s) => s.elements)
  const wires = useCircuitStore((s) => s.wires)
  const junctions = useCircuitStore((s) => s.junctions)
  const selection = useCircuitStore((s) => s.selection)
  const draft = useCircuitStore((s) => s.draft)
  // Store actions are stable references, so selecting them never causes a re-render.
  const addElement = useCircuitStore((s) => s.addElement)
  const beginMove = useCircuitStore((s) => s.beginMove)
  const moveElement = useCircuitStore((s) => s.moveElement)
  const select = useCircuitStore((s) => s.select)
  const startWire = useCircuitStore((s) => s.startWire)
  const addBend = useCircuitStore((s) => s.addBend)
  const finishWire = useCircuitStore((s) => s.finishWire)
  const finishWireOnWire = useCircuitStore((s) => s.finishWireOnWire)
  const cancelWire = useCircuitStore((s) => s.cancelWire)
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch)

  const [cellPx, setCellPx] = useState(GRID)
  const [gridVisible, setGridVisible] = useState(true)
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 })

  const worldRef = useRef<SVGGElement>(null) // the <g> that carries the zoom transform
  const scale = cellPx / GRID
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)

  useKeyboardShortcuts()

  /** Screen position -> world units (what the model uses). Asks the browser, so zoom/scroll just work. */
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const m = worldRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }, [])

  // ---- dragging parts -------------------------------------------------------
  // Pointer events + pointer capture: after pointerdown the part keeps receiving pointermove/up
  // even when the cursor leaves it (or the window), so no global listeners are needed.
  const onElementPointerDown = (e: ReactPointerEvent<SVGGElement>, el: CircuitElement) => {
    e.stopPropagation()
    if (draft) return
    select({ kind: 'element', id: el.id })
    e.currentTarget.setPointerCapture(e.pointerId)
    const w = toWorld(e.clientX, e.clientY)
    drag.current = { id: el.id, dx: w.x - el.x, dy: w.y - el.y, moved: false }
  }
  const onElementPointerMove = (e: ReactPointerEvent<SVGGElement>, el: CircuitElement) => {
    const d = drag.current
    if (!d || d.id !== el.id) return
    const w = toWorld(e.clientX, e.clientY)
    const p = snapPoint({ x: w.x - d.dx, y: w.y - d.dy })
    if (el.x === p.x && el.y === p.y) return
    if (!d.moved) { beginMove(); d.moved = true } // one undo step per drag
    moveElement(d.id, p.x, p.y)
  }
  const onElementPointerUp = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    drag.current = null
  }

  // ---- drop from the sidebar -----------------------------------------------
  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/plain')
    if (!isComponentType(type)) return
    const p = snapPoint(toWorld(e.clientX, e.clientY))
    addElement(type, p.x, p.y)
  }

  // ---- wiring ---------------------------------------------------------------
  const onPinClick = (e: ReactMouseEvent, elementId: string, pinId: string) => {
    e.stopPropagation()
    const ep = { kind: 'pin', elementId, pinId } as const
    if (draft) finishWire(ep)
    else startWire(ep)
  }
  const onJunctionClick = (e: ReactMouseEvent, junctionId: string) => {
    e.stopPropagation()
    const ep = { kind: 'junction', junctionId } as const
    if (draft) finishWire(ep)
    else startWire(ep)
  }
  const onWireClick = (e: ReactMouseEvent, wireId: string) => {
    e.stopPropagation()
    if (draft) finishWireOnWire(wireId, toWorld(e.clientX, e.clientY))
    else select({ kind: 'wire', id: wireId })
  }
  const onBackgroundClick = (e: ReactMouseEvent) => {
    if (draft) addBend(snapPoint(toWorld(e.clientX, e.clientY)))
    else select(null)
  }

  // live preview of the wire being drawn
  const start = draft ? endpointPos(draft.from, elements, junctions) : null
  const previewD = draft && start
    ? toPathData(routeOrthogonal(start, draft.bends, cursor, start.axis, null))
    : null

  const cell = cellPx
  return (
    <div
      className="relative h-full flex-1 select-none overflow-hidden bg-slate-50"
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
    >
      <svg
        className={`absolute inset-0 h-full w-full touch-none ${draft ? 'cursor-crosshair' : ''}`}
        onClick={onBackgroundClick}
        onPointerMove={(e) => draft && setCursor(snapPoint(toWorld(e.clientX, e.clientY)))}
        onContextMenu={(e) => { if (draft) { e.preventDefault(); cancelWire() } }}
      >
        <defs>
          {/* shifted by half a cell so the dot sits in the tile centre (no clipping) yet lands on grid points */}
          <pattern id="grid" width={cell} height={cell} x={-cell / 2} y={-cell / 2} patternUnits="userSpaceOnUse">
            <circle cx={cell / 2} cy={cell / 2} r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        {gridVisible && <rect width="100%" height="100%" fill="url(#grid)" />}

        {/* everything below lives in world units; zoom = scale */}
        <g ref={worldRef} transform={`scale(${scale})`}>
          <WireLayer
            data={{ elements, wires, junctions }}
            selection={selection}
            onWireClick={onWireClick}
            onJunctionClick={onJunctionClick}
          />
          {elements.map((el) => (
            <ElementView
              key={el.id}
              element={el}
              selected={selection?.kind === 'element' && selection.id === el.id}
              onPointerDown={onElementPointerDown}
              onPointerMove={onElementPointerMove}
              onPointerUp={onElementPointerUp}
              onToggle={(x) => toggleSwitch(x.id)}
            />
          ))}
          <PinLayer data={{ elements, wires, junctions }} drawing={!!draft} onPinClick={onPinClick} />
          {previewD && (
            <path d={previewD} stroke="#2563eb" strokeWidth="2" strokeDasharray="5 4" fill="none" pointerEvents="none" />
          )}
        </g>
      </svg>

      <div className="group absolute right-4 top-3 z-30" onClick={(e) => e.stopPropagation()}>
        <button
          type="button" title="Controls" aria-label="Show controls hint"
          className="rounded-full bg-white/90 p-1.5 text-gray-500 shadow hover:text-blue-600 focus:text-blue-600"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="pointer-events-none absolute right-full top-0 mr-2 hidden w-64 rounded-md bg-white px-3 py-2 text-xs text-gray-600 shadow-lg group-focus-within:block group-hover:block">
          {draft
            ? 'Click canvas — add bend · click pin/wire — finish · Esc — cancel'
            : 'Click pin — new wire · R — rotate · Del — delete · Ctrl+Z — undo'}
        </div>
      </div>

      <PropertiesPanel />
      <GridSettings cellPx={cellPx} visible={gridVisible} onCellPx={setCellPx} onVisible={setGridVisible} />
    </div>
  )
}
