"use client";
import React from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${value === color ? 'border-[var(--text)] scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md border border-[var(--line)]" style={{ backgroundColor: value }} />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="flex-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--gold)]"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
