import { HelpCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { endpointPos, snapPoint } from "../model/geometry";
import { GRID, isComponentType } from "../model/registry";
import { nearestOnPath, routeWire, toPathData } from "../model/routing";
import { wirePath } from "../model/wires";
import type { CircuitElement, ComponentType, Point } from "../model/types";
import { useCircuitStore } from "../store/circuitStore";
import { ElementView } from "./ElementView";
import { GridSettings, MAX_CELL, MIN_CELL } from "./GridSettings";
import { PinLayer } from "./PinLayer";
import { WireLayer } from "./WireLayer";

interface CanvasProps {
  selectedComponent: ComponentType | null;
  onComponentPlaced: () => void;
}

export function Canvas({ selectedComponent, onComponentPlaced }: CanvasProps) {
  const elements = useCircuitStore((s) => s.elements);
  const wires = useCircuitStore((s) => s.wires);
  const junctions = useCircuitStore((s) => s.junctions);
  const selection = useCircuitStore((s) => s.selection);
  const draft = useCircuitStore((s) => s.draft);
  const justPanned = useRef(false);
  // Active touch pointers used for pinch-to-zoom.
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());

  const pinch = useRef<{
    startDistance: number;
    startCellPx: number;
    worldPoint: Point;
  } | null>(null);

  // Store actions are stable references, so selecting them never causes a re-render.
  const addElement = useCircuitStore((s) => s.addElement);
  const beginMove = useCircuitStore((s) => s.beginMove);
  const moveElement = useCircuitStore((s) => s.moveElement);
  const select = useCircuitStore((s) => s.select);
  const startWire = useCircuitStore((s) => s.startWire);
  const addBend = useCircuitStore((s) => s.addBend);
  const finishWire = useCircuitStore((s) => s.finishWire);
  const finishWireOnWire = useCircuitStore((s) => s.finishWireOnWire);
  const cancelWire = useCircuitStore((s) => s.cancelWire);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const moveBend = useCircuitStore((s) => s.moveBend);
  const setWireBends = useCircuitStore((s) => s.setWireBends);
  const insertBend = useCircuitStore((s) => s.insertBend);
  const removeBend = useCircuitStore((s) => s.removeBend);
  const pruneDeadBends = useCircuitStore((s) => s.pruneDeadBends);
  const diagonalWires = useCircuitStore((s) => s.diagonalWires);

  const [cellPx, setCellPx] = useState(GRID);
  const [gridVisible, setGridVisible] = useState(true);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const worldRef = useRef<SVGGElement>(null);
  const scale = cellPx / GRID;

  const drag = useRef<{
    id: string;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);

  // Pan gesture: remembers where the pointer and the pan were when the button went down.
  const panDrag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    active: boolean;
  } | null>(null);

  useKeyboardShortcuts();

  /** Screen position -> world units. */
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const m = worldRef.current?.getScreenCTM();

    if (!m) return { x: 0, y: 0 };

    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());

    return { x: p.x, y: p.y };
  }, []);

  // ---- dragging parts -------------------------------------------------------

  const onElementPointerDown = (
    e: ReactPointerEvent<SVGGElement>,
    el: CircuitElement,
  ) => {
    e.stopPropagation();

    if (draft) return;

    select({ kind: "element", id: el.id });
    e.currentTarget.setPointerCapture(e.pointerId);

    const w = toWorld(e.clientX, e.clientY);

    drag.current = {
      id: el.id,
      dx: w.x - el.x,
      dy: w.y - el.y,
      moved: false,
    };
  };

  const onElementPointerMove = (
    e: ReactPointerEvent<SVGGElement>,
    el: CircuitElement,
  ) => {
    const d = drag.current;

    if (!d || d.id !== el.id) return;

    const w = toWorld(e.clientX, e.clientY);
    const p = snapPoint({
      x: w.x - d.dx,
      y: w.y - d.dy,
    });

    if (el.x === p.x && el.y === p.y) return;

    if (!d.moved) {
      beginMove();
      d.moved = true;
    }

    moveElement(d.id, p.x, p.y);
  };

  const onElementPointerUp = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drag.current?.moved) pruneDeadBends();

    drag.current = null;
  };

  // ---- drop from the sidebar -----------------------------------------------

  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();

    const type = e.dataTransfer.getData("text/plain");

    if (!isComponentType(type)) return;

    const p = snapPoint(toWorld(e.clientX, e.clientY));

    addElement(type, p.x, p.y);
  };

  // ---- wiring ---------------------------------------------------------------

  const onPinClick = (e: ReactMouseEvent, elementId: string, pinId: string) => {
    e.stopPropagation();

    const ep = { kind: "pin", elementId, pinId } as const;

    if (draft) finishWire(ep);
    else startWire(ep);
  };

  const onJunctionClick = (e: ReactMouseEvent, junctionId: string) => {
    e.stopPropagation();

    const ep = { kind: "junction", junctionId } as const;

    if (draft) finishWire(ep);
    else startWire(ep);
  };

  // ---- dragging a whole wire segment ---------------------------------------

  const segmentDrag = useRef<{
    wireId: string;
    segment: number;
    points: Point[];
    start: Point;
    normal: Point;
    moved: boolean;
  } | null>(null);

  const onSegmentPointerDown = (
    e: ReactPointerEvent<SVGPathElement>,
    wireId: string,
    segment: number,
  ) => {
    e.stopPropagation();

    const wire = wires.find((item) => item.id === wireId);
    if (!wire) return;

    const points = wirePath(wire, { elements, junctions });
    if (!points || !points[segment] || !points[segment + 1]) return;

    const a = points[segment];
    const b = points[segment + 1];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) return;

    select({ kind: "wire", id: wireId });

    segmentDrag.current = {
      wireId,
      segment,
      points,
      start: toWorld(e.clientX, e.clientY),
      normal: {
        x: -dy / length,
        y: dx / length,
      },
      moved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSegmentPointerMove = (e: ReactPointerEvent<SVGPathElement>) => {
    const drag = segmentDrag.current;
    if (!drag) return;

    const current = toWorld(e.clientX, e.clientY);

    const dx = current.x - drag.start.x;
    const dy = current.y - drag.start.y;

    const rawOffset = dx * drag.normal.x + dy * drag.normal.y;

    // Ignore tiny movements so a normal tap only selects the wire.
    if (!drag.moved && Math.hypot(dx, dy) * scale < 4) return;

    if (!drag.moved) {
      beginMove();
      drag.moved = true;
    }

    const wire = wires.find((item) => item.id === drag.wireId);
    if (!wire) return;

    // Orthogonal wires move in grid increments.
    const offset = wire.diagonal
      ? Math.round(rawOffset * 100) / 100
      : Math.round(rawOffset / GRID) * GRID;

    const a = drag.points[drag.segment];
    const b = drag.points[drag.segment + 1];

    const movedA = {
      x: a.x + drag.normal.x * offset,
      y: a.y + drag.normal.y * offset,
    };

    const movedB = {
      x: b.x + drag.normal.x * offset,
      y: b.y + drag.normal.y * offset,
    };

    // Keep both endpoints fixed and insert the shifted segment
    // between its original neighbours.
    const nextPath = [
      ...drag.points.slice(0, drag.segment),
      a,
      movedA,
      movedB,
      b,
      ...drag.points.slice(drag.segment + 2),
    ];

    setWireBends(drag.wireId, nextPath.slice(1, -1));
  };

  const onSegmentPointerUp = (e: ReactPointerEvent<SVGPathElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    segmentDrag.current = null;
  };

  // ---- editing the bends of the selected wire ------------------------------

  const bendDrag = useRef<{ moved: boolean } | null>(null);

  const [activeBend, setActiveBend] = useState<{
    wireId: string;
    index: number;
  } | null>(null);

  const onBendPointerDown = (
    e: ReactPointerEvent<SVGCircleElement>,
    wireId: string,
    index: number,
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    bendDrag.current = { moved: false };
    setActiveBend({ wireId, index });
  };

  const onBendPointerMove = (
    e: ReactPointerEvent<SVGCircleElement>,
    wireId: string,
    index: number,
  ) => {
    const d = bendDrag.current;

    if (!d) return;

    const p = snapPoint(toWorld(e.clientX, e.clientY));
    const current = wires.find((w) => w.id === wireId)?.bends[index];

    if (!current || (current.x === p.x && current.y === p.y)) return;

    if (!d.moved) {
      beginMove();
      d.moved = true;
    }

    moveBend(wireId, index, p);
  };

  const onBendPointerUp = (e: ReactPointerEvent<SVGCircleElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (bendDrag.current?.moved) pruneDeadBends();

    bendDrag.current = null;
    setActiveBend(null);
  };

  /**
   * Double-click on a diagonal wire adds a bend where you clicked.
   */
  const onWireDoubleClick = (e: ReactMouseEvent, wireId: string) => {
    e.stopPropagation();

    const wire = wires.find((w) => w.id === wireId);

    if (!wire?.diagonal) return;

    const path = wirePath(wire, { elements, junctions });
    const hit = path && nearestOnPath(path, toWorld(e.clientX, e.clientY));

    if (hit) {
      insertBend(wireId, hit.segment, snapPoint(hit.point));
    }
  };

  const onWireClick = (e: ReactMouseEvent, wireId: string) => {
    e.stopPropagation();

    if (draft) {
      finishWireOnWire(wireId, toWorld(e.clientX, e.clientY));
    } else {
      select({ kind: "wire", id: wireId });
    }
  };

  // ---- clicking the empty canvas -------------------------------------------

  const onBackgroundClick = (e: ReactMouseEvent) => {
    if (justPanned.current) {
      justPanned.current = false;
      return;
    }

    // Drawing a wire has priority over placing a new component.
    if (draft) {
      addBend(snapPoint(toWorld(e.clientX, e.clientY)));
      return;
    }

    // Touch-friendly component placement.
    if (selectedComponent) {
      const p = snapPoint(toWorld(e.clientX, e.clientY));

      addElement(selectedComponent, p.x, p.y);
      onComponentPlaced();
      return;
    }

    select(null);
  };

  // ---- panning --------------------------------------------------------------

  const PAN_THRESHOLD = 4;

  const onSvgPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    justPanned.current = false;

    if (e.button !== 0 && e.button !== 1) return;

    if (e.pointerType === "touch") {
      touchPointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      // Two fingers start pinch-to-zoom.
      if (touchPointers.current.size === 2) {
        const points = Array.from(touchPointers.current.values());
        const [a, b] = points;

        const midpoint = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };

        const distance = Math.hypot(a.x - b.x, a.y - b.y);

        pinch.current = {
          startDistance: Math.max(distance, 1),
          startCellPx: cellPx,
          worldPoint: toWorld(midpoint.x, midpoint.y),
        };

        panDrag.current = null;
        justPanned.current = true;
        setPanning(true);

        // Capture both fingers so the gesture remains active.
        for (const pointerId of touchPointers.current.keys()) {
          if (!e.currentTarget.hasPointerCapture(pointerId)) {
            e.currentTarget.setPointerCapture(pointerId);
          }
        }

        return;
      }
    }

    panDrag.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      active: false,
    };
  };

  const onSvgPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      const pointers = touchPointers.current;

      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
        });
      }

      // Update zoom while two fingers are active.
      if (pinch.current && pointers.size >= 2) {
        const points = Array.from(pointers.values());
        const [a, b] = points;

        const distance = Math.hypot(a.x - b.x, a.y - b.y);

        const midpoint = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };

        const rect = e.currentTarget.getBoundingClientRect();

        const nextCellPx = Math.min(
          MAX_CELL,
          Math.max(
            MIN_CELL,
            Math.round(
              pinch.current.startCellPx *
                (distance / pinch.current.startDistance),
            ),
          ),
        );

        const nextScale = nextCellPx / GRID;

        // Keep the point between the fingers in the same world position.
        setCellPx(nextCellPx);
        setPan({
          x: midpoint.x - rect.left - pinch.current.worldPoint.x * nextScale,
          y: midpoint.y - rect.top - pinch.current.worldPoint.y * nextScale,
        });

        justPanned.current = true;
        return;
      }
    }

    const d = panDrag.current;

    if (d) {
      if (
        !d.active &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) > PAN_THRESHOLD
      ) {
        d.active = true;
        justPanned.current = true;
        setPanning(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      if (d.active) {
        setPan({
          x: d.panX + e.clientX - d.x,
          y: d.panY + e.clientY - d.y,
        });
      }
    }

    if (draft) {
      setCursor(snapPoint(toWorld(e.clientX, e.clientY)));
    }
  };

  const onSvgPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (e.pointerType === "touch") {
      touchPointers.current.delete(e.pointerId);

      if (pinch.current) {
        pinch.current = null;

        // If one finger remains, allow it to continue panning.
        const remaining = Array.from(touchPointers.current.values())[0];

        if (remaining) {
          panDrag.current = {
            x: remaining.x,
            y: remaining.y,
            panX: pan.x,
            panY: pan.y,
            active: false,
          };
        } else {
          panDrag.current = null;
        }

        setPanning(false);
        justPanned.current = true;
        return;
      }
    }

    panDrag.current = null;
    setPanning(false);
  };

  const onSvgWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    const dx = e.shiftKey ? e.deltaY : e.deltaX;
    const dy = e.shiftKey ? 0 : e.deltaY;

    setPan((p) => ({
      x: p.x - dx,
      y: p.y - dy,
    }));
  };

  // Live preview of the wire being drawn.
  const start = draft ? endpointPos(draft.from, elements, junctions) : null;

  const previewD =
    draft && start
      ? toPathData(
          routeWire(
            start,
            draft.bends,
            cursor,
            start.axis,
            null,
            diagonalWires,
          ),
        )
      : null;

  const cell = cellPx;

  return (
    <div
      className="relative h-full flex-1 select-none overflow-hidden bg-slate-50"
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
    >
      <svg
        className={`absolute inset-0 h-full w-full touch-none ${
          panning ? "cursor-grabbing" : draft ? "cursor-crosshair" : ""
        }`}
        onClick={onBackgroundClick}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
        onWheel={onSvgWheel}
        onContextMenu={(e) => {
          if (draft) {
            e.preventDefault();
            cancelWire();
          }
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={cell}
            height={cell}
            x={pan.x - cell / 2}
            y={pan.y - cell / 2}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={cell / 2} cy={cell / 2} r="1" fill="#cbd5e1" />
          </pattern>
        </defs>

        {gridVisible && <rect width="100%" height="100%" fill="url(#grid)" />}

        <g
          ref={worldRef}
          transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}
        >
          <WireLayer
            data={{ elements, wires, junctions }}
            selection={selection}
            scale={scale}
            onWireClick={onWireClick}
            onWireDoubleClick={onWireDoubleClick}
            onJunctionClick={onJunctionClick}
            onSegmentPointerDown={onSegmentPointerDown}
            onSegmentPointerMove={onSegmentPointerMove}
            onSegmentPointerUp={onSegmentPointerUp}
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
              selected={selection?.kind === "element" && selection.id === el.id}
              onPointerDown={onElementPointerDown}
              onPointerMove={onElementPointerMove}
              onPointerUp={onElementPointerUp}
              onToggle={(x) => toggleSwitch(x.id)}
            />
          ))}

          <PinLayer
            data={{ elements, wires, junctions }}
            drawing={!!draft}
            scale={scale}
            onPinClick={onPinClick}
          />

          {previewD && (
            <path
              d={previewD}
              stroke="#2563eb"
              strokeWidth="2"
              strokeDasharray="5 4"
              fill="none"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      <div
        className="group absolute right-4 top-3 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="Controls"
          aria-label="Show controls hint"
          className="rounded-full bg-white/90 p-1.5 text-gray-500 shadow hover:text-blue-600 focus:text-blue-600"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute right-full top-0 mr-2 hidden w-64 rounded-md bg-white px-3 py-2 text-xs text-gray-600 shadow-lg group-focus-within:block group-hover:block">
          {draft
            ? "Click canvas — add bend · click pin/wire — finish · D — diagonal/straight · Esc — cancel"
            : selectedComponent
              ? "Tap the canvas to place the selected component"
              : "Click pin — new wire · Drag canvas / wheel — pan · Pinch — zoom · R — rotate · Del — delete · Ctrl+Z — undo"}
        </div>
      </div>

      <GridSettings
        cellPx={cellPx}
        visible={gridVisible}
        onCellPx={setCellPx}
        onVisible={setGridVisible}
        onResetView={() => setPan({ x: 0, y: 0 })}
      />
    </div>
  );
}
