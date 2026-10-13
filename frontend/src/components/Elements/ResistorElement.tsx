import React from 'react';

export const ResistorElement: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return (
    <g className="cursor-pointer">
      {/* Виділення рамкою при кліку */}
      {isSelected && (
        <rect x="-5" y="-12" width="70" height="34" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" rx="4" />
      )}
      {/* Вхідний та вихідний дроти */}
      <line x1="0" y1="5" x2="15" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      <line x1="45" y1="5" x2="60" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      {/* Прямокутник резистора */}
      <rect x="15" y="-3" width="30" height="16" fill="#ffffff" stroke="#1f2937" strokeWidth="2.5" rx="2" />
    </g>
  );
};