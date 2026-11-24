
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import { wirePath } from "../model/wires";
import { nearestOnPath, toPathData } from "../model/routing";
import type { CircuitData, Point, Selection } from "../model/types";

const WIRE = "#2563eb";

interface Props {
  data: CircuitData;
  selection: Selection | null;
  scale: number;

  onWireClick: (e: ReactMouseEvent, wireId: string) => void;
  onWireDoubleClick: (e: ReactMouseEvent, wireId: string) => void;
  onJunctionClick: (e: ReactMouseEvent, junctionId: string) => void;

  onBendPointerDown: (
    e: ReactPointerEvent<SVGCircleElement>,
    wireId: string,
    index: number,
  ) => void;
  onBendPointerMove: (
    e: ReactPointerEvent<SVGCircleElement>,
    wireId: string,
    index: number,
  ) => void;
  onBendPointerUp: (e: ReactPointerEvent<SVGCircleElement>) => void;

  onBendRemove: (wireId: string, index: number) => void;

  activeBend: {
    wireId: string;
    index: number;
  } | null;
}

/**
 * Draws wires, junctions and editable bend handles.
 * The visible handles stay small, while their pointer targets are larger.
 */
export function WireLayer({
  data,
  selection,
  scale,
  onWireClick,
  onWireDoubleClick,
  onJunctionClick,
  onBendPointerDown,
  onBendPointerMove,
  onBendPointerUp,
  onBendRemove,
  activeBend,
}: Props) {
  const degree = new Map<string, number>();

  for (const wire of data.wires) {
    for (const endpoint of [wire.from, wire.to]) {
      if (endpoint.kind === "junction") {
        degree.set(
          endpoint.junctionId,
          (degree.get(endpoint.junctionId) ?? 0) + 1,
        );
      }
    }
  }

  // Keep the touch target approximately 36px wide at every zoom level.
  const handleRadius = 18 / scale;

  return (
    <g>
      {data.wires.map((wire) => {
        const points: Point[] | null = wirePath(wire, data);

        if (!points) return null;

        const path = toPathData(points);
        const selected =
          selection?.kind === "wire" && selection.id === wire.id;

        return (
          <g key={wire.id}>
            {selected && (
              <path
                d={path}
                stroke="#93c5fd"
                strokeWidth="7"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}

            <path
              d={path}
              stroke={WIRE}
              strokeWidth="2.5"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />

            {/* Invisible hit area for selecting a wire. */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth={Math.max(12 / scale, 10)}
              fill="none"
              className="cursor-pointer"
              onClick={(event) => onWireClick(event, wire.id)}
              onDoubleClick={(event) =>
                onWireDoubleClick(event, wire.id)
              }
            />

            {selected &&
              wire.bends.map((bend, index) => {
                const dragging =
                  activeBend?.wireId === wire.id &&
                  activeBend.index === index;

                // Do not show handles for bends that are not on the
                // currently rendered route.
                if (
                  !dragging &&
                  (nearestOnPath(points, bend)?.dist ?? Infinity) > 0.5
                ) {
                  return null;
                }

                return (
                  <g key={index}>
                    {/* Large invisible touch target. */}
                    <circle
                      cx={bend.x}
                      cy={bend.y}
                      r={handleRadius}
                      fill="transparent"
                      className="cursor-move"
                      style={{ touchAction: "none" }}
                      onPointerDown={(event) =>
                        onBendPointerDown(event, wire.id, index)
                      }
                      onPointerMove={(event) =>
                        onBendPointerMove(event, wire.id, index)
                      }
                      onPointerUp={onBendPointerUp}
                      onPointerCancel={onBendPointerUp}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        onBendRemove(wire.id, index);
                      }}
                    />

                    {/* Small visible handle — its appearance is unchanged. */}
                    <circle
                      cx={bend.x}
                      cy={bend.y}
                      r="5"
                      fill={dragging ? "#dbeafe" : "#ffffff"}
                      stroke={WIRE}
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
          </g>
        );
      })}

      {data.junctions
        .filter((junction) => (degree.get(junction.id) ?? 0) >= 3)
        .map((junction) => (
          <g
            key={junction.id}
            className="cursor-pointer"
            onClick={(event) =>
              onJunctionClick(event, junction.id)
            }
          >
            <circle
              cx={junction.x}
              cy={junction.y}
              r="12"
              fill="transparent"
            />
            <circle
              cx={junction.x}
              cy={junction.y}
              r="4"
              fill={WIRE}
              pointerEvents="none"
            />
          </g>
        ))}
    </g>
  );
}
