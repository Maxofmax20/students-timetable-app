'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { GroupApiItem } from '@/types';
import { cn } from '@/lib/utils';

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
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/v1/groups');
      const data = await res.json();
      setGroups(data.data?.items || []);
    } catch (err) {
      toast('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGroups();
    }
  }, [status]);

  const handleSave = async () => {
    if (!formData.code || !formData.name) return toast('Code and name are required', 'error');
    setActionLoading(true);
    
    const isEdit = modalMode === 'edit';
    const url = isEdit ? `/api/v1/groups/${selectedGroup?.id}` : '/api/v1/groups';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${modalMode} group`);
      
      toast(`Group ${isEdit ? 'updated' : 'created'} successfully`);
      setIsModalOpen(false);
      fetchGroups();
    } catch (err: any) {
      toast(err.message, 'error');
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
      fetchGroups();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (g: GroupApiItem) => {
    setSelectedGroup(g);
    setFormData({ code: g.code, name: g.name });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setFormData({ code: '', name: '' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Student Groups" subtitle="Manage cohorts and academic groups">
       <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
          
          <div className="flex flex-wrap items-center justify-between gap-4 px-2">
             <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Groups</h2>
                <p className="text-[var(--text-secondary)] text-sm">Organize students into trackable cohorts.</p>
             </div>
             
             <div className="flex items-center gap-3">
                <SearchInput 
                  placeholder="Search groups..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[280px]"
                />
                <Button onClick={openCreate} variant="primary" className="gap-2">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Group
                </Button>
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
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Code</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Name</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredGroups.map(g => (
                        <tr key={g.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
                          <td className="px-6 py-4 text-[var(--gold)] font-bold font-mono text-sm">{g.code}</td>
                          <td className="px-6 py-4 text-white font-medium">{g.name}</td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all">
                               <Button variant="ghost" size="sm" onClick={() => openEdit(g)} className="h-8 w-8 p-0 rounded-lg">
                                 <span className="material-symbols-outlined text-[18px]">edit_square</span>
                               </Button>
                               <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedGroup(g); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
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

       {/* Form Modal */}
       <Modal 
         open={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         title={modalMode === 'create' ? 'Create New Group' : 'Edit Group'} 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Create Group' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="space-y-4 py-2">
            <Input 
              label="Group Code" 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value})} 
              placeholder="e.g. CS-2024" 
            />
            <Input 
              label="Group Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Computer Science Freshman" 
            />
         </div>
       </Modal>

       {/* Delete Modal */}
       <Modal 
         open={isDeleteOpen} 
         onClose={() => setIsDeleteOpen(false)} 
         title="Delete Group" 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Deleting...' : 'Delete Group'}
             </Button>
           </div>
         }
       >
         <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
           Are you sure you want to delete <span className="text-white font-bold">{selectedGroup?.name}</span>? 
           All courses assigned to this group will become unassigned. This action cannot be undone.
         </p>
       </Modal>
    </AppShell>
  );
}
