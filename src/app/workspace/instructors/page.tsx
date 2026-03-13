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
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { BulkActionBar } from '@/components/workspace/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import type { InstructorApiItem } from '@/types';
import { cn } from '@/lib/utils';

export default function InstructorsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const bulk = useBulkSelection();
  
  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorApiItem | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchInstructors = async () => {
    try {
      const res = await fetch('/api/v1/instructors');
      const data = await res.json();
      setInstructors(data.data?.items || []);
    } catch (err) {
      toast('Failed to load instructors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInstructors();
    }
  }, [status]);

  const handleSave = async () => {
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
      fetchInstructors();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstructor) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/instructors/${selectedInstructor.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove instructor');
      
      toast('Instructor removed successfully');
      setIsDeleteOpen(false);
      fetchInstructors();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (i: InstructorApiItem) => {
    setSelectedInstructor(i);
    setFormData({ name: i.name, email: i.email || '', phone: i.phone || '' });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setFormData({ name: '', email: '', phone: '' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const filteredInstructors = instructors.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.email && i.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Bulk helpers
  const filteredIds = filteredInstructors.map((i) => i.id);
  const allChecked = filteredIds.length > 0 && filteredIds.every((id) => bulk.selectedIds.has(id));
  const someChecked = filteredIds.some((id) => bulk.selectedIds.has(id)) && !allChecked;

  const handleBulkExport = () => {
    const selected = instructors.filter((i) => bulk.selectedIds.has(i.id));
    if (!selected.length) return;
    const headers = ['id', 'name', 'email', 'phone'];
    const csvRows = selected.map((i) => [i.id, i.name, i.email ?? '', i.phone ?? ''].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `instructors-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selected.length} instructor${selected.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    const ids = Array.from(bulk.selectedIds);
    try {
      const res = await fetch('/api/v1/instructors/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.message || 'Bulk delete failed');
      toast(`Deleted ${result.data?.deleted ?? ids.length} instructor(s)`);
      bulk.clear();
      setBulkDeleteOpen(false);
      setBulkDeleteConfirm('');
      fetchInstructors();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk delete failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AppShell title="Faculty" subtitle="Manage university instructors and staff">
       <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
          
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                   <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Faculty directory</div>
                   <h2 className="text-3xl font-bold text-white tracking-tight">Instructors</h2>
                   <p className="text-[var(--text-secondary)] text-sm">Keep staffing, contact details, and assignment labels consistent across the workspace.</p>
                </div>
                
                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                   <SearchInput 
                     placeholder="Search instructors..." 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     onClear={() => setSearch('')}
                     className="w-full sm:w-[320px]"
                   />
                   <Button onClick={openCreate} variant="primary" className="gap-2">
                     <span className="material-symbols-outlined text-[20px]">person_add</span>
                     Add Instructor
                   </Button>
                </div>
             </div>
             <div className="mt-4 flex flex-wrap gap-2">
               <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                 {instructors.length} faculty records
               </span>
               <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)]">
                 {search ? `${filteredInstructors.length} matching search` : 'Name, contact, and assignment ready'}
               </span>
             </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
             {loading ? (
               <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
               </div>
             ) : filteredInstructors.length > 0 ? (
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
                               aria-label="Select all instructors"
                             />
                           </th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Instructor</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Contact Info</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredInstructors.map(i => {
                         const rowChecked = bulk.selectedIds.has(i.id);
                         return (
                         <tr key={i.id} className={cn("group/row transition-all", rowChecked ? "bg-[var(--gold)]/5" : "hover:bg-[var(--surface-2)]/30")}>
                           <td className="pl-5 pr-2 py-4">
                             <input
                               type="checkbox"
                               checked={rowChecked}
                               onChange={() => bulk.toggle(i.id)}
                               className="h-4 w-4 rounded border-[var(--border)] accent-[var(--gold)] cursor-pointer"
                               aria-label={`Select ${i.name}`}
                             />
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                 <Avatar name={i.name} size="sm" />
                                 <span className="text-white font-bold text-sm tracking-tight">{i.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-[var(--text-secondary)] text-sm">{i.email || 'No email'}</span>
                                 <span className="text-[var(--text-muted)] text-[11px]">{i.phone || 'No phone'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(i)} className="h-8 w-8 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                </Button>
                                <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedInstructor(i); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
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
                 icon={search ? "search_off" : "person_add"}
                 title={search ? "No instructors found" : "No faculty yet"}
                 description={search ? `No results for "${search}".` : "Start by adding instructors to your workspace database."}
                 action={search ? (
                   <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
                 ) : (
                   <Button variant="primary" onClick={openCreate}>Add First Instructor</Button>
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
         title={modalMode === 'create' ? 'Add New Instructor' : 'Edit Instructor'} 
         subtitle={modalMode === 'create' ? 'Create a faculty record with the contact details you want available during assignment.' : 'Update the instructor profile without leaving the resource page.'}
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Instructor' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
            <div className="mb-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Instructor details</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Capture the name first, then add optional contact details for scheduling coordination.</p>
            </div>
            <div className="space-y-4 py-1">
              <Input 
                label="Full Name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Prof. Alan Turing" 
                helperText="This is the primary label shown in course assignment selectors."
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input 
                  label="Email" 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="alan@university.edu" 
                  helperText="Optional"
                />
                <Input 
                  label="Phone" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+1 234..." 
                  helperText="Optional"
                />
              </div>
            </div>
         </div>
       </Modal>

       {/* Single delete Modal */}
       <Modal 
         open={isDeleteOpen} 
         onClose={() => setIsDeleteOpen(false)} 
         title="Remove Instructor" 
         subtitle="This removes the instructor record and clears current assignments."
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Removing...' : 'Remove Instructor'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4">
           <div className="flex items-start gap-3">
             <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
             <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
               Are you sure you want to remove <span className="text-white font-bold">{selectedInstructor?.name}</span>? 
               Any courses assigned to them will be marked as unassigned. This action cannot be undone.
             </p>
           </div>
         </div>
       </Modal>

       {/* Bulk delete confirmation */}
       <Modal
         open={bulkDeleteOpen}
         onClose={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }}
         title={`Remove ${bulk.count} Instructor${bulk.count > 1 ? 's' : ''}`}
         subtitle="This permanently removes the selected instructors."
         actions={
           <>
             <Button variant="ghost" onClick={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }} disabled={bulkLoading}>Cancel</Button>
             <Button variant="danger" onClick={() => void handleBulkDelete()} disabled={bulkLoading || bulkDeleteConfirm !== 'DELETE'}>
               {bulkLoading ? 'Removing...' : `Remove ${bulk.count} Instructor${bulk.count > 1 ? 's' : ''}`}
             </Button>
           </>
         }
       >
         <div className="space-y-4">
           <p className="text-sm text-[var(--text-secondary)]">You are about to permanently remove <span className="font-semibold text-white">{bulk.count} instructor{bulk.count > 1 ? 's' : ''}</span>. This cannot be undone.</p>
           <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Type <span className="text-white font-mono">DELETE</span> to confirm</label>
             <Input value={bulkDeleteConfirm} onChange={(e) => setBulkDeleteConfirm(e.target.value)} placeholder="DELETE" className="font-mono" />
           </div>
         </div>
       </Modal>
    </AppShell>
  );
}
