'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCourseVisualTone } from '@/lib/course-visuals';
import { formatSessionType } from '@/lib/course-sessions';
import { formatMinute, scheduleDayOrder } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import type { AssignmentApiItem, CourseApiItem, ExamApiItem } from '@/types';

type CourseDetailPanelProps = {
  course: CourseApiItem | null;
  exams: ExamApiItem[];
  assignments: AssignmentApiItem[];
  onEdit?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
};

function courseStatusTone(status: string) {
  if (status === 'ACTIVE') return 'border-[var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]';
  if (status === 'CONFLICT') return 'border-[var(--danger)]/20 bg-[var(--danger-muted)] text-[var(--danger)]';
  return 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]';
}

export function CourseDetailPanel({ course, exams, assignments, onEdit, onDuplicate, onClose }: CourseDetailPanelProps) {
  if (!course) {
    return (
      <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] xl:sticky xl:top-6">
        <EmptyState
          icon="menu_book"
          title="Open a course hub"
          description="Select a course from the table to see its sessions, upcoming exams, open tasks, and quick actions in one place."
        />
      </aside>
    );
  }

  const tone = getCourseVisualTone(course.id || course.code);
  const sessions = (course.sessions || []).slice().sort((a, b) => {
    const dayDiff = scheduleDayOrder.indexOf(a.day as (typeof scheduleDayOrder)[number]) - scheduleDayOrder.indexOf(b.day as (typeof scheduleDayOrder)[number]);
    if (dayDiff !== 0) return dayDiff;
    return a.startMinute - b.startMinute;
  });
  const linkedExams = exams
    .filter((item) => item.courseId === course.id)
    .sort((a, b) => +new Date(a.examDate) - +new Date(b.examDate))
    .slice(0, 4);
  const linkedAssignments = assignments
    .filter((item) => item.courseId === course.id)
    .sort((a, b) => {
      const dueA = a.dueAt ? +new Date(a.dueAt) : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueAt ? +new Date(b.dueAt) : Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    })
    .slice(0, 5);
  const nextExam = linkedExams.find((item) => +new Date(item.examDate) >= Date.now()) || linkedExams[0] || null;
  const openTasks = linkedAssignments.filter((item) => item.status !== 'DONE');
  const firstSessionDay = sessions[0]?.day;

  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] xl:sticky xl:top-6">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', tone.badge)}>{course.code}</div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{course.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', courseStatusTone(course.status))}>{course.status}</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{sessions.length} sessions</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{linkedExams.length} exams</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{openTasks.length} open tasks</span>
            </div>
          </div>
          {onClose ? <Button variant="ghost" size="sm" onClick={onClose}>Close</Button> : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit ? <Button variant="primary" size="sm" onClick={onEdit}>Edit course</Button> : null}
          {onDuplicate ? <Button variant="secondary" size="sm" onClick={onDuplicate}>Duplicate</Button> : null}
          {firstSessionDay ? <Link href={`/workspace/timetable?day=${encodeURIComponent(firstSessionDay)}`}><Button variant="secondary" size="sm">Open in timetable</Button></Link> : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Weekly rhythm</div>
          <div className="mt-3 space-y-2">
            {sessions.length ? sessions.map((session) => (
              <Link key={session.id} href={`/workspace/timetable?day=${encodeURIComponent(session.day || 'Sat')}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{formatSessionType(session.type || 'LECTURE')}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{session.day} • {formatMinute(session.startMinute)}–{formatMinute(session.endMinute)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right text-[11px] text-[var(--text-secondary)]">
                    <span>{session.room?.code || course.room?.code || 'Room TBD'}</span>
                    <span>{session.group?.code || course.group?.code || 'Group TBD'}</span>
                  </div>
                </div>
              </Link>
            )) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">No sessions attached yet.</div>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Linked exams</div>
            <Link href={`/workspace/exams?course=${encodeURIComponent(course.id)}`} className="text-xs font-bold text-[var(--gold)]">Open module</Link>
          </div>
          <div className="mt-3 space-y-2">
            {linkedExams.length ? linkedExams.map((exam) => (
              <Link key={exam.id} href={`/workspace/exams?course=${encodeURIComponent(course.id)}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{exam.title}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{new Date(exam.examDate).toLocaleString()}</div>
                  </div>
                  <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">{exam.examType}</span>
                </div>
              </Link>
            )) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">No exams linked yet.</div>}
          </div>
          {nextExam ? <p className="mt-2 text-xs text-[var(--text-secondary)]">Next exam: <span className="font-semibold text-white">{nextExam.title}</span></p> : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Linked tasks</div>
            <Link href={`/workspace/tasks?course=${encodeURIComponent(course.id)}`} className="text-xs font-bold text-[var(--gold)]">Open module</Link>
          </div>
          <div className="mt-3 space-y-2">
            {linkedAssignments.length ? linkedAssignments.map((task) => (
              <Link key={task.id} href={`/workspace/tasks?course=${encodeURIComponent(course.id)}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 transition-all hover:border-[var(--text-muted)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{task.title}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : 'No due date yet'}</div>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">{task.priority}</span>
                </div>
              </Link>
            )) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">No tasks linked yet.</div>}
          </div>
        </section>
      </div>
    </aside>
  );
}
