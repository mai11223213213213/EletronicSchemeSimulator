import React from 'react';

export const SwitchElement: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return (
    <g className="cursor-pointer">
      {isSelected && (
        <rect x="-5" y="-18" width="70" height="40" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" rx="4" />
      )}
      {/* Вхідний та вихідний контакти */}
      <line x1="0" y1="5" x2="15" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      <line x1="45" y1="5" x2="60" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      {/* Клеми (точки з'єднання) */}
      <circle cx="15" cy="5" r="3" fill="#1f2937" />
      <circle cx="45" cy="5" r="3" fill="#1f2937" />
      {/* Рухомий контакт (розімкнутий під кутом) */}
      <line x1="15" y1="5" x2="40" y2="-7" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
};