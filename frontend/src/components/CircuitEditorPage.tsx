import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { getCircuit, updateCircuit } from "../api/circuits";
import { useCircuitStore } from "../store/circuitStore";
import { CircuitWorkspace } from "./CircuitWorkspace";
import { WorkspaceSkeleton } from "./WorkspaceSkeleton";

type SaveStatus = "saved" | "saving" | "error";

export function CircuitEditorPage() {
  const { id } = useParams<{ id: string }>();

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const skipSave = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);

  const elements = useCircuitStore((state) => state.elements);
  const wires = useCircuitStore((state) => state.wires);
  const junctions = useCircuitStore((state) => state.junctions);
  const loadCircuit = useCircuitStore((state) => state.loadCircuit);

  // Load circuit
  useEffect(() => {
    if (!id) return;

    let active = true;

    getCircuit(id)
      .then(({ data }) => {
        if (!active) return;

        skipSave.current = true;
        loadCircuit(data);
        setLoadedId(id);
        setSaveStatus("saved");
        setError("");
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err instanceof Error ? err.message : "Unable to load this circuit.",
        );
      });

    return () => {
      active = false;
    };
  }, [id, loadCircuit]);

  // Autosave circuit changes
  useEffect(() => {
    const version = ++saveVersion.current;

    if (!id || loadedId !== id) return;

    // Do not save immediately after loading
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      setSaveStatus("saving");

      const data = {
        elements,
        wires,
        junctions,
      };

      // Keep requests in order to prevent older data overwriting newer data
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          await updateCircuit(id, { data });
        })
        .then(() => {
          if (version !== saveVersion.current) return;

          setSaveStatus("saved");
          setError("");
        })
        .catch((err) => {
          if (version !== saveVersion.current) return;

          setSaveStatus("error");
          setError(
            err instanceof Error ? err.message : "Unable to save this circuit.",
          );
        });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [id, loadedId, elements, wires, junctions]);

  if (error && loadedId !== id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101716] p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-white">
            Unable to open circuit
          </p>
          <p className="mt-2 text-sm text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (loadedId !== id) {
    return <WorkspaceSkeleton />;
  }

  return (
    <>
      <CircuitWorkspace />

      {/* Save status */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-1 left-1/2 z-40 -translate-x-1/2 text-xs font-medium ${
  saveStatus === 'error'
    ? 'text-red-400'
    : saveStatus === 'saving'
      ? 'text-amber-400'
      : 'text-emerald-400'
}`}
      >
        {saveStatus === "saving"
          ? "Saving..."
          : saveStatus === "error"
            ? "Save failed"
            : "All changes saved"}
      </div>
    </>
  );
}
