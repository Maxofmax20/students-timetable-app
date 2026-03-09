'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { EditCourseModal } from '@/components/workspace/EditCourseModal';
import { CoursesView } from '@/components/workspace/CoursesView';
import { formatMinute } from '@/lib/schedule';
import { toUiStatus } from '@/lib/utils';
import type { ActionLabel, CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem, Row, RowAction } from '@/types';

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

  const rows = useMemo(() => courses.map(courseToRow), [courses]);

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

  const handleAction = (action: ActionLabel) => {
    if (action === 'New') {
      openCreate();
    }
  };

  const handleRowAction = (action: RowAction, row: Row) => {
    const course = courses.find((item) => item.id === row.id);
    if (!course) return;

    if (action === 'Edit') {
      openEdit(course);
      return;
    }

    if (action === 'Delete') {
      setDeleteTarget(course);
      return;
    }

    if (action === 'Duplicate') {
      setCourseModalData({
        ...courseToRow(course),
        code: course.code ? `${course.code}-COPY` : undefined
      });
      setCourseModalMode('create');
      setCourseModalOpen(true);
    }
  };

  return (
    <AppShell title="Courses" subtitle="Manage and organize all university courses.">
      <CoursesView
        rows={rows}
        denseRows={false}
        timeMode="24h"
        onAction={handleAction}
        onRowAction={handleRowAction}
        isLoading={status === 'loading' || loading}
      />

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
