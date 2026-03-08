"use client";
import React from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <div className="relative">
      <input 
        type="date" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-colors"
      />
    </div>
  );
}
