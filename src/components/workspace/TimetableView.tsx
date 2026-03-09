'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Row, RowAction } from '@/types';
import type { ScheduleItem } from '@/lib/schedule';
import { formatMinute, getOrderedScheduleDays, getScheduleBounds, layoutDayItems } from '@/lib/schedule';

type ViewMode = 'grid' | 'list';

interface TimetableViewProps {
  items?: ScheduleItem[];
  rows?: Row[];
  timeMode?: string;
  weekStart: string;
  focusDay?: string;
  onRowAction?: (action: RowAction, row: Row) => void;
  onExportCalendar?: () => void;
  isLoading?: boolean;
}

const GRID_ROW_HEIGHT = 72;
const GRID_TIME_RAIL_WIDTH = 72;
const GRID_MIN_COLUMN_WIDTH = 96;
const TIMETABLE_VIEW_KEY = 'students-timetable:view-mode';

function getItemTone(item: ScheduleItem) {
  const variants = [
    'border-blue-400/40 bg-blue-500/12',
    'border-emerald-400/40 bg-emerald-500/12',
    'border-rose-400/40 bg-rose-500/12',
    'border-amber-400/40 bg-amber-500/12',
    'border-purple-400/40 bg-purple-500/12'
  ];

  const seed = `${item.groupId ?? item.group}:${item.roomId ?? item.room}`;
  const hash = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[hash % variants.length];
}

function buildHourMarks(startMinute: number, endMinute: number) {
  const marks: number[] = [];
  for (let minute = startMinute; minute <= endMinute; minute += 60) {
    marks.push(minute);
  }
  return marks;
}

function parseRowTimeToMinutes(value: string) {
  const parts = value.split(/\s*(?:→|->|–|—|-)\s*/).filter(Boolean);
  if (parts.length !== 2) return null;

  const [start, end] = parts.map((part) => part.trim());
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  if ([startHour, startMinute, endHour, endMinute].some((part) => !Number.isFinite(part))) {
    return null;
  }

  return {
    startMinute: startHour * 60 + startMinute,
    endMinute: endHour * 60 + endMinute
  };
}

function rowToScheduleItem(row: Row): ScheduleItem | null {
  const parsed = parseRowTimeToMinutes(row.time);
  if (!parsed) return null;

  const [course, type] = row.course.split(' — ');
  return {
    id: row.id,
    courseId: row.id,
    code: row.code || row.id,
    course: course || row.course,
    type: type || 'Session',
    status: row.status.toUpperCase(),
    group: row.group,
    groupId: row.groupId ?? null,
    room: row.room,
    roomId: row.roomId ?? null,
    instructor: row.instructor,
    instructorId: row.instructorId ?? null,
    day: row.day.substring(0, 3),
    startMinute: parsed.startMinute,
    endMinute: parsed.endMinute,
    timeLabel: `${formatMinute(parsed.startMinute)} → ${formatMinute(parsed.endMinute)}`
  };
}

