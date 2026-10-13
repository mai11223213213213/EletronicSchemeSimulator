import React from 'react';

export const LampElement: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return (
    <g className="cursor-pointer">
      {isSelected && (
        <rect x="-17" y="-22" width="64" height="54" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" rx="4" />
      )}
      {/* Контакти */}
      <line x1="-10" y1="5" x2="10" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      <line x1="30" y1="5" x2="50" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      {/* Коло лампи з хрестиком усередині */}
      <circle cx="20" cy="5" r="14" fill="#ffffff" stroke="#1f2937" strokeWidth="2.5" />
      <line x1="10" y1="-5" x2="30" y2="15" stroke="#1f2937" strokeWidth="2" />
      <line x1="30" y1="-5" x2="10" y2="15" stroke="#1f2937" strokeWidth="2" />
    </g>
  );
};