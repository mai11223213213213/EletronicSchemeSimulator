import { Activity, PanelTopOpen, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { useConsoleVisible, useHasReadout, useSimStore } from '../store/simStore'
import { Canvas } from './Canvas'
import { Sidebar } from './SideBar'
import { SimulationConsole } from './SimulationConsole'

export function CircuitWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const running = useSimStore((s) => s.running)
  const hasReadout = useHasReadout()
  const readoutVisible = useConsoleVisible()
  const setConsoleOpen = useSimStore((s) => s.setConsoleOpen)
  const start = useSimStore((s) => s.start)
  const stop = useSimStore((s) => s.stop)

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <Canvas />
      {sidebarOpen ? (
        <div className="absolute bottom-2 left-2 top-2 z-20 w-64">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <button
          type="button" onClick={() => setSidebarOpen(true)} title="Show components" aria-label="Show components"
          className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <PanelTopOpen className="h-4 w-4" />
          Components
        </button>
      )}

      <button
        type="button"
        onClick={running ? stop : start}
        className={`absolute left-1/2 top-3 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg ${
          running ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {running ? 'Stop simulation' : 'Start simulation'}
      </button>

      {/* right edge: below the "?" hint button, above the Grid button */}
      {readoutVisible && (
        <div className="absolute bottom-16 right-4 top-14 z-20 w-72">
          <SimulationConsole />
        </div>
      )}
      {hasReadout && !readoutVisible && (
        <button
          type="button" onClick={() => setConsoleOpen(true)} title="Show readout" aria-label="Show readout"
          className="absolute right-14 top-3 z-30 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <Activity className="h-4 w-4" />
          Readout
        </button>
        )}
    </main>
  )
}
