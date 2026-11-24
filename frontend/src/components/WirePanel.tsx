
import { Trash2, X } from "lucide-react";
import { useCircuitStore } from "../store/circuitStore";

/**
 * Wire style and editing actions.
 */
export function WirePanel() {
  const drawing = useCircuitStore((s) => s.draft !== null);

  const selected = useCircuitStore((s) =>
    s.selection?.kind === "wire"
      ? s.wires.find((w) => w.id === s.selection!.id)
      : undefined,
  );

  const diagonalWires = useCircuitStore((s) => s.diagonalWires);
  const setWireStyle = useCircuitStore((s) => s.setWireStyle);
  const deleteSelected = useCircuitStore((s) => s.deleteSelected);
  const cancelWire = useCircuitStore((s) => s.cancelWire);

  if (!drawing && !selected) return null;

  const diagonal =
    drawing || !selected ? diagonalWires : selected.diagonal === true;

  const button = (isDiagonal: boolean, label: string) => (
    <button
      type="button"
      onClick={() => setWireStyle(isDiagonal)}
      aria-pressed={diagonal === isDiagonal}
      className={`flex-1 rounded border px-2 py-1.5 text-sm ${
        diagonal === isDiagonal
          ? "border-blue-400 bg-blue-50 font-medium text-blue-700"
          : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-blue-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="pointer-events-auto shrink-0 rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">
          {drawing ? "New wire" : "Wire"}
        </h3>

        {drawing && (
          <button
            type="button"
            onClick={cancelWire}
            title="Cancel wire drawing"
            aria-label="Cancel wire drawing"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {selected && (
          <button
            type="button"
            onClick={deleteSelected}
            title="Delete wire"
            aria-label="Delete wire"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 active:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {button(false, "Straight")}
        {button(true, "Diagonal")}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        D — switch style · drag a segment to move it · drag the dots to move
        bends
      </p>
    </div>
  );
}
