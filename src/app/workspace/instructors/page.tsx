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
import type { InstructorApiItem } from '@/types';
import { cn } from '@/lib/utils';

export default function InstructorsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  
  const [instructors, setInstructors] = useState<InstructorApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorApiItem | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [actionLoading, setActionLoading] = useState(false);

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

  return (
    <AppShell title="Faculty" subtitle="Manage university instructors and staff">
       <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
          
          <div className="flex flex-wrap items-center justify-between gap-4 px-2">
             <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Instructors</h2>
                <p className="text-[var(--text-secondary)] text-sm">Assign faculty members to courses and groups.</p>
             </div>
             
             <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SearchInput 
                  placeholder="Search instructors..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-[280px]"
                />
                <Button onClick={openCreate} variant="primary" className="gap-2">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  Add Instructor
                </Button>
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
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Instructor</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Contact Info</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredInstructors.map(i => (
                        <tr key={i.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
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
                      ))}
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

       {/* Form Modal */}
       <Modal 
         open={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         title={modalMode === 'create' ? 'Add New Instructor' : 'Edit Instructor'} 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Instructor' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="space-y-4 py-2">
            <Input 
              label="Full Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Prof. Alan Turing" 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Email" 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="alan@university.edu" 
              />
              <Input 
                label="Phone" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                placeholder="+1 234..." 
              />
            </div>
         </div>
       </Modal>

       {/* Delete Modal */}
       <Modal 
         open={isDeleteOpen} 
         onClose={() => setIsDeleteOpen(false)} 
         title="Remove Instructor" 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Removing...' : 'Remove Instructor'}
             </Button>
           </div>
         }
       >
         <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
           Are you sure you want to remove <span className="text-white font-bold">{selectedInstructor?.name}</span>? 
           Any courses assigned to them will be marked as unassigned. This action cannot be undone.
         </p>
       </Modal>
    </AppShell>
  );
}
