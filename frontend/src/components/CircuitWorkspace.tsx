import {
  Activity,
  PanelTopOpen,
  Play,
  Square,
  Settings,
  LogOut,
  Save,
} from "lucide-react";
import { useState } from "react";

import {
  useConsoleVisible,
  useHasReadout,
  useSimStore,
} from "../store/simStore";

import { Canvas } from "./Canvas";
import { ModelSwitch } from "./ModelSwitch";
import { PropertiesPanel } from "./PropertiesPanel";
import { Sidebar } from "./SideBar";
import { SimulationConsole } from "./SimulationConsole";
import { WirePanel } from "./WirePanel";

interface CircuitWorkspaceProps {
  circuitName: string;
  onRename: (name: string) => Promise<void>;
  onExit: () => void;
  exiting: boolean;
}

const NARROW_QUERY = "(max-width: 899px)";
const isNarrow = () => window.matchMedia(NARROW_QUERY).matches;

export function CircuitWorkspace({
  circuitName,
  onRename,
  onExit,
  exiting,
}: CircuitWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [nameDraft, setNameDraft] = useState({
    sourceName: circuitName,
    value: circuitName,
  });
  const name =
    nameDraft.sourceName === circuitName ? nameDraft.value : circuitName;

  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);

  const running = useSimStore((s) => s.running);
  const hasReadout = useHasReadout();
  const readoutVisible = useConsoleVisible();
  const setConsoleOpen = useSimStore((s) => s.setConsoleOpen);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);

  const openSidebar = () => {
    setSidebarOpen(true);
    if (isNarrow()) setConsoleOpen(false);
  };

  const openReadout = () => {
    setConsoleOpen(true);
    if (isNarrow()) setSidebarOpen(false);
  };

  const startSimulation = () => {
    start();
    if (isNarrow()) setSidebarOpen(false);
  };

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setRenameError("Circuit name cannot be empty.");
      return;
    }

    if (trimmedName.length > 60) {
      setRenameError("Circuit name cannot exceed 60 characters.");
      return;
    }

    if (trimmedName === circuitName) {
      setNameDraft({ sourceName: circuitName, value: circuitName });
      setRenameError("");
      return;
    }

    setRenaming(true);
    setRenameError("");

    try {
      await onRename(trimmedName);
      setNameDraft({ sourceName: trimmedName, value: trimmedName });
      setRenameError("");
    } catch (error) {
      setRenameError(
        error instanceof Error
          ? error.message
          : "Unable to rename this circuit.",
      );
    } finally {
      setRenaming(false);
    }
  }

  return (
    <main className="relative flex h-full min-h-0 w-full overflow-hidden">
      <Canvas />

      {sidebarOpen ? (
        <div className="absolute bottom-2 left-2 top-2 z-20 w-64 max-[899px]:bottom-16 max-[899px]:left-2 max-[899px]:top-14 max-[899px]:w-[min(14rem,calc(100vw-1rem))]">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={openSidebar}
          title="Show components"
          aria-label="Show components"
          className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white max-[899px]:top-3 max-[899px]:px-2.5 max-[899px]:py-2"
        >
          <PanelTopOpen className="h-4 w-4" />
          Components
        </button>
      )}

      {/* Main toolbar */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 max-[899px]:bottom-3 max-[899px]:left-1/2 max-[899px]:top-auto max-[899px]:w-[calc(100%-1rem)] max-[899px]:justify-center max-[899px]:gap-1">
        {" "}
        <button
          type="button"
          onClick={running ? stop : startSimulation}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg max-[899px]:px-2 max-[899px]:py-2 max-[899px]:text-xs ${
            running
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {running ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? "Stop simulation" : "Start simulation"}
        </button>
        <ModelSwitch />
        {/* Settings menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            title="Circuit settings"
            aria-label="Circuit settings"
            aria-expanded={settingsOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-700 shadow-lg transition hover:bg-gray-100 ${
              settingsOpen ? "bg-gray-100" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Circuit settings
              </h3>

              <form onSubmit={handleRename}>
                <label
                  htmlFor="circuit-name"
                  className="mb-1.5 block text-xs font-medium text-gray-600"
                >
                  Circuit name
                </label>

                <input
                  id="circuit-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setNameDraft({
                      sourceName: circuitName,
                      value: event.target.value,
                    });
                    setRenameError("");
                  }}
                  maxLength={60}
                  disabled={renaming || exiting}
                  placeholder="Enter circuit name"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 disabled:opacity-60"
                />

                {renameError && (
                  <p className="mt-1.5 text-xs text-red-500" role="alert">
                    {renameError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={renaming || exiting || !name.trim()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {renaming ? "Saving..." : "Save name"}
                </button>
              </form>

              <div className="my-3 border-t border-gray-200" />

              <button
                type="button"
                onClick={onExit}
                disabled={exiting || renaming}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {exiting ? "Saving and leaving..." : "Back to dashboard"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panels */}
      <div className="pointer-events-none absolute bottom-16 right-4 top-14 z-20 flex w-72 flex-col gap-2 max-[899px]:bottom-16 max-[899px]:left-2 max-[899px]:right-2 max-[899px]:top-auto max-[899px]:max-h-[42%] max-[899px]:w-auto">
        {" "}
        <PropertiesPanel />
        <WirePanel />
        {readoutVisible && (
          <div className="pointer-events-auto min-h-0 flex-1">
            <SimulationConsole />
          </div>
        )}
      </div>

      {hasReadout && !readoutVisible && (
        <button
          type="button"
          onClick={openReadout}
          title="Show readout"
          aria-label="Show readout"
          className="absolute right-14 top-3 z-30 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white max-[899px]:right-2 max-[899px]:top-3 max-[899px]:px-2.5 max-[899px]:py-2"
        >
          <Activity className="h-4 w-4" />
          Readout
        </button>
      )}
    </main>
  );
}
