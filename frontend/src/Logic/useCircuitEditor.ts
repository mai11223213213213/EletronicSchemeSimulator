import { useState } from 'react';
import {type CircuitElement,type Wire, type ComponentType } from '../types/cricut';

export const useCircuitEditor = () => {
  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Додавання нового елемента
  const addElement = (type: ComponentType, x: number, y: number) => {
    const newElement: CircuitElement = {
      id: `el-${Date.now()}`,
      type,
      x,
      y,
      rotation: 0,
      pins: [
        { id: 'pin-1', x: 0, y: 5 },
        { id: 'pin-2', x: 60, y: 5 },
      ],
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  // Переміщення елемента
  const moveElement = (id: string, x: number, y: number) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)));
  };

  // Обертання компонента на 90 градусів клавішею 'R'
  const rotateSelected = () => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, rotation: (el.rotation + 45) % 360 } : el))
    );
  };

  return {
    elements,
    wires,
    selectedId,
    setSelectedId,
    addElement,
    moveElement,
    rotateSelected,
  };
};