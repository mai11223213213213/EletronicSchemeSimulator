import React from 'react';
import {type ComponentType } from '../types/cricut';
import { Battery, Zap, Lightbulb, ToggleLeft } from 'lucide-react';

interface SidebarProps {
  onAddElement: (type: ComponentType, x: number, y: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    // Передаємо лише рядок типу елемента
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-sm select-none z-10">
      <h2 className="text-md font-bold text-gray-800 border-b pb-2">Компоненти схеми</h2>
      <div className="flex flex-col gap-3">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'battery')}
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Battery className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Джерело живлення</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'resistor')}
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Zap className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">Резистор</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'lamp')}
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">Лампа розжарювання</span>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'switch')}
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 transition"
        >
          <ToggleLeft className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Вимикач</span>
        </div>
      </div>
    </aside>
  );
};