'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { EditCourseModal } from '@/components/workspace/EditCourseModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMinute } from '@/lib/schedule';
import { toUiStatus } from '@/lib/utils';
import type { CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem, Row } from '@/types';

function splitCourseTitle(title: string) {
  const [course, type] = title.split(' — ');
  return { course: course || title, type: type || 'Session' };
}

function toApiStatus(status: Row['status'] | string | undefined) {
  if (status === 'Draft') return 'DRAFT';
  if (status === 'Conflict') return 'CONFLICT';
  return 'ACTIVE';
}

function courseToRow(course: CourseApiItem): Row {
  const titleBits = splitCourseTitle(course.title);
  const firstSession = course.sessions?.[0];

  return {
    id: course.id,
    source: 'real',
    code: course.code,
    course: titleBits.course,
    group: firstSession?.group?.code || course.group?.code || '-',
    groupId: firstSession?.groupId ?? course.groupId ?? null,
    instructor: firstSession?.instructor?.name || course.instructor?.name || '-',
    instructorId: firstSession?.instructorId ?? course.instructorId ?? null,
    room: firstSession?.room?.code || course.room?.code || '-',
    roomId: firstSession?.roomId ?? course.roomId ?? null,
    day: firstSession?.day || 'Mon',
    time: firstSession ? `${formatMinute(firstSession.startMinute)}-${formatMinute(firstSession.endMinute)}` : '09:00-10:00',
    status: toUiStatus(course.status)
  };
}

type CourseCard = {
  id: string;
  title: string;
  code: string;
  type: string;
  group: string;
  room: string;
  instructor: string;
  status: string;
  sessionCount: number;
  nextSlot: string;
  raw: CourseApiItem;
};

export default function WorkspaceCoursesPage() {
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams?.get('create') === '1';
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [groups, setGroups] = useState<GroupApiItem[]>([]);
  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [rooms, setRooms] = useState<RoomApiItem[]>([]);
  const [query, setQuery] = useState('');
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'create' | 'full'>('create');
  const [courseModalData, setCourseModalData] = useState<Partial<Row>>({});
  const [deleteTarget, setDeleteTarget] = useState<CourseApiItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createHandled, setCreateHandled] = useState(false);

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
        throw new Error(coursesPayload?.message || 'Failed to load courses');
      }

      setCourses(coursesPayload.data?.items || []);
      setGroups(groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items || [] : []);
      setInstructors(instructorsResponse.ok && instructorsPayload?.ok ? instructorsPayload.data?.items || [] : []);
      setRooms(roomsResponse.ok && roomsPayload?.ok ? roomsPayload.data?.items || [] : []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void load();
    }
  }, [status]);

  useEffect(() => {
    if (!loading && shouldOpenCreate && !createHandled) {
      setCourseModalData({});
      setCourseModalMode('create');
      setCourseModalOpen(true);
      setCreateHandled(true);
    }
  }, [createHandled, loading, shouldOpenCreate]);

  const cards = useMemo<CourseCard[]>(() => {
    return courses.map((item) => {
      const titleBits = splitCourseTitle(item.title);
      const firstSession = item.sessions?.[0];
      return {
        id: item.id,
        title: titleBits.course,
        code: item.code,
        type: titleBits.type,
        group: item.group?.code || firstSession?.group?.code || '-',
        room: item.room?.code || firstSession?.room?.code || '-',
        instructor: item.instructor?.name || firstSession?.instructor?.name || '-',
        status: item.status,
        sessionCount: item.sessions?.length || 0,
        nextSlot: firstSession ? `${firstSession.day} • ${formatMinute(firstSession.startMinute)} → ${formatMinute(firstSession.endMinute)}` : 'No scheduled session',
        raw: item
      };
    });
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((course) =>
      [course.title, course.code, course.type, course.group, course.room, course.instructor, course.nextSlot]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [cards, query]);

  const counts = useMemo(() => ({
    total: cards.length,
    lectures: cards.filter((item) => item.type.toLowerCase() === 'lec').length,
    sections: cards.filter((item) => item.type.toLowerCase() === 'sec').length,
    labs: cards.filter((item) => item.type.toLowerCase() === 'lab').length
  }), [cards]);

  const openCreate = () => {
    setCourseModalData({});
    setCourseModalMode('create');
    setCourseModalOpen(true);
  };

  const openEdit = (course: CourseApiItem) => {
    setCourseModalData(courseToRow(course));
    setCourseModalMode('full');
    setCourseModalOpen(true);
  };

  const saveCourse = async (data: Partial<Row>, originalId?: string) => {
    setSaving(true);
    try {
      const payload = {
        code: data.code,
        title: data.course,
        status: toApiStatus(data.status),
        groupId: data.groupId ?? null,
        instructorId: data.instructorId ?? null,
        roomId: data.roomId ?? null,
        day: data.day ?? null,
        time: data.time ?? null
      };

      const response = await fetch(originalId ? `/api/v1/courses/${originalId}` : '/api/v1/courses', {
        method: originalId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || (originalId ? 'Failed to update course' : 'Failed to create course'));
      }

      toast(originalId ? 'Course updated' : 'Course created');
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Course save failed', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/courses/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'Failed to delete course');
      }

      toast('Course deleted');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Course delete failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Courses" subtitle="Catalog-first course management, separate from the timetable agenda">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Course catalog</div>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Manage course entities without confusing them with timetable rows.</h2>
              <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
                Courses hold catalog metadata. Scheduled occurrences belong to the timetable and are shown here only as supporting context.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => void load()}>{loading ? 'Refreshing...' : 'Refresh catalog'}</Button>
              <Button variant="primary" onClick={openCreate}>New Course</Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              placeholder="Search by course, code, instructor, group, or room..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              containerClassName="w-full md:max-w-lg"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-3"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-bold">Total</div><div className="mt-1 text-lg font-bold text-white">{counts.total}</div></div>
            <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-3"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-bold">Lectures</div><div className="mt-1 text-lg font-bold text-white">{counts.lectures}</div></div>
            <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-3"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-bold">Sections</div><div className="mt-1 text-lg font-bold text-white">{counts.sections}</div></div>
            <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-3"><div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-bold">Labs</div><div className="mt-1 text-lg font-bold text-white">{counts.labs}</div></div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-secondary)]">Loading courses...</div>
        ) : filtered.length ? (
          <div className="space-y-3">
            {filtered.map((course) => (
              <div key={course.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base text-white break-words">{course.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-[var(--gold-soft)]">{course.type}</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">{course.code}</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-white">{course.status}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-center lg:min-w-[108px]">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-bold">Scheduled sessions</div>
                    <div className="mt-1 text-2xl font-bold text-white">{course.sessionCount}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold">Instructor</div>
                    <div className="mt-1 text-white font-semibold break-words">{course.instructor}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold">Primary group</div>
                    <div className="mt-1 text-white font-semibold break-words">{course.group}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold">Default room</div>
                    <div className="mt-1 text-white font-semibold break-words">{course.room}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold">Next scheduled slot</div>
                    <div className="mt-1 text-white font-semibold break-words">{course.nextSlot}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => openEdit(course.raw)} className="justify-center">Edit Course</Button>
                  <Button variant="danger" onClick={() => setDeleteTarget(course.raw)} className="justify-center">Delete Course</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={query ? 'search_off' : 'library_books'}
            title={query ? 'No courses found' : 'No courses yet'}
            description={query ? `No courses match "${query}".` : 'Create your first course here, then add real day/time details so it appears on the timetable.'}
            action={query ? (
              <Button variant="ghost" onClick={() => setQuery('')}>Clear Search</Button>
            ) : (
              <Button variant="primary" onClick={openCreate}>Create First Course</Button>
            )}
          />
        )}
      </div>

      <EditCourseModal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        mode={courseModalMode}
        initialData={courseModalData}
        groups={groups}
        instructors={instructors}
        rooms={rooms}
        onSave={saveCourse}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Course"
        subtitle="This removes the course and its scheduled sessions from the workspace."
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={() => void deleteCourse()} disabled={saving}>{saving ? 'Deleting...' : 'Delete Course'}</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget?.title}</span>? This action cannot be undone.
        </p>
      </Modal>
    </AppShell>
  );
}
