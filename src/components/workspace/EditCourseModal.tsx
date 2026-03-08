'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Row, GroupApiItem, InstructorApiItem, RoomApiItem } from '@/types';

export type EditCourseMode = 'title' | 'time' | 'room' | 'full' | 'duplicate' | 'create';

export interface EditCourseModalProps {
  open: boolean;
  onClose: () => void;
  mode: EditCourseMode;
  initialData?: Partial<Row>;
  groups: GroupApiItem[];
  instructors: InstructorApiItem[];
  rooms: RoomApiItem[];
  onSave: (data: Partial<Row>, originalId?: string) => Promise<void>;
}

export function EditCourseModal({ open, onClose, mode, initialData, groups, instructors, rooms, onSave }: EditCourseModalProps) {
  const [formData, setFormData] = useState<Partial<Row>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        code: initialData.code || '',
        course: initialData.course || '',
        status: initialData.status || 'Active',
        groupId: initialData.groupId || null,
        instructorId: initialData.instructorId || null,
        roomId: initialData.roomId || null,
        day: initialData.day && initialData.day !== '--' ? initialData.day : 'Mon',
        time: initialData.time && initialData.time !== '--' ? initialData.time : '09:00-10:00'
      });
    } else if (open && !initialData) {
      setFormData({
        code: '',
        course: '',
        status: 'Active',
        groupId: null,
        instructorId: null,
        roomId: null,
        day: 'Mon',
        time: '09:00-10:00'
      });
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData, initialData?.id);
      onClose();
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'title': return 'Edit Course Title';
      case 'time': return 'Edit Schedule';
      case 'room': return 'Assign Room';
      case 'duplicate': return 'Duplicate Course';
      case 'create': return 'Create Course';
      default: return 'Edit Course';
    }
  };

  if (!open) return null;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={getTitle()} 
      size="md"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : mode === 'duplicate' ? 'Duplicate' : mode === 'create' ? 'Create Course' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* IDENTITY SECTION */}
        {(mode === 'title' || mode === 'full' || mode === 'duplicate' || mode === 'create') && (
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input 
                  label="Course Title" 
                  value={formData.course || ''} 
                  onChange={e => setFormData({ ...formData, course: e.target.value })} 
                  placeholder="e.g. Introduction to AI" 
                />
              </div>
              <Input 
                label="Code" 
                value={formData.code || ''} 
                onChange={e => setFormData({ ...formData, code: e.target.value })} 
                placeholder="CS101" 
              />
            </div>
          </section>
        )}

        {/* SCHEDULE SECTION */}
        {(mode === 'time' || mode === 'full' || mode === 'duplicate' || mode === 'create') && (
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Schedule</h4>
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight ml-1">Day</label>
                  <select value={formData.day || 'Mon'} onChange={e => setFormData({ ...formData, day: e.target.value })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--gold)] outline-none transition-colors">
                    {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map(d => <option key={d} value={d} className="bg-[var(--surface)]">{d}</option>)}
                  </select>
               </div>
               <Input 
                 label="Time Range" 
                 value={formData.time || ''} 
                 onChange={e => setFormData({ ...formData, time: e.target.value })} 
                 placeholder="09:00-10:00"
                 helperText="Format: HH:MM-HH:MM"
               />
            </div>
          </section>
        )}

        {/* ASSIGNMENTS SECTION */}
        {(mode === 'room' || mode === 'full' || mode === 'duplicate' || mode === 'create') && (
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Assignments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight ml-1">Room</label>
                  <select value={formData.roomId || ''} onChange={e => setFormData({ ...formData, roomId: e.target.value || null })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--gold)] outline-none transition-colors">
                    <option value="" className="bg-[var(--surface)]">Unassigned</option>
                    {rooms.map(r => <option key={r.id} value={r.id} className="bg-[var(--surface)]">{r.code} - {r.name}</option>)}
                  </select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight ml-1">Group</label>
                  <select value={formData.groupId || ''} onChange={e => setFormData({ ...formData, groupId: e.target.value || null })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--gold)] outline-none transition-colors">
                    <option value="" className="bg-[var(--surface)]">Unassigned</option>
                    {groups.map(g => <option key={g.id} value={g.id} className="bg-[var(--surface)]">{g.name}</option>)}
                  </select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight ml-1">Instructor</label>
                  <select value={formData.instructorId || ''} onChange={e => setFormData({ ...formData, instructorId: e.target.value || null })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--gold)] outline-none transition-colors">
                    <option value="" className="bg-[var(--surface)]">Unassigned</option>
                    {instructors.map(i => <option key={i.id} value={i.id} className="bg-[var(--surface)]">{i.name}</option>)}
                  </select>
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight ml-1">Status</label>
                  <select value={formData.status || 'Active'} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--gold)] outline-none transition-colors">
                    <option value="Active" className="bg-[var(--surface)]">Active</option>
                    <option value="Draft" className="bg-[var(--surface)]">Draft</option>
                    <option value="Conflict" className="bg-[var(--surface)]">Conflict</option>
                  </select>
               </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
