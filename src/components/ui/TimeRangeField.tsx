'use client';

import { useMemo } from 'react';
import { AppSelect } from '@/components/ui/AppSelect';
import { cn } from '@/lib/utils';

type TimeRangeFieldProps = {
  label?: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  helperText?: string;
  errorText?: string;
};

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  const value = `${hours}:${minutes}`;
  return { value, label: value, keywords: `${hours}${minutes}` };
});

const QUICK_DURATIONS = [45, 60, 90, 120];

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const bounded = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
  const hours = Math.floor(bounded / 60).toString().padStart(2, '0');
  const minutes = (bounded % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function TimeRangeField({ label = 'Time range', start, end, onStartChange, onEndChange, helperText, errorText }: TimeRangeFieldProps) {
  const startIndex = useMemo(() => TIME_OPTIONS.findIndex((option) => option.value === start), [start]);
  const endOptions = useMemo(() => {
    if (startIndex < 0) return TIME_OPTIONS;
    return TIME_OPTIONS.slice(startIndex + 1);
  }, [startIndex]);

  const durationLabel = useMemo(() => {
    const minutes = timeToMinutes(end) - timeToMinutes(start);
    if (!Number.isFinite(minutes) || minutes <= 0) return 'Choose a valid range';
    return `${minutes} min session`;
  }, [end, start]);

  const setQuickDuration = (minutes: number) => {
    const nextEnd = minutesToTime(timeToMinutes(start) + minutes);
    if (timeToMinutes(nextEnd) <= timeToMinutes(start)) return;
    onEndChange(nextEnd);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</label>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
          {durationLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <AppSelect
          label="Starts"
          value={start}
          onChange={(value) => {
            onStartChange(value);
            if (timeToMinutes(end) <= timeToMinutes(value)) {
              onEndChange(minutesToTime(timeToMinutes(value) + 60));
            }
          }}
          options={TIME_OPTIONS}
          placeholder="Start"
          compact
          searchable
          searchPlaceholder="Start time"
        />
        <div className="hidden h-[52px] items-center justify-center text-[var(--text-muted)] md:flex">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </div>
        <AppSelect
          label="Ends"
          value={end}
          onChange={onEndChange}
          options={endOptions}
          placeholder="End"
          compact
          searchable
          searchPlaceholder="End time"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_DURATIONS.map((minutes) => {
          const active = timeToMinutes(end) - timeToMinutes(start) === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => setQuickDuration(minutes)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
                active
                  ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'
              )}
            >
              {minutes} min
            </button>
          );
        })}
      </div>

      {errorText ? <div className="text-[11px] font-semibold text-[var(--danger)]">{errorText}</div> : helperText ? <div className="text-[11px] text-[var(--text-secondary)]">{helperText}</div> : null}
    </div>
  );
}
