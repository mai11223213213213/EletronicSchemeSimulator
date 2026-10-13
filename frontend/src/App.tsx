import React, { useEffect } from 'react';
import { Sidebar } from './components/SideBar';
import { Canvas } from './components/Canvas';
import { useCircuitEditor } from './Logic/useCircuitEditor';

export default function App() {
  const {
    elements,
    wires,
    selectedId,
    setSelectedId,
    addElement,
    moveElement,
    rotateSelected,
  } = useCircuitEditor();

  // Додаємо слухач клавіші 'R' для обертання деталі
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        rotateSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      <Sidebar onAddElement={addElement} />
      <Canvas
        elements={elements}
        wires={wires}
        onDropElement={addElement}
        onSelectElement={setSelectedId}
        selectedId={selectedId}
        onMoveElement={moveElement}
      />
    </div>
  );
}