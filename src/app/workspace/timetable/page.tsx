'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
import { useToast } from '@/components/ui/Toast';
import { TimetableView, type TimetableItem } from '@/components/workspace/TimetableView';
import { buildScheduleConflictReport, buildScheduleItems, downloadScheduleCalendar, getScheduleConflictLabels } from '@/lib/schedule';
import { groupHierarchyPath, sortGroupsForDisplay } from '@/lib/group-room-model';
import { csvCell, downloadFile } from '@/lib/utils';
import type { CourseApiItem, GroupApiItem } from '@/types';

const SESSION_TYPE_OPTIONS = ['Lecture', 'Section', 'Lab', 'Online', 'Hybrid'] as const;
type SessionTypeLabel = (typeof SESSION_TYPE_OPTIONS)[number];
type DeliveryFilter = 'ALL' | 'PHYSICAL' | 'ONLINE' | 'HYBRID';

type TimetableSavedState = {
  selectedTypes: SessionTypeLabel[];
  selectedGroupId: string;
  deliveryFilter: DeliveryFilter;
  showConflictLayer: boolean;
};

type WorkspaceAccess = {
  productRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  canWrite: boolean;
  canImport: boolean;
};

type SavedTimetableView = {
  id: string;
  name: string;
  stateJson: TimetableSavedState;
  updatedAt: string;
};

function matchesDelivery(item: TimetableItem, filter: DeliveryFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'ONLINE') return item.type === 'Online';
  if (filter === 'HYBRID') return item.type === 'Hybrid';
  return item.type === 'Lecture' || item.type === 'Section' || item.type === 'Lab';
}


