import React, { useEffect } from 'react';
import { CircuitWorkspace } from './components/CircuitWorkspace';
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
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <CircuitWorkspace
        elements={elements}
        wires={wires}
        onAddElement={addElement}
        onSelectElement={setSelectedId}
        selectedId={selectedId}
        onMoveElement={moveElement}
      />
    </div>
  );
}