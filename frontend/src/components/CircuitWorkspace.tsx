import { useState } from 'react';
import { PanelTopOpen } from 'lucide-react';
import type { CircuitElement, ComponentType, Wire } from '../types/cricut';
import { Canvas } from './Canvas';
import { Sidebar } from './SideBar';

interface CircuitWorkspaceProps {
  elements: CircuitElement[];
  wires: Wire[];
  onAddElement: (type: ComponentType, x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  selectedId: string | null;
  onMoveElement: (id: string, x: number, y: number) => void;
}

export function CircuitWorkspace({
  elements,
  wires,
  onAddElement,
  onSelectElement,
  selectedId,
  onMoveElement,
}: CircuitWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <Canvas
        elements={elements}
        wires={wires}
        onDropElement={onAddElement}
        onSelectElement={onSelectElement}
        selectedId={selectedId}
        onMoveElement={onMoveElement}
      />
      {sidebarOpen ? (
        <div className="absolute bottom-2 left-2 top-2 z-20 w-64">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
          aria-label="Show components"
          title="Show components"
        >
          <PanelTopOpen className="h-4 w-4" />
          Components
        </button>
      )}
    </main>
  );
}