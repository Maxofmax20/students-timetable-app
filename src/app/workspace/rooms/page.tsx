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
import type { RoomApiItem } from '@/types';
import { cn } from '@/lib/utils';

export default function RoomsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();
  
  const [rooms, setRooms] = useState<RoomApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomApiItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', capacity: '', building: '' });
  const [actionLoading, setActionLoading] = useState(false);

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
    } catch (err: any) {
      toast(err.message, 'error');
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
    } catch (err: any) {
      toast(err.message, 'error');
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

  return (
    <AppShell title="Campus Facilities" subtitle="Manage rooms, labs, and lecture halls">
       <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
          
          <div className="flex flex-wrap items-center justify-between gap-4 px-2">
             <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Rooms</h2>
                <p className="text-[var(--text-secondary)] text-sm">Assign physical spaces to scheduled courses.</p>
             </div>
             
             <div className="flex items-center gap-3">
                <SearchInput 
                  placeholder="Search rooms or buildings..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[280px]"
                />
                <Button onClick={openCreate} variant="primary" className="gap-2">
                  <span className="material-symbols-outlined text-[20px]">meeting_room</span>
                  Add Room
                </Button>
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
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Code</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Information</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Capacity</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {filteredRooms.map(r => (
                        <tr key={r.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
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
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all">
                               <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="h-8 w-8 p-0 rounded-lg">
                                 <span className="material-symbols-outlined text-[18px]">edit_square</span>
                               </Button>
                               <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedRoom(r); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
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

       {/* Form Modal */}
       <Modal 
         open={isModalOpen} 
         onClose={() => setIsModalOpen(false)} 
         title={modalMode === 'create' ? 'Add New Room' : 'Edit Room'} 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button variant="primary" onClick={handleSave} disabled={actionLoading}>
               {actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Room' : 'Save Changes'}
             </Button>
           </div>
         }
       >
         <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Input 
                 label="Room Code" 
                 value={formData.code} 
                 onChange={e => setFormData({...formData, code: e.target.value})} 
                 placeholder="E412" 
               />
               <div className="md:col-span-2">
                 <Input 
                   label="Room Name" 
                   value={formData.name} 
                   onChange={e => setFormData({...formData, name: e.target.value})} 
                   placeholder="Main Lecture Hall" 
                 />
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Building" 
                value={formData.building} 
                onChange={e => setFormData({...formData, building: e.target.value})} 
                placeholder="Engineering Block" 
              />
              <Input 
                label="Capacity" 
                type="number"
                value={formData.capacity} 
                onChange={e => setFormData({...formData, capacity: e.target.value})} 
                placeholder="Number of seats" 
              />
            </div>
         </div>
       </Modal>

       {/* Delete Modal */}
       <Modal 
         open={isDeleteOpen} 
         onClose={() => setIsDeleteOpen(false)} 
         title="Delete Room" 
         actions={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
             <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
               {actionLoading ? 'Deleting...' : 'Delete Room'}
             </Button>
           </div>
         }
       >
         <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
           Are you sure you want to remove <span className="text-white font-bold">{selectedRoom?.name}</span>? 
           Any courses scheduled in this room will become unassigned. This action cannot be undone.
         </p>
       </Modal>
    </AppShell>
  );
}
