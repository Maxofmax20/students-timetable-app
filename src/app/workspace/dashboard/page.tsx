'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleConflicts, buildScheduleItems, downloadScheduleCalendar, formatMinute } from '@/lib/schedule';
import type { CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem } from '@/types';

export const dynamic = 'force-dynamic';

type DashboardStats = {
  groups: number;
  instructors: number;
  rooms: number;
};

function formatConflictWindow(startMinute: number, endMinute: number) {
  return `${formatMinute(startMinute)} → ${formatMinute(endMinute)}`;
}

export default function WorkspaceDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ groups: 0, instructors: 0, rooms: 0 });
  const [scanNotice, setScanNotice] = useState('Schedule integrity is based on real timetable sessions only.');

  const load = async () => {
    setLoading(true);
    try {
      const [coursesResponse, groupsResponse, instructorsResponse, roomsResponse] = await Promise.all([
        fetch('/api/v1/courses', { credentials: 'include' }),
        fetch('/api/v1/groups', { credentials: 'include' }),
        fetch('/api/v1/instructors', { credentials: 'include' }),
        fetch('/api/v1/rooms', { credentials: 'include' })
      ]);

      const [coursesPayload, groupsPayload, instructorsPayload, roomsPayload] = await Promise.all([
        coursesResponse.json(),
        groupsResponse.json(),
        instructorsResponse.json(),
        roomsResponse.json()
      ]);

      if (!coursesResponse.ok || !coursesPayload?.ok) {
        throw new Error(coursesPayload?.message || 'Failed to load dashboard');
      }

      setCourses(coursesPayload.data?.items || []);
      setStats({
        groups: groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items?.length || 0 : 0,
        instructors: instructorsResponse.ok && instructorsPayload?.ok ? instructorsPayload.data?.items?.length || 0 : 0,
        rooms: roomsResponse.ok && roomsPayload?.ok ? roomsPayload.data?.items?.length || 0 : 0
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    }
  }, [status]);

  const scheduleItems = useMemo(() => buildScheduleItems(courses), [courses]);
  const conflicts = useMemo(() => buildScheduleConflicts(scheduleItems), [scheduleItems]);
  const previewItems = scheduleItems.slice(0, 4);

  const exportCalendar = () => {
    const result = downloadScheduleCalendar(scheduleItems, 'students-timetable-calendar.ics', 'Students Timetable');
    if (!result.ok) {
      toast('No scheduled sessions are available to export yet.', 'error');
      return;
    }

    toast(`Calendar export downloaded with ${result.count} scheduled event${result.count === 1 ? '' : 's'}.`);
  };

  const scanIntegrity = () => {
    if (!scheduleItems.length) {
      setScanNotice('No scheduled sessions exist yet, so there is nothing to scan.');
      toast('No scheduled sessions to scan yet.', 'error');
      return;
    }

    if (!conflicts.length) {
      setScanNotice(`Integrity check passed across ${scheduleItems.length} scheduled session${scheduleItems.length === 1 ? '' : 's'}.`);
      toast('No room or instructor conflicts found.');
      return;
    }

    setScanNotice(`Integrity check found ${conflicts.length} overlap${conflicts.length === 1 ? '' : 's'} across the current timetable.`);
    toast(`Found ${conflicts.length} timetable overlap${conflicts.length === 1 ? '' : 's'}.`, 'error');
  };

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Overview" subtitle="Loading workspace summary">
        <div className="flex flex-col gap-6 p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-10 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Overview" subtitle="A truthful summary of your catalog, schedule health, and next actions">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1.5 shadow-[var(--shadow-glow)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--gold)]">Workspace overview</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">Keep the catalog clean and the timetable beautifully truthful.</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
                Courses stay metadata-first. Real scheduled sessions drive the dashboard preview, integrity scan, timetable, and calendar export.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="justify-center" onClick={() => void load()}>
                {loading ? 'Refreshing...' : 'Refresh overview'}
              </Button>
              <Button variant="primary" className="justify-center" onClick={() => router.push('/workspace/courses?create=1')}>
                New Course
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Courses', value: courses.length, icon: 'book_2', tone: 'text-[var(--gold)]', alert: false },
            { label: 'Scheduled sessions', value: scheduleItems.length, icon: 'calendar_month', tone: 'text-[var(--info)]', alert: false },
            { label: 'Groups', value: stats.groups, icon: 'groups', tone: 'text-[var(--success)]', alert: false },
            { label: 'Instructors', value: stats.instructors, icon: 'school', tone: 'text-[var(--text-secondary)]', alert: false },
            { label: 'Rooms', value: stats.rooms, icon: 'meeting_room', tone: 'text-[var(--warning)]', alert: false }
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{stat.label}</div>
                  <div className="mt-3 text-3xl font-black tracking-tight text-white">{stat.value}</div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] transition-transform group-hover:scale-110 ${stat.tone}`}>
                  <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr,0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-lg)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Quick actions</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Every action below is wired to a real workflow.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    label: 'New Course',
                    description: 'Create a course and optionally add its first scheduled session.',
                    icon: 'add_box',
                    tone: 'text-[var(--gold)]',
                    onClick: () => router.push('/workspace/courses?create=1')
                  },
                  {
                    label: 'Check Conflicts',
                    description: 'Review room and instructor overlaps in the current timetable.',
                    icon: 'rule',
                    tone: 'text-[var(--danger)]',
                    onClick: scanIntegrity
                  },
                  {
                    label: 'Export Calendar',
                    description: 'Download an ICS file built from real scheduled sessions only.',
                    icon: 'calendar_month',
                    tone: 'text-[var(--info)]',
                    onClick: exportCalendar
                  }
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="group flex min-h-[132px] flex-col items-start gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 text-left transition-all hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] transition-transform group-hover:scale-110 ${action.tone}`}>
                      <span className="material-symbols-outlined text-[21px]">{action.icon}</span>
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{action.label}</div>
                      <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-lg)]">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Schedule integrity</h3>
                <p className="text-sm text-[var(--text-secondary)]">{scanNotice}</p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Integrity result</div>
                  <div className={`mt-2 text-2xl font-black ${conflicts.length ? 'text-[var(--danger)]' : 'text-white'}`}>{conflicts.length ? `${conflicts.length} overlap${conflicts.length === 1 ? '' : 's'}` : 'Clean scan'}</div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    {scheduleItems.length
                      ? `Checked ${scheduleItems.length} scheduled session${scheduleItems.length === 1 ? '' : 's'}.`
                      : 'No scheduled sessions exist yet.'}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Calendar export</div>
                  <div className="mt-2 text-2xl font-black text-white">{scheduleItems.length} event{scheduleItems.length === 1 ? '' : 's'}</div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    Export uses the same scheduled rows shown on the timetable page.
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {conflicts.length ? (
                  conflicts.slice(0, 4).map((conflict) => (
                    <button
                      key={conflict.key}
                      type="button"
                      onClick={() => router.push(`/workspace/timetable?day=${encodeURIComponent(conflict.day)}`)}
                      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-left transition-colors hover:bg-[var(--danger)]/10"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white">
                          {conflict.kind === 'room' ? 'Room overlap' : 'Instructor overlap'} — {conflict.label}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {conflict.day} • {formatConflictWindow(conflict.startMinute, conflict.endMinute)} • {conflict.items.length} sessions
                        </div>
                        <div className="mt-2 text-xs text-[var(--text-secondary)]">
                          {conflict.items.map((item) => item.course).join(' • ')}
                        </div>
                      </div>
                      <span className="material-symbols-outlined shrink-0 text-[var(--danger)]">arrow_outward</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-5 text-sm text-[var(--text-secondary)]">
                    No room or instructor overlaps are currently detected.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Schedule preview</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Tap a row to open the timetable on that day.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/workspace/timetable')}>
                Open timetable
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {previewItems.length ? (
                previewItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/workspace/timetable?day=${encodeURIComponent(item.day)}`)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 text-left transition-colors hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  >
                    <div className="mt-1 h-10 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">{item.course}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">{item.type} • {item.code}</div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">When</div>
                          <div className="mt-1 font-semibold text-white">{item.day} • {item.timeLabel}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Where</div>
                          <div className="mt-1 font-semibold text-white">{item.room}</div>
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined shrink-0 text-[var(--text-muted)]">chevron_right</span>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-6 text-center">
                  <div className="text-sm font-semibold text-white">No scheduled sessions yet</div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Add a course with a real day and time to populate the timetable preview and calendar export.
                  </p>
                  <Button variant="primary" className="mt-4" onClick={() => router.push('/workspace/courses?create=1')}>
                    Add first course
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
