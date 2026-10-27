import { PanelTopOpen } from 'lucide-react'
import { useState } from 'react'
import { Canvas } from './Canvas'
import { Sidebar } from './SideBar'

export function CircuitWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
    </main>
  )
}
