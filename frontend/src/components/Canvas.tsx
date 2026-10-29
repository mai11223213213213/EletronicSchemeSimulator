import { HelpCircle } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type {
  DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent,
} from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { endpointPos, snapPoint } from '../model/geometry'
import { GRID, isComponentType } from '../model/registry'
import { nearestOnPath, routeWire, toPathData } from '../model/routing'
import { wirePath } from '../model/wires'
import type { CircuitElement, Point } from '../model/types'
import { useCircuitStore } from '../store/circuitStore'
import { ElementView } from './ElementView'
import { GridSettings } from './GridSettings'
import { PinLayer } from './PinLayer'
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
  const moveBend = useCircuitStore((s) => s.moveBend)
  const insertBend = useCircuitStore((s) => s.insertBend)
  const removeBend = useCircuitStore((s) => s.removeBend)
  const pruneDeadBends = useCircuitStore((s) => s.pruneDeadBends)
  const diagonalWires = useCircuitStore((s) => s.diagonalWires)

  const [cellPx, setCellPx] = useState(GRID)
  const [gridVisible, setGridVisible] = useState(true)
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 }) // how far the world is shifted, in screen pixels
  const [panning, setPanning] = useState(false)

  const worldRef = useRef<SVGGElement>(null) // the <g> that carries the pan + zoom transform
  const scale = cellPx / GRID
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  // Pan gesture: remembers where the pointer and the pan were when the button went down.
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number; active: boolean } | null>(null)
  const justPanned = useRef(false) // true after a pan, so the click that ends it is not treated as "click on empty canvas"

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
    if (drag.current?.moved) pruneDeadBends() // wires of the moved part may have collapsed bends
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
  // ---- editing the bends ("nodes") of the selected wire -------------------------
  // Same recipe as dragging a part: pointer capture on the handle, snap to the grid, one undo step per drag.
  const bendDrag = useRef<{ moved: boolean } | null>(null)
  // the handle being dragged stays visible even if, for a moment, the wire does not pass through it
  const [activeBend, setActiveBend] = useState<{ wireId: string; index: number } | null>(null)
  const onBendPointerDown = (e: ReactPointerEvent<SVGCircleElement>, wireId: string, index: number) => {
    e.stopPropagation() // so the canvas does not start panning
    e.currentTarget.setPointerCapture(e.pointerId)
    bendDrag.current = { moved: false }
    setActiveBend({ wireId, index })
  }
  const onBendPointerMove = (e: ReactPointerEvent<SVGCircleElement>, wireId: string, index: number) => {
    const d = bendDrag.current
    if (!d) return
    const p = snapPoint(toWorld(e.clientX, e.clientY))
    const current = wires.find((w) => w.id === wireId)?.bends[index]
    if (!current || (current.x === p.x && current.y === p.y)) return
    if (!d.moved) { beginMove(); d.moved = true } // saves the undo snapshot once, at the first real movement
    moveBend(wireId, index, p)
  }
  const onBendPointerUp = (e: ReactPointerEvent<SVGCircleElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (bendDrag.current?.moved) pruneDeadBends()
    bendDrag.current = null
    setActiveBend(null)
  }
  /**
   * Double-click on a diagonal wire adds a bend where you clicked. A diagonal wire's drawn path is exactly
   * [start, ...bends, end], so the segment you hit (hit.segment) is also the position the new bend must take in `bends`.
   * (An orthogonal wire's path contains computed elbows, so this index trick would not hold there.)
   */
  const onWireDoubleClick = (e: ReactMouseEvent, wireId: string) => {
    e.stopPropagation()
    const wire = wires.find((w) => w.id === wireId)
    if (!wire?.diagonal) return
    const path = wirePath(wire, { elements, junctions })
    const hit = path && nearestOnPath(path, toWorld(e.clientX, e.clientY))
    if (hit) insertBend(wireId, hit.segment, snapPoint(hit.point))
  }

  const onWireClick = (e: ReactMouseEvent, wireId: string) => {
    e.stopPropagation()
    if (draft) finishWireOnWire(wireId, toWorld(e.clientX, e.clientY))
    else select({ kind: 'wire', id: wireId })
  }
  const onBackgroundClick = (e: ReactMouseEvent) => {
    if (justPanned.current) { justPanned.current = false; return } // the click that ended a pan does nothing
    if (draft) addBend(snapPoint(toWorld(e.clientX, e.clientY)))
    else select(null)
  }

  // ---- panning ----------------------------------------------------------------
  // Drag empty canvas (left or middle button, or a finger) to move the view; the mouse wheel pans too.
  // Pointer capture is only taken once the pointer has moved a few pixels. Capturing at pointerdown would
  // redirect the following click to the <svg> and break clicks on pins and wires.
  const PAN_THRESHOLD = 4
  const onSvgPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    justPanned.current = false
    if (e.button !== 0 && e.button !== 1) return
    panDrag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, active: false }
  }
  const onSvgPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = panDrag.current
    if (d) {
      if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) > PAN_THRESHOLD) {
        d.active = true
        justPanned.current = true
        setPanning(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      if (d.active) setPan({ x: d.panX + e.clientX - d.x, y: d.panY + e.clientY - d.y })
    }
    if (draft) setCursor(snapPoint(toWorld(e.clientX, e.clientY)))
  }
  const onSvgPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    panDrag.current = null
    setPanning(false)
  }
  const onSvgWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    const dx = e.shiftKey ? e.deltaY : e.deltaX // Shift + wheel = sideways
    const dy = e.shiftKey ? 0 : e.deltaY
    setPan((p) => ({ x: p.x - dx, y: p.y - dy }))
  }

  // live preview of the wire being drawn
  const start = draft ? endpointPos(draft.from, elements, junctions) : null
  const previewD = draft && start
    ? toPathData(routeWire(start, draft.bends, cursor, start.axis, null, diagonalWires))
    : null

  const cell = cellPx
  return (
    <div
      className="relative h-full flex-1 select-none overflow-hidden bg-slate-50"
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
    >
      <svg
        className={`absolute inset-0 h-full w-full touch-none ${panning ? 'cursor-grabbing' : draft ? 'cursor-crosshair' : ''}`}
        onClick={onBackgroundClick}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
        onWheel={onSvgWheel}
        onContextMenu={(e) => { if (draft) { e.preventDefault(); cancelWire() } }}
      >
        <defs>
          {/* shifted by half a cell so the dot sits in the tile centre (no clipping) yet lands on grid points;
              plus the pan, so the dots move together with the schematic */}
          <pattern id="grid" width={cell} height={cell} x={pan.x - cell / 2} y={pan.y - cell / 2} patternUnits="userSpaceOnUse">
            <circle cx={cell / 2} cy={cell / 2} r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        {gridVisible && <rect width="100%" height="100%" fill="url(#grid)" />}

        {/* everything below lives in world units. SVG applies the list right to left: first zoom (scale), then shift (pan) */}
        <g ref={worldRef} transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          <WireLayer
            data={{ elements, wires, junctions }}
            selection={selection}
            onWireClick={onWireClick}
            onWireDoubleClick={onWireDoubleClick}
            onJunctionClick={onJunctionClick}
            onBendPointerDown={onBendPointerDown}
            onBendPointerMove={onBendPointerMove}
            onBendPointerUp={onBendPointerUp}
            onBendRemove={removeBend}
            activeBend={activeBend}
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
          <PinLayer data={{ elements, wires, junctions }} drawing={!!draft} scale={scale} onPinClick={onPinClick} />
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
            ? 'Click canvas — add bend · click pin/wire — finish · D — diagonal/straight · Esc — cancel'
            : 'Click pin — new wire · Drag canvas / wheel — pan · R — rotate · Del — delete · Ctrl+Z — undo'}
        </div>
      </div>

      <GridSettings
        cellPx={cellPx} visible={gridVisible} onCellPx={setCellPx} onVisible={setGridVisible}
        onResetView={() => setPan({ x: 0, y: 0 })}
      />
    </div>
  )
}
