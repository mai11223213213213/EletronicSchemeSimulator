import React from 'react';
import type { ComponentType } from '../types/cricut';
import { X } from 'lucide-react';
import { BatteryElement } from './Elements/BatteryElement';
import { LampElement } from './Elements/LampElement';
import { ResistorElement } from './Elements/ResistorElement';
import { SwitchElement } from './Elements/SwitchElement';

interface SidebarProps {
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const components = [
    { type: 'battery', name: 'Battery', preview: BatteryElement, viewBox: '0 -20 60 45' },
    { type: 'resistor', name: 'Resistor', preview: ResistorElement, viewBox: '0 -12 60 34' },
    { type: 'lamp', name: 'Lamp', preview: LampElement, viewBox: '-12 -18 64 46' },
    { type: 'switch', name: 'Switch', preview: SwitchElement, viewBox: '0 -18 60 40' },
  ] as const;

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    // Передаємо лише рядок типу елемента
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur select-none">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800">Components</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Hide components"
          title="Hide components"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid min-h-0 grid-cols-2 content-start gap-2 overflow-y-auto">
        {components.map(({ type, name, preview: Preview, viewBox }) => (
          <button
            key={type}
            type="button"
            draggable
            onDragStart={(event) => handleDragStart(event, type)}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded border border-gray-200 bg-white px-2 py-3 text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 active:cursor-grabbing"
            aria-label={`Drag ${name} to canvas`}
          >
            <svg viewBox={viewBox} className="h-14 w-full overflow-visible" aria-hidden="true">
              <Preview />
            </svg>
            <span className="text-xs font-medium text-gray-700">{name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};