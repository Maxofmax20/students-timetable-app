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
import { formatRoomLevel, normalizeRoomFields, roomDisplaySummary } from '@/lib/group-room-model';
import type { RoomApiItem } from '@/types';

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
  const [formData, setFormData] = useState({ code: '', name: '', capacity: '', building: '', buildingCode: '', roomNumber: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/v1/rooms');
      const data = await res.json();
      setRooms(data.data?.items || []);
    } catch {
      toast('Failed to load rooms', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void fetchRooms();
    }
  }, [status]);

  const normalizedPreview = useMemo(() => normalizeRoomFields({
    code: formData.code,
    buildingCode: formData.buildingCode,
    roomNumber: formData.roomNumber
  }), [formData.buildingCode, formData.code, formData.roomNumber]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const haystack = [
        room.code,
        room.name,
        room.building,
        room.buildingCode,
        room.roomNumber,
        room.level != null ? `level ${room.level}` : null,
        room.level === 0 ? 'ground' : null
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [rooms, search]);

  const handleCodeChange = (value: string) => {
    const normalized = normalizeRoomFields({ code: value });
    setFormData((current) => ({
      ...current,
      code: value.toUpperCase(),
      buildingCode: normalized.buildingCode || current.buildingCode,
      roomNumber: normalized.roomNumber || current.roomNumber
    }));
  };

  const handleStructuredChange = (patch: Partial<typeof formData>) => {
    setFormData((current) => {
      const next = { ...current, ...patch };
      const normalized = normalizeRoomFields({
        code: next.code,
        buildingCode: next.buildingCode,
        roomNumber: next.roomNumber
      });
      return {
        ...next,
        code: normalized.code || next.code
      };
    });
  };

  const getPayload = () => ({
    code: normalizedPreview.code || formData.code.trim().toUpperCase(),
    name: formData.name.trim(),
    capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
    building: formData.building.trim() || null,
    buildingCode: normalizedPreview.buildingCode,
    roomNumber: normalizedPreview.roomNumber
  });

  const handleSave = async () => {
    if (!formData.name.trim()) return toast('Room name is required', 'error');
    if (!getPayload().code) return toast('Room code or structured building + room number is required', 'error');

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
      await fetchRooms();
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
      await fetchRooms();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (room: RoomApiItem) => {
    setSelectedRoom(room);
    setFormData({
      code: room.code,
      name: room.name,
      capacity: room.capacity?.toString() || '',
      building: room.building || '',
      buildingCode: room.buildingCode || '',
      roomNumber: room.roomNumber || ''
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setSelectedRoom(null);
    setFormData({ code: '', name: '', capacity: '', building: '', buildingCode: '', roomNumber: '' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  return (
    <AppShell title="Campus Facilities" subtitle="Manage structured rooms and building layout">
      <div className="flex flex-col gap-6 p-1 md:p-6 lg:p-8 animate-panel-pop">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Facility structure</div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Rooms</h2>
              <p className="text-[var(--text-secondary)] text-sm">Track building letter, room number, and derived level so scheduling uses real campus structure instead of flat codes only.</p>
            </div>

            <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <SearchInput
                placeholder="Search rooms, buildings, or levels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                className="w-full sm:w-[360px]"
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
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {new Set(rooms.map((room) => room.buildingCode).filter(Boolean)).size} buildings represented
            </span>
            <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)]">
              {search ? `${filteredRooms.length} matching search` : 'Examples: E119 → Building E, Room 119, Level 1'}
            </span>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
          {loading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : filteredRooms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-raised)]/50 text-[var(--text-secondary)] border-b border-[var(--border)]">
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Code</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Structure</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px]">Capacity</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {filteredRooms.map((room) => (
                    <tr key={room.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-[var(--surface-3)] px-3 py-1.5 rounded-lg border border-[var(--border)] shadow-sm">
                          <span className="material-symbols-outlined text-[var(--gold)] text-lg">door_open</span>
                          <span className="text-white font-bold font-mono text-sm">{room.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-semibold text-sm">{room.name}</span>
                          <span className="text-[var(--text-secondary)] text-xs">{roomDisplaySummary(room)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[var(--text-secondary)] text-sm font-medium">{room.capacity ? `${room.capacity} seats` : 'Not specified'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(room)} className="h-8 w-8 p-0 rounded-lg">
                            <span className="material-symbols-outlined text-[18px]">edit_square</span>
                          </Button>
                          <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedRoom(room); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 rounded-lg">
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
              icon={search ? 'search_off' : 'add_location_alt'}
              title={search ? 'No matches found' : 'No rooms yet'}
              description={search ? `No rooms match "${search}".` : 'Add rooms like E119 or E412 and let the system derive building and level automatically.'}
              action={search ? (
                <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
              ) : (
                <Button variant="primary" onClick={openCreate}>Add First Room</Button>
              )}
            />
          )}
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Add Room' : 'Edit Room'}
        subtitle={modalMode === 'create' ? 'Create a structured room record using building letter and room number.' : 'Update room structure without leaving the current resource page.'}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={actionLoading}>{actionLoading ? 'Saving...' : modalMode === 'create' ? 'Add Room' : 'Save Changes'}</Button>
          </div>
        }
      >
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 md:p-5">
          <div className="mb-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Room details</div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Example: E412 means Building E, Room 412, Level 4. The full code updates automatically when the structured fields are present.</p>
          </div>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Building letter"
                value={formData.buildingCode}
                onChange={(e) => handleStructuredChange({ buildingCode: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                placeholder="E"
                helperText="Campus building letter code."
              />
              <Input
                label="Room number"
                value={formData.roomNumber}
                onChange={(e) => handleStructuredChange({ roomNumber: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="412"
                helperText="Numeric room identifier inside the building."
              />
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Derived level</div>
                <div className="mt-2 text-sm font-semibold text-white">{formatRoomLevel(normalizedPreview.level)}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">Derived from the room number range.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Room code"
                value={formData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="E412"
                helperText="Full scheduling code. If building letter + room number are set, this syncs automatically."
              />
              <div className="md:col-span-2">
                <Input
                  label="Room name"
                  value={formData.name}
                  onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Electronics Lab"
                  helperText="Human-readable room name used across the workspace."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Building name"
                value={formData.building}
                onChange={(e) => setFormData((current) => ({ ...current, building: e.target.value }))}
                placeholder="Engineering Block"
                helperText="Optional descriptive building name."
              />
              <Input
                label="Capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData((current) => ({ ...current, capacity: e.target.value }))}
                placeholder="40"
                helperText="Optional seat capacity for planning."
              />
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Preview: <span className="font-semibold text-white">{normalizedPreview.code || formData.code || '—'}</span>
              {normalizedPreview.buildingCode || normalizedPreview.roomNumber ? (
                <span> • {roomDisplaySummary({ code: normalizedPreview.code || formData.code, building: formData.building || null, buildingCode: normalizedPreview.buildingCode, roomNumber: normalizedPreview.roomNumber, level: normalizedPreview.level })}</span>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Room"
        subtitle="This removes the room record and clears any active room assignments."
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>{actionLoading ? 'Deleting...' : 'Delete Room'}</Button>
          </div>
        }
      >
        <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--danger)]">warning</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Are you sure you want to remove <span className="text-white font-bold">{selectedRoom?.name}</span>? Any sessions assigned to this room will become unassigned. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
