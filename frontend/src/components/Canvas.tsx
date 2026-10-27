import { HelpCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const st = useCircuitStore.getState // actions are stable; always read fresh state through this

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
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const w = toWorld(e.clientX, e.clientY)
      const p = snapPoint({ x: w.x - d.dx, y: w.y - d.dy })
      const el = st().elements.find((x) => x.id === d.id)
      if (!el || (el.x === p.x && el.y === p.y)) return
      if (!d.moved) { st().beginMove(); d.moved = true } // one undo step per drag
      st().moveElement(d.id, p.x, p.y)
    }
    const onUp = () => { drag.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [st, toWorld])

  const onElementMouseDown = (e: React.MouseEvent, el: CircuitElement) => {
    e.stopPropagation()
    if (st().draft) return
    st().select({ kind: 'element', id: el.id })
    const w = toWorld(e.clientX, e.clientY)
    drag.current = { id: el.id, dx: w.x - el.x, dy: w.y - el.y, moved: false }
  }

  // ---- drop from the sidebar -----------------------------------------------
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/plain')
    if (!isComponentType(type)) return
    const p = snapPoint(toWorld(e.clientX, e.clientY))
    st().addElement(type, p.x, p.y)
  }

  // ---- wiring ---------------------------------------------------------------
  const onPinClick = (e: React.MouseEvent, elementId: string, pinId: string) => {
    e.stopPropagation()
    const ep = { kind: 'pin', elementId, pinId } as const
    if (st().draft) st().finishWire(ep)
    else st().startWire(ep)
  }
  const onJunctionClick = (e: React.MouseEvent, junctionId: string) => {
    e.stopPropagation()
    const ep = { kind: 'junction', junctionId } as const
    if (st().draft) st().finishWire(ep)
    else st().startWire(ep)
  }
  const onWireClick = (e: React.MouseEvent, wireId: string) => {
    e.stopPropagation()
    if (st().draft) st().finishWireOnWire(wireId, toWorld(e.clientX, e.clientY))
    else st().select({ kind: 'wire', id: wireId })
  }
  const onBackgroundClick = (e: React.MouseEvent) => {
    if (st().draft) st().addBend(snapPoint(toWorld(e.clientX, e.clientY)))
    else st().select(null)
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
        className={`absolute inset-0 h-full w-full ${draft ? 'cursor-crosshair' : ''}`}
        onClick={onBackgroundClick}
        onMouseMove={(e) => draft && setCursor(snapPoint(toWorld(e.clientX, e.clientY)))}
        onContextMenu={(e) => { if (draft) { e.preventDefault(); st().cancelWire() } }}
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
              onMouseDown={onElementMouseDown}
              onToggle={(x) => st().toggleSwitch(x.id)}
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
