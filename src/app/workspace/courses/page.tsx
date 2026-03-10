'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { CoursesView } from '@/components/workspace/CoursesView';
import { EditCourseModal, type EditCourseInitialData, type EditCourseSubmitData } from '@/components/workspace/EditCourseModal';
import { formatSessionType, stripLegacySessionSuffix } from '@/lib/course-sessions';
import { formatMinute } from '@/lib/schedule';
import { toUiStatus } from '@/lib/utils';
import type { CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem, Row } from '@/types';

function toApiStatus(status: Row['status'] | string | undefined) {
  if (status === 'Draft') return 'DRAFT';
  if (status === 'Conflict') return 'CONFLICT';
  return 'ACTIVE';
}

function courseDisplayName(course: CourseApiItem) {
  const base = stripLegacySessionSuffix(course.title);
  const count = course.sessions?.length || 0;
  return count > 1 ? `${base} (${count} sessions)` : base;
}

function courseToRow(course: CourseApiItem): Row {
  const firstSession = course.sessions?.[0];

  return {
    id: course.id,
    source: 'real',
    code: course.code,
    course: courseDisplayName(course),
    courseName: stripLegacySessionSuffix(course.title),
    group: course.group?.code || firstSession?.group?.code || '-',
    groupId: course.groupId ?? firstSession?.groupId ?? null,
    instructor: course.instructor?.name || firstSession?.instructor?.name || '-',
    instructorId: course.instructorId ?? firstSession?.instructorId ?? null,
    room: course.room?.code || firstSession?.room?.code || '-',
    roomId: course.roomId ?? firstSession?.roomId ?? null,
    day: firstSession?.day || '--',
    time: firstSession ? `${formatMinute(firstSession.startMinute)}-${formatMinute(firstSession.endMinute)}` : '--',
    status: toUiStatus(course.status)
  };
}

function courseToEditorData(course: CourseApiItem): EditCourseInitialData {
  const sessions = (course.sessions || []).map((session) => ({
    id: session.id,
    type: session.type || undefined,
    day: session.day,
    startTime: formatMinute(session.startMinute),
    endTime: formatMinute(session.endMinute),
    groupId: session.groupId ?? null,
    instructorId: session.instructorId ?? null,
    roomId: session.roomId ?? null,
    onlinePlatform: session.onlinePlatform ?? null,
    onlineLink: session.onlineLink ?? null,
    note: session.note ?? null
  }));

  return {
    id: course.id,
    code: course.code,
    course: stripLegacySessionSuffix(course.title),
    status: toUiStatus(course.status),
    groupId: course.groupId ?? null,
    instructorId: course.instructorId ?? null,
    roomId: course.roomId ?? null,
    sessions
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
  const [courseModalMode, setCourseModalMode] = useState<'create' | 'full' | 'duplicate'>('create');
  const [courseModalData, setCourseModalData] = useState<EditCourseInitialData>({ sessions: [] });
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
      setCourseModalData({ sessions: [] });
      setCourseModalMode('create');
      setCourseModalOpen(true);
      setCreateHandled(true);
    }
  }, [createHandled, loading, shouldOpenCreate]);

  const rows = useMemo(() => courses.map(courseToRow), [courses]);

  const openCreate = () => {
    setCourseModalData({ sessions: [] });
    setCourseModalMode('create');
    setCourseModalOpen(true);
  };

  const openEdit = (course: CourseApiItem) => {
    setCourseModalData(courseToEditorData(course));
    setCourseModalMode('full');
    setCourseModalOpen(true);
  };

  const openDuplicate = (course: CourseApiItem) => {
    const duplicateData = courseToEditorData(course);
    setCourseModalData({
      ...duplicateData,
      id: undefined,
      code: course.code ? `${course.code}-COPY` : undefined,
      sessions: duplicateData.sessions?.map((session) => ({ ...session, id: undefined }))
    });
    setCourseModalMode('duplicate');
    setCourseModalOpen(true);
  };

  const saveCourse = async (data: EditCourseSubmitData, originalId?: string) => {
    setSaving(true);
    try {
      const payload = {
        code: data.code,
        title: data.course,
        status: toApiStatus(data.status),
        groupId: data.groupId ?? null,
        instructorId: data.instructorId ?? null,
        roomId: data.roomId ?? null,
        sessions: data.sessions
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

  const handleAction = () => {
    openCreate();
  };

  const handleRowAction = (action: 'Edit' | 'Duplicate' | 'Delete', row: Row) => {
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
      openDuplicate(course);
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
        subtitle="This removes the course and all of its attached sessions from the workspace."
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