export function TimetableView({ items, rows = [], weekStart, focusDay, onExportCalendar, isLoading }: TimetableViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [mobileDay, setMobileDay] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(max-width: 767px)');
    const stored = window.localStorage.getItem(TIMETABLE_VIEW_KEY);

    if (stored === 'list' || stored === 'grid') {
      setViewMode(stored);
    }

    const update = () => {
      setIsMobile(media.matches);
    };

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const canonicalItems = useMemo(() => {
    if (items?.length) return items;
    return rows.map(rowToScheduleItem).filter(Boolean) as ScheduleItem[];
  }, [items, rows]);

  const orderedDays = useMemo(() => getOrderedScheduleDays(weekStart, focusDay), [weekStart, focusDay]);

  useEffect(() => {
    const preferredDay = focusDay?.trim().substring(0, 3);
    if (preferredDay && orderedDays.includes(preferredDay as (typeof orderedDays)[number])) {
      setMobileDay(preferredDay);
      return;
    }

    const firstWithItems = orderedDays.find((day) => canonicalItems.some((item) => item.day === day));
    setMobileDay(firstWithItems || orderedDays[0] || '');
  }, [orderedDays, canonicalItems, focusDay]);

  const itemsByDay = useMemo(
    () => Object.fromEntries(orderedDays.map((day) => [day, canonicalItems.filter((item) => item.day === day)])) as Record<string, ScheduleItem[]>,
    [canonicalItems, orderedDays]
  );
  const hasItems = canonicalItems.length > 0;
  const { startMinute, endMinute } = useMemo(() => getScheduleBounds(canonicalItems), [canonicalItems]);
  const hourMarks = useMemo(() => buildHourMarks(startMinute, endMinute), [startMinute, endMinute]);
  const totalHours = Math.max((endMinute - startMinute) / 60, 1);

  const showDesktopGrid = !isMobile && viewMode === 'grid';
  const showMobileGrid = isMobile && viewMode === 'grid';
  const gridMinWidth = GRID_TIME_RAIL_WIDTH + orderedDays.length * GRID_MIN_COLUMN_WIDTH;
  const selectedMobileDay = mobileDay && orderedDays.includes(mobileDay as (typeof orderedDays)[number]) ? mobileDay : orderedDays[0];
  const selectedMobileIndex = Math.max(orderedDays.indexOf(selectedMobileDay as (typeof orderedDays)[number]), 0);
  const selectedMobileItems = selectedMobileDay ? (itemsByDay[selectedMobileDay] || []) : [];
  const mobilePlacements = layoutDayItems(selectedMobileItems);
  const mobileTimeRailWidth = 56;

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TIMETABLE_VIEW_KEY, mode);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-md)] animate-panel-pop">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-soft)] bg-[var(--bg-raised)]/50 p-4 md:p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
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
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-md)] animate-panel-pop">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-soft)] bg-[var(--bg-raised)]/50 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">Timetable</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {isMobile
              ? 'On phone, Grid shows one day at a time with clear day navigation. List stays available for scanning the whole week.'
              : 'Switch between Grid and List on desktop using the same real schedule data.'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1 shadow-inner">
              <button
                type="button"
                onClick={() => handleModeChange('grid')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-bold transition-all md:px-4',
                  viewMode === 'grid' ? 'border border-[var(--border)] bg-[var(--surface-3)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-white'
                )}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('list')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-bold transition-all md:px-4',
                  viewMode === 'list' ? 'border border-[var(--border)] bg-[var(--surface-3)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-white'
                )}
              >
                List
              </button>
            </div>

            <Button variant="secondary" size="sm" className="gap-2" onClick={onExportCalendar}>
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span className="hidden sm:inline">Export ICS</span>
            </Button>
          </div>

          {isMobile ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">
              {viewMode === 'grid' ? 'Mobile grid' : 'List view'}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {!hasItems ? (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-lg)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--gold)]">
              <span className="material-symbols-outlined text-[26px]">event_busy</span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">No scheduled sessions yet</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Add real session day/time details in Courses and they will appear in both the list and grid timetable views.
            </p>
          </div>
        ) : showDesktopGrid ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-lg)]">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Full week grid</div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  All {orderedDays.length} days are rendered. On narrower desktop widths, scroll horizontally to reveal the full week.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                Horizontal scroll
              </div>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
              <div className="overflow-x-auto overflow-y-hidden pb-2">
                <div style={{ minWidth: `${gridMinWidth}px` }}>
                  <div className="grid border-b border-[var(--border)] bg-[var(--surface-2)]" style={{ gridTemplateColumns: `${GRID_TIME_RAIL_WIDTH}px repeat(${orderedDays.length}, minmax(${GRID_MIN_COLUMN_WIDTH}px, 1fr))` }}>
                    <div className="sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface-2)]" />
                    {orderedDays.map((day) => (
                      <div key={day} className="border-r border-[var(--border-soft)] px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)] last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: `${GRID_TIME_RAIL_WIDTH}px repeat(${orderedDays.length}, minmax(${GRID_MIN_COLUMN_WIDTH}px, 1fr))` }}>
                    <div className="sticky left-0 z-10 relative border-r border-[var(--border)] bg-[var(--surface)]">
                      {hourMarks.map((mark, index) => (
                        <div
                          key={mark}
                          className="absolute inset-x-0 px-3 text-right text-[11px] font-bold text-[var(--text-muted)]"
                          style={{ top: `${index * GRID_ROW_HEIGHT - 8}px` }}
                        >
                          {formatMinute(mark)}
                        </div>
                      ))}
                    </div>

                    {orderedDays.map((day) => {
                      const dayItems = itemsByDay[day] || [];
                      const placements = layoutDayItems(dayItems);

                      return (
                        <div
                          key={day}
                          className="relative border-r border-[var(--border-soft)] last:border-r-0"
                          style={{ minHeight: `${totalHours * GRID_ROW_HEIGHT}px` }}
                        >
                          {hourMarks.slice(0, -1).map((mark, index) => (
                            <div
                              key={mark}
                              className="pointer-events-none absolute inset-x-0 border-t border-[var(--border-soft)]/70"
                              style={{ top: `${index * GRID_ROW_HEIGHT}px` }}
                            />
                          ))}

                          {dayItems.length === 0 ? (
                            <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl border border-dashed border-[var(--border)]/80 bg-[var(--surface-2)]/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                              No sessions
                            </div>
                          ) : null}

                          {placements.map(({ item, lane, lanes }) => {
                            const top = ((item.startMinute - startMinute) / 60) * GRID_ROW_HEIGHT;
                            const height = Math.max(((item.endMinute - item.startMinute) / 60) * GRID_ROW_HEIGHT, 56);
                            const width = `calc(${100 / lanes}% - 8px)`;
                            const left = `calc(${(lane * 100) / lanes}% + 4px)`;
                            const tone = getItemTone(item);

                            return (
                              <article
                                key={item.id}
                                className={cn('absolute overflow-hidden rounded-2xl border px-3 py-2 shadow-[var(--shadow-md)] transition-transform hover:scale-[1.01]', tone)}
                                style={{ top: `${top + 4}px`, left, width, height: `${height - 8}px` }}
                              >
                                <div className="flex h-full flex-col justify-between gap-2">
                                  <div className="space-y-1 min-w-0">
                                    <div className="truncate text-xs font-bold text-white">{item.course}</div>
                                    <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">{item.type}</div>
                                  </div>

                                  <div className="space-y-1 text-[10px] text-white/85">
                                    <div className="truncate font-semibold">{item.group}</div>
                                    <div className="truncate">{item.room}</div>
                                    <div className="truncate">{formatMinute(item.startMinute)} → {formatMinute(item.endMinute)}</div>
                                    {height >= 96 ? <div className="truncate text-white/70">{item.instructor}</div> : null}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMobileGrid ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Mobile grid</div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    One day at a time, placed by real start/end times.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  {selectedMobileIndex + 1} / {orderedDays.length}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileDay(orderedDays[Math.max(selectedMobileIndex - 1, 0)])}
                  disabled={selectedMobileIndex === 0}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous day"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>

                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex min-w-max gap-2 pr-1">
                    {orderedDays.map((day) => {
                      const isActive = day === selectedMobileDay;
                      const count = itemsByDay[day]?.length || 0;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setMobileDay(day)}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left transition-all',
                            isActive
                              ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-white shadow-[var(--shadow-sm)]'
                              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
                          )}
                        >
                          <div className="text-xs font-bold uppercase tracking-[0.12em]">{day}</div>
                          <div className="mt-0.5 text-[11px]">{count} item{count === 1 ? '' : 's'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDay(orderedDays[Math.min(selectedMobileIndex + 1, orderedDays.length - 1)])}
                  disabled={selectedMobileIndex === orderedDays.length - 1}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next day"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
              <div className="grid border-b border-[var(--border)] bg-[var(--surface-2)]" style={{ gridTemplateColumns: `${mobileTimeRailWidth}px 1fr` }}>
                <div className="border-r border-[var(--border)]" />
                <div className="px-4 py-4 text-center text-sm font-bold uppercase tracking-[0.15em] text-[var(--gold)]">{selectedMobileDay}</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: `${mobileTimeRailWidth}px 1fr` }}>
                <div className="relative border-r border-[var(--border)] bg-[var(--surface)]">
                  {hourMarks.map((mark, index) => (
                    <div
                      key={mark}
                      className="absolute inset-x-0 px-2 text-right text-[10px] font-bold text-[var(--text-muted)]"
                      style={{ top: `${index * GRID_ROW_HEIGHT - 7}px` }}
                    >
                      {formatMinute(mark)}
                    </div>
                  ))}
                </div>

                <div className="relative" style={{ minHeight: `${totalHours * GRID_ROW_HEIGHT}px` }}>
                  {hourMarks.slice(0, -1).map((mark, index) => (
                    <div
                      key={mark}
                      className="pointer-events-none absolute inset-x-0 border-t border-[var(--border-soft)]/70"
                      style={{ top: `${index * GRID_ROW_HEIGHT}px` }}
                    />
                  ))}

                  {selectedMobileItems.length === 0 ? (
                    <div className="absolute inset-x-3 top-3 rounded-xl border border-dashed border-[var(--border)]/80 bg-[var(--surface-2)]/70 px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      No sessions scheduled for {selectedMobileDay}
                    </div>
                  ) : null}

                  {mobilePlacements.map(({ item, lane, lanes }) => {
                    const top = ((item.startMinute - startMinute) / 60) * GRID_ROW_HEIGHT;
                    const height = Math.max(((item.endMinute - item.startMinute) / 60) * GRID_ROW_HEIGHT, 68);
                    const width = `calc(${100 / lanes}% - 8px)`;
                    const left = `calc(${(lane * 100) / lanes}% + 4px)`;
                    const tone = getItemTone(item);

                    return (
                      <article
                        key={item.id}
                        className={cn('absolute overflow-hidden rounded-2xl border px-3 py-3 shadow-[var(--shadow-md)] active:scale-[0.99]', tone)}
                        style={{ top: `${top + 4}px`, left, width, height: `${height - 8}px` }}
                      >
                        <div className="flex h-full flex-col justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="line-clamp-2 text-sm font-bold leading-snug text-white">{item.course}</div>
                            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">{item.type}</div>
                          </div>
                          <div className="space-y-1 text-[11px] text-white/90">
                            <div className="truncate font-semibold">{item.group}</div>
                            <div className="truncate">{item.room}</div>
                            <div className="truncate">{formatMinute(item.startMinute)} → {formatMinute(item.endMinute)}</div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Weekly agenda</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The same real schedule items are grouped day by day here for easier scanning.
              </p>
            </div>

            {orderedDays.map((day) => {
              const dayItems = [...(itemsByDay[day] || [])].sort((a, b) => a.startMinute - b.startMinute);

              return (
                <section key={day} className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold)]">{day}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{dayItems.length} item{dayItems.length === 1 ? '' : 's'}</div>
                  </div>

                  {dayItems.length ? (
                    <div className="space-y-3 p-3">
                      {dayItems.map((item) => {
                        const isConflict = item.status === 'CONFLICT';
                        return (
                          <article
                            key={item.id}
                            className={cn('rounded-2xl border bg-[var(--bg-raised)] p-4 transition-all hover:shadow-[var(--shadow-md)]', isConflict ? 'border-[var(--danger)]/40' : 'border-[var(--border)]')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-sm font-bold leading-snug text-white">{item.course}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-[var(--gold-soft)]">{item.type}</span>
                                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">{item.group}</span>
                                </div>
                              </div>
                              {isConflict ? <span className="material-symbols-outlined shrink-0 text-lg text-[var(--danger)]">warning</span> : null}
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Time</div>
                                <div className="mt-1 font-semibold text-white">{formatMinute(item.startMinute)} → {formatMinute(item.endMinute)}</div>
                              </div>
                              <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Room</div>
                                <div className="mt-1 font-semibold text-white">{item.room}</div>
                              </div>
                              <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2 sm:col-span-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Instructor</div>
                                <div className="mt-1 break-words font-semibold text-white">{item.instructor}</div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-[var(--text-secondary)]">No scheduled classes for {day}.</div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
