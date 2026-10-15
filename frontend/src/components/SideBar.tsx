import React from 'react';
import {type ComponentType } from '../types/cricut';
import { Battery, Zap, Lightbulb, ToggleLeft, X } from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    // Передаємо лише рядок типу елемента
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur select-none">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800">Компоненти схеми</h2>
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
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'battery')}
          className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-3 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Battery className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Джерело живлення</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'resistor')}
          className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-3 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Zap className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">Резистор</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'lamp')}
          className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-3 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">Лампа розжарювання</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'switch')}
          className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 p-3 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <ToggleLeft className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Вимикач</span>
        </div>
      </div>
    </aside>
  );
};