'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { BulkActionBar } from '@/components/workspace/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import type { GroupApiItem } from '@/types';

const GROUPS_TEMPLATE_CSV = `code,name,parentCode
A,Main Group A,
A1,Subgroup A1,A
A2,Subgroup A2,A
B,Main Group B,
B1,Subgroup B1,B`;

const GROUPS_IMPORT_HELP = [
  'Supported columns: code, optional name, and optional parentCode/mainGroupCode. Code-only rows are also accepted.',
  'If a subgroup code looks like A1 or B2 and parentCode is omitted, the import safely infers the main group code from the subgroup code.',
  'Subgroups must resolve to an existing main group or a main-group row inside the same CSV preview. Orphan subgroup imports are rejected.',
  'Choose import mode: create only, update existing, or create + update. Preview clearly shows each row outcome before confirmation.'
];

export default function GroupsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const bulk = useBulkSelection();
  
  const [groups, setGroups] = useState<GroupApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupApiItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', parentGroupId: '__none__' });
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/v1/groups');
      const data = await res.json();
      setGroups(data.data?.items || []);
      setCanWrite(Boolean(data.data?.access?.canWrite ?? true));
      setCanImport(Boolean(data.data?.access?.canImport ?? true));
    } catch {
      toast('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchGroups();
    }
  }, [status]);

  const sortedGroups = useMemo(() => sortGroupsForDisplay(groups), [groups]);
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedGroups;
    return sortedGroups.filter((group) => {
      const parentBits = `${group.parentGroup?.code || ''} ${group.parentGroup?.name || ''}`.toLowerCase();
      return (
        group.code.toLowerCase().includes(q) ||
        group.name.toLowerCase().includes(q) ||
        parentBits.includes(q) ||
        groupKindLabel(group).toLowerCase().includes(q)
      );
    });
  }, [search, sortedGroups]);

  const groupedSections = useMemo(() => groupGroupsByRoot(filteredGroups), [filteredGroups]);
  const selection = useBulkSelection(filteredGroups.map((group) => group.id));

  const exportSelectedCsv = () => {
    const selectedRows = filteredGroups.filter((group) => selection.selected.has(group.id));
    if (!selectedRows.length) return toast('Select groups first. Export scope is selected rows only.', 'error');
    const header = ['code', 'name', 'parent_code'];
    const lines = [header.map(csvCell).join(','), ...selectedRows.map((group) => [group.code, group.name, group.parentGroup?.code || ''].map(csvCell).join(','))];
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadFile(`groups-selected-${dateTag}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    toast(`Exported ${selectedRows.length} selected group row(s). Scope: selected items only.`);
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selection.selected);
    if (!ids.length) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/groups/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || 'Bulk delete failed');
      if (payload.failed?.length) {
        const childBlocked = payload.failed.find((f: { reason: string }) => f.reason === 'GROUP_HAS_CHILDREN');
        if (childBlocked) toast('Some selected groups were blocked because they still have child subgroups (GROUP_HAS_CHILDREN).', 'error');
      }
      selection.clear();
      setBulkDeleteOpen(false);
      setBulkConfirmText('');
      toast(`Bulk delete complete: ${payload.successCount}/${payload.requested} deleted.`);
      await fetchGroups();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Bulk delete failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedSection = useMemo(
    () => groupedSections.find((section) => section.rootCode === selectedSectionKey) ?? null,
    [groupedSections, selectedSectionKey]
  );

  const toggleSection = (key: string) => {
    if (search.trim()) return;
    setCollapsedSections((current) => ({
      ...current,
      [key]: !(current[key] ?? true)
    }));
  };

  const mainGroupOptions = useMemo(() => [
    { value: '__none__', label: 'Main group', description: 'Top-level group with no parent' },
    ...sortedGroups
      .filter((group) => !group.parentGroupId)
      .map((group) => ({
        value: group.id,
        label: group.code,
        description: group.name,
        keywords: `${group.code} ${group.name}`
      }))
  ], [sortedGroups]);

  const handleSave = async () => {
    if (!canWrite) {
      toast('Viewer mode: group updates are disabled.', 'error');
      return;
    }
    if (!formData.code.trim() || !formData.name.trim()) {
      return toast('Code and name are required', 'error');
    }

    setActionLoading(true);
    const isEdit = modalMode === 'edit';
    const url = isEdit ? `/api/v1/groups/${selectedGroup?.id}` : '/api/v1/groups';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          parentGroupId: formData.parentGroupId === '__none__' ? null : formData.parentGroupId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${modalMode} group`);

      toast(`Group ${isEdit ? 'updated' : 'created'} successfully`);
      setIsModalOpen(false);
      await fetchGroups();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canWrite) {
      toast('Viewer mode: group deletion is disabled.', 'error');
      return;
    }
    if (!selectedGroup) return;
    const groupToDelete = selectedGroup;
    setActionLoading(true);
    setDeletingGroupId(groupToDelete.id);
    try {
      const res = await fetch(`/api/v1/groups/${groupToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete group');

      setGroups((current) => {
        const next = current.filter((group) => group.id !== groupToDelete.id);
        if (!groupToDelete.parentGroupId) return next;
        return next.map((group) => group.id === groupToDelete.parentGroupId
          ? { ...group, childCount: Math.max(0, (group.childCount || 0) - 1) }
          : group);
      });
      toast('Group deleted');
      setIsDeleteOpen(false);
      setSelectedGroup(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
      setDeletingGroupId(null);
    }
  };

  const openSectionDelete = (rootCode: string) => {
    if (!canWrite) {
      toast('Viewer mode: group deletion is disabled.', 'error');
      return;
    }
    if (search.trim()) {
      toast('Clear search before deleting a full group section so no hidden rows are skipped.', 'error');
      return;
    }
    setSelectedSectionKey(rootCode);
    setIsSectionDeleteOpen(true);
  };

  const handleSectionDelete = async () => {
    if (!canWrite) return toast('Viewer mode: group deletion is disabled.', 'error');
    if (!selectedSection) return;

    const root = selectedSection.root || selectedSection.items.find((item) => !item.parentGroupId) || selectedSection.items[0];
    if (!root) {
      toast('Section root could not be resolved safely.', 'error');
      return;
    }

    const subgroups = selectedSection.items.filter((item) => item.id !== root.id);
    setSectionDeleteLoadingKey(selectedSection.rootCode);

    try {
      for (const subgroup of subgroups) {
        const subgroupRes = await fetch(`/api/v1/groups/${subgroup.id}`, { method: 'DELETE' });
        if (!subgroupRes.ok) {
          const data = await subgroupRes.json().catch(() => ({}));
          throw new Error(`Subgroup ${subgroup.code} could not be deleted: ${data?.message || 'delete failed'}`);
        }
      }

      const rootRes = await fetch(`/api/v1/groups/${root.id}`, { method: 'DELETE' });
      if (!rootRes.ok) {
        const data = await rootRes.json().catch(() => ({}));
        throw new Error(`Main group ${root.code} could not be deleted: ${data?.message || 'delete failed'}`);
      }

      const idsToRemove = new Set(selectedSection.items.map((item) => item.id));
      setGroups((current) => current.filter((group) => !idsToRemove.has(group.id)));
      toast(`Deleted section ${selectedSection.rootCode} (${selectedSection.items.length} row${selectedSection.items.length === 1 ? '' : 's'})`);
      setIsSectionDeleteOpen(false);
      setSelectedSectionKey(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Section delete failed', 'error');
    } finally {
      setSectionDeleteLoadingKey(null);
    }
  };

  const openEdit = (group: GroupApiItem) => {
    if (!canWrite) {
      toast('Viewer mode: editing is disabled.', 'error');
      return;
    }
    setSelectedGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      parentGroupId: group.parentGroupId || '__none__'
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    if (!canWrite) {
      toast('Viewer mode: group creation is disabled.', 'error');
      return;
    }
    setSelectedGroup(null);
    setFormData({ code: '', name: '', parentGroupId: '__none__' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.code.toLowerCase().includes(search.toLowerCase())
  );

  // Bulk helpers
  const filteredIds = filteredGroups.map((g) => g.id);
  const allChecked = filteredIds.length > 0 && filteredIds.every((id) => bulk.selectedIds.has(id));
  const someChecked = filteredIds.some((id) => bulk.selectedIds.has(id)) && !allChecked;

  const handleBulkExport = () => {
    const selected = groups.filter((g) => bulk.selectedIds.has(g.id));
    if (!selected.length) return;
    const headers = ['id', 'code', 'name'];
    const csvRows = selected.map((g) => [g.id, g.code, g.name].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `groups-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selected.length} group${selected.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    const ids = Array.from(bulk.selectedIds);
    try {
      const res = await fetch('/api/v1/groups/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.message || 'Bulk delete failed');
      toast(`Deleted ${result.data?.deleted ?? ids.length} group(s)`);
      bulk.clear();
      setBulkDeleteOpen(false);
      setBulkDeleteConfirm('');
      fetchGroups();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk delete failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AppShell title="Student Groups" subtitle="Manage main groups and subgroup hierarchy">
      <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Academic structure</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Groups</h2>
              <p className="text-[var(--text-secondary)] text-sm">Support whole main groups like A or targeted subgroups like A1 without losing the hierarchy.</p>
            </div>

            <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <SearchInput
                placeholder="Search groups, parents, or subgroup codes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                className="w-full sm:w-[360px]"
              />
              {canImport ? (
                <Button onClick={() => setIsImportOpen(true)} variant="secondary" className="gap-2">
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  Import CSV
                </Button>
              ) : null}
              {canWrite ? (
                <Button onClick={openCreate} variant="primary" className="gap-2">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Group
                </Button>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Viewer mode</div>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
             {loading ? (
               <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
               </div>
             ) : filteredGroups.length > 0 ? (
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-[var(--bg-raised)]/50 text-[var(--text-secondary)] border-b border-[var(--border)]">
                           <th className="pl-5 pr-2 py-4 w-10">
                             <input
                               type="checkbox"
                               checked={allChecked}
                               ref={(el) => { if (el) el.indeterminate = someChecked; }}
                               onChange={() => bulk.toggleAll(filteredIds)}
                               className="h-4 w-4 rounded border-[var(--border)] accent-[var(--gold)] cursor-pointer"
                               aria-label="Select all groups"
                             />
                           </th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Code</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Name</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredGroups.map(g => {
                        const rowChecked = bulk.selectedIds.has(g.id);
                        return (
                        <tr key={g.id} className={cn("group/row transition-all", rowChecked ? "bg-[var(--gold)]/5" : "hover:bg-[var(--surface-2)]/30")}>
                          <td className="pl-5 pr-2 py-4">
                            <input
                              type="checkbox"
                              checked={rowChecked}
                              onChange={() => bulk.toggle(g.id)}
                              className="h-4 w-4 rounded border-[var(--border)] accent-[var(--gold)] cursor-pointer"
                              aria-label={`Select ${g.name}`}
                            />
                          </td>
                          <td className="px-6 py-4 text-[var(--gold)] font-bold font-mono text-sm">{g.code}</td>
                          <td className="px-6 py-4 text-white font-medium">{g.name}</td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                               <Button variant="ghost" size="sm" onClick={() => openEdit(g)} className="h-8 w-8 p-0 rounded-lg">
                                 <span className="material-symbols-outlined text-[18px]">edit_square</span>
                               </Button>
                               <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedGroup(g); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
                                 <span className="material-symbols-outlined text-[18px]">delete</span>
                               </Button>
                             </div>
                          </td>
                        </tr>
                       );
                      })}
                    </tbody>
                 </table>
               </div>
             ) : (
               <EmptyState 
                 icon={search ? "search_off" : "group_add"}
                 title={search ? "No matches found" : "No groups yet"}
                 description={search ? `No groups match "${search}".` : "Start by creating groups for your students."}
                 action={search ? (
                   <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
                 ) : (
                   <Button variant="primary" onClick={openCreate}>Create Group</Button>
                 )}
               />
             )}
          </div>
        </div>

       {/* Bulk action bar */}
       <BulkActionBar
         count={bulk.count}
         loading={bulkLoading}
         onClear={bulk.clear}
         onAction={(action) => {
           if (action === 'delete') setBulkDeleteOpen(true);
           if (action === 'export') handleBulkExport();
         }}
       />

       {/* Form Modal */}
       <Modal 
         open={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         title={modalMode === 'create' ? 'Create New Group' : 'Edit Group'} 
         subtitle={modalMode === 'create' ? 'Create a clean group record students and courses can attach to immediately.' : 'Update the group identity without leaving the current flow.'}
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Create Group' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
            <div className="mb-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Group details</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Use a short recognizable code and a descriptive cohort name.</p>
            </div>
            <div className="space-y-4 py-1">
              <Input 
                label="Group Code" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                placeholder="e.g. CS-2024" 
                helperText="Short academic identifier used across the workspace."
              />
              <Input
                label="Group name"
                value={formData.name}
                onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                placeholder="Main Group A or Subgroup A1"
                helperText="Keep the human-readable name aligned with the code hierarchy."
              />
            </div>
            <AppSelect
              label="Parent main group"
              value={formData.parentGroupId}
              onChange={(value) => setFormData((current) => ({ ...current, parentGroupId: value }))}
              options={mainGroupOptions.filter((option) => option.value === '__none__' || option.value !== selectedGroup?.id)}
              searchable
              searchPlaceholder="Find main group"
              helperText="Choose a parent only for subgroups like A1, A2, or B3. Leave as Main group for top-level cohorts like A or B."
            />
          </div>
        </div>
      </Modal>

       {/* Single delete Modal */}
       <Modal 
         open={isDeleteOpen} 
         onClose={() => setIsDeleteOpen(false)} 
         title="Delete Group" 
         subtitle="This removes the group record and unassigns linked courses."
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Deleting...' : 'Delete Group'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4">
           <div className="flex items-start gap-3">
             <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
             <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
               Are you sure you want to delete <span className="text-white font-bold">{selectedGroup?.name}</span>? 
               All courses assigned to this group will become unassigned. This action cannot be undone.
             </p>
           </div>
         </div>
       </Modal>

       {/* Bulk delete confirmation */}
       <Modal
         open={bulkDeleteOpen}
         onClose={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }}
         title={`Delete ${bulk.count} Group${bulk.count > 1 ? 's' : ''}`}
         subtitle="This permanently removes the selected groups."
         actions={
           <>
             <Button variant="ghost" onClick={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }} disabled={bulkLoading}>Cancel</Button>
             <Button variant="danger" onClick={() => void handleBulkDelete()} disabled={bulkLoading || bulkDeleteConfirm !== 'DELETE'}>
               {bulkLoading ? 'Deleting...' : `Delete ${bulk.count} Group${bulk.count > 1 ? 's' : ''}`}
             </Button>
           </>
         }
       >
         <div className="space-y-4">
           <p className="text-sm text-[var(--text-secondary)]">You are about to permanently delete <span className="font-semibold text-white">{bulk.count} group{bulk.count > 1 ? 's' : ''}</span>. This cannot be undone.</p>
           <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Type <span className="text-white font-mono">DELETE</span> to confirm</label>
             <Input value={bulkDeleteConfirm} onChange={(e) => setBulkDeleteConfirm(e.target.value)} placeholder="DELETE" className="font-mono" />
           </div>
         </div>
       </Modal>
    </AppShell>
  );
}
