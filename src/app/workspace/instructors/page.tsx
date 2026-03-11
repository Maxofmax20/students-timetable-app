'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { CsvImportModal } from '@/components/workspace/CsvImportModal';
import type { InstructorApiItem } from '@/types';
import { cn } from '@/lib/utils';

type WorkspaceAccess = {
  productRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  canWrite: boolean;
  canImport: boolean;
};

type AssignmentFilter = 'all' | 'assigned' | 'unassigned';

type InstructorDetails = {
  id: string;
  impact: {
    courseCount: number;
    sessionCount: number;
    assignmentStatus: 'assigned' | 'unassigned';
  };
  workload: {
    assignedCoursesCount: number;
    assignedSessionsCount: number;
    sessionsByType: Record<string, number>;
    busiestDay: { day: string; count: number } | null;
    onlineSessionsCount: number;
    physicalSessionsCount: number;
  };
  schedule: Array<{
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    type: string;
    course?: { code?: string | null; title?: string | null } | null;
    group?: { code?: string | null; name?: string | null } | null;
    room?: { code?: string | null; name?: string | null } | null;
    onlinePlatform?: string | null;
  }>;
};

const INSTRUCTORS_TEMPLATE_CSV = `name,email,phone
Dr. Sarah Chen,sarah.chen@university.edu,+1-555-0101
Prof. Omar Malik,omar.malik@university.edu,+1-555-0102
Dr. Laila Nasser,,+1-555-0103
`;

const INSTRUCTORS_IMPORT_HELP = [
  'Required column: name. Optional: email, phone.',
  'Use email when available for safest matching during updates.',
  'Preview always runs first. Confirm Import is disabled until preview has ready rows.',
  'Create-only never changes existing instructors. Update modes only fill missing contact fields (no silent overwrite).',
  'If a name matches multiple instructors, add email in CSV to disambiguate.'
];

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday'
};

export default function InstructorsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();

  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorApiItem | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<InstructorDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);

  const fetchInstructors = async () => {
    try {
      const res = await fetch('/api/v1/instructors');
      const data = await res.json();
      setInstructors(data.data?.items || []);
      setAccess(data.data?.access || null);
    } catch {
      toast('Failed to load instructors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructorDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      const res = await fetch(`/api/v1/instructors/${id}`);
      const data = await res.json();
      if (!res.ok || !data?.data) throw new Error(data?.message || 'Failed to load instructor details');
      setSelectedDetails(data.data as InstructorDetails);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load instructor details', 'error');
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInstructors();
    }
  }, [status]);

  useEffect(() => {
    if (selectedInstructor?.id) {
      void fetchInstructorDetails(selectedInstructor.id);
    } else {
      setSelectedDetails(null);
    }
  }, [selectedInstructor?.id]);

  const handleSave = async () => {
    if (!access?.canWrite) return toast('Viewer mode: instructor changes are disabled.', 'error');
    if (!formData.name) return toast('Instructor name is required', 'error');
    setActionLoading(true);

    const isEdit = modalMode === 'edit';
    const url = isEdit ? `/api/v1/instructors/${selectedInstructor?.id}` : '/api/v1/instructors';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${modalMode} instructor`);

      toast(`Instructor ${isEdit ? 'updated' : 'added'} successfully`);
      setIsModalOpen(false);
      await fetchInstructors();
      if (selectedInstructor?.id) {
        const refreshed = (data.data as InstructorApiItem | undefined)?.id || selectedInstructor.id;
        setSelectedInstructor((prev) => (prev ? { ...prev, ...(data.data || {}) } : prev));
        await fetchInstructorDetails(refreshed);
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!access?.canWrite) return toast('Viewer mode: instructor deletion is disabled.', 'error');
    if (!selectedInstructor) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/instructors/${selectedInstructor.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove instructor');

      toast('Instructor removed successfully');
      setIsDeleteOpen(false);
      setSelectedInstructor(null);
      setSelectedDetails(null);
      await fetchInstructors();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (i: InstructorApiItem) => {
    if (!access?.canWrite) {
      toast('Viewer mode: editing instructors is disabled.', 'error');
      return;
    }
    setSelectedInstructor(i);
    setFormData({ name: i.name, email: i.email || '', phone: i.phone || '' });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    if (!access?.canWrite) {
      toast('Viewer mode: adding instructors is disabled.', 'error');
      return;
    }
    setFormData({ name: '', email: '', phone: '' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const filteredInstructors = useMemo(() => instructors.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
      || (i.email && i.email.toLowerCase().includes(search.toLowerCase()))
      || (i.phone && i.phone.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (assignmentFilter === 'all') return true;
    return (i.assignmentStatus || 'unassigned') === assignmentFilter;
  }), [instructors, search, assignmentFilter]);

  const assignedCount = instructors.filter((item) => (item.assignmentStatus || 'unassigned') === 'assigned').length;
  const unassignedCount = instructors.length - assignedCount;

  return (
    <AppShell title="Faculty" subtitle="Manage university instructors and staff">
      <div className="grid gap-6 p-1 md:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8 animate-panel-pop">
        <section className="flex min-h-0 flex-col gap-6">
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Faculty directory</div>
                <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Instructors</h2>
                <p className="text-[var(--text-secondary)] text-sm">Scan assignment impact quickly, then inspect schedules/workload before editing or removing instructors.</p>
              </div>

              <div className="w-full lg:max-w-[620px]">
                <SearchInput
                  placeholder="Search instructors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                  className="w-full"
                />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button onClick={() => setIsImportOpen(true)} variant="secondary" className="min-h-11 w-full justify-center gap-2" disabled={!access?.canImport}>
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    Import CSV
                  </Button>
                  <Button onClick={openCreate} variant="primary" className="min-h-11 w-full justify-center gap-2" disabled={!access?.canWrite}>
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                    Add Instructor
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {instructors.length} faculty records
              </span>
              <button type="button" onClick={() => setAssignmentFilter('assigned')} className={cn('rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] min-h-8', assignmentFilter === 'assigned' ? 'border-[var(--success)]/30 bg-[var(--success-muted)] text-[var(--success)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]')}>
                {assignedCount} assigned
              </button>
              <button type="button" onClick={() => setAssignmentFilter('unassigned')} className={cn('rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] min-h-8', assignmentFilter === 'unassigned' ? 'border-[var(--warning)]/30 bg-[var(--warning-muted)] text-[var(--warning)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]')}>
                {unassignedCount} unassigned
              </button>
              <button type="button" onClick={() => setAssignmentFilter('all')} className={cn('rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] min-h-8', assignmentFilter === 'all' ? 'border-[var(--gold)]/30 bg-[var(--gold-muted)] text-[var(--gold)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]')}>
                all
              </button>
            </div>
          </div>

          {!access?.canWrite ? (
            <div className="rounded-[20px] border border-[var(--warning)]/30 bg-[var(--warning-muted)] px-4 py-3 text-sm text-[var(--warning)]">
              You are in Viewer mode. Instructor records are read-only; create, edit, delete, and import actions are disabled.
            </div>
          ) : null}

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : filteredInstructors.length > 0 ? (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {filteredInstructors.map((i) => (
                    <article
                      key={i.id}
                      className={cn('rounded-2xl border p-3.5 transition-all cursor-pointer bg-[var(--bg-raised)]', selectedInstructor?.id === i.id ? 'border-[var(--gold)]/40 bg-[var(--gold-muted)]/25' : 'border-[var(--border)]')}
                      onClick={() => setSelectedInstructor(i)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <Avatar name={i.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold tracking-tight text-white" title={i.name}>{i.name}</div>
                            <div className={cn('mt-0.5 text-[10px] font-black uppercase tracking-[0.12em]', (i.assignmentStatus || 'unassigned') === 'assigned' ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                              {(i.assignmentStatus || 'unassigned') === 'assigned' ? 'Assigned' : 'Unassigned'}
                            </div>
                          </div>
                        </div>
                        {access?.canWrite ? (
                          <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(i); }} className="h-10 w-10 rounded-xl p-0">
                              <span className="material-symbols-outlined text-[18px]">edit_square</span>
                            </Button>
                            <Button variant="ghost-danger" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedInstructor(i); setIsDeleteOpen(true); }} className="h-10 w-10 rounded-xl p-0">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="truncate text-[var(--text-secondary)]" title={i.email || 'No email'}>{i.email || 'No email'}</div>
                        <div className="truncate text-[var(--text-muted)]" title={i.phone || 'No phone'}>{i.phone || 'No phone'}</div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-white">{i.sessionCount || 0} sessions</span>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--text-secondary)]">{i.courseCount || 0} courses</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-raised)]/50 text-[var(--text-secondary)] border-b border-[var(--border)]">
                        <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Instructor</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Contact</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Assignments</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredInstructors.map((i) => (
                        <tr key={i.id} className={cn('group/row hover:bg-[var(--surface-2)]/30 transition-all cursor-pointer', selectedInstructor?.id === i.id ? 'bg-[var(--gold-muted)]/40' : '')} onClick={() => setSelectedInstructor(i)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={i.name} size="sm" />
                              <div>
                                <div className="text-white font-bold text-sm tracking-tight">{i.name}</div>
                                <div className={cn('text-[10px] font-black uppercase tracking-[0.12em]', (i.assignmentStatus || 'unassigned') === 'assigned' ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>
                                  {(i.assignmentStatus || 'unassigned') === 'assigned' ? 'Assigned' : 'Unassigned'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex max-w-[280px] flex-col">
                              <span className="truncate text-[var(--text-secondary)] text-sm" title={i.email || 'No email'}>{i.email || 'No email'}</span>
                              <span className="truncate text-[var(--text-muted)] text-[11px]" title={i.phone || 'No phone'}>{i.phone || 'No phone'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-sm">
                              <span className="text-white font-semibold">{i.sessionCount || 0} sessions</span>
                              <span className="text-[var(--text-secondary)]">{i.courseCount || 0} courses</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {access?.canWrite ? (
                              <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(i); }} className="h-9 w-9 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                </Button>
                                <Button variant="ghost-danger" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedInstructor(i); setIsDeleteOpen(true); }} className="h-9 w-9 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </Button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState
                icon={search ? 'search_off' : 'person_add'}
                title={search ? 'No instructors found' : 'No faculty yet'}
                description={search ? `No results for "${search}".` : 'Start by adding instructors to your workspace database.'}
                action={search ? (
                  <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
                ) : (
                  <Button variant="primary" onClick={openCreate}>Add First Instructor</Button>
                )}
              />
            )}
          </div>
        </section>

        <aside className="min-h-0 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] md:p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Instructor schedule + workload</div>
          {!selectedInstructor ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Select an instructor from the table to inspect workload and weekly session assignments.</p>
          ) : detailsLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : selectedDetails ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                <div className="text-sm font-bold text-white">{selectedInstructor.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
                    <div className="text-[var(--text-muted)]">Courses</div>
                    <div className="text-white font-bold">{selectedDetails.workload.assignedCoursesCount}</div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
                    <div className="text-[var(--text-muted)]">Sessions</div>
                    <div className="text-white font-bold">{selectedDetails.workload.assignedSessionsCount}</div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
                    <div className="text-[var(--text-muted)]">Online</div>
                    <div className="text-white font-bold">{selectedDetails.workload.onlineSessionsCount}</div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
                    <div className="text-[var(--text-muted)]">Physical</div>
                    <div className="text-white font-bold">{selectedDetails.workload.physicalSessionsCount}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--text-secondary)]">
                  Busiest day: <span className="text-white font-semibold">{selectedDetails.workload.busiestDay ? `${DAY_LABELS[selectedDetails.workload.busiestDay.day] || selectedDetails.workload.busiestDay.day} (${selectedDetails.workload.busiestDay.count})` : 'No sessions yet'}</span>
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">Sessions by type</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.keys(selectedDetails.workload.sessionsByType).length ? Object.entries(selectedDetails.workload.sessionsByType).map(([type, count]) => (
                    <span key={type} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-white">
                      {type}: {count}
                    </span>
                  )) : <span className="text-sm text-[var(--text-secondary)]">No assigned sessions.</span>}
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">Assigned sessions</div>
                <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {selectedDetails.schedule.length ? selectedDetails.schedule.map((item) => (
                    <div key={item.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
                      <div className="text-xs font-bold text-white">{DAY_LABELS[item.day] || item.day} • {item.startTime} - {item.endTime}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">{item.course?.code || 'Course'} — {item.course?.title || 'Untitled'}</div>
                      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.group?.code || 'No group'} • {item.room?.code || item.onlinePlatform || 'No room'} • {item.type}</div>
                    </div>
                  )) : <div className="text-sm text-[var(--text-secondary)]">No session assignments for this instructor.</div>}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--danger)]">Could not load instructor details.</p>
          )}
        </aside>
      </div>

      <CsvImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Instructors from CSV"
        subtitle="Preview instructor creates/updates before confirmation. Existing records are never silently overwritten."
        endpoint="/api/v1/import/instructors"
        templateFilename="instructors-import-template.csv"
        templateCsv={INSTRUCTORS_TEMPLATE_CSV}
        helpLines={INSTRUCTORS_IMPORT_HELP}
        canImport={Boolean(access?.canImport)}
        onImported={async () => {
          setIsImportOpen(false);
          await fetchInstructors();
          if (selectedInstructor?.id) await fetchInstructorDetails(selectedInstructor.id);
        }}
      />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add New Instructor' : 'Edit Instructor'}
        subtitle={modalMode === 'create' ? 'Create a faculty record with contact details available during assignment.' : 'Update the instructor profile without leaving the resource page.'}
        actions={(
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Instructor' : 'Save Changes'}
            </Button>
          </div>
        )}
      >
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
          <div className="mb-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Instructor details</div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Duplicate emails are blocked to keep assignment references safe and unambiguous.</p>
          </div>
          <div className="space-y-4 py-1">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Prof. Alan Turing"
              helperText="Primary label shown in course assignment selectors."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alan@university.edu"
                helperText="Optional, but recommended for import matching."
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234..."
                helperText="Optional"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remove Instructor"
        subtitle="Review assignment impact before removing this instructor."
        actions={(
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Removing...' : 'Remove Instructor'}
            </Button>
          </div>
        )}
      >
        <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Are you sure you want to remove <span className="text-white font-bold">{selectedInstructor?.name}</span>? This action clears instructor links from related records.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="text-[var(--text-muted)]">Linked courses</div>
              <div className="font-bold text-white">{selectedDetails?.impact.courseCount ?? selectedInstructor?.courseCount ?? 0}</div>
            </div>
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="text-[var(--text-muted)]">Linked sessions</div>
              <div className="font-bold text-white">{selectedDetails?.impact.sessionCount ?? selectedInstructor?.sessionCount ?? 0}</div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Courses and sessions remain, but their instructor assignment becomes unassigned.</p>
        </div>
      </Modal>
    </AppShell>
  );
}
