import React, { useState, useEffect } from 'react';
import {type CircuitElement, type Wire, type ComponentType } from '../types/cricut';
import { ResistorElement } from './Elements/ResistorElement';
import { BatteryElement } from './Elements/BatteryElement';
import { LampElement } from './Elements/LampElement';
import { SwitchElement } from './Elements/SwitchElement';
import { Grid2X2, Settings2 } from 'lucide-react';

interface CanvasProps {
  elements: CircuitElement[];
  wires: Wire[];
  onDropElement: (type: ComponentType, x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  selectedId: string | null;
  onMoveElement: (id: string, x: number, y: number) => void;
}

const MIN_GRID_SIZE = 5;
const MAX_GRID_SIZE = 30;

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  wires,
  onDropElement,
  onSelectElement,
  selectedId,
  onMoveElement,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [gridSize, setGridSize] = useState(10);
  const [gridVisible, setGridVisible] = useState(true);
  const [gridSettingsOpen, setGridSettingsOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const x = Math.round(rawX / gridSize) * gridSize;
    const y = Math.round(rawY / gridSize) * gridSize;

    const type = e.dataTransfer.getData('text/plain') as ComponentType;
    if (!type) return;

    onDropElement(type, x, y);
  };

  const handleMouseDown = (e: React.MouseEvent, el: CircuitElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    setDraggingId(el.id);
    setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return;
      const rawX = e.clientX - dragOffset.x;
      const rawY = e.clientY - dragOffset.y;

      const x = Math.round(rawX / gridSize) * gridSize;
      const y = Math.round(rawY / gridSize) * gridSize;

      onMoveElement(draggingId, x, y);
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragOffset, gridSize, onMoveElement]);

  return (
    <div
      className="flex-1 bg-slate-50 relative overflow-hidden cursor-crosshair select-none h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => onSelectElement(null)}
    >
      {/* Сітка фону */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <circle cx={gridSize / 2} cy={gridSize / 2} r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        {gridVisible && <rect width="100%" height="100%" fill="url(#grid)" />}

        {/* Дроти */}
        {wires.map((wire) => (
          <line key={wire.id} x1="0" y1="0" x2="100" y2="100" stroke="#2563eb" strokeWidth="2.5" />
        ))}
      </svg>

      {/* Елементи на полотні */}
      <svg className="w-full h-full absolute inset-0">
        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          return (
            <g
              key={el.id}
              transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
              onMouseDown={(e) => handleMouseDown(e, el)}
              className="cursor-move"
            >
              {el.type === 'resistor' && <ResistorElement isSelected={isSelected} />}
              {el.type === 'battery' && <BatteryElement isSelected={isSelected} />}
              {el.type === 'lamp' && <LampElement isSelected={isSelected} />}
              {el.type === 'switch' && <SwitchElement isSelected={isSelected} />}
            </g>
          );
        })}
      </svg>

      <div className={`absolute bottom-4 right-4 z-20 flex items-end gap-2 ${gridSettingsOpen ? 'flex-row' : ''}`}>
        {gridSettingsOpen && (
          <div className="w-64 rounded-md border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Grid2X2 className="h-4 w-4 text-gray-900" />
                Grid settings
              </div>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {gridSize} px
              </span>
            </div>
            <label className="mb-2 flex items-center justify-between text-sm text-gray-700">
              <span>Show grid</span>
              <input
                type="checkbox"
                checked={gridVisible}
                onChange={(event) => setGridVisible(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
            </label>
            <label className="block text-sm text-gray-700" htmlFor="grid-size">
              Grid scale
            </label>
            <input
              id="grid-size"
              type="range"
              min={MIN_GRID_SIZE}
              max={MAX_GRID_SIZE}
              step="1"
              value={gridSize}
              onChange={(event) => setGridSize(Number(event.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{MIN_GRID_SIZE} px</span>
              <span>{MAX_GRID_SIZE} px</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setGridSettingsOpen((open) => !open)}
          aria-expanded={gridSettingsOpen}
          aria-label={gridSettingsOpen ? 'Close grid settings' : 'Open grid settings'}
          title="Grid settings"
          className="flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur transition hover:bg-white"
        >
          <Settings2 className="h-4 w-4 text-gray-900" />
          <span>Grid</span>
          <span className="text-xs text-gray-500">{gridSize}px</span>
        </button>
      </div>
    </div>
  );
};