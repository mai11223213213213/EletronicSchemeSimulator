import React, { useState, useEffect } from 'react';
import {type CircuitElement, type Wire, type ComponentType } from '../types/cricut';
import { ResistorElement } from './Elements/ResistorElement';
import { BatteryElement } from './Elements/BatteryElement';
import { LampElement } from './Elements/LampElement';
import { SwitchElement } from './Elements/SwitchElement';

interface CanvasProps {
  elements: CircuitElement[];
  wires: Wire[];
  onDropElement: (type: ComponentType, x: number, y: number) => void;
  onSelectElement: (id: string | null) => void;
  selectedId: string | null;
  onMoveElement: (id: string, x: number, y: number) => void;
}

const GRID_SIZE = 10;

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

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

      const x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
      const y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

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
  }, [draggingId, dragOffset, onMoveElement]);

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
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

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
    </div>
  );
};