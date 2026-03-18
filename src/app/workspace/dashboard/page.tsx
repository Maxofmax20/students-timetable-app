'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { buildScheduleItems, scheduleDayOrder, type ScheduleItem } from '@/lib/schedule';
import type { AcademicTermApiItem, AssignmentApiItem, CourseApiItem, ExamApiItem } from '@/types';

export const dynamic = 'force-dynamic';

const weekdayMap: Record<number, (typeof scheduleDayOrder)[number]> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat'
};

function getNow() {
  const now = new Date();
  return {
    day: weekdayMap[now.getDay()] || 'Sat',
    minute: now.getHours() * 60 + now.getMinutes(),
    iso: now.toISOString()
  };
}

function findNextSession(items: ScheduleItem[], nowDay: string, nowMinute: number) {
  const nowDayIndex = scheduleDayOrder.indexOf(nowDay as (typeof scheduleDayOrder)[number]);
  if (nowDayIndex === -1) return null;

  for (let offset = 0; offset < scheduleDayOrder.length; offset += 1) {
    const day = scheduleDayOrder[(nowDayIndex + offset) % scheduleDayOrder.length];
    const dayItems = items.filter((item) => item.day === day).sort((a, b) => a.startMinute - b.startMinute);
    const candidate = dayItems.find((item) => (offset === 0 ? item.endMinute > nowMinute : true));
    if (candidate) return candidate;
  }

  return null;
}

function formatExamTime(item: ExamApiItem) {
  if (item.startMinute == null || item.endMinute == null) return 'Time TBD';
  const startHour = String(Math.floor(item.startMinute / 60)).padStart(2, '0');
  const startMinute = String(item.startMinute % 60).padStart(2, '0');
  const endHour = String(Math.floor(item.endMinute / 60)).padStart(2, '0');
  const endMinute = String(item.endMinute % 60).padStart(2, '0');
  return `${startHour}:${startMinute}–${endHour}:${endMinute}`;
}

export default function WorkspaceDashboardPage() {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [terms, setTerms] = useState<AcademicTermApiItem[]>([]);
  const [exams, setExams] = useState<ExamApiItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApiItem[]>([]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const load = async () => {
      setLoading(true);
      try {
        const [coursesResponse, termsResponse, examsResponse, assignmentsResponse] = await Promise.all([
          fetch('/api/v1/courses', { credentials: 'include' }),
          fetch('/api/v1/academic-terms', { credentials: 'include' }),
          fetch('/api/v1/exams', { credentials: 'include' }),
          fetch('/api/v1/assignments', { credentials: 'include' })
        ]);

        const [coursesPayload, termsPayload, examsPayload, assignmentsPayload] = await Promise.all([
          coursesResponse.json(),
          termsResponse.json(),
          examsResponse.json(),
          assignmentsResponse.json()
        ]);

        if (!coursesResponse.ok || !coursesPayload?.ok) throw new Error(coursesPayload?.message || 'Failed to load dashboard');

        setCourses(coursesPayload.data?.items || []);
        setTerms(termsResponse.ok && termsPayload?.ok ? termsPayload.data?.items || [] : []);
        setExams(examsResponse.ok && examsPayload?.ok ? examsPayload.data?.items || [] : []);
        setAssignments(assignmentsResponse.ok && assignmentsPayload?.ok ? assignmentsPayload.data?.items || [] : []);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status, toast]);

  const scheduleItems = useMemo(() => buildScheduleItems(courses), [courses]);
  const now = useMemo(() => getNow(), []);
  const todaySessions = useMemo(() => scheduleItems.filter((item) => item.day === now.day).sort((a, b) => a.startMinute - b.startMinute), [now.day, scheduleItems]);
  const nextSession = useMemo(() => findNextSession(scheduleItems, now.day, now.minute), [now.day, now.minute, scheduleItems]);
  const activeTerm = useMemo(() => terms.find((term) => term.isActive) || terms[0] || null, [terms]);
  const upcomingExams = useMemo(() => exams.filter((item) => new Date(item.examDate).getTime() >= Date.now()).slice(0, 4), [exams]);
  const pendingAssignments = useMemo(() => assignments.filter((item) => item.status !== 'DONE').slice(0, 5), [assignments]);
  const focusLoad = useMemo(() => ({
    exams: upcomingExams.length,
    tasks: pendingAssignments.length,
    classesToday: todaySessions.length
  }), [pendingAssignments.length, todaySessions.length, upcomingExams.length]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your daily academic command center — classes, exams, tasks, and active term context in one place."
      actions={
        <div className="flex items-center gap-2">
          <Link href="/workspace/exams"><Button variant="secondary" size="sm">Exams</Button></Link>
          <Link href="/workspace/tasks"><Button variant="secondary" size="sm">Tasks</Button></Link>
          <Link href="/workspace/timetable"><Button variant="primary" size="sm">Open timetable</Button></Link>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-10">
        <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-lg)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Today at a glance</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Study week, organized.</h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                  Keep your timetable, exam pressure, and assignment load visible before the week turns messy.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Active term</div>
                <div className="mt-1 text-sm font-bold text-white">{activeTerm ? `${activeTerm.name}` : 'No term yet'}</div>
                <div className="text-xs text-[var(--text-secondary)]">{activeTerm ? `${activeTerm.season} • ${activeTerm.academicYear}` : 'Create one from Settings'}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Classes today" value={String(focusLoad.classesToday)} icon="calendar_month" />
              <MetricCard label="Upcoming exams" value={String(focusLoad.exams)} icon="local_library" />
              <MetricCard label="Open tasks" value={String(focusLoad.tasks)} icon="task_alt" />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Next up</div>
            <h3 className="mt-2 text-xl font-black tracking-tight text-white">Your next class</h3>
            {nextSession ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                <div className="text-lg font-black text-white">{nextSession.course}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{nextSession.day} • {nextSession.timeLabel}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">{nextSession.type}</span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">{nextSession.room}</span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">{nextSession.instructor}</span>
                </div>
              </div>
            ) : (
              <EmptyCard message="No upcoming classes found yet." />
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
          <Panel title={`Today's classes (${now.day})`} eyebrow="Timetable pulse">
            {loading ? <LoadingList /> : todaySessions.length ? (
              <div className="space-y-2">
                {todaySessions.map((item) => (
                  <Link key={item.id} href={`/workspace/timetable?day=${encodeURIComponent(item.day)}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{item.course}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.timeLabel} • {item.type}</div>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">{item.room}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyCard message="Your day is clear — no classes scheduled yet." />}
          </Panel>

          <Panel title="Upcoming exams" eyebrow="Assessment radar">
            {loading ? <LoadingList /> : upcomingExams.length ? (
              <div className="space-y-2">
                {upcomingExams.map((item) => (
                  <Link key={item.id} href="/workspace/exams" className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{item.title}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.course?.title || 'Course'} • {new Date(item.examDate).toLocaleDateString()}</div>
                      </div>
                      <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]">{item.examType}</span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">{formatExamTime(item)}{item.location ? ` • ${item.location}` : ''}</div>
                  </Link>
                ))}
              </div>
            ) : <EmptyCard message="No exams yet — add your first quiz, midterm, or final." />}
          </Panel>

          <Panel title="Pending tasks" eyebrow="Execution lane">
            {loading ? <LoadingList /> : pendingAssignments.length ? (
              <div className="space-y-2">
                {pendingAssignments.map((item) => (
                  <Link key={item.id} href="/workspace/tasks" className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{item.title}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.course?.title || 'Course'}</div>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold text-white">{item.priority}</span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">{item.dueAt ? `Due ${new Date(item.dueAt).toLocaleString()}` : 'No due date yet'} • {item.status.replace('_', ' ')}</div>
                  </Link>
                ))}
              </div>
            ) : <EmptyCard message="No active tasks — good time to plan ahead." />}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
        <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">{eyebrow}</div>
      <h3 className="mt-2 text-xl font-black tracking-tight text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyCard({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">{message}</div>;
}

function LoadingList() {
  return <div className="space-y-2">{[...Array(3)].map((_, index) => <div key={index} className="skeleton h-20 rounded-2xl" />)}</div>;
}
