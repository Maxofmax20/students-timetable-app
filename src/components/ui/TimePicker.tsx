"use client";
import React from 'react';

interface TimePickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  mode?: '12h' | '24h';
}

export function TimePicker({ value, onChange, mode = '24h' }: TimePickerProps) {
  // A simple native time input customized
  return (
    <div className="relative">
      <input 
        type="time" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-colors"
      />
    </div>
  );
}
