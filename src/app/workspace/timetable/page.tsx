'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { AppSelect } from '@/components/ui/AppSelect';
import { useToast } from '@/components/ui/Toast';
import { TimetableView, type TimetableItem } from '@/components/workspace/TimetableView';
import { buildScheduleItems } from '@/lib/schedule';
import { groupHierarchyPath, sortGroupsForDisplay } from '@/lib/group-room-model';
import type { CourseApiItem, GroupApiItem } from '@/types';

const SESSION_TYPE_OPTIONS = ['Lecture', 'Section', 'Lab', 'Online', 'Hybrid'] as const;
type SessionTypeLabel = (typeof SESSION_TYPE_OPTIONS)[number];
type DeliveryFilter = 'ALL' | 'PHYSICAL' | 'ONLINE' | 'HYBRID';

function matchesDelivery(item: TimetableItem, filter: DeliveryFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'ONLINE') return item.type === 'Online';
  if (filter === 'HYBRID') return item.type === 'Hybrid';
  return item.type === 'Lecture' || item.type === 'Section' || item.type === 'Lab';
}

function computeConflictMap(items: TimetableItem[]) {
  const map = new Map<string, Set<string>>();
  for (const item of items) map.set(item.id, new Set());

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i];
      const right = items[j];
      if (left.day !== right.day) continue;
      const overlaps = left.startMinute < right.endMinute && right.startMinute < left.endMinute;
      if (!overlaps) continue;

      if (left.groupId && right.groupId && left.groupId === right.groupId) {
        map.get(left.id)?.add('Group clash');
        map.get(right.id)?.add('Group clash');
      }
      if (left.roomId && right.roomId && left.roomId === right.roomId) {
        map.get(left.id)?.add('Room clash');
        map.get(right.id)?.add('Room clash');
      }
      if (left.instructorId && right.instructorId && left.instructorId === right.instructorId) {
        map.get(left.id)?.add('Instructor clash');
        map.get(right.id)?.add('Instructor clash');
      }
    }
  }

  return map;
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

        setCourses(coursesPayload.data?.items || []);
        setGroups(groupsResponse.ok && groupsPayload?.ok ? groupsPayload.data?.items || [] : []);
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

  const conflictMap = useMemo(() => computeConflictMap(filteredItems), [filteredItems]);
  const displayItems = useMemo(() => filteredItems.map((item) => {
    const conflicts = [...(conflictMap.get(item.id) || new Set<string>())];
    return {
      ...item,
      conflictTypes: conflicts,
      conflictCount: conflicts.length
    };
  }), [conflictMap, filteredItems]);

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

  const resetFilters = () => {
    setSelectedTypes([...SESSION_TYPE_OPTIONS]);
    setSelectedGroupId('ALL');
    setDeliveryFilter('ALL');
    setShowConflictLayer(true);
  };

  return (
    <AppShell title="Timetable" subtitle="Inspect the weekly schedule with smarter controls and clash visibility.">
      <div className="space-y-6">
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
