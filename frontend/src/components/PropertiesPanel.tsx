import { useState } from "react";
import { RotateCw, Trash2, X } from "lucide-react";
import { REGISTRY } from "../model/registry";
import { useCircuitStore } from "../store/circuitStore";

export function PropertiesPanel() {
  const element = useCircuitStore((s) =>
    s.selection?.kind === "element"
      ? s.elements.find((e) => e.id === s.selection!.id)
      : undefined,
  );

  const notice = useCircuitStore((s) => s.notice);
  const setProp = useCircuitStore((s) => s.setProp);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const rotateSelected = useCircuitStore((s) => s.rotateSelected);
  const deleteSelected = useCircuitStore((s) => s.deleteSelected);
  const select = useCircuitStore((s) => s.select);

  if (!element) return null;

  const def = REGISTRY[element.type];
  const notes = notice?.elementId === element.id ? notice.notes : [];

  return (
    <div
      className="pointer-events-auto max-h-[70%] shrink-0 overflow-y-auto rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur max-[899px]:max-h-[35vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-gray-800">
          {def.label}
        </h3>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={rotateSelected}
            title="Rotate component"
            aria-label="Rotate component"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={deleteSelected}
            title="Delete component"
            aria-label="Delete component"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 active:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => select(null)}
            title="Deselect component"
            aria-label="Deselect component"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {element.type === "switch" && (
        <button
          type="button"
          onClick={() => toggleSwitch(element.id)}
          className="mb-2 w-full rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
        >
          {element.props.closed
            ? "Closed — click to open"
            : "Open — click to close"}
        </button>
      )}

      {def.fields
        .filter((f) => f.show?.(element.props) ?? true)
        .map((f) => {
          const value = Number(element.props[f.key] ?? def.defaults[f.key]);

          return (
            <label
              key={f.key}
              className="mb-1 flex items-center justify-between gap-2 text-sm text-gray-700"
            >
              <span>{f.label}</span>

              <span className="flex items-center gap-1">
                {f.options ? (
                  <select
                    value={value}
                    onChange={(e) =>
                      setProp(element.id, f.key, Number(e.target.value))
                    }
                    className="w-32 rounded border border-gray-300 bg-white px-1 py-0.5 text-sm"
                  >
                    {f.options.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <NumberField
                      value={value}
                      min={f.min}
                      onCommit={(v) => setProp(element.id, f.key, v)}
                    />
                    <span className="w-7 text-xs text-gray-500">{f.unit}</span>
                  </>
                )}
              </span>
            </label>
          );
        })}

      {def.readouts && (
        <dl className="mt-2 space-y-0.5 rounded bg-gray-50 p-2 text-xs text-gray-600">
          {def.readouts(element.props).map(([label, v]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt>{label}</dt>
              <dd className="font-mono text-gray-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {notes.map((note) => (
        <p
          key={note}
          role="status"
          className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800"
        >
          ⚠ {note}
        </p>
      ))}

      {def.help && (
        <p className="mt-2 text-xs leading-snug text-gray-500">
          {def.help(element.props)}
        </p>
      )}

      <p className="mt-2 text-xs text-gray-400 max-[899px]:hidden">
        R — rotate · Del — delete
      </p>
    </div>
  );
}

function NumberField({
  value,
  min,
  onCommit,
}: {
  value: number;
  min: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const finish = () => {
    const v = Number(draft);

    if (
      draft !== null &&
      draft.trim() !== "" &&
      Number.isFinite(v) &&
      v >= min &&
      v !== value
    ) {
      onCommit(v);
    }

    setDraft(null);
  };

  return (
    <input
      type="number"
      min={min}
      step="any"
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-right text-sm"
    />
  );
}
