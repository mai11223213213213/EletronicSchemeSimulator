import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface LampNodeProps {
  data: {
    isOn: boolean;
    label?: string;
  };
}

export const LampNode: React.FC<LampNodeProps> = ({ data }) => {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white border-2 border-gray-800 rounded-lg shadow-md min-w-[80px]">
      {/* Лівий контакт для підключення проводу */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-600 !w-3 !h-3"
      />

      {/* SVG-символ електричної лампочки за стандартом */}
      <svg
        width="50"
        height="50"
        viewBox="0 0 100 100"
        className="transition-colors duration-200"
      >
        {/* Коло лампи */}
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="black"
          strokeWidth="6"
          fill={data.isOn ? '#FACC15' : '#E5E7EB'} // Жовтий якщо горить, сірий якщо ні
        />
        {/* Хрестик всередині (позначення лампи) */}
        <line x1="25" y1="25" x2="75" y2="75" stroke="black" strokeWidth="6" />
        <line x1="75" y1="25" x2="25" y2="75" stroke="black" strokeWidth="6" />
      </svg>

      <span className="text-xs font-semibold mt-1">{data.label || 'Лампа'}</span>

      {/* Правий контакт */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-600 !w-3 !h-3"
      />
    </div>
  );
};