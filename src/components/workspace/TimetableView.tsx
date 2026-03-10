'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { getOrderedScheduleDays } from '@/lib/schedule';
import type { Row, RowAction, WeekStartOption } from '@/types';

export type TimetableItem = {
  id: string;
  courseId: string;
  code: string;
  course: string;
  type: string;
  status: string;
  group: string;
  groupId?: string | null;
  room: string;
  roomId?: string | null;
  instructor: string;
  instructorId?: string | null;
  day: string;
  startMinute: number;
  endMinute: number;
  timeLabel: string;
  conflictTypes?: string[];
  conflictCount?: number;
};

type TimetableViewProps = {
  items?: TimetableItem[];
  rows?: Row[];
  timeMode?: string;
  weekStart?: WeekStartOption | string;
  focusDay?: string;
  onRowAction?: (action: RowAction, row: Row) => void;
  onExportCalendar?: () => void | Promise<void>;
  isLoading?: boolean;
  showConflictLayer?: boolean;
};

const DEFAULT_DAY_ORDER = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const TYPE_COLORS: Record<string, string> = {
  Lecture: 'border-[var(--gold)]/30 bg-[linear-gradient(135deg,var(--gold-muted),transparent)]',
  Section: 'border-[var(--info)]/30 bg-[linear-gradient(135deg,var(--info-muted),transparent)]',
  Lab: 'border-[var(--success)]/30 bg-[linear-gradient(135deg,var(--success-muted),transparent)]',
  Online: 'border-[var(--accent)]/30 bg-[linear-gradient(135deg,var(--accent-muted),transparent)]',
  Hybrid: 'border-[var(--warning)]/30 bg-[linear-gradient(135deg,var(--warning-muted),transparent)]'
};

