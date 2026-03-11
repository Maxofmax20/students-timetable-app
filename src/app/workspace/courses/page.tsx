'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AppSelect } from '@/components/ui/AppSelect';
import { useToast } from '@/components/ui/Toast';
import { CoursesView } from '@/components/workspace/CoursesView';
import { CsvImportModal } from '@/components/workspace/CsvImportModal';
import { EditCourseModal, type EditCourseInitialData, type EditCourseSubmitData } from '@/components/workspace/EditCourseModal';
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
  const [saving, setSaving] = useState(false);
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

  const handleRowAction = (action: 'Edit' | 'Duplicate' | 'Delete', row: Row) => {
    if (!access?.canWrite) {
      toast('Viewer mode: editing actions are disabled.', 'error');
      return;
    }
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

  return (
    <AppShell title="Courses" subtitle="Manage and organize all university courses.">
      <div className="space-y-6">
        <section className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-2 shadow-[var(--shadow-sm)] md:p-2.5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">
                Showing {filteredCourses.length} of {courses.length}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {activeFilterSummary.length} active filter{activeFilterSummary.length === 1 ? '' : 's'}
              </span>
              <Button variant={showFiltersPanel ? 'primary' : 'secondary'} onClick={() => setShowFiltersPanel((current) => !current)} className="ml-auto gap-1.5 px-3">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
              </Button>
              <Button variant={showSavedViewsPanel ? 'primary' : 'secondary'} onClick={() => setShowSavedViewsPanel((current) => !current)} className="gap-1.5 px-3">
                <span className="material-symbols-outlined text-[18px]">bookmark</span>
                Saved views
              </Button>
              <Button variant="ghost" onClick={exportFilteredCoursesCsv} className="gap-1.5 px-2.5 text-[var(--text-secondary)] sm:px-3">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="ghost" onClick={() => { setFilters(DEFAULT_FILTERS); setActiveSavedViewId(null); }} className="gap-1.5 px-2.5 text-[var(--text-secondary)] sm:px-3">
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>

            <div className="min-w-[180px] md:max-w-[300px]">
              <AppSelect
                value={activeSavedViewId || 'CUSTOM'}
                onChange={(value) => {
                  if (value === 'CUSTOM') {
                    setActiveSavedViewId(null);
                    return;
                  }
                  const view = savedViews.find((item) => item.id === value);
                  if (view) applySavedView(view);
                }}
                options={savedViewOptions}
                placeholder="Current saved view"
                compact
              />
            </div>

            {activeFilterSummary.length ? (
              <div className="flex flex-wrap gap-2">
                {activeFilterSummary.map((label) => (
                  <span key={label} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            {showFiltersPanel ? (
              <div className="grid gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)] md:grid-cols-2 xl:grid-cols-4">
                <AppSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={statusOptions} />
                <AppSelect label="Session type" value={filters.sessionType} onChange={(value) => setFilters((current) => ({ ...current, sessionType: value }))} options={sessionTypeOptions} />
                <AppSelect label="Day" value={filters.day} onChange={(value) => setFilters((current) => ({ ...current, day: value }))} options={DAY_OPTIONS} />
                <AppSelect label="Delivery" value={filters.delivery} onChange={(value) => setFilters((current) => ({ ...current, delivery: value }))} options={DELIVERY_OPTIONS} />
                <AppSelect label="Group" value={filters.groupId} onChange={(value) => setFilters((current) => ({ ...current, groupId: value }))} options={groupOptions} searchable searchPlaceholder="Find group" />
                <AppSelect label="Instructor" value={filters.instructorId} onChange={(value) => setFilters((current) => ({ ...current, instructorId: value }))} options={instructorOptions} searchable searchPlaceholder="Find instructor" />
                <AppSelect label="Room" value={filters.roomId} onChange={(value) => setFilters((current) => ({ ...current, roomId: value }))} options={roomOptions} searchable searchPlaceholder="Find room" />
                <div className="flex items-end">
                  <Button variant="ghost" onClick={() => { setFilters(DEFAULT_FILTERS); setActiveSavedViewId(null); }} className="w-full gap-2 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Reset Filters
                  </Button>
                </div>
              </div>
            ) : null}

            {showSavedViewsPanel ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)]">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:max-w-sm">
                    <Input
                      label="Saved view name"
                      value={viewDraftName}
                      onChange={(event) => setViewDraftName(event.target.value)}
                      placeholder="e.g. Draft labs for Group A"
                      helperText="Save current filters for one-tap reuse."
                    />
                  </div>
                  <Button variant="primary" onClick={() => void saveCurrentView()} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                    Save Current View
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {savedViews.length ? (
                    savedViews.map((view) => {
                      const isActive = activeSavedViewId === view.id;
                      return (
                        <div key={view.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${isActive ? 'border-[var(--gold)] bg-[var(--gold-muted)]' : 'border-[var(--border)] bg-[var(--bg-raised)]'}`}>
                          <button type="button" onClick={() => applySavedView(view)} className="rounded-full px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-[var(--surface)]">{view.name}</button>
                          <button type="button" onClick={() => void renameSavedView(view)} aria-label={`Rename saved view ${view.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-white"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button type="button" onClick={() => void deleteSavedView(view.id)} aria-label={`Delete saved view ${view.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--danger)]"><span className="material-symbols-outlined text-[18px]">close</span></button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-[var(--text-secondary)]">No saved views yet — create one after setting up a useful filter combination.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        {!access?.canWrite ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            You are in Viewer mode. Course data is read-only; import and create/edit/delete actions are disabled.
          </div>
        ) : null}

        <CoursesView
          rows={rows}
          denseRows={false}
          timeMode="24h"
          onAction={handleAction}
          onRowAction={handleRowAction}
          isLoading={status === 'loading' || loading}
          canCreate={Boolean(access?.canWrite)}
          extraActions={
            access?.canImport ? (
              <Button onClick={() => setIsImportOpen(true)} variant="secondary" className="gap-2 w-full sm:w-auto justify-center">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Import CSV
              </Button>
            ) : null
          }
        />
      </div>

      <CsvImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Courses + Sessions from CSV"
        subtitle="Preview grouped course imports first, validate linked entities, and then confirm explicit create/append actions. Existing course records are never silently overwritten."
        endpoint="/api/v1/import/courses"
        templateFilename="courses-sessions-import-template.csv"
        templateCsv={COURSES_TEMPLATE_CSV}
        helpLines={COURSES_IMPORT_HELP}
        onImported={async () => {
          setIsImportOpen(false);
          await load();
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
