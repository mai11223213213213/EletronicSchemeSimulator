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

  const skipSave = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const elements = useCircuitStore((state) => state.elements);
  const wires = useCircuitStore((state) => state.wires);
  const junctions = useCircuitStore((state) => state.junctions);
  const loadCircuit = useCircuitStore((state) => state.loadCircuit);

  // Завантажуємо схему з сервера
  useEffect(() => {
    if (!id) return;

    let active = true;

    getCircuit(id)
      .then(({ data }) => {
        if (!active) return;
        setSaveStatus("saved");
        skipSave.current = true;
        loadCircuit(data);
        setLoadedId(id);
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

  // Автоматично зберігаємо зміни
  useEffect(() => {
    const version = ++saveVersion.current;

    if (!id || loadedId !== id) return;

    // Не зберігаємо дані одразу після завантаження
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

      // Запити виконуються послідовно
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => updateCircuit(id, { data }))
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
  <div
    role="status"
    className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border px-4 py-2 text-xs font-medium shadow-lg ${
      saveStatus === "error"
        ? "border-red-500/30 bg-red-950/90 text-red-300"
        : saveStatus === "saving"
          ? "border-amber-500/30 bg-[#19211f]/95 text-amber-300"
          : "border-emerald-500/30 bg-[#19211f]/95 text-emerald-300"
    }`}
  >
    {saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "error"
        ? "Save failed"
        : "All changes saved"}
  </div>;

  return (
    <>
      <CircuitWorkspace />

      {error && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {error}
        </div>
      )}
    </>
  );
}
