"use client";
import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-[var(--bg)] bg-[var(--muted)] rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200 ${posClasses[position]}`}>
          {content}
          <div className="absolute w-2 h-2 bg-[var(--muted)] rotate-45" style={{
            ...(position === 'top' ? { bottom: '-4px', left: 'calc(50% - 4px)' } : {}),
            ...(position === 'bottom' ? { top: '-4px', left: 'calc(50% - 4px)' } : {}),
            ...(position === 'left' ? { right: '-4px', top: 'calc(50% - 4px)' } : {}),
            ...(position === 'right' ? { left: '-4px', top: 'calc(50% - 4px)' } : {}),
          }} />
        </div>
      )}
    </div>
  );
}
