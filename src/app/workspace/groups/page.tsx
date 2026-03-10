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
import { AppSelect } from '@/components/ui/AppSelect';
import { groupHierarchyPath, groupKindLabel, sortGroupsForDisplay } from '@/lib/group-room-model';
import type { GroupApiItem } from '@/types';

export default function GroupsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();

  const [groups, setGroups] = useState<GroupApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupApiItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', parentGroupId: '__none__' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/v1/groups');
      const data = await res.json();
      setGroups(data.data?.items || []);
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
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/groups/${selectedGroup.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete group');

      toast('Group deleted successfully');
      setIsDeleteOpen(false);
      await fetchGroups();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (group: GroupApiItem) => {
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
    setSelectedGroup(null);
    setFormData({ code: '', name: '', parentGroupId: '__none__' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  return (
    <AppShell title="Student Groups" subtitle="Manage main groups and subgroup hierarchy">
      <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Academic structure</div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Groups</h2>
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
              <Button onClick={openCreate} variant="primary" className="gap-2">
                <span className="material-symbols-outlined text-[20px]">add</span>
                New Group
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {groups.filter((group) => !group.parentGroupId).length} main groups
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {groups.filter((group) => group.parentGroupId).length} subgroups
            </span>
            <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)]">
              {search ? `${filteredGroups.length} matching search` : 'Lectures can target A; labs can target A1'}
            </span>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
          {loading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : filteredGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-raised)]/50 text-[var(--text-secondary)] border-b border-[var(--border)]">
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Group</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Hierarchy</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Children</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[var(--gold)] font-bold font-mono text-sm">{group.code}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${group.parentGroupId ? 'border border-[var(--info)]/30 bg-[var(--info-muted)] text-[var(--info)]' : 'border border-[var(--gold)]/20 bg-[var(--gold-muted)] text-[var(--gold)]'}`}>
                              {groupKindLabel(group)}
                            </span>
                          </div>
                          <span className="text-white font-medium">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-white">{groupHierarchyPath(group)}</span>
                          <span className="text-[var(--text-secondary)] text-xs">
                            {group.parentGroup ? `Child of ${group.parentGroup.name}` : 'Top-level group that can receive full-cohort sessions'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-medium">{group.childCount || 0} subgroup{group.childCount === 1 ? '' : 's'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(group)} className="h-8 w-8 p-0 rounded-lg">
                            <span className="material-symbols-outlined text-[18px]">edit_square</span>
                          </Button>
                          <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedGroup(group); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={search ? 'search_off' : 'group_add'}
              title={search ? 'No matches found' : 'No groups yet'}
              description={search ? `No groups match "${search}".` : 'Start by creating a main group like A, then attach subgroups like A1 or A2.'}
              action={search ? (
                <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
              ) : (
                <Button variant="primary" onClick={openCreate}>Create Group</Button>
              )}
            />
          )}
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Group' : 'Edit Group'}
        subtitle={modalMode === 'create' ? 'Create a main group or attach a subgroup to an existing parent.' : 'Update the group identity and hierarchy without leaving the resource page.'}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={actionLoading}>{actionLoading ? 'Saving...' : modalMode === 'create' ? 'Create Group' : 'Save Changes'}</Button>
          </div>
        }
      >
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
          <div className="mb-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Group details</div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Main groups can own subgroup children. Example: A is a parent, while A1 is a subgroup under A.</p>
          </div>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Group code"
                value={formData.code}
                onChange={(e) => setFormData((current) => ({ ...current, code: e.target.value.toUpperCase() }))}
                placeholder="A or A1"
                helperText="Use the real academic code students and staff already recognize."
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

      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Group"
        subtitle="This removes the group record and clears linked course/session assignments."
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>{actionLoading ? 'Deleting...' : 'Delete Group'}</Button>
          </div>
        }
      >
        <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              {selectedGroup?.childCount ? (
                <>Delete is blocked for <span className="text-white font-bold">{selectedGroup?.name}</span> because it still has {selectedGroup.childCount} subgroup{selectedGroup.childCount === 1 ? '' : 's'} attached. Reassign or remove those subgroups first.</>
              ) : (
                <>Are you sure you want to delete <span className="text-white font-bold">{selectedGroup?.name}</span>? Any sessions assigned to this group will become unassigned. This action cannot be undone.</>
              )}
            </p>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
