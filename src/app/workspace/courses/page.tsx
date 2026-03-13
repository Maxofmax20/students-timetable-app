'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { CoursesView } from '@/components/workspace/CoursesView';
import { BulkActionBar } from '@/components/workspace/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { formatMinute } from '@/lib/schedule';
import { formatSessionType, inferLegacySessionType, SESSION_TYPE_OPTIONS, stripLegacySessionSuffix } from '@/lib/course-sessions';
import { csvCell, downloadFile, toUiStatus } from '@/lib/utils';
import type { CourseApiItem, GroupApiItem, InstructorApiItem, RoomApiItem, Row } from '@/types';

type FilterValue = 'ALL' | string;

type CourseFilters = {
  status: FilterValue;
  sessionType: FilterValue;
  day: FilterValue;
  groupId: FilterValue;
  instructorId: FilterValue;
  roomId: FilterValue;
  delivery: FilterValue;
};

type SavedCourseView = {
  id: string;
  name: string;
  stateJson: CourseFilters;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceAccess = {
  productRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  canWrite: boolean;
  canImport: boolean;
};

const DEFAULT_FILTERS: CourseFilters = {
  status: 'ALL',
  sessionType: 'ALL',
  day: 'ALL',
  groupId: 'ALL',
  instructorId: 'ALL',
  roomId: 'ALL',
  delivery: 'ALL'
};

const DAY_OPTIONS = [
  { value: 'ALL', label: 'All days', description: 'Show every scheduled day' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' }
];

const DELIVERY_OPTIONS = [
  { value: 'ALL', label: 'All delivery modes', description: 'Physical, online, and hybrid sessions' },
  { value: 'PHYSICAL', label: 'Physical sessions', description: 'Lecture / section / lab sessions with a physical room' },
  { value: 'ONLINE', label: 'Online sessions', description: 'Virtual-only sessions' },
  { value: 'HYBRID', label: 'Hybrid sessions', description: 'Mixed physical + online sessions' }
];

const COURSES_TEMPLATE_CSV = `courseCode,courseTitle,status,sessionType,day,startTime,endTime,groupCode,roomCode,instructorName,instructorEmail,onlinePlatform,onlineLink,note
EMIE,Electrical Machines & Industrial Electronics,ACTIVE,LECTURE,Sat,08:00,10:00,A,E119,Dr. Ahmed,,,
EMIE,Electrical Machines & Industrial Electronics,ACTIVE,LAB,Tue,10:00,12:00,A1,E226,Dr. Ahmed,,,
ROBO,Robotics Engineering,ACTIVE,ONLINE,Thu,13:00,15:00,A2,,Dr. Sara,,Google Meet,https://example.com/robo,Remote delivery`;

const COURSES_IMPORT_HELP = [
  'Use one CSV row per session. Rows with the same courseCode are grouped into one course with many sessions.',
  'Required baseline columns: courseCode, courseTitle, sessionType, day, startTime, endTime. Status is optional and defaults to ACTIVE.',
  'Group and room links resolve by exact groupCode and roomCode. Instructor links resolve by instructorEmail first, or exact unique instructor name if email is blank.',
  'Choose import mode: create only, update existing, or create + update. Preview clearly shows create vs upgrade vs conflict outcomes before confirmation.'
];

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

function getCourseSessionTypes(course: CourseApiItem) {
  if (course.sessions?.length) {
    return course.sessions.map((session) => session.type || inferLegacySessionType(course.title, course.code));
  }
  return [inferLegacySessionType(course.title, course.code)];
}

function matchesDeliveryFilter(course: CourseApiItem, delivery: FilterValue) {
  if (delivery === 'ALL') return true;
  const types = getCourseSessionTypes(course);
  if (delivery === 'ONLINE') return types.some((type) => type === 'ONLINE');
  if (delivery === 'HYBRID') return types.some((type) => type === 'HYBRID');
  return types.some((type) => type === 'LECTURE' || type === 'SECTION' || type === 'LAB');
}

function matchesGroupFilter(course: CourseApiItem, value: FilterValue) {
  if (value === 'ALL') return true;
  if (course.groupId === value) return true;
  return (course.sessions || []).some((session) => session.groupId === value);
}

function matchesInstructorFilter(course: CourseApiItem, value: FilterValue) {
  if (value === 'ALL') return true;
  if (course.instructorId === value) return true;
  return (course.sessions || []).some((session) => session.instructorId === value);
}

function matchesRoomFilter(course: CourseApiItem, value: FilterValue) {
  if (value === 'ALL') return true;
  if (course.roomId === value) return true;
  return (course.sessions || []).some((session) => session.roomId === value);
}

function matchesCourseFilters(course: CourseApiItem, filters: CourseFilters) {
  if (filters.status !== 'ALL' && toUiStatus(course.status) !== filters.status) return false;
  if (filters.sessionType !== 'ALL' && !getCourseSessionTypes(course).some((type) => type === filters.sessionType)) return false;
  if (filters.day !== 'ALL' && !(course.sessions || []).some((session) => session.day === filters.day)) return false;
  if (!matchesGroupFilter(course, filters.groupId)) return false;
  if (!matchesInstructorFilter(course, filters.instructorId)) return false;
  if (!matchesRoomFilter(course, filters.roomId)) return false;
  if (!matchesDeliveryFilter(course, filters.delivery)) return false;
  return true;
}

function summarizeFilters(filters: CourseFilters, groups: GroupApiItem[], instructors: InstructorApiItem[], rooms: RoomApiItem[]) {
  const labels: string[] = [];
  if (filters.status !== 'ALL') labels.push(filters.status);
  if (filters.sessionType !== 'ALL') labels.push(formatSessionType(filters.sessionType));
  if (filters.day !== 'ALL') labels.push(filters.day);
  if (filters.groupId !== 'ALL') labels.push(groups.find((group) => group.id === filters.groupId)?.code || 'Specific group');
  if (filters.instructorId !== 'ALL') labels.push(instructors.find((instructor) => instructor.id === filters.instructorId)?.name || 'Specific instructor');
  if (filters.roomId !== 'ALL') labels.push(rooms.find((room) => room.id === filters.roomId)?.code || 'Specific room');
  if (filters.delivery !== 'ALL') labels.push(filters.delivery === 'PHYSICAL' ? 'Physical' : filters.delivery);
  return labels;
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'create' | 'full' | 'duplicate'>('create');
  const [courseModalData, setCourseModalData] = useState<EditCourseInitialData>({ sessions: [] });
  const [deleteTarget, setDeleteTarget] = useState<CourseApiItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [createHandled, setCreateHandled] = useState(false);
  const [filters, setFilters] = useState<CourseFilters>(DEFAULT_FILTERS);
  const [savedViews, setSavedViews] = useState<SavedCourseView[]>([]);
  const [viewDraftName, setViewDraftName] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSavedViewsPanel, setShowSavedViewsPanel] = useState(false);

  const loadSavedViews = async (resolvedWorkspaceId: string) => {
    const response = await fetch(`/api/v1/saved-views?workspaceId=${resolvedWorkspaceId}&surface=COURSES`, { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || 'Failed to load saved views');
    }
    setSavedViews(payload.data?.items || []);
  };

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

      const resolvedWorkspaceId = coursesPayload.data?.workspaceId || '';
      setWorkspaceId(resolvedWorkspaceId);
      setAccess(coursesPayload.data?.access || null);
      setCourses(coursesPayload.data?.items || []);
      setGroups(groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items || [] : []);
      setInstructors(instructorsResponse.ok && instructorsPayload?.ok ? instructorsPayload.data?.items || [] : []);
      setRooms(roomsResponse.ok && roomsPayload?.ok ? roomsPayload.data?.items || [] : []);
      if (resolvedWorkspaceId) {
        await loadSavedViews(resolvedWorkspaceId);
      }
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

  const filteredCourses = useMemo(() => courses.filter((course) => matchesCourseFilters(course, filters)), [courses, filters]);
  const rows = useMemo(() => filteredCourses.map(courseToRow), [filteredCourses]);
  const selection = useBulkSelection(rows.map((row) => row.id));
  const { pruneTo } = selection;
  useEffect(() => {
    pruneTo(rows.map((row) => row.id));
  }, [rows, pruneTo]);
  const activeFilterSummary = useMemo(() => summarizeFilters(filters, groups, instructors, rooms), [filters, groups, instructors, rooms]);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'All statuses', description: 'Show active, draft, and conflict courses' },
    { value: 'Active', label: 'Active' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Conflict', label: 'Conflict' }
  ], []);

  const sessionTypeOptions = useMemo(() => [
    { value: 'ALL', label: 'All session types', description: 'Lecture, section, lab, online, and hybrid' },
    ...SESSION_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label, description: option.description }))
  ], []);

  const groupOptions = useMemo(() => [
    { value: 'ALL', label: 'All groups', description: 'No group-level filtering' },
    ...groups.map((group) => ({ value: group.id, label: group.code, description: group.name, keywords: `${group.code} ${group.name}` }))
  ], [groups]);

  const instructorOptions = useMemo(() => [
    { value: 'ALL', label: 'All instructors', description: 'Show every assigned instructor' },
    ...instructors.map((instructor) => ({ value: instructor.id, label: instructor.name, description: instructor.email || instructor.phone || undefined }))
  ], [instructors]);

  const roomOptions = useMemo(() => [
    { value: 'ALL', label: 'All rooms', description: 'No room-level filtering' },
    ...rooms.map((room) => ({ value: room.id, label: room.code, description: room.name }))
  ], [rooms]);

  const savedViewOptions = useMemo(() => [
    { value: 'CUSTOM', label: 'Custom view', description: 'Use currently selected filters' },
    ...savedViews.map((view) => ({ value: view.id, label: view.name, description: `Updated ${new Date(view.updatedAt).toLocaleDateString()}` }))
  ], [savedViews]);

  const applySavedView = (view: SavedCourseView) => {
    setFilters(view.stateJson);
    setActiveSavedViewId(view.id);
    toast(`Applied saved view: ${view.name}`);
  };

  const saveCurrentView = async () => {
    const name = viewDraftName.trim();
    if (!name) {
      toast('Give this view a name first.', 'error');
      return;
    }
    if (!workspaceId) {
      toast('Workspace is still loading. Try again in a moment.', 'error');
      return;
    }

    const response = await fetch('/api/v1/saved-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, surface: 'COURSES', name, stateJson: filters })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to save current view', 'error');
      return;
    }

    setSavedViews((current) => [payload.data, ...current]);
    setViewDraftName('');
    setActiveSavedViewId(payload.data.id);
    toast('Saved current view');
  };

  const renameSavedView = async (view: SavedCourseView) => {
    const nextName = window.prompt('Rename saved view', view.name)?.trim();
    if (!nextName || nextName === view.name) return;

    const response = await fetch(`/api/v1/saved-views/${view.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, name: nextName })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to rename saved view', 'error');
      return;
    }

    setSavedViews((current) => current.map((item) => (item.id === view.id ? payload.data : item)));
    toast('Saved view renamed');
  };

  const deleteSavedView = async (id: string) => {
    const response = await fetch(`/api/v1/saved-views/${id}?workspaceId=${workspaceId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to remove saved view', 'error');
      return;
    }

    setSavedViews((current) => current.filter((view) => view.id !== id));
    if (activeSavedViewId === id) setActiveSavedViewId(null);
    toast('Saved view removed');
  };

  const openCreate = () => {
    if (!access?.canWrite) {
      toast('Viewer mode: course creation is disabled.', 'error');
      return;
    }
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
      openDuplicate(course);
    }
  };

  const scopeLabel = activeFilterSummary.length ? activeFilterSummary.join(' • ') : 'All courses and sessions';

  const exportFilteredCoursesCsv = () => {
    const rows: string[][] = [];
    for (const course of filteredCourses) {
      for (const session of course.sessions || []) {
        const sessionType = session.type || inferLegacySessionType(course.title, course.code);
        if (filters.sessionType !== 'ALL' && sessionType !== filters.sessionType) continue;
        if (filters.day !== 'ALL' && session.day !== filters.day) continue;
        if (filters.groupId !== 'ALL' && (session.groupId || course.groupId) !== filters.groupId) continue;
        if (filters.instructorId !== 'ALL' && (session.instructorId || course.instructorId) !== filters.instructorId) continue;
        if (filters.roomId !== 'ALL' && (session.roomId || course.roomId) !== filters.roomId) continue;
        if (filters.delivery === 'ONLINE' && sessionType !== 'ONLINE') continue;
        if (filters.delivery === 'HYBRID' && sessionType !== 'HYBRID') continue;
        if (filters.delivery === 'PHYSICAL' && !['LECTURE', 'SECTION', 'LAB'].includes(sessionType)) continue;

        rows.push([
          course.code,
          stripLegacySessionSuffix(course.title),
          toUiStatus(course.status),
          formatSessionType(sessionType),
          session.day,
          formatMinute(session.startMinute) + '-' + formatMinute(session.endMinute),
          session.group?.code || course.group?.code || '-',
          session.room?.code || course.room?.code || '-',
          session.room?.name || course.room?.name || '-',
          session.instructor?.name || course.instructor?.name || '-',
          session.onlinePlatform || '',
          session.onlineLink || '',
          session.note || '',
          scopeLabel
        ]);
      }
    }

    if (!rows.length) {
      toast('No session rows match the current course filters for CSV export.', 'error');
      return;
    }

    const header = ['course_code', 'course_title', 'status', 'session_type', 'day', 'time', 'group_code', 'room_code', 'room_name', 'instructor', 'online_platform', 'online_link', 'note', 'scope'];
    const lines = [header.map(csvCell).join(','), ...rows.map((line) => line.map((cell) => csvCell(cell)).join(','))];
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadFile('courses-filtered-sessions-' + dateTag + '.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    toast('Exported filtered courses CSV (' + rows.length + ' session rows). Scope: ' + scopeLabel);
  };

  const exportSelectedCoursesCsv = () => {
    const selectedRows = rows.filter((row) => selection.selected.has(row.id));
    if (!selectedRows.length) {
      toast('Select at least one course first. This export only includes selected rows.', 'error');
      return;
    }
    const header = ['course_code', 'course_title', 'status', 'group', 'instructor', 'room'];
    const csvRows = selectedRows.map((row) => [row.code || '', row.courseName || row.course, row.status, row.group, row.instructor, row.room]);
    const lines = [header.map(csvCell).join(','), ...csvRows.map((line) => line.map((cell) => csvCell(cell)).join(','))];
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadFile(`courses-selected-${dateTag}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    toast(`Exported ${selectedRows.length} selected course row(s). Scope: selected items only.`);
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selection.selected);
    if (!ids.length) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/courses/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'delete', ids }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Bulk delete failed');
      setBulkDeleteOpen(false);
      setBulkConfirmText('');
      selection.clear();
      toast(`Bulk delete complete: ${payload.successCount}/${payload.requested} deleted.` + (payload.failed?.length ? ` Failed: ${payload.failed[0].reason}` : ''));
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk delete failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runBulkStatus = async (statusValue: 'ACTIVE' | 'DRAFT') => {
    const ids = Array.from(selection.selected);
    if (!ids.length) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/courses/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'status', ids, status: statusValue }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Bulk status update failed');
      setBulkStatusOpen(null);
      selection.clear();
      toast(`Bulk status complete: ${payload.successCount}/${payload.requested} updated to ${statusValue}.`);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk status failed', 'error');
    } finally {
      setSaving(false);
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
        open={bulkDeleteOpen}
        onClose={() => { if (!saving) { setBulkDeleteOpen(false); setBulkConfirmText(''); } }}
        title="Delete Selected Courses"
        subtitle="This permanently removes all selected courses and their sessions."
        actions={
          <>
            <Button variant="ghost" onClick={() => { setBulkDeleteOpen(false); setBulkConfirmText(''); }} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={() => void runBulkDelete()} disabled={saving || bulkConfirmText !== 'DELETE'}>{saving ? 'Deleting...' : `Delete ${selection.selectedCount} Selected`}</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Destructive action scope: <span className="font-semibold text-white">selected items only</span> ({selection.selectedCount} selected). Type <span className="font-bold text-white">DELETE</span> to confirm.</p>
        <div className="mt-3">
          <Input value={bulkConfirmText} onChange={(event) => setBulkConfirmText(event.target.value)} placeholder="Type DELETE" />
        </div>
      </Modal>

      <Modal
        open={Boolean(bulkStatusOpen)}
        onClose={() => setBulkStatusOpen(null)}
        title="Bulk Course Status Update"
        subtitle="Apply a single status to all currently selected courses."
        actions={
          <>
            <Button variant="ghost" onClick={() => setBulkStatusOpen(null)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={() => bulkStatusOpen && void runBulkStatus(bulkStatusOpen)} disabled={saving}>{saving ? 'Applying...' : `Set ${selection.selectedCount} to ${bulkStatusOpen}`}</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Status target: <span className="font-semibold text-white">{bulkStatusOpen}</span>. Scope: selected courses only ({selection.selectedCount}).</p>
      </Modal>

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
