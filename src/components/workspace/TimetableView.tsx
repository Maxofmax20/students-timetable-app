'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Row, RowAction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface TimetableViewProps {
  rows: Row[];
  timeMode: string;
  weekStart: string;
  focusDay?: string;
  onRowAction?: (action: RowAction, row: Row) => void;
  onExportCalendar?: () => void;
  isLoading?: boolean;
}

const ORDERED_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const WEEK_START_MAP: Record<string, (typeof ORDERED_DAYS)[number]> = {
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
  MONDAY: 'Mon'
};

export function TimetableView({ rows, weekStart, focusDay, onRowAction, onExportCalendar, isLoading }: TimetableViewProps) {
  const normalizedWeekStart = WEEK_START_MAP[weekStart] || 'Sat';
  const startIdx = ORDERED_DAYS.findIndex((day) => day === normalizedWeekStart);
  const baseDays = [...ORDERED_DAYS.slice(startIdx), ...ORDERED_DAYS.slice(0, startIdx)];
  const focusDayKey = focusDay?.substring(0, 3);
  const displayDays = focusDayKey && baseDays.includes(focusDayKey as (typeof ORDERED_DAYS)[number])
    ? [focusDayKey as (typeof ORDERED_DAYS)[number], ...baseDays.filter((day) => day !== focusDayKey)]
    : baseDays;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] animate-panel-pop shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="space-y-3 p-3">
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] animate-panel-pop shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-soft)] bg-[var(--bg-raised)]/50 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">Timetable</h2>
          <p className="text-sm text-[var(--text-secondary)]">Visualize and resolve scheduling overlaps.</p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">
            List view
          </div>

          <Button variant="secondary" size="sm" className="gap-2" onClick={onExportCalendar}>
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span className="hidden sm:inline">Export ICS</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Weekly agenda</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The timetable is shown in its stable list view so every scheduled session remains visible and reliable.
          </p>
        </div>

        <div className="space-y-4">
          {displayDays.map((day) => {
            const dayRows = rows
              .filter((row) => row.day.substring(0, 3).toLowerCase() === day.toLowerCase() && row.time !== '--')
              .sort((a, b) => a.time.localeCompare(b.time));

            return (
              <section key={day} className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)]">{day}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{dayRows.length} item{dayRows.length === 1 ? '' : 's'}</div>
                </div>

                {dayRows.length ? (
                  <div className="space-y-3 p-3">
                    {dayRows.map((course) => {
                      const isConflict = course.status === 'Conflict';
                      const [courseTitle, courseKindRaw] = course.course.split(' — ');
                      const courseKind = courseKindRaw || 'Session';

                      return (
                        <button
                          key={course.id}
                          onClick={() => onRowAction?.('Edit', course)}
                          className={cn(
                            'w-full rounded-2xl border bg-[var(--bg-raised)] p-4 text-left transition-all hover:shadow-[var(--shadow-md)]',
                            isConflict ? 'border-[var(--danger)]/40' : 'border-[var(--border)]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="break-words text-sm font-bold leading-snug text-white">{courseTitle}</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-[var(--gold-soft)]">{courseKind}</span>
                                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">{course.group}</span>
                              </div>
                            </div>
                            {isConflict ? <span className="material-symbols-outlined shrink-0 text-lg text-[var(--danger)]">warning</span> : null}
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Time</div>
                              <div className="mt-1 font-semibold text-white">{course.time}</div>
                            </div>
                            <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Room</div>
                              <div className="mt-1 font-semibold text-white">{course.room}</div>
                            </div>
                            <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2 sm:col-span-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor</div>
                              <div className="mt-1 break-words font-semibold text-white">{course.instructor}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-[var(--text-secondary)]">No scheduled classes for {day}.</div>
                )}
              </section>
            );
          })}

          {!rows.length ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-secondary)]">
              No scheduled courses yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
