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
import { BulkActionBar } from '@/components/workspace/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import type { RoomApiItem } from '@/types';
import { cn } from '@/lib/utils';

export default function RoomsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const bulk = useBulkSelection();
  
  const [rooms, setRooms] = useState<RoomApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomApiItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', capacity: '', building: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/v1/rooms');
      const data = await res.json();
      setRooms(data.data?.items || []);
    } catch (err) {
      toast('Failed to load rooms', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRooms();
    }
  }, [status]);

  const getPayload = () => ({
    code: formData.code,
    name: formData.name,
    capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
    building: formData.building || null
  });

  const handleSave = async () => {
    if (!formData.code || !formData.name) return toast('Code and name are required', 'error');
    setActionLoading(true);
    
    const isEdit = modalMode === 'edit';
    const url = isEdit ? `/api/v1/rooms/${selectedRoom?.id}` : '/api/v1/rooms';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload())
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${modalMode} room`);
      
      toast(`Room ${isEdit ? 'updated' : 'added'} successfully`);
      setIsModalOpen(false);
      fetchRooms();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoom) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/rooms/${selectedRoom.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove room');
      
      toast('Room removed successfully');
      setIsDeleteOpen(false);
      fetchRooms();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (r: RoomApiItem) => {
    setSelectedRoom(r);
    setFormData({ 
      code: r.code, 
      name: r.name, 
      capacity: r.capacity?.toString() || '', 
      building: r.building || '' 
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setFormData({ code: '', name: '', capacity: '', building: '' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    (r.building && r.building.toLowerCase().includes(search.toLowerCase()))
  );

  // Bulk helpers
  const filteredIds = filteredRooms.map((r) => r.id);
  const allChecked = filteredIds.length > 0 && filteredIds.every((id) => bulk.selectedIds.has(id));
  const someChecked = filteredIds.some((id) => bulk.selectedIds.has(id)) && !allChecked;

  const handleBulkExport = () => {
    const selected = rooms.filter((r) => bulk.selectedIds.has(r.id));
    if (!selected.length) return;
    const headers = ['id', 'code', 'name', 'capacity', 'building'];
    const csvRows = selected.map((r) => [r.id, r.code, r.name, r.capacity ?? '', r.building ?? ''].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rooms-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selected.length} room${selected.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    const ids = Array.from(bulk.selectedIds);
    try {
      const res = await fetch('/api/v1/rooms/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.message || 'Bulk delete failed');
      toast(`Deleted ${result.data?.deleted ?? ids.length} room(s)`);
      bulk.clear();
      setBulkDeleteOpen(false);
      setBulkDeleteConfirm('');
      fetchRooms();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Bulk delete failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AppShell title="Campus Facilities" subtitle="Manage rooms, labs, and lecture halls">
       <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
          
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                   <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Facility directory</div>
                   <h2 className="text-3xl font-bold text-white tracking-tight">Rooms</h2>
                   <p className="text-[var(--text-secondary)] text-sm">Manage classrooms, labs, and lecture halls with clearer capacity and building context.</p>
                </div>
                
                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                   <SearchInput 
                     placeholder="Search rooms or buildings..." 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     onClear={() => setSearch('')}
                     className="w-full sm:w-[340px]"
                   />
                   <Button onClick={openCreate} variant="primary" className="gap-2">
                     <span className="material-symbols-outlined text-[20px]">meeting_room</span>
                     Add Room
                   </Button>
                </div>
             </div>
             <div className="mt-4 flex flex-wrap gap-2">
               <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                 {rooms.length} spaces tracked
               </span>
               <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)]">
                 {search ? `${filteredRooms.length} matching search` : 'Code, capacity, and building in one place'}
               </span>
             </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
             {loading ? (
               <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
               </div>
             ) : filteredRooms.length > 0 ? (
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
                               aria-label="Select all rooms"
                             />
                           </th>
                           <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Code</th>
                           <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Information</th>
                           <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Capacity</th>
                           <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                        </tr>
                     </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                        {filteredRooms.map(r => {
                          const rowChecked = bulk.selectedIds.has(r.id);
                          return (
                         <tr key={r.id} className={cn("group/row transition-all", rowChecked ? "bg-[var(--gold)]/5" : "hover:bg-[var(--surface-2)]/30")}>
                           <td className="pl-5 pr-2 py-4">
                             <input
                               type="checkbox"
                               checked={rowChecked}
                               onChange={() => bulk.toggle(r.id)}
                               className="h-4 w-4 rounded border-[var(--border)] accent-[var(--gold)] cursor-pointer"
                               aria-label={`Select ${r.name}`}
                             />
                           </td>
                           <td className="px-6 py-4">
                              <div className="inline-flex items-center gap-2 bg-[var(--surface-3)] px-3 py-1.5 rounded-lg border border-[var(--border)] shadow-sm">
                                 <span className="material-symbols-outlined text-[var(--gold)] text-lg">door_open</span>
                                 <span className="text-white font-bold font-mono text-sm">{r.code}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-white font-semibold text-sm">{r.name}</span>
                                 <span className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider">{r.building || 'No building defined'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[var(--text-secondary)] text-sm font-medium">
                               {r.capacity ? `${r.capacity} seats` : 'Not specified'}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="h-8 w-8 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                </Button>
                                <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedRoom(r); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
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
                 icon={search ? "search_off" : "add_location_alt"}
                 title={search ? "No matches found" : "No rooms yet"}
                 description={search ? `No rooms match "${search}".` : "Add classrooms, labs and lecture halls to your database."}
                 action={search ? (
                   <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
                 ) : (
                   <Button variant="primary" onClick={openCreate}>Add First Room</Button>
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
         title={modalMode === 'create' ? 'Add New Room' : 'Edit Room'} 
         subtitle={modalMode === 'create' ? 'Create a room record the scheduler can assign immediately.' : 'Update room metadata without leaving the current resource page.'}
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Room' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
            <div className="mb-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Room details</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Keep the room code short, then add optional building and capacity details for planning clarity.</p>
            </div>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                 <Input 
                   label="Room Code" 
                   value={formData.code} 
                   onChange={e => setFormData({...formData, code: e.target.value})} 
                   placeholder="E412" 
                   helperText="Short identifier shown in course cards and tables."
                 />
                 <div className="md:col-span-2">
                   <Input 
                     label="Room Name" 
                     value={formData.name} 
                     onChange={e => setFormData({...formData, name: e.target.value})} 
                     placeholder="Main Lecture Hall" 
                     helperText="Use the human-readable name staff recognize fastest."
                   />
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input 
                  label="Building" 
                  value={formData.building} 
                  onChange={e => setFormData({...formData, building: e.target.value})} 
                  placeholder="Engineering Block" 
                  helperText="Optional"
                />
                <Input 
                  label="Capacity" 
                  type="number"
                  value={formData.capacity} 
                  onChange={e => setFormData({...formData, capacity: e.target.value})} 
                  placeholder="Number of seats" 
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
         title="Delete Room" 
         subtitle="This removes the room record and clears any active room assignments."
         actions={
           <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Deleting...' : 'Delete Room'}
             </Button>
           </div>
         }
       >
         <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4">
           <div className="flex items-start gap-3">
             <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
             <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
               Are you sure you want to remove <span className="text-white font-bold">{selectedRoom?.name}</span>? 
               Any courses scheduled in this room will become unassigned. This action cannot be undone.
             </p>
           </div>
         </div>
       </Modal>

       {/* Bulk delete confirmation */}
       <Modal
         open={bulkDeleteOpen}
         onClose={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }}
         title={`Delete ${bulk.count} Room${bulk.count > 1 ? 's' : ''}`}
         subtitle="This permanently removes the selected rooms."
         actions={
           <>
             <Button variant="ghost" onClick={() => { setBulkDeleteOpen(false); setBulkDeleteConfirm(''); }} disabled={bulkLoading}>Cancel</Button>
             <Button variant="danger" onClick={() => void handleBulkDelete()} disabled={bulkLoading || bulkDeleteConfirm !== 'DELETE'}>
               {bulkLoading ? 'Deleting...' : `Delete ${bulk.count} Room${bulk.count > 1 ? 's' : ''}`}
             </Button>
           </>
         }
       >
         <div className="space-y-4">
           <p className="text-sm text-[var(--text-secondary)]">You are about to permanently delete <span className="font-semibold text-white">{bulk.count} room{bulk.count > 1 ? 's' : ''}</span>. This cannot be undone.</p>
           <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Type <span className="text-white font-mono">DELETE</span> to confirm</label>
             <Input value={bulkDeleteConfirm} onChange={(e) => setBulkDeleteConfirm(e.target.value)} placeholder="DELETE" className="font-mono" />
           </div>
         </div>
       </Modal>
    </AppShell>
  );
}
