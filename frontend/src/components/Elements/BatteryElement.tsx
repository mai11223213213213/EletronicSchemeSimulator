
import React from 'react';

export const BatteryElement: React.FC<{ isSelected?: boolean }> = ({ isSelected }) => {
  return (
    <g className="cursor-pointer">
      {isSelected && (
        <rect x="-5" y="-15" width="70" height="40" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" rx="4" />
      )}
      {/* Провід вхід */}
      <line x1="0" y1="5" x2="20" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      {/* Довга пластина (+) */}
      <line x1="20" y1="-10" x2="20" y2="20" stroke="#1f2937" strokeWidth="3" />
      {/* Коротка товста пластина (-) */}
      <line x1="32" y1="-2" x2="32" y2="12" stroke="#1f2937" strokeWidth="5" />
      {/* Провід вихід */}
      <line x1="32" y1="5" x2="52" y2="5" stroke="#1f2937" strokeWidth="2.5" />
      {/* Позначки + та - */}
      <text x="16" y="-14" fontSize="10" fontWeight="bold" fill="#374151">+</text>
      <text x="30" y="-14" fontSize="10" fontWeight="bold" fill="#374151">-</text>
    </g>
  );
};