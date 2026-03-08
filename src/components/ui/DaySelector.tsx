"use client";
import React from 'react';

interface DaySelectorProps {
  value: string[];
  onChange: (days: string[]) => void;
  weekStart?: 'SATURDAY' | 'SUNDAY' | 'MONDAY';
}

const ALL_DAYS = [
  { id: 'Sat', label: 'Saturday' },
  { id: 'Sun', label: 'Sunday' },
  { id: 'Mon', label: 'Monday' },
  { id: 'Tue', label: 'Tuesday' },
  { id: 'Wed', label: 'Wednesday' },
  { id: 'Thu', label: 'Thursday' },
  { id: 'Fri', label: 'Friday' },
];

export function DaySelector({ value, onChange, weekStart = 'SATURDAY' }: DaySelectorProps) {
  const startIndex = ALL_DAYS.findIndex(d => d.label.toUpperCase() === weekStart);
  const orderedDays = startIndex >= 0 
    ? [...ALL_DAYS.slice(startIndex), ...ALL_DAYS.slice(0, startIndex)]
    : ALL_DAYS;

  const toggleDay = (dayId: string) => {
    if (value.includes(dayId)) {
      onChange(value.filter(d => d !== dayId));
    } else {
      onChange([...value, dayId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {orderedDays.map(day => {
        const isActive = value.includes(day.id);
        return (
          <button
            key={day.id}
            type="button"
            onClick={() => toggleDay(day.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              isActive 
                ? 'bg-[var(--surface-3)] border-[var(--gold)] text-[var(--gold-soft)] shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-3)]'
            }`}
          >
            {day.id}
          </button>
        );
      })}
    </div>
  );
}