function formatMinute(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeRange(start: number, end: number) {
  return `${formatMinute(start)} → ${formatMinute(end)}`;
}

function parseRowTime(value: string) {
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

function rowToTimetableItem(row: Row): TimetableItem | null {
  const parsed = parseRowTime(row.time);
  if (!parsed || parsed.endMinute <= parsed.startMinute) return null;

  const [course, type] = row.course.split(' — ');

  return {
    id: row.id,
    courseId: row.id,
    code: row.code || row.id,
    course: course || row.course,
    type: type || 'Lecture',
    status: row.status,
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

function buildLanes(items: TimetableItem[]) {
  const sorted = [...items].sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
  const lanes: number[] = [];
  const assigned = new Map<string, { lane: number; lanes: number }>();

  for (const item of sorted) {
    let lane = lanes.findIndex((endMinute) => endMinute <= item.startMinute);
    if (lane === -1) {
      lanes.push(item.endMinute);
      lane = lanes.length - 1;
    } else {
      lanes[lane] = item.endMinute;
    }
    assigned.set(item.id, { lane, lanes: lanes.length });
  }

  const totalLanes = Math.max(lanes.length, 1);
  for (const item of sorted) {
    const current = assigned.get(item.id);
    if (current) assigned.set(item.id, { lane: current.lane, lanes: totalLanes });
  }

  return assigned;
}

export function TimetableView({
  items,
  rows = [],
  weekStart = 'SATURDAY',
  focusDay,
  onExportCalendar,
  isLoading = false,
  showConflictLayer = true
}: TimetableViewProps) {
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');

  const sourceItems = useMemo(() => {
    if (items?.length) return items;
    return rows.map(rowToTimetableItem).filter(Boolean) as TimetableItem[];
  }, [items, rows]);

  const orderedDays = useMemo(() => {
    const days = getOrderedScheduleDays(weekStart, focusDay);
    return days.length ? days : [...DEFAULT_DAY_ORDER];
  }, [focusDay, weekStart]);

  const dayBuckets = useMemo(() => {
    const minStart = sourceItems.length ? Math.max(360, Math.floor(Math.min(...sourceItems.map((item) => item.startMinute)) / 60) * 60 - 60) : 420;
    const maxEnd = sourceItems.length ? Math.min(1320, Math.ceil(Math.max(...sourceItems.map((item) => item.endMinute)) / 60) * 60 + 60) : 1080;
    const hourHeight = density === 'compact' ? 72 : 92;
    const totalHours = Math.max(1, (maxEnd - minStart) / 60);
    const slots = Array.from({ length: totalHours + 1 }, (_, index) => minStart + index * 60);

    const buckets = orderedDays.map((day) => {
      const dayItems = sourceItems.filter((item) => item.day === day);
      return {
        day,
        laneMap: buildLanes(dayItems),
        items: dayItems,
        total: dayItems.length
      };
    });

    return { minStart, maxEnd, hourHeight, totalHours, slots, buckets };
  }, [density, orderedDays, sourceItems]);

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 md:px-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timetable intelligence</div>
            <h3 className="mt-1 text-xl font-black tracking-tight text-white">Weekly board</h3>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Loading
          </span>
        </div>
        <div className="px-4 py-10 text-center text-sm text-[var(--text-secondary)] md:px-6">Loading timetable sessions…</div>
      </div>
    );
  }

  if (!sourceItems.length) {
    return (
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 md:px-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timetable intelligence</div>
            <h3 className="mt-1 text-xl font-black tracking-tight text-white">Weekly board</h3>
          </div>
          <div className="flex items-center gap-2">
            {onExportCalendar ? (
              <Button variant="secondary" onClick={() => void onExportCalendar()} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Export calendar
              </Button>
            ) : null}
            <Button variant={density === 'compact' ? 'secondary' : 'primary'} onClick={() => setDensity((current) => current === 'compact' ? 'normal' : 'compact')} className="gap-2">
              <span className="material-symbols-outlined text-[18px]">{density === 'compact' ? 'unfold_more' : 'density_small'}</span>
              {density === 'compact' ? 'Normal density' : 'Compact density'}
            </Button>
          </div>
        </div>
        <EmptyState
          icon="calendar_month"
          title="No timetable sessions match the current view"
          description="Try broadening the active filters or reset the intelligence controls to bring sessions back into view."
        />
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timetable intelligence</div>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">Weekly board</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Inspect sessions by type, group, delivery mode, and visible clash cues without leaving the timetable.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onExportCalendar ? (
            <Button variant="secondary" onClick={() => void onExportCalendar()} className="gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              Export calendar
            </Button>
          ) : null}
          <Button variant={density === 'compact' ? 'primary' : 'secondary'} onClick={() => setDensity((current) => current === 'compact' ? 'normal' : 'compact')} className="gap-2">
            <span className="material-symbols-outlined text-[18px]">{density === 'compact' ? 'density_small' : 'unfold_more'}</span>
            {density === 'compact' ? 'Compact on' : 'Compact off'}
          </Button>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {sourceItems.length} session{sourceItems.length === 1 ? '' : 's'} visible
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px] px-4 py-4 md:px-6">
          <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] gap-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <div className="rounded-2xl border border-transparent px-2 py-3 text-left">Time</div>
            {dayBuckets.buckets.map((bucket) => (
              <div key={bucket.day} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-3">
                <div className="text-white text-sm font-black normal-case tracking-normal">{bucket.day}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{bucket.total} session{bucket.total === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[76px_repeat(7,minmax(0,1fr))] gap-3">
            <div className="relative">
              <div style={{ height: `${dayBuckets.totalHours * dayBuckets.hourHeight}px` }} className="relative">
                {dayBuckets.slots.slice(0, -1).map((slot, index) => (
                  <div key={slot} className="absolute left-0 right-0" style={{ top: `${index * dayBuckets.hourHeight}px` }}>
                    <div className="pr-2 text-right text-[11px] font-semibold text-[var(--text-secondary)]">{formatMinute(slot)}</div>
                  </div>
                ))}
              </div>
            </div>

            {dayBuckets.buckets.map((bucket) => (
              <div key={bucket.day} className="relative rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface-2))] shadow-[var(--shadow-sm)]" style={{ height: `${dayBuckets.totalHours * dayBuckets.hourHeight}px` }}>
                {dayBuckets.slots.slice(0, -1).map((slot, index) => (
                  <div key={slot} className="absolute left-0 right-0 border-t border-dashed border-[var(--border-soft)]" style={{ top: `${index * dayBuckets.hourHeight}px` }} />
                ))}
                {bucket.items.map((item) => {
                  const laneInfo = bucket.laneMap.get(item.id) || { lane: 0, lanes: 1 };
                  const gap = 8;
                  const width = `calc((100% - ${(laneInfo.lanes - 1) * gap}px) / ${laneInfo.lanes})`;
                  const left = `calc(${laneInfo.lane} * (${width} + ${gap}px))`;
                  const top = ((item.startMinute - dayBuckets.minStart) / 60) * dayBuckets.hourHeight;
                  const height = Math.max(64, ((item.endMinute - item.startMinute) / 60) * dayBuckets.hourHeight - 6);
                  const typeColor = TYPE_COLORS[item.type] || 'border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))]';
                  const conflictVisible = Boolean(showConflictLayer && item.conflictTypes?.length);

                  return (
                    <article
                      key={item.id}
                      className={`absolute rounded-[22px] border p-3 shadow-[var(--shadow-md)] transition-transform hover:-translate-y-0.5 ${typeColor} ${conflictVisible ? 'ring-2 ring-[var(--danger)]/40' : ''}`}
                      style={{ top: `${top + 3}px`, left, width, height }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">{item.type}</span>
                        {conflictVisible ? (
                          <span className="rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--danger)]">
                            {item.conflictCount} clash{item.conflictCount === 1 ? '' : 'es'}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-black text-white leading-tight">{item.code}</div>
                      <div className="mt-1 text-xs font-medium text-white/90 line-clamp-2">{item.course}</div>
                      <div className="mt-2 text-[11px] font-semibold text-[var(--text-secondary)]">{timeRange(item.startMinute, item.endMinute)}</div>
                      <div className="mt-2 space-y-1 text-[11px] text-[var(--text-secondary)]">
                        <div>{item.group !== '-' ? `Group ${item.group}` : 'Group unassigned'}</div>
                        <div>{item.room !== '-' ? `Room ${item.room}` : 'Room unassigned'}</div>
                        <div>{item.instructor !== '-' ? item.instructor : 'Instructor unassigned'}</div>
                      </div>
                      {conflictVisible ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.conflictTypes?.map((conflict) => (
                            <span key={`${item.id}-${conflict}`} className="rounded-full border border-[var(--danger)]/30 bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">
                              {conflict}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
