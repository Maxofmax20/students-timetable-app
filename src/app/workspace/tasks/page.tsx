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
import type { AcademicTermApiItem, AssignmentApiItem, CourseApiItem } from '@/types';

function priorityRank(priority: AssignmentApiItem['priority']) {
  switch (priority) {
    case 'URGENT': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}

export const dynamic = 'force-dynamic';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const deepLinkedCourseId = searchParams?.get('course') || '';
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [terms, setTerms] = useState<AcademicTermApiItem[]>([]);
  const [items, setItems] = useState<AssignmentApiItem[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTermFilter, setSelectedTermFilter] = useState('ALL');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [form, setForm] = useState({ academicTermId: '', courseId: '', title: '', description: '', dueAt: '', priority: 'MEDIUM', status: 'TODO' });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [invalidCourseHandled, setInvalidCourseHandled] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      setLoading(true);
      try {
        const [coursesResponse, termsResponse, tasksResponse] = await Promise.all([
          fetch('/api/v1/courses', { credentials: 'include' }),
          fetch('/api/v1/academic-terms', { credentials: 'include' }),
          fetch('/api/v1/assignments', { credentials: 'include' })
        ]);
        const [coursesPayload, termsPayload, tasksPayload] = await Promise.all([coursesResponse.json(), termsResponse.json(), tasksResponse.json()]);
        setCourses(coursesPayload.data?.items || []);
        setTerms(termsPayload.data?.items || []);
        setItems(tasksPayload.data?.items || []);
        setWorkspaceId(tasksPayload.data?.workspaceId || coursesPayload.data?.workspaceId || termsPayload.data?.workspaceId || '');
        const activeTerm = (termsPayload.data?.items || []).find((item: AcademicTermApiItem) => item.isActive) || (termsPayload.data?.items || [])[0];
        setForm((current) => ({ ...current, academicTermId: current.academicTermId || activeTerm?.id || '', courseId: current.courseId || coursesPayload.data?.items?.[0]?.id || '' }));
      } catch {
        toast('Failed to load tasks', 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [status, toast]);

  useEffect(() => {
    if (!deepLinkedCourseId) {
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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (selectedTermFilter !== 'ALL' && item.academicTermId !== selectedTermFilter) return false;
        if (selectedCourseFilter !== 'ALL' && item.courseId !== selectedCourseFilter) return false;
        if (!query) return true;
        const haystack = [item.title, item.description, item.course?.title, item.course?.code, item.priority, item.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        if (a.status !== b.status) return a.status.localeCompare(b.status);
        if (dueA !== dueB) return dueA - dueB;
        return priorityRank(b.priority) - priorityRank(a.priority);
      });
  }, [items, searchQuery, selectedCourseFilter, selectedTermFilter]);

  const grouped = useMemo(() => ({
    todo: filteredItems.filter((item) => item.status === 'TODO'),
    inProgress: filteredItems.filter((item) => item.status === 'IN_PROGRESS'),
    done: filteredItems.filter((item) => item.status === 'DONE')
  }), [filteredItems]);

  const stats = useMemo(() => ({
    open: items.filter((item) => item.status !== 'DONE').length,
    dueSoon: items.filter((item) => {
      if (item.status === 'DONE' || !item.dueAt) return false;
      const due = new Date(item.dueAt).getTime();
      const now = Date.now();
      return due >= now && due <= now + 3 * 24 * 60 * 60 * 1000;
    }).length,
    completed: items.filter((item) => item.status === 'DONE').length
  }), [items]);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setForm((current) => ({ ...current, title: '', description: '', dueAt: '', priority: 'MEDIUM', status: 'TODO', courseId: selectedCourseFilter !== 'ALL' ? selectedCourseFilter : current.courseId }));
  };

  const submitTask = async () => {
    if (!form.academicTermId || !form.courseId || !form.title) {
      toast('Fill term, course, and title first.', 'error');
      return;
    }
    if (editingTaskId && !workspaceId) {
      toast('Workspace is still loading', 'error');
      return;
    }

    const response = await fetch(editingTaskId ? `/api/v1/assignments/${editingTaskId}` : '/api/v1/assignments', {
      method: editingTaskId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...(editingTaskId ? { workspaceId } : {}),
        ...form,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || `Failed to ${editingTaskId ? 'update' : 'create'} task`, 'error');
      return;
    }

    setItems((current) => editingTaskId ? current.map((item) => item.id === editingTaskId ? payload.data : item) : [...current, payload.data]);
    resetTaskForm();
    toast(editingTaskId ? 'Task updated' : 'Task added');
  };

  const updateTaskStatus = async (id: string, status: AssignmentApiItem['status']) => {
    if (!workspaceId) {
      toast('Workspace is still loading', 'error');
      return;
    }
    const response = await fetch(`/api/v1/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, status })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to update task', 'error');
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? payload.data : item));
  };

  const startEditTask = (item: AssignmentApiItem) => {
    setEditingTaskId(item.id);
    setForm((current) => ({
      ...current,
      academicTermId: item.academicTermId,
      courseId: item.courseId,
      title: item.title,
      description: item.description || '',
      dueAt: item.dueAt ? new Date(new Date(item.dueAt).getTime() - new Date(item.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
      priority: item.priority,
      status: item.status
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTask = async (id: string) => {
    if (!workspaceId) {
      toast('Workspace is still loading', 'error');
      return;
    }
    const response = await fetch(`/api/v1/assignments/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to delete task', 'error');
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingTaskId === id) resetTaskForm();
    toast('Task removed');
  };

  return (
    <AppShell title="Tasks" subtitle="Assignments, lab reports, revision work, and deadlines — tracked with academic context.">
      <div className="flex flex-col gap-6 pb-10">
        <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Execution lane</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Keep coursework moving before deadlines turn ugly.</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Tasks now behave like a real student workflow board: quick capture, due-date visibility, status movement, and clean delete handling.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Open tasks" value={String(stats.open)} icon="task_alt" />
              <StatCard label="Due in 3 days" value={String(stats.dueSoon)} icon="timer" />
              <StatCard label="Completed" value={String(stats.completed)} icon="done_all" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] space-y-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">{editingTaskId ? 'Edit task' : 'Quick add'}</div>
              <h2 className="mt-2 text-xl font-black text-white">{editingTaskId ? 'Update task' : 'New task'}</h2>
            </div>
            <AppSelect label="Term" value={form.academicTermId} onChange={(value) => setForm((current) => ({ ...current, academicTermId: value }))} options={terms.map((term) => ({ value: term.id, label: term.name, description: `${term.season} • ${term.academicYear}` }))} />
            <AppSelect label="Course" value={form.courseId} onChange={(value) => setForm((current) => ({ ...current, courseId: value }))} options={courses.map((course) => ({ value: course.id, label: `${course.code} — ${course.title}` }))} />
            <Input label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Microprocessors lab report" />
            <Input label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short notes or deliverable details" />
            <Input label="Due date" type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <AppSelect label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ value, label: value }))} />
              <AppSelect label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={['TODO', 'IN_PROGRESS', 'DONE'].map((value) => ({ value, label: value.replace('_', ' ') }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" className="flex-1" onClick={() => void submitTask()}>{editingTaskId ? 'Update task' : 'Create task'}</Button>
              {editingTaskId ? <Button variant="secondary" onClick={resetTaskForm}>Cancel</Button> : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Task board</div>
                <h2 className="mt-2 text-xl font-black text-white">Filter and move work</h2>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,220px)]">
                <Input label="Search tasks" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by title, course, or status" />
                <AppSelect label="Term filter" value={selectedTermFilter} onChange={setSelectedTermFilter} options={[{ value: 'ALL', label: 'All academic terms' }, ...terms.map((term) => ({ value: term.id, label: term.name, description: `${term.season} • ${term.academicYear}` }))]} />
                <AppSelect label="Course filter" value={selectedCourseFilter} onChange={setSelectedCourseFilter} options={[{ value: 'ALL', label: 'All courses' }, ...courses.map((course) => ({ value: course.id, label: `${course.code} — ${course.title}` }))]} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <TaskColumn title="To do" items={grouped.todo} loading={loading} onDelete={deleteTask} onMove={updateTaskStatus} onEdit={startEditTask} />
                <TaskColumn title="In progress" items={grouped.inProgress} loading={loading} onDelete={deleteTask} onMove={updateTaskStatus} onEdit={startEditTask} />
                <TaskColumn title="Done" items={grouped.done} loading={loading} onDelete={deleteTask} onMove={updateTaskStatus} onEdit={startEditTask} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function TaskColumn({ title, items, loading, onMove, onDelete, onEdit }: { title: string; items: AssignmentApiItem[]; loading: boolean; onMove: (id: string, status: AssignmentApiItem['status']) => Promise<void>; onDelete: (id: string) => Promise<void>; onEdit: (item: AssignmentApiItem) => void; }) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">{title}</div>
      <div className="mt-4 space-y-3">
        {loading ? [...Array(3)].map((_, index) => <div key={index} className="skeleton h-24 rounded-2xl" />) : items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.course?.title || 'Course'}</div>
                <div className="mt-1">
                  <Link href={`/workspace/courses?course=${encodeURIComponent(item.courseId)}`} className="text-[11px] font-bold text-[var(--gold)]">
                    Open linked course hub
                  </Link>
                </div>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-black text-white">{item.priority}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>{item.dueAt ? `Due ${new Date(item.dueAt).toLocaleString()}` : 'No due date'}</span>
              <div className="flex items-center gap-1">
                {item.status !== 'DONE' ? <button onClick={() => void onMove(item.id, 'DONE')} className="rounded-full border border-[var(--success)]/30 bg-[var(--success-muted)] px-2.5 py-1 text-[10px] font-black text-[var(--success)]">Done</button> : null}
                {item.status === 'TODO' ? <button onClick={() => void onMove(item.id, 'IN_PROGRESS')} className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-black text-[var(--gold)]">Start</button> : null}
                <button onClick={() => onEdit(item)} className="rounded-full border border-[var(--border)]/80 bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-black text-white">Edit</button>
                <button onClick={() => void onDelete(item.id)} className="rounded-full border border-[var(--danger)]/30 bg-[var(--danger-muted)] px-2.5 py-1 text-[10px] font-black text-[var(--danger)]">Delete</button>
              </div>
            </div>
          </article>
        )) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">No items here.</div>}
      </div>
    </section>
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
