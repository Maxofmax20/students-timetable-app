'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { EditCourseModal } from '@/components/workspace/EditCourseModal';
import { CoursesView } from '@/components/workspace/CoursesView';
import { BulkActionBar } from '@/components/workspace/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
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
  const bulk = useBulkSelection();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseApiItem[]>([]);
  const [groups, setGroups] = useState<GroupApiItem[]>([]);
  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [rooms, setRooms] = useState<RoomApiItem[]>([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'create' | 'full'>('create');
  const [courseModalData, setCourseModalData] = useState<Partial<Row>>({});
  const [deleteTarget, setDeleteTarget] = useState<CourseApiItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
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

  // ── Bulk helpers ──────────────────────────────────────────────────────────
  const selectedCourseIds = Array.from(bulk.selectedIds);

  const handleBulkExport = () => {
    const selected = courses.filter((c) => bulk.selectedIds.has(c.id));
    if (!selected.length) return;
    const headers = ['id', 'code', 'title', 'status'];
    const rows = selected.map((c) => [c.id, c.code, c.title, c.status].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `courses-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selected.length} course${selected.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/v1/courses/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedCourseIds }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.message || 'Bulk delete failed');
      toast(`Deleted ${result.data?.deleted ?? selectedCourseIds.length} course(s)`);
      bulk.clear();
      setBulkDeleteOpen(false);
      setBulkDeleteConfirm('');
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk delete failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatus = async (newStatus: 'ACTIVE' | 'DRAFT') => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/v1/courses/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedCourseIds, status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.message || 'Status update failed');
      toast(`Updated ${result.data?.updated ?? selectedCourseIds.length} course(s) to ${newStatus.toLowerCase()}`);
      bulk.clear();
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk status update failed', 'error');
    } finally {
      setBulkLoading(false);
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
        selectedIds={bulk.selectedIds}
        onToggle={bulk.toggle}
        onToggleAll={bulk.toggleAll}
      />

      {/* Bulk action bar */}
      <BulkActionBar
        count={bulk.count}
        loading={bulkLoading}
        showStatus
        onClear={bulk.clear}
        onAction={(action) => {
          if (action === 'delete') setBulkDeleteOpen(true);
          if (action === 'export') handleBulkExport();
          if (action === 'status-active') void handleBulkStatus('ACTIVE');
          if (action === 'status-draft') void handleBulkStatus('DRAFT');
        }}
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

      {/* Single course delete */}
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

      {/* Bulk delete confirmation */}
      <Modal
        open={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }}
        title={`Delete ${bulk.count} Course${bulk.count > 1 ? 's' : ''}`}
        subtitle="This permanently removes the selected courses and all their sessions."
        actions={
          <>
            <Button variant="ghost" onClick={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleBulkDelete()}
              disabled={bulkLoading || bulkDeleteConfirm !== 'DELETE'}
            >
              {bulkLoading ? 'Deleting...' : `Delete ${bulk.count} Course${bulk.count > 1 ? 's' : ''}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            You are about to permanently delete <span className="font-semibold text-white">{bulk.count} course{bulk.count > 1 ? 's' : ''}</span>. This action cannot be undone.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Type <span className="text-white font-mono">DELETE</span> to confirm
            </label>
            <Input
              value={bulkDeleteConfirm}
              onChange={(e) => setBulkDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