export default function WorkspaceTimetablePage() {
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
  const [selectedTypes, setSelectedTypes] = useState<SessionTypeLabel[]>([...SESSION_TYPE_OPTIONS]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('ALL');
  const [showConflictLayer, setShowConflictLayer] = useState(true);
  const [savedViews, setSavedViews] = useState<SavedTimetableView[]>([]);
  const [viewDraftName, setViewDraftName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      setLoading(true);
      try {
        const [coursesResponse, groupsResponse] = await Promise.all([
          fetch('/api/v1/courses', { credentials: 'include' }),
          fetch('/api/v1/groups', { credentials: 'include' })
        ]);
        const [coursesPayload, groupsPayload] = await Promise.all([coursesResponse.json(), groupsResponse.json()]);

        if (!coursesResponse.ok || !coursesPayload?.ok) {
          throw new Error(coursesPayload?.message || 'Failed to load timetable data');
        }

        const resolvedWorkspaceId = coursesPayload.data?.workspaceId || '';
        setWorkspaceId(resolvedWorkspaceId);
        setCourses(coursesPayload.data?.items || []);
        setAccess(coursesPayload.data?.access || null);
        setGroups(groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items || [] : []);

        if (resolvedWorkspaceId) {
          const savedViewsResponse = await fetch(`/api/v1/saved-views?workspaceId=${resolvedWorkspaceId}&surface=TIMETABLE`, { credentials: 'include' });
          const savedViewsPayload = await savedViewsResponse.json();
          if (!savedViewsResponse.ok || !savedViewsPayload?.ok) {
            throw new Error(savedViewsPayload?.message || 'Failed to load timetable saved views');
          }
          setSavedViews(savedViewsPayload.data?.items || []);
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load timetable data', 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [status, toast]);

  const scheduleItems = useMemo(() => buildScheduleItems(courses) as TimetableItem[], [courses]);
  const sortedGroups = useMemo(() => sortGroupsForDisplay(groups), [groups]);

  const groupDescendants = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of sortedGroups) {
      if (!group.parentGroupId) continue;
      const current = map.get(group.parentGroupId) || [];
      current.push(group.id);
      map.set(group.parentGroupId, current);
    }
    return map;
  }, [sortedGroups]);

  const groupOptions = useMemo(() => [
    { value: 'ALL', label: 'All groups', description: 'See the full schedule across all groups' },
    ...sortedGroups.map((group) => ({
      value: group.id,
      label: group.parentGroupId ? `${group.code} — subgroup` : `${group.code} — main group`,
      description: `${groupHierarchyPath(group)} • ${group.name}`,
      keywords: `${group.code} ${group.name} ${group.parentGroup?.code || ''}`
    }))
  ], [sortedGroups]);

  const filteredItems = useMemo(() => {
    const selectedGroup = sortedGroups.find((group) => group.id === selectedGroupId) || null;
    const groupScope = new Set<string>();
    if (selectedGroup && selectedGroupId !== 'ALL') {
      groupScope.add(selectedGroup.id);
      if (!selectedGroup.parentGroupId) {
        for (const childId of groupDescendants.get(selectedGroup.id) || []) groupScope.add(childId);
      }
    }

    return scheduleItems.filter((item) => {
      if (!selectedTypes.includes(item.type as SessionTypeLabel)) return false;
      if (!matchesDelivery(item, deliveryFilter)) return false;
      if (selectedGroupId !== 'ALL') {
        if (!item.groupId) return false;
        if (!groupScope.has(item.groupId)) return false;
      }
      return true;
    });
  }, [deliveryFilter, groupDescendants, scheduleItems, selectedGroupId, selectedTypes, sortedGroups]);

  const conflictReport = useMemo(() => buildScheduleConflictReport(filteredItems), [filteredItems]);
  const displayItems = useMemo(() => filteredItems.map((item) => {
    const conflictKinds = conflictReport.conflictMap.get(item.id) || new Set<'room' | 'instructor' | 'group'>();
    const conflictTypes = getScheduleConflictLabels(conflictKinds);
    return {
      ...item,
      conflictTypes,
      conflictCount: conflictTypes.length
    };
  }), [conflictReport.conflictMap, filteredItems]);

  const activeSummary = useMemo(() => {
    const labels: string[] = [];
    if (selectedTypes.length !== SESSION_TYPE_OPTIONS.length) labels.push(`${selectedTypes.length} session type${selectedTypes.length === 1 ? '' : 's'}`);
    if (selectedGroupId !== 'ALL') {
      const group = sortedGroups.find((item) => item.id === selectedGroupId);
      if (group) labels.push(group.code);
    }
    if (deliveryFilter !== 'ALL') labels.push(deliveryFilter === 'PHYSICAL' ? 'Physical only' : `${deliveryFilter.charAt(0)}${deliveryFilter.slice(1).toLowerCase()} only`);
    if (showConflictLayer) labels.push('Conflict layer on');
    return labels;
  }, [deliveryFilter, selectedGroupId, selectedTypes.length, showConflictLayer, sortedGroups]);

  const conflictStats = useMemo(() => {
    const sessionsWithConflicts = displayItems.filter((item) => item.conflictCount).length;
    const totalConflictBadges = displayItems.reduce((sum, item) => sum + (item.conflictCount || 0), 0);
    return { sessionsWithConflicts, totalConflictBadges };
  }, [displayItems]);

  const applySavedView = (view: SavedTimetableView) => {
    const state = view.stateJson;
    setSelectedTypes(state.selectedTypes);
    setSelectedGroupId(state.selectedGroupId);
    setDeliveryFilter(state.deliveryFilter);
    setShowConflictLayer(state.showConflictLayer);
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

    const stateJson: TimetableSavedState = { selectedTypes, selectedGroupId, deliveryFilter, showConflictLayer };
    const response = await fetch('/api/v1/saved-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, surface: 'TIMETABLE', name, stateJson })
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

  const renameSavedView = async (view: SavedTimetableView) => {
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

  const resetFilters = () => {
    setSelectedTypes([...SESSION_TYPE_OPTIONS]);
    setSelectedGroupId('ALL');
    setDeliveryFilter('ALL');
    setShowConflictLayer(true);
    setActiveSavedViewId(null);
  };

  const scopeLabel = activeSummary.length ? activeSummary.join(' • ') : 'All timetable sessions';
  const dateTag = new Date().toISOString().slice(0, 10);

  const exportFilteredIcs = () => {
    const result = downloadScheduleCalendar(filteredItems, `timetable-filtered-${dateTag}.ics`, 'Students Timetable — Filtered View');
    if (!result.ok) {
      toast('No visible sessions to export with the current timetable filters.', 'error');
      return;
    }
    toast(`Exported filtered timetable ICS (${result.count} sessions). Scope: ${scopeLabel}`);
  };

  const printFilteredView = () => {
    window.print();
    toast(`Print dialog opened for current timetable view. Scope: ${scopeLabel}`);
  };

  const exportRoomUsageSummary = () => {
    if (!filteredItems.length) {
      toast('No visible sessions to summarize by room.', 'error');
      return;
    }

    const roomMap = new Map<string, { room: string; sessions: number; uniqueCourses: Set<string>; days: Set<string> }>();
    for (const item of filteredItems) {
      const roomKey = item.roomId || item.room || 'Unassigned';
      const bucket = roomMap.get(roomKey) || { room: item.room || 'Unassigned', sessions: 0, uniqueCourses: new Set<string>(), days: new Set<string>() };
      bucket.sessions += 1;
      bucket.uniqueCourses.add(item.courseId);
      bucket.days.add(item.day);
      roomMap.set(roomKey, bucket);
    }

    const rows = [...roomMap.values()].sort((a, b) => b.sessions - a.sessions || a.room.localeCompare(b.room));
    const lines = [
      ['room', 'sessions_count', 'unique_courses_count', 'days_covered', 'scope'].map(csvCell).join(',')
    ];
    for (const row of rows) {
      lines.push([
        row.room,
        `${row.sessions}`,
        `${row.uniqueCourses.size}`,
        [...row.days].sort().join(' | '),
        scopeLabel
      ].map(csvCell).join(','));
    }

    downloadFile(`room-usage-summary-filtered-${dateTag}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    toast(`Exported room usage summary CSV (${rows.length} rows). Scope: ${scopeLabel}`);
  };

  const exportInstructorAssignmentSummary = () => {
    if (!filteredItems.length) {
      toast('No visible sessions to summarize by instructor.', 'error');
      return;
    }

    const instructorMap = new Map<string, { instructor: string; sessions: number; minutes: number; uniqueCourses: Set<string>; groups: Set<string> }>();
    for (const item of filteredItems) {
      const key = item.instructorId || item.instructor || 'Unassigned';
      const bucket = instructorMap.get(key) || { instructor: item.instructor || 'Unassigned', sessions: 0, minutes: 0, uniqueCourses: new Set<string>(), groups: new Set<string>() };
      bucket.sessions += 1;
      bucket.minutes += Math.max(0, item.endMinute - item.startMinute);
      bucket.uniqueCourses.add(item.courseId);
      if (item.group && item.group !== '-') bucket.groups.add(item.group);
      instructorMap.set(key, bucket);
    }

    const rows = [...instructorMap.values()].sort((a, b) => b.sessions - a.sessions || a.instructor.localeCompare(b.instructor));
    const lines = [
      ['instructor', 'sessions_count', 'unique_courses_count', 'teaching_hours', 'groups', 'scope'].map(csvCell).join(',')
    ];
    for (const row of rows) {
      lines.push([
        row.instructor,
        `${row.sessions}`,
        `${row.uniqueCourses.size}`,
        `${(row.minutes / 60).toFixed(2)}`,
        [...row.groups].sort().join(' | '),
        scopeLabel
      ].map(csvCell).join(','));
    }

    downloadFile(`instructor-assignment-summary-filtered-${dateTag}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    toast(`Exported instructor summary CSV (${rows.length} rows). Scope: ${scopeLabel}`);
  };

  return (
    <AppShell title="Timetable" subtitle="Inspect the weekly schedule with smarter controls and clash visibility.">
      <div className="space-y-6">
        {!access?.canWrite ? (
          <div className="rounded-[20px] border border-[var(--warning)]/30 bg-[var(--warning-muted)] px-4 py-3 text-sm text-[var(--warning)]">
            You are in Viewer mode. Timetable stays fully browsable; shared data editing/import remains blocked in resource pages.
          </div>
        ) : null}

        <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Timetable intelligence</div>
                <h3 className="mt-1 text-xl font-black tracking-tight text-white">Inspect the schedule by type, group, delivery mode, and clashes</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Focus the timetable to a specific academic context, reveal room/instructor/group collisions, and reset quickly when you want the full weekly picture back.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">
                  {displayItems.length} visible session{displayItems.length === 1 ? '' : 's'}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  {conflictStats.sessionsWithConflicts} sessions with clashes
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <div className="grid gap-4 lg:grid-cols-[1.5fr_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Session type visibility</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SESSION_TYPE_OPTIONS.map((type) => {
                      const active = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedTypes((current) => active ? current.filter((item) => item !== type) : [...current, type])}
                          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${active ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-[var(--gold)]' : 'border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'}`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AppSelect
                  label="Group focus"
                  value={selectedGroupId}
                  onChange={(value) => setSelectedGroupId(value)}
                  options={groupOptions}
                  searchable
                  searchPlaceholder="Find group"
                  helperText="Selecting a main group includes its subgroup children automatically."
                />

                <AppSelect
                  label="Delivery mode"
                  value={deliveryFilter}
                  onChange={(value) => setDeliveryFilter(value as DeliveryFilter)}
                  options={[
                    { value: 'ALL', label: 'All delivery modes', description: 'Physical, online, and hybrid sessions' },
                    { value: 'PHYSICAL', label: 'Physical only', description: 'Lecture, section, and lab sessions' },
                    { value: 'ONLINE', label: 'Online only', description: 'Virtual-only sessions' },
                    { value: 'HYBRID', label: 'Hybrid only', description: 'Mixed delivery sessions' }
                  ]}
                />

                <div className="flex flex-col gap-2 lg:items-end lg:justify-end">
                  <Button variant={showConflictLayer ? 'primary' : 'secondary'} onClick={() => setShowConflictLayer((current) => !current)} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {showConflictLayer ? 'Conflict layer on' : 'Conflict layer off'}
                  </Button>
                  <Button variant="secondary" onClick={resetFilters} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Reset view
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:max-w-sm">
                    <Input
                      label="Saved view name"
                      value={viewDraftName}
                      onChange={(event) => setViewDraftName(event.target.value)}
                      placeholder="e.g. Group A online checks"
                      helperText="Save current timetable controls for one-click reuse."
                    />
                  </div>
                  <Button variant="primary" onClick={() => void saveCurrentView()} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                    Save Current View
                  </Button>
                </div>

                {activeSavedViewId ? (
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">
                    Active saved view: {savedViews.find((view) => view.id === activeSavedViewId)?.name || 'Custom'}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {savedViews.length ? savedViews.map((view) => {
                    const isActive = activeSavedViewId === view.id;
                    return (
                      <div key={view.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${isActive ? 'border-[var(--gold)] bg-[var(--gold-muted)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                        <button
                          type="button"
                          onClick={() => applySavedView(view)}
                          className="rounded-full px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-[var(--surface)]"
                        >
                          {view.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => void renameSavedView(view)}
                          aria-label={`Rename saved view ${view.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-white"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSavedView(view.id)}
                          aria-label={`Delete saved view ${view.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--danger)]"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    );
                  }) : <div className="text-sm text-[var(--text-secondary)]">No saved views yet — save your current timetable filters.</div>}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Reports & export</div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">All actions below use the currently visible timetable filters and saved-view state.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={exportFilteredIcs} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    Export filtered timetable (.ics)
                  </Button>
                  <Button variant="secondary" onClick={printFilteredView} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Print current filtered view
                  </Button>
                  <Button variant="secondary" onClick={exportRoomUsageSummary} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                    Export room usage summary (.csv)
                  </Button>
                  <Button variant="secondary" onClick={exportInstructorAssignmentSummary} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">co_present</span>
                    Export instructor summary (.csv)
                  </Button>
                </div>
              </div>

              {activeSummary.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeSummary.map((label) => (
                    <span key={label} className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <TimetableView items={displayItems} showConflictLayer={showConflictLayer} />
      </div>
    </AppShell>
  );
}
