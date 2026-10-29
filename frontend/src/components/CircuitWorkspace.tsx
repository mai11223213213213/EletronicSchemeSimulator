import { Activity, PanelTopOpen, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { useConsoleVisible, useHasReadout, useSimStore } from '../store/simStore'
import { Canvas } from './Canvas'
import { ModelSwitch } from './ModelSwitch'
import { PropertiesPanel } from './PropertiesPanel'
import { Sidebar } from './SideBar'
import { SimulationConsole } from './SimulationConsole'
import { WirePanel } from './WirePanel'

/** Below this width the left and right panels cannot sit side by side any more. Matches Tailwind's `max-[899px]:`. */
const NARROW_QUERY = '(max-width: 899px)'
const isNarrow = () => window.matchMedia(NARROW_QUERY).matches

export function CircuitWorkspace() {
  // On a narrow screen start with the components list closed, so the canvas is not covered at first glance.
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow())
  const running = useSimStore((s) => s.running)
  const hasReadout = useHasReadout()
  const readoutVisible = useConsoleVisible()
  const setConsoleOpen = useSimStore((s) => s.setConsoleOpen)
  const start = useSimStore((s) => s.start)
  const stop = useSimStore((s) => s.stop)

  // On a narrow screen the left list and the right readout take turns: opening one closes the other.
  const openSidebar = () => {
    setSidebarOpen(true)
    if (isNarrow()) setConsoleOpen(false)
  }
  const openReadout = () => {
    setConsoleOpen(true)
    if (isNarrow()) setSidebarOpen(false)
  }
  const startSimulation = () => {
    start() // also opens the readout
    if (isNarrow()) setSidebarOpen(false)
  }

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <Canvas />

      {sidebarOpen ? (
        <div className="absolute bottom-2 left-2 top-2 z-20 w-64 max-[899px]:w-52">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <button
          type="button" onClick={openSidebar} title="Show components" aria-label="Show components"
          className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <PanelTopOpen className="h-4 w-4" />
          Components
        </button>
      )}

      {/* top centre normally; bottom centre on a narrow screen, where the top corners are taken */}
      <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 max-[899px]:bottom-4 max-[899px]:top-auto">
        <button
          type="button"
          onClick={running ? stop : startSimulation}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg ${
            running ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? 'Stop simulation' : 'Start simulation'}
        </button>
        <ModelSwitch />
      </div>

      {/*
        Right column: below the "?" hint button, above the Grid button. Properties and readout are laid out
        one under the other in the SAME flex column, so they can never overlap whatever the screen size.
        The column itself ignores the mouse (the canvas stays clickable around the cards); the cards turn it back on.
      */}
      <div className="pointer-events-none absolute bottom-16 right-4 top-14 z-20 flex w-72 flex-col gap-2 max-[899px]:w-56">
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
          type="button" onClick={openReadout} title="Show readout" aria-label="Show readout"
          className="absolute right-14 top-3 z-30 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <Activity className="h-4 w-4" />
          Readout
        </button>
      )}
    </main>
  )
}
