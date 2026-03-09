'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleItems, downloadScheduleCalendar, scheduleDayOrder } from '@/lib/schedule';
import type { CourseApiItem } from '@/types';

const dayLabels: Record<string, string> = {
  Sat: 'Saturday',
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday'
};

export default function TimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusDay = searchParams?.get('day') || '';
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/courses', { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Failed to load timetable');
      }

      setCourses(payload.data?.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    }
  }, [status]);

  const items = useMemo(() => buildScheduleItems(courses), [courses]);

  const grouped = useMemo(() => {
    const orderedDays = focusDay && scheduleDayOrder.includes(focusDay as (typeof scheduleDayOrder)[number])
      ? [focusDay, ...scheduleDayOrder.filter((day) => day !== focusDay)]
      : [...scheduleDayOrder];

    return orderedDays.map((day) => ({
      day,
      label: dayLabels[day] || day,
      items: items.filter((item) => item.day === day)
    }));
  }, [focusDay, items]);

  const exportCalendar = () => {
    const result = downloadScheduleCalendar(items, 'students-timetable-calendar.ics', 'Students Timetable');
    if (!result.ok) {
      toast('No scheduled sessions are available to export yet.', 'error');
      return;
    }

    toast(`Calendar export downloaded with ${result.count} event${result.count === 1 ? '' : 's'}.`);
  };

  return (
    <AppShell title="Timetable" subtitle="A schedule-first weekly agenda built from real session entries">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-24">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1.5 shadow-[var(--shadow-glow)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--gold)]">Weekly timetable</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
                Every visible row here is built from real scheduled sessions and is eligible for calendar export.
              </p>
              {focusDay && (
                <p className="text-xs text-[var(--text-muted)]">
                  Focused on {dayLabels[focusDay] || focusDay}. <button type="button" className="font-semibold text-[var(--gold)]" onClick={() => router.push('/workspace/timetable')}>Clear focus</button>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => void load()}>{loading ? 'Refreshing...' : 'Refresh timetable'}</Button>
              <Button variant="primary" onClick={exportCalendar}>Export Calendar</Button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-secondary)]">
            Loading timetable...
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ day, label, items: dayItems }) => (
              <section key={day} className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{label}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-muted)]">{dayItems.length} scheduled item{dayItems.length === 1 ? '' : 's'}</div>
                  </div>
                  {focusDay === day ? (
                    <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Focused day</span>
                  ) : null}
                </div>

                {dayItems.length ? (
                  <div className="p-3 space-y-3">
                    {dayItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push('/workspace/courses')}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 text-left transition-all hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-md)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white break-words">{item.course}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-[var(--gold-soft)]">{item.type}</span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">{item.code}</span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">Group {item.group}</span>
                            </div>
                          </div>
                          <span className="material-symbols-outlined shrink-0 text-[var(--text-muted)]">arrow_outward</span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                          <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Time</div>
                            <div className="mt-1 font-semibold text-white">{item.timeLabel}</div>
                          </div>
                          <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Room</div>
                            <div className="mt-1 font-semibold text-white">{item.room}</div>
                          </div>
                          <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2 sm:col-span-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Instructor</div>
                            <div className="mt-1 font-semibold text-white break-words">{item.instructor}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-[var(--text-secondary)]">No scheduled classes for {label}.</div>
                )}
              </section>
            ))}

            {!items.length && (
              <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                <div className="text-base font-semibold text-white">No scheduled sessions yet</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Add a day and time to a course before using timetable export.
                </p>
                <Button variant="primary" className="mt-4" onClick={() => router.push('/workspace/courses?create=1')}>
                  Add first course
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
