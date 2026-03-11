'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getOrderedScheduleDays, layoutDayItems, type TimetableLayoutItem } from '@/lib/schedule';
import { cn } from '@/lib/utils';
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

type CardPreset = 'rich' | 'comfortable' | 'compact' | 'micro';
type ViewMode = 'grid' | 'list';

const DEFAULT_DAY_ORDER = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const VIEW_MODE_KEY = 'students-timetable:view-mode';
const TYPE_META: Record<string, { tone: string; short: string }> = {
  Lecture: {
    tone: 'border-[var(--gold)]/30 bg-[linear-gradient(135deg,var(--gold-muted),transparent)]',
    short: 'Lec'
  },
  Section: {
    tone: 'border-[var(--info)]/30 bg-[linear-gradient(135deg,var(--info-muted),transparent)]',
    short: 'Sec'
  },
  Lab: {
    tone: 'border-[var(--success)]/30 bg-[linear-gradient(135deg,var(--success-muted),transparent)]',
    short: 'Lab'
  },
  Online: {
    tone: 'border-[var(--accent)]/30 bg-[linear-gradient(135deg,var(--accent-muted),transparent)]',
    short: 'Online'
  },
  Hybrid: {
    tone: 'border-[var(--warning)]/30 bg-[linear-gradient(135deg,var(--warning-muted),transparent)]',
    short: 'Hybrid'
  }
};

function formatMinute(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function compactTimeRange(start: number, end: number) {
  return `${formatMinute(start)}–${formatMinute(end)}`;
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

function getCardPreset({
  height,
  lanes,
  density,
  isMobile
}: {
  height: number;
  lanes: number;
  density: 'normal' | 'compact';
  isMobile: boolean;
}): CardPreset {
  if (height <= 72 || lanes >= 4 || (isMobile && lanes >= 3)) return 'micro';
  if (height <= 96 || lanes >= 3 || (density === 'compact' && height <= 116) || (isMobile && lanes >= 2)) return 'compact';
  if (height <= 144 || density === 'compact' || isMobile) return 'comfortable';
  return 'rich';
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function ViewToggle({
  viewMode,
  onChange
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]">
      {(['grid', 'list'] as const).map((mode) => {
        const active = mode === viewMode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all',
              active
                ? 'bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-secondary)] hover:text-white'
            )}
          >
            {mode === 'grid' ? 'Grid view' : 'List view'}
          </button>
        );
      })}
    </div>
  );
}

function SessionCard({
  item,
  placement,
  top,
  height,
  density,
  isMobile,
  showConflictLayer,
  onOpen
}: {
  item: TimetableItem;
  placement: TimetableLayoutItem;
  top: number;
  height: number;
  density: 'normal' | 'compact';
  isMobile: boolean;
  showConflictLayer: boolean;
  onOpen: (item: TimetableItem) => void;
}) {
  const gap = isMobile ? 6 : 8;
  const width = `calc((100% - ${(placement.lanes - 1) * gap}px) / ${placement.lanes})`;
  const left = `calc(${placement.lane} * (${width} + ${gap}px))`;
  const preset = getCardPreset({ height, lanes: placement.lanes, density, isMobile });
  const typeMeta = TYPE_META[item.type] || { tone: 'border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))]', short: item.type.slice(0, 3) };
  const showConflict = Boolean(showConflictLayer && item.conflictTypes?.length);
  const compactTime = compactTimeRange(item.startMinute, item.endMinute);
  const primaryMeta = [item.group !== '-' ? `G ${item.group}` : null, item.room !== '-' ? item.room : null].filter(Boolean).join(' • ');
  const showCourse = preset !== 'micro';
  const showPrimaryMeta = preset === 'rich' || preset === 'comfortable';
  const showInstructor = preset === 'rich';
  const showConflictChips = showConflict && preset === 'rich';
  const showConflictBadge = showConflict && preset !== 'rich';
  const courseClass =
    preset === 'rich'
      ? 'line-clamp-3 text-[12px] font-medium leading-4'
      : preset === 'comfortable'
        ? 'line-clamp-2 text-[11px] font-medium leading-4'
        : 'line-clamp-2 text-[10px] font-medium leading-[1.15]';

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        'absolute overflow-hidden rounded-[18px] border text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]',
        typeMeta.tone,
        preset === 'micro' ? 'px-2 py-1.5' : preset === 'compact' ? 'px-2.5 py-2' : 'px-3 py-2.5',
        showConflict ? 'ring-1 ring-[var(--danger)]/30' : ''
      )}
      style={{ top: `${top + 3}px`, left, width, height: `${height}px` }}
      aria-label={`${item.code} ${item.type} ${item.timeLabel}`}
      title={`${item.code} • ${item.course} • ${item.type} • ${item.timeLabel}`}
    >
      <div className="flex h-full flex-col justify-between gap-1.5 overflow-hidden">
        <div className="flex items-start justify-between gap-1.5">
          <span className={cn(
            'max-w-full rounded-full border border-[var(--border)] bg-[var(--surface)] font-black uppercase tracking-[0.12em] text-[var(--gold)]',
            preset === 'micro' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          )}>
            {preset === 'micro' || preset === 'compact' ? typeMeta.short : item.type}
          </span>
          {showConflictBadge ? (
            <span className="shrink-0 rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--danger)]">
              {item.conflictCount}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 space-y-1 overflow-hidden">
          <div className={cn(
            'truncate font-black text-white',
            preset === 'micro' ? 'text-[11px]' : preset === 'compact' ? 'text-xs' : 'text-sm'
          )}>
            {item.code}
          </div>
          {showCourse ? (
            <div className={cn('break-words text-white/88', courseClass)}>
              {item.course}
            </div>
          ) : null}
        </div>

        <div className="mt-auto min-w-0 space-y-1 overflow-hidden">
          <div className={cn(
            'truncate font-semibold text-[var(--text-secondary)]',
            preset === 'micro' ? 'text-[10px]' : 'text-[11px]'
          )}>
            {compactTime}
          </div>
          {showPrimaryMeta && primaryMeta ? (
            <div className="truncate text-[10px] font-medium text-[var(--text-secondary)]">{primaryMeta}</div>
          ) : null}
          {showInstructor && item.instructor !== '-' ? (
            <div className="truncate text-[10px] font-medium text-[var(--text-secondary)]">{item.instructor}</div>
          ) : null}
          {showConflictChips ? (
            <div className="flex flex-wrap gap-1">
              {item.conflictTypes?.map((conflict) => (
                <span key={`${item.id}-${conflict}`} className="rounded-full border border-[var(--danger)]/25 bg-[var(--surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--danger)]">
                  {conflict}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SessionDetailsModal({
  item,
  open,
  onClose
}: {
  item: TimetableItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm" title={`${item.code} • ${item.type}`} subtitle={item.course}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Time</div>
          <div className="mt-1 text-sm font-semibold text-white">{item.timeLabel}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Day</div>
          <div className="mt-1 text-sm font-semibold text-white">{item.day}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Group</div>
          <div className="mt-1 text-sm font-semibold text-white">{item.group !== '-' ? item.group : 'Unassigned'}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Room</div>
          <div className="mt-1 text-sm font-semibold text-white">{item.room !== '-' ? item.room : 'Unassigned'}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-2">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Instructor</div>
          <div className="mt-1 text-sm font-semibold text-white">{item.instructor !== '-' ? item.instructor : 'Unassigned'}</div>
        </div>
        {item.conflictTypes?.length ? (
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 sm:col-span-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--danger)]">Conflict visibility</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.conflictTypes.map((conflict) => (
                <span key={conflict} className="rounded-full border border-[var(--danger)]/30 bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--danger)]">
                  {conflict}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DayBoard({
  day,
  placements,
  minStart,
  totalHours,
  hourHeight,
  slots,
  density,
  isMobile,
  showConflictLayer,
  onOpen
}: {
  day: string;
  placements: TimetableLayoutItem[];
  minStart: number;
  totalHours: number;
  hourHeight: number;
  slots: number[];
  density: 'normal' | 'compact';
  isMobile: boolean;
  showConflictLayer: boolean;
  onOpen: (item: TimetableItem) => void;
}) {
  return (
    <div className={cn(
      'relative rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface-2))] shadow-[var(--shadow-sm)]',
      isMobile ? 'min-w-0' : ''
    )} style={{ height: `${totalHours * hourHeight}px` }}>
      {slots.slice(0, -1).map((slot, index) => (
        <div key={`${day}-${slot}`} className="absolute left-0 right-0 border-t border-dashed border-[var(--border-soft)]" style={{ top: `${index * hourHeight}px` }} />
      ))}
      {placements.map((placement) => {
        const durationHeight = ((placement.item.endMinute - placement.item.startMinute) / 60) * hourHeight - 8;
        const minimumHeight = isMobile ? 34 : density === 'compact' ? 32 : 36;
        const height = Math.max(minimumHeight, durationHeight);
        const top = ((placement.item.startMinute - minStart) / 60) * hourHeight;
        return (
          <SessionCard
            key={placement.item.id}
            item={placement.item as TimetableItem}
            placement={placement}
            top={top}
            height={height}
            density={density}
            isMobile={isMobile}
            showConflictLayer={showConflictLayer}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}

function ListSection({
  day,
  items,
  onOpen,
  showConflictLayer
}: {
  day: string;
  items: TimetableItem[];
  onOpen: (item: TimetableItem) => void;
  showConflictLayer: boolean;
}) {
  if (!items.length) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 md:px-5">
        <div>
          <div className="text-sm font-black tracking-tight text-white">{day}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{items.length} session{items.length === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div className="divide-y divide-[var(--border)]/70">
        {items.map((item) => {
          const typeMeta = TYPE_META[item.type] || { tone: '', short: item.type };
          const metaChips = [
            item.group !== '-' ? `Group ${item.group}` : null,
            item.room !== '-' ? `Room ${item.room}` : null,
            item.instructor !== '-' ? item.instructor : null
          ].filter(Boolean) as string[];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="w-full px-4 py-4 text-left transition-colors hover:bg-[var(--bg-raised)]/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] md:px-5"
              aria-label={`${item.code} ${item.type} ${item.timeLabel}`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">
                      {item.type}
                    </span>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white', typeMeta.tone)}>
                      {item.code}
                    </span>
                    {showConflictLayer && item.conflictTypes?.length ? (
                      <span className="rounded-full border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--danger)]">
                        {item.conflictCount} clash{item.conflictCount === 1 ? '' : 'es'}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 line-clamp-2 text-base font-black leading-snug text-white md:text-lg" title={item.course}>{item.course}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {metaChips.map((chip) => (
                      <span key={`${item.id}-${chip}`} className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                        {chip}
                      </span>
                    ))}
                  </div>
                  {showConflictLayer && item.conflictTypes?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.conflictTypes.map((conflict) => (
                        <span key={`${item.id}-${conflict}`} className="rounded-full border border-[var(--danger)]/30 bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-bold text-[var(--danger)]">
                          {conflict}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left md:min-w-[148px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Time</div>
                  <div className="mt-1 text-sm font-semibold text-white">{item.timeLabel}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
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
  const isMobile = useIsMobile();
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [viewModeReady, setViewModeReady] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimetableItem | null>(null);
  const [mobileDay, setMobileDay] = useState('');

  const sourceItems = useMemo(() => {
    if (items?.length) return items;
    return rows.map(rowToTimetableItem).filter(Boolean) as TimetableItem[];
  }, [items, rows]);

  const orderedDays = useMemo(() => {
    const days = getOrderedScheduleDays(weekStart, focusDay);
    return days.length ? days : [...DEFAULT_DAY_ORDER];
  }, [focusDay, weekStart]);

  useEffect(() => {
    if (typeof window === 'undefined' || viewModeReady) return;
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'grid' || stored === 'list') {
      setViewMode(stored);
    } else {
      setViewMode(isMobile ? 'list' : 'grid');
    }
    setViewModeReady(true);
  }, [isMobile, viewModeReady]);

  const updateViewMode = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_KEY, nextMode);
    }
  };

  useEffect(() => {
    const preferredDay = focusDay?.trim().substring(0, 3);
    if (preferredDay && orderedDays.includes(preferredDay as (typeof orderedDays)[number])) {
      setMobileDay(preferredDay);
      return;
    }

    const firstDayWithItems = orderedDays.find((day) => sourceItems.some((item) => item.day === day));
    setMobileDay((current) => (current && orderedDays.includes(current as (typeof orderedDays)[number]) ? current : firstDayWithItems || orderedDays[0] || ''));
  }, [focusDay, orderedDays, sourceItems]);

  const boardMetrics = useMemo(() => {
    const minStart = sourceItems.length ? Math.max(360, Math.floor(Math.min(...sourceItems.map((item) => item.startMinute)) / 60) * 60 - 60) : 420;
    const maxEnd = sourceItems.length ? Math.min(1320, Math.ceil(Math.max(...sourceItems.map((item) => item.endMinute)) / 60) * 60 + 60) : 1080;
    const hourHeight = isMobile ? (density === 'compact' ? 52 : 60) : density === 'compact' ? 68 : 92;
    const totalHours = Math.max(1, (maxEnd - minStart) / 60);
    const slots = Array.from({ length: totalHours + 1 }, (_, index) => minStart + index * 60);
    return { minStart, maxEnd, hourHeight, totalHours, slots };
  }, [density, isMobile, sourceItems]);

  const dayBuckets = useMemo(() => orderedDays.map((day) => {
    const dayItems = sourceItems.filter((item) => item.day === day);
    return {
      day,
      items: dayItems,
      total: dayItems.length,
      placements: layoutDayItems(dayItems)
    };
  }), [orderedDays, sourceItems]);

  const visibleDayBuckets = useMemo(() => dayBuckets.filter((bucket) => bucket.total > 0), [dayBuckets]);

  const activeMobileDay = orderedDays.includes(mobileDay as (typeof orderedDays)[number]) ? mobileDay : orderedDays[0] || '';
  const mobileIndex = Math.max(orderedDays.indexOf(activeMobileDay as (typeof orderedDays)[number]), 0);
  const mobileBucket = dayBuckets.find((bucket) => bucket.day === activeMobileDay) || dayBuckets[0];

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
            <ViewToggle viewMode={viewMode} onChange={updateViewMode} />
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

  const effectiveViewMode = viewModeReady ? viewMode : isMobile ? 'list' : 'grid';

  return (
    <>
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timetable intelligence</div>
            <h3 className="mt-1 text-xl font-black tracking-tight text-white">
              {effectiveViewMode === 'list' ? 'List view' : 'Weekly board'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {effectiveViewMode === 'list'
                ? 'List View groups sessions by day and keeps full course names and fuller metadata readable on both desktop and mobile.'
                : isMobile
                  ? 'Grid View keeps a single focused day on mobile so dense schedules stay readable. Tap any session for full details.'
                  : 'Grid View adapts card density so busy days stay readable without losing the timetable intelligence controls.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onExportCalendar ? (
              <Button variant="secondary" onClick={() => void onExportCalendar()} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Export calendar
              </Button>
            ) : null}
            <ViewToggle viewMode={effectiveViewMode} onChange={updateViewMode} />
            {effectiveViewMode === 'grid' ? (
              <Button variant={density === 'compact' ? 'primary' : 'secondary'} onClick={() => setDensity((current) => current === 'compact' ? 'normal' : 'compact')} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">{density === 'compact' ? 'density_small' : 'unfold_more'}</span>
                {density === 'compact' ? 'Compact on' : 'Compact off'}
              </Button>
            ) : null}
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              {sourceItems.length} session{sourceItems.length === 1 ? '' : 's'} visible
            </span>
          </div>
        </div>

        {effectiveViewMode === 'list' ? (
          <div className="space-y-4 px-4 py-4 md:px-6">
            {visibleDayBuckets.map((bucket) => (
              <ListSection
                key={bucket.day}
                day={bucket.day}
                items={bucket.items}
                onOpen={setSelectedItem}
                showConflictLayer={showConflictLayer}
              />
            ))}
          </div>
        ) : isMobile ? (
          <div className="space-y-4 px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--bg-raised)] p-3 shadow-[var(--shadow-sm)]">
              <Button
                variant="secondary"
                onClick={() => setMobileDay(orderedDays[Math.max(mobileIndex - 1, 0)])}
                disabled={mobileIndex === 0}
                className="h-11 w-11 min-w-11 justify-center rounded-2xl px-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </Button>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex min-w-max gap-2 pr-1">
                  {dayBuckets.map((bucket) => {
                    const active = bucket.day === activeMobileDay;
                    return (
                      <button
                        key={bucket.day}
                        type="button"
                        onClick={() => setMobileDay(bucket.day)}
                        className={cn(
                          'rounded-2xl border px-3 py-2 text-left transition-all',
                          active
                            ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-white shadow-[var(--shadow-sm)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                        )}
                      >
                        <div className="text-xs font-black uppercase tracking-[0.12em]">{bucket.day}</div>
                        <div className="mt-0.5 text-[10px] font-semibold">{bucket.total} session{bucket.total === 1 ? '' : 's'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setMobileDay(orderedDays[Math.min(mobileIndex + 1, orderedDays.length - 1)])}
                disabled={mobileIndex === orderedDays.length - 1}
                className="h-11 w-11 min-w-11 justify-center rounded-2xl px-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Button>
            </div>

            <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-3">
              <div className="relative">
                <div style={{ height: `${boardMetrics.totalHours * boardMetrics.hourHeight}px` }} className="relative">
                  {boardMetrics.slots.slice(0, -1).map((slot, index) => (
                    <div key={slot} className="absolute left-0 right-0" style={{ top: `${index * boardMetrics.hourHeight}px` }}>
                      <div className="pr-2 text-right text-[10px] font-semibold text-[var(--text-secondary)]">{formatMinute(slot)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {mobileBucket ? (
                <DayBoard
                  day={mobileBucket.day}
                  placements={mobileBucket.placements}
                  minStart={boardMetrics.minStart}
                  totalHours={boardMetrics.totalHours}
                  hourHeight={boardMetrics.hourHeight}
                  slots={boardMetrics.slots}
                  density={density}
                  isMobile
                  showConflictLayer={showConflictLayer}
                  onOpen={setSelectedItem}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1080px] px-4 py-4 md:px-6 xl:min-w-[1180px]">
              <div className="grid grid-cols-[76px_repeat(7,minmax(132px,1fr))] gap-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <div className="rounded-2xl border border-transparent px-2 py-3 text-left">Time</div>
                {dayBuckets.map((bucket) => (
                  <div key={bucket.day} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-3">
                    <div className="text-sm font-black tracking-normal text-white">{bucket.day}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{bucket.total} session{bucket.total === 1 ? '' : 's'}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-[76px_repeat(7,minmax(132px,1fr))] gap-3">
                <div className="relative">
                  <div style={{ height: `${boardMetrics.totalHours * boardMetrics.hourHeight}px` }} className="relative">
                    {boardMetrics.slots.slice(0, -1).map((slot, index) => (
                      <div key={slot} className="absolute left-0 right-0" style={{ top: `${index * boardMetrics.hourHeight}px` }}>
                        <div className="pr-2 text-right text-[11px] font-semibold text-[var(--text-secondary)]">{formatMinute(slot)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {dayBuckets.map((bucket) => (
                  <DayBoard
                    key={bucket.day}
                    day={bucket.day}
                    placements={bucket.placements}
                    minStart={boardMetrics.minStart}
                    totalHours={boardMetrics.totalHours}
                    hourHeight={boardMetrics.hourHeight}
                    slots={boardMetrics.slots}
                    density={density}
                    isMobile={false}
                    showConflictLayer={showConflictLayer}
                    onOpen={setSelectedItem}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SessionDetailsModal item={selectedItem} open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} />
    </>
  );
}
