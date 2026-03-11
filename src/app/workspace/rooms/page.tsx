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
import { CsvImportModal } from '@/components/workspace/CsvImportModal';
import { formatRoomLevel, groupRoomsByBuilding, normalizeRoomFields, roomDisplaySummary } from '@/lib/group-room-model';
import type { RoomApiItem } from '@/types';

type WorkspaceAccess = {
  productRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  canWrite: boolean;
  canImport: boolean;
};

const ROOMS_TEMPLATE_CSV = `buildingCode,roomNumber,name,buildingName,capacity
E,119,Room E119,Main Engineering Building,40
E,226,Room E226,,25
E,412,Room E412,,60`;

const ROOMS_IMPORT_HELP = [
  'Supported columns: buildingCode + roomNumber, or a single code/fullCode column. buildingName and capacity are optional.',
  'Level is derived automatically from the room number using the university rule already used by the product.',
  'Choose import mode: create only, update existing, or create + update. Preview clearly shows each row outcome before confirmation.',
  'If name is omitted, the import uses a safe default like "Room E119" so invalid blank-name rows are never created.'
];

export default function RoomsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const { toast } = useToast();

  const [rooms, setRooms] = useState<RoomApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomApiItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', capacity: '', building: '', buildingCode: '', roomNumber: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/v1/rooms');
      const data = await res.json();
      setRooms(data.data?.items || []);
      setAccess(data.data?.access || null);
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

  const groupedRooms = useMemo(() => groupRoomsByBuilding(filteredRooms), [filteredRooms]);

  const toggleSection = (key: string) => {
    if (search.trim()) return;
    setCollapsedSections((current) => ({
      ...current,
      [key]: !(current[key] ?? true)
    }));
  };

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
    if (!access?.canWrite) return toast('Viewer mode: room changes are disabled.', 'error');
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
    if (!access?.canWrite) return toast('Viewer mode: room deletion is disabled.', 'error');
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
    if (!access?.canWrite) {
      toast('Viewer mode: editing rooms is disabled.', 'error');
      return;
    }
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
    if (!access?.canWrite) {
      toast('Viewer mode: adding rooms is disabled.', 'error');
      return;
    }
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
              <Button onClick={() => setIsImportOpen(true)} variant="secondary" className="gap-2" disabled={!access?.canImport}>
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Import CSV
              </Button>
              <Button onClick={openCreate} variant="primary" className="gap-2" disabled={!access?.canWrite}>
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
              {search ? `${filteredRooms.length} matching rooms across ${groupedRooms.length} buildings` : 'Example: E119 → Building E, Room 119, Level 0'}
            </span>
          </div>
        </div>

        {!access?.canWrite ? (
          <div className="rounded-[20px] border border-[var(--warning)]/30 bg-[var(--warning-muted)] px-4 py-3 text-sm text-[var(--warning)]">
            You are in Viewer mode. Room records are read-only; create, edit, delete, and import actions are disabled.
          </div>
        ) : null}

        <div className="space-y-5">
          {loading ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-lg)] space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : filteredRooms.length > 0 ? (
            groupedRooms.map((section) => {
              const isCollapsed = search.trim() ? false : (collapsedSections[section.buildingCode] ?? true);

              return (
                <section key={section.buildingCode} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-lg)]">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.buildingCode)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full flex-col gap-3 border-b border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] px-4 py-4 text-left transition-colors hover:bg-[linear-gradient(135deg,var(--surface-2),var(--surface-3))] md:px-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Building section</div>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-white">{section.buildingCode === '—' ? 'Unstructured rooms' : `Building ${section.buildingCode}`}</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {section.buildingName ? `${section.buildingName} • ` : ''}Rooms are grouped under the same building letter for faster scanning.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">
                          {section.rooms.length} room{section.rooms.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
                          <span className={`material-symbols-outlined text-[20px] transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
                        </span>
                      </div>
                    </div>
                  </button>

                  {!isCollapsed ? (
                    <div className="p-4 md:p-6 grid gap-3">
                      {section.rooms.map((room) => (
                        <div key={room.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 bg-[var(--surface-3)] px-3 py-1.5 rounded-lg border border-[var(--border)] shadow-sm">
                                  <span className="material-symbols-outlined text-[var(--gold)] text-lg">door_open</span>
                                  <span className="text-white font-bold font-mono text-sm">{room.code}</span>
                                </div>
                                {room.buildingCode ? <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">Building {room.buildingCode}</span> : null}
                              </div>
                              <div className="mt-2 text-white font-semibold">{room.name}</div>
                              <div className="mt-1 text-sm text-[var(--text-secondary)]">{roomDisplaySummary(room)}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                {room.roomNumber ? <span className="rounded-full border border-[var(--border)] px-2.5 py-1">Room {room.roomNumber}</span> : null}
                                <span className="rounded-full border border-[var(--border)] px-2.5 py-1">{formatRoomLevel(room.level)}</span>
                                <span className="rounded-full border border-[var(--border)] px-2.5 py-1">{room.capacity ? `${room.capacity} seats` : 'Capacity not set'}</span>
                              </div>
                            </div>
                            {access?.canWrite ? (
                              <div className="flex items-center gap-2 self-end md:self-start">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(room)} className="h-9 w-9 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                </Button>
                                <Button variant="ghost-danger" size="sm" onClick={() => { setSelectedRoom(room); setIsDeleteOpen(true); }} className="h-9 w-9 p-0 rounded-lg">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })
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
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Example: E412 means Building E, Room 412, Level 3. The full code updates automatically when the structured fields are present.</p>
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

      <CsvImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Rooms from CSV"
        subtitle="Preview every room first, validate structure, and then confirm explicit create/update actions. Existing room codes are never silently overwritten."
        endpoint="/api/v1/import/rooms"
        templateFilename="rooms-import-template.csv"
        templateCsv={ROOMS_TEMPLATE_CSV}
        helpLines={ROOMS_IMPORT_HELP}
        canImport={Boolean(access?.canImport)}
        onImported={async () => {
          setIsImportOpen(false);
          await fetchRooms();
        }}
      />

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
