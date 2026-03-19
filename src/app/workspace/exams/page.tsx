'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { AcademicTermApiItem, CourseApiItem, ExamApiItem } from '@/types';

export const dynamic = 'force-dynamic';

type ExamFormState = {
  academicTermId: string;
  courseId: string;
  title: string;
  examType: 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICAL' | 'ORAL' | 'OTHER';
  examDate: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

type TimelineScope = 'UPCOMING' | 'ALL' | 'PAST';

const emptyForm: ExamFormState = {
  academicTermId: '',
  courseId: '',
  title: '',
  examType: 'QUIZ',
  examDate: '',
  startTime: '',
  endTime: '',
  location: '',
  notes: ''
};

function formatMinuteLabel(total?: number | null) {
  if (total == null) return 'Time TBD';
  const hours = String(Math.floor(total / 60)).padStart(2, '0');
  const minutes = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function examToForm(exam: ExamApiItem): ExamFormState {
  return {
    academicTermId: exam.academicTermId,
    courseId: exam.courseId,
    title: exam.title,
    examType: exam.examType,
    examDate: toDateTimeLocalValue(exam.examDate),
    startTime: exam.startMinute != null ? formatMinuteLabel(exam.startMinute) : '',
    endTime: exam.endMinute != null ? formatMinuteLabel(exam.endMinute) : '',
    location: exam.location || '',
    notes: exam.notes || ''
  };
}

function buildDefaultForm(terms: AcademicTermApiItem[], courses: CourseApiItem[]): ExamFormState {
  const activeTerm = terms.find((term) => term.isActive) || terms[0];
  return {
    ...emptyForm,
    academicTermId: activeTerm?.id || '',
    courseId: courses[0]?.id || ''
  };
}

function sameDayCount(exams: ExamApiItem[], daysAhead: number) {
  const now = Date.now();
  const boundary = now + daysAhead * 24 * 60 * 60 * 1000;
  return exams.filter((exam) => {
    const date = new Date(exam.examDate).getTime();
    return date >= now && date <= boundary;
  }).length;
}

export default function ExamsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const deepLinkedCourseId = searchParams?.get('course') || '';

  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [terms, setTerms] = useState<AcademicTermApiItem[]>([]);
  const [exams, setExams] = useState<ExamApiItem[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [scope, setScope] = useState<TimelineScope>('UPCOMING');
  const [selectedTermFilter, setSelectedTermFilter] = useState('ALL');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<ExamFormState>(emptyForm);
  const [invalidCourseHandled, setInvalidCourseHandled] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const load = async () => {
      setLoading(true);
      try {
        const [coursesResponse, termsResponse, examsResponse] = await Promise.all([
          fetch('/api/v1/courses', { credentials: 'include' }),
          fetch('/api/v1/academic-terms', { credentials: 'include' }),
          fetch('/api/v1/exams', { credentials: 'include' })
        ]);

        const [coursesPayload, termsPayload, examsPayload] = await Promise.all([
          coursesResponse.json(),
          termsResponse.json(),
          examsResponse.json()
        ]);

        if (!coursesResponse.ok || !coursesPayload?.ok) {
          throw new Error(coursesPayload?.message || 'Failed to load courses');
        }

        const nextCourses = coursesPayload.data?.items || [];
        const nextTerms = termsResponse.ok && termsPayload?.ok ? termsPayload.data?.items || [] : [];
        const nextExams = examsResponse.ok && examsPayload?.ok ? examsPayload.data?.items || [] : [];
        const nextWorkspaceId = examsPayload.data?.workspaceId || coursesPayload.data?.workspaceId || termsPayload.data?.workspaceId || '';

        setCourses(nextCourses);
        setTerms(nextTerms);
        setExams(nextExams);
        setWorkspaceId(nextWorkspaceId);
        setForm((current) => {
          if (current.academicTermId || current.courseId) return current;
          return buildDefaultForm(nextTerms, nextCourses);
        });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load exams', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status, toast]);

  useEffect(() => {
    if (!deepLinkedCourseId) {
      setSelectedCourseFilter('ALL');
      setInvalidCourseHandled(false);
      return;
    }
    if (courses.some((course) => course.id === deepLinkedCourseId)) {
      setSelectedCourseFilter(deepLinkedCourseId);
      setForm((current) => ({ ...current, courseId: deepLinkedCourseId }));
      setInvalidCourseHandled(false);
      return;
    }
    if (!loading && !invalidCourseHandled) {
      setSelectedCourseFilter('ALL');
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('course');
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      toast('The requested course filter was not found.', 'error');
      setInvalidCourseHandled(true);
    }
  }, [courses, deepLinkedCourseId, invalidCourseHandled, loading, pathname, router, searchParams, toast]);

  useEffect(() => {
    if (loading) return;
    const current = searchParams?.get('course') || '';
    const next = selectedCourseFilter !== 'ALL' ? selectedCourseFilter : '';
    if (current === next) return;

    const params = new URLSearchParams(searchParams?.toString() || '');
    if (next) params.set('course', next);
    else params.delete('course');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }, [loading, pathname, router, searchParams, selectedCourseFilter]);

  useEffect(() => {
    if (editingExamId) return;
    if (selectedCourseFilter === 'ALL') return;
    setForm((current) => current.courseId === selectedCourseFilter ? current : { ...current, courseId: selectedCourseFilter });
  }, [editingExamId, selectedCourseFilter]);

  const sortedExams = useMemo(
    () => exams.slice().sort((a, b) => +new Date(a.examDate) - +new Date(b.examDate) || (a.startMinute ?? 0) - (b.startMinute ?? 0)),
    [exams]
  );

  const filteredExams = useMemo(() => {
    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    return sortedExams.filter((exam) => {
      const examTime = new Date(exam.examDate).getTime();
      if (scope === 'UPCOMING' && examTime < now) return false;
      if (scope === 'PAST' && examTime >= now) return false;
      if (selectedTermFilter !== 'ALL' && exam.academicTermId !== selectedTermFilter) return false;
      if (selectedCourseFilter !== 'ALL' && exam.courseId !== selectedCourseFilter) return false;
      if (!query) return true;

      const haystack = [
        exam.title,
        exam.examType,
        exam.location,
        exam.notes,
        exam.course?.title,
        exam.course?.code,
        exam.academicTerm?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [scope, searchQuery, selectedCourseFilter, selectedTermFilter, sortedExams]);

  const examStats = useMemo(() => {
    const upcoming = sortedExams.filter((exam) => new Date(exam.examDate).getTime() >= Date.now());
    return {
      total: sortedExams.length,
      upcoming: upcoming.length,
      nextWeek: sameDayCount(sortedExams, 7),
      finals: upcoming.filter((exam) => exam.examType === 'FINAL').length
    };
  }, [sortedExams]);

  const activeTerm = useMemo(() => terms.find((term) => term.isActive) || terms[0] || null, [terms]);

  const resetForm = () => {
    setEditingExamId(null);
    const next = buildDefaultForm(terms, courses);
    setForm({ ...next, courseId: selectedCourseFilter !== 'ALL' ? selectedCourseFilter : next.courseId });
  };

  const submitExam = async () => {
    if (!form.academicTermId || !form.courseId || !form.title || !form.examDate) {
      toast('Fill term, course, title, and exam date first.', 'error');
      return;
    }

    if (editingExamId && !workspaceId) {
      toast('Workspace is still loading.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(editingExamId ? { workspaceId } : {}),
        academicTermId: form.academicTermId,
        courseId: form.courseId,
        title: form.title.trim(),
        examType: form.examType,
        examDate: new Date(form.examDate).toISOString(),
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        location: form.location || null,
        notes: form.notes || null
      };

      const response = await fetch(editingExamId ? `/api/v1/exams/${editingExamId}` : '/api/v1/exams', {
        method: editingExamId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || `Failed to ${editingExamId ? 'update' : 'create'} exam`);
      }

      setExams((current) => {
        const next = editingExamId
          ? current.map((item) => (item.id === editingExamId ? result.data : item))
          : [...current, result.data];
        return next.sort((a, b) => +new Date(a.examDate) - +new Date(b.examDate) || (a.startMinute ?? 0) - (b.startMinute ?? 0));
      });
      toast(editingExamId ? 'Exam updated' : 'Exam created');
      resetForm();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exam: ExamApiItem) => {
    setEditingExamId(exam.id);
    setForm(examToForm(exam));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteExam = async (id: string) => {
    if (!workspaceId) {
      toast('Workspace is still loading.', 'error');
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/v1/exams/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'Failed to delete exam');
      }
      setExams((current) => current.filter((item) => item.id !== id));
      if (editingExamId === id) resetForm();
      toast('Exam removed');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete exam', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell
      title="Exams"
      subtitle="Plan quizzes, midterms, finals, and practicals with the same clarity as your timetable."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={resetForm}>
            New exam
          </Button>
          <Button variant="primary" size="sm" onClick={() => void submitExam()} isLoading={submitting}>
            {editingExamId ? 'Update exam' : 'Save exam'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-10">
        <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Assessment planner</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Keep exam pressure visible before it piles up.</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                This V2 exams module is now a real planning surface: create, review, edit, and remove assessments with term and course context.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Active term</div>
              <div className="mt-1 text-sm font-bold text-white">{activeTerm ? activeTerm.name : 'No academic term yet'}</div>
              <div className="text-xs text-[var(--text-secondary)]">{activeTerm ? `${activeTerm.season} • ${activeTerm.academicYear}` : 'Create one in Settings'}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total exams" value={String(examStats.total)} icon="local_library" />
            <StatCard label="Upcoming" value={String(examStats.upcoming)} icon="schedule" />
            <StatCard label="Next 7 days" value={String(examStats.nextWeek)} icon="event_upcoming" />
            <StatCard label="Upcoming finals" value={String(examStats.finals)} icon="workspace_premium" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">{editingExamId ? 'Edit exam' : 'Quick add'}</div>
                <h3 className="mt-2 text-xl font-black text-white">{editingExamId ? 'Update selected exam' : 'Create new exam'}</h3>
              </div>
              {editingExamId ? (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <AppSelect
                label="Academic term"
                value={form.academicTermId}
                onChange={(value) => setForm((current) => ({ ...current, academicTermId: value }))}
                options={terms.map((term) => ({
                  value: term.id,
                  label: term.name,
                  description: `${term.season} • ${term.academicYear}`,
                  badge: term.isActive ? 'Active' : undefined
                }))}
                placeholder="Select academic term"
              />

              <AppSelect
                label="Course"
                value={form.courseId}
                onChange={(value) => setForm((current) => ({ ...current, courseId: value }))}
                options={courses.map((course) => ({
                  value: course.id,
                  label: `${course.code} — ${course.title}`,
                  description: course.status
                }))}
                placeholder="Select course"
                searchable
                searchPlaceholder="Find course"
              />

              <Input
                label="Exam title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Robotics quiz"
              />

              <AppSelect
                label="Exam type"
                value={form.examType}
                onChange={(value) => setForm((current) => ({ ...current, examType: value as ExamFormState['examType'] }))}
                options={['QUIZ', 'MIDTERM', 'FINAL', 'PRACTICAL', 'ORAL', 'OTHER'].map((value) => ({ value, label: value }))}
              />

              <Input
                label="Exam date"
                type="datetime-local"
                value={form.examDate}
                onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  placeholder="09:30"
                />
                <Input
                  label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  placeholder="10:45"
                />
              </div>

              <Input
                label="Location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="E412"
              />

              <div className="flex flex-col gap-2">
                <label className="ml-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional context, coverage, reminders, or materials"
                  className="min-h-[112px] w-full rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] px-4 py-3.5 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" className="flex-1 min-w-[160px]" onClick={() => void submitExam()} isLoading={submitting}>
                  {editingExamId ? 'Update exam' : 'Create exam'}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Reset form
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timeline</div>
                  <h3 className="mt-2 text-xl font-black text-white">Exam schedule</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['UPCOMING', 'ALL', 'PAST'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScope(value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition-all',
                        scope === value
                          ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-[var(--gold)]'
                          : 'border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-white'
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,220px)]">
                <Input
                  label="Search exams"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by course, title, type..."
                />
                <AppSelect
                  label="Term filter"
                  value={selectedTermFilter}
                  onChange={setSelectedTermFilter}
                  options={[
                    { value: 'ALL', label: 'All academic terms' },
                    ...terms.map((term) => ({ value: term.id, label: term.name, description: `${term.season} • ${term.academicYear}` }))
                  ]}
                />
                <AppSelect
                  label="Course filter"
                  value={selectedCourseFilter}
                  onChange={setSelectedCourseFilter}
                  options={[
                    { value: 'ALL', label: 'All courses' },
                    ...courses.map((course) => ({ value: course.id, label: `${course.code} — ${course.title}` }))
                  ]}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                [...Array(4)].map((_, index) => <div key={index} className="skeleton h-28 rounded-2xl" />)
              ) : filteredExams.length ? (
                filteredExams.map((exam) => (
                  <article key={exam.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-lg font-black text-white">{exam.title}</h4>
                          <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">
                            {exam.examType}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">
                          {exam.course?.title || 'Course'} • {new Date(exam.examDate).toLocaleString()}
                        </div>
                        <div className="mt-2">
                          <Link href={`/workspace/courses?course=${encodeURIComponent(exam.courseId)}`} className="text-xs font-bold text-[var(--gold)]">
                            Open linked course hub
                          </Link>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                            {exam.location || 'Location TBD'}
                          </span>
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                            {formatMinuteLabel(exam.startMinute)} {exam.endMinute != null ? `– ${formatMinuteLabel(exam.endMinute)}` : ''}
                          </span>
                          {exam.academicTerm ? (
                            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                              {exam.academicTerm.name}
                            </span>
                          ) : null}
                        </div>
                        {exam.notes ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{exam.notes}</p> : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-start">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(exam)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          onClick={() => void deleteExam(exam.id)}
                          disabled={deletingId === exam.id}
                        >
                          {deletingId === exam.id ? 'Removing…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-5 text-sm text-[var(--text-secondary)]">
                  No exams match the current filters yet. Add your next quiz, midterm, or final from the panel on the left.
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
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
