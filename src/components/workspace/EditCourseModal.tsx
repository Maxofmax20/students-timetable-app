'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
import { TimeRangeField } from '@/components/ui/TimeRangeField';
import { cn } from '@/lib/utils';
import type { GroupApiItem, InstructorApiItem, RoomApiItem, Row } from '@/types';

export type EditCourseMode = 'create' | 'title' | 'time' | 'room' | 'full' | 'duplicate';

type EditCourseModalProps = {
  open: boolean;
  onClose: () => void;
  mode: EditCourseMode;
  initialData?: Partial<Row>;
  groups: GroupApiItem[];
  instructors: InstructorApiItem[];
  rooms: RoomApiItem[];
  onSave: (data: Partial<Row>, originalId?: string) => Promise<void>;
};

type FormState = {
  code: string;
  course: string;
  status: Row['status'];
  day: string;
  start: string;
  end: string;
  groupId: string;
  instructorId: string;
  roomId: string;
};

type FieldErrors = Partial<Record<'code' | 'course' | 'day' | 'time' | 'groupId' | 'instructorId' | 'roomId', string>>;

type ModeMeta = {
  title: string;
  subtitle: string;
  saveLabel: string;
};

const NONE_VALUE = '__none__';

const DAY_OPTIONS = [
  { value: 'Sat', label: 'Saturday', badge: 'Sat', description: 'Start of the academic week' },
  { value: 'Sun', label: 'Sunday', badge: 'Sun' },
  { value: 'Mon', label: 'Monday', badge: 'Mon' },
  { value: 'Tue', label: 'Tuesday', badge: 'Tue' },
  { value: 'Wed', label: 'Wednesday', badge: 'Wed' },
  { value: 'Thu', label: 'Thursday', badge: 'Thu' },
  { value: 'Fri', label: 'Friday', badge: 'Fri' }
];

const STATUS_OPTIONS: { value: Row['status']; label: string; description: string }[] = [
  { value: 'Active', label: 'Active', description: 'Visible in timetable and export' },
  { value: 'Draft', label: 'Draft', description: 'Keep editing before publishing' },
  { value: 'Conflict', label: 'Conflict', description: 'Needs attention before scheduling' }
];

const MODE_META: Record<EditCourseMode, ModeMeta> = {
  create: {
    title: 'Create Course',
    subtitle: 'Build a course with schedule and assignments in one connected flow.',
    saveLabel: 'Create Course'
  },
  title: {
    title: 'Rename Course',
    subtitle: 'Update the course identity students will see across the workspace.',
    saveLabel: 'Save Title'
  },
  time: {
    title: 'Update Schedule',
    subtitle: 'Adjust the day and time with a cleaner, app-native picker flow.',
    saveLabel: 'Save Schedule'
  },
  room: {
    title: 'Change Room',
    subtitle: 'Reassign this course to a different room without touching other details.',
    saveLabel: 'Save Room'
  },
  full: {
    title: 'Edit Course',
    subtitle: 'Refine the course details, schedule, and assignments together.',
    saveLabel: 'Save Changes'
  },
  duplicate: {
    title: 'Duplicate Course',
    subtitle: 'Create a copy you can adjust before it goes live.',
    saveLabel: 'Create Duplicate'
  }
};

function parseTimeRange(value?: string) {
  if (!value) return { start: '09:00', end: '10:00' };
  const parts = value.split(/\s*(?:→|->|–|—|-)\s*/).filter(Boolean);
  if (parts.length !== 2) return { start: '09:00', end: '10:00' };
  return { start: parts[0].trim(), end: parts[1].trim() };
}

function emptyForm(): FormState {
  return {
    code: '',
    course: '',
    status: 'Active',
    day: 'Sat',
    start: '09:00',
    end: '10:00',
    groupId: NONE_VALUE,
    instructorId: NONE_VALUE,
    roomId: NONE_VALUE
  };
}

function optionOrNone<T extends { id: string }>(items: T[], map: (item: T) => { value: string; label: string; description?: string; keywords?: string }) {
  return [
    { value: NONE_VALUE, label: 'Unassigned', description: 'Leave this field empty for now' },
    ...items.map(map)
  ];
}

function sanitizeOptionalValue(value: string) {
  return value === NONE_VALUE ? null : value;
}

function DayPicker({ value, onChange, errorText }: { value: string; onChange: (next: string) => void; errorText?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Day</label>
        <span className="text-[11px] text-[var(--text-secondary)]">Best for fast taps on phone</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {DAY_OPTIONS.map((day) => {
          const active = value === day.value;
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onChange(day.value)}
              aria-pressed={active}
              className={cn(
                'rounded-2xl border px-3 py-3 text-left transition-all',
                active
                  ? 'border-[var(--gold)] bg-[linear-gradient(180deg,var(--gold-muted),color-mix(in srgb,var(--gold-muted) 72%,transparent))] text-white shadow-[var(--shadow-sm)]'
                  : 'border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">{day.badge}</div>
                {active ? <span className="material-symbols-outlined text-[18px] text-white">check_circle</span> : null}
              </div>
              <div className={cn('mt-1 text-[11px]', active ? 'text-white/80' : 'text-[var(--text-secondary)]')}>{day.label}</div>
            </button>
          );
        })}
      </div>
      {errorText ? <div className="text-[11px] font-semibold text-[var(--danger)]">{errorText}</div> : null}
    </div>
  );
}

function SummaryPill({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-2xl border px-3 py-3', highlight ? 'border-[var(--gold)]/25 bg-[var(--gold-muted)]' : 'border-[var(--border)] bg-[var(--surface)]')}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {label}
      </div>
      <div className={cn('mt-2 text-sm font-semibold', highlight ? 'text-[var(--gold)]' : 'text-white')}>{value}</div>
    </div>
  );
}

function SectionCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">{eyebrow}</div>
        <h3 className="mt-1 text-lg font-black tracking-tight text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function EditCourseModal({ open, onClose, mode, initialData, groups, instructors, rooms, onSave }: EditCourseModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    const times = parseTimeRange(initialData?.time);
    setForm({
      code: initialData?.code || '',
      course: initialData?.course || '',
      status: (initialData?.status as Row['status']) || 'Active',
      day: initialData?.day?.substring(0, 3) || 'Sat',
      start: times.start,
      end: times.end,
      groupId: initialData?.groupId || NONE_VALUE,
      instructorId: initialData?.instructorId || NONE_VALUE,
      roomId: initialData?.roomId || NONE_VALUE
    });
    setSaving(false);
    setError('');
    setFieldErrors({});
  }, [open, initialData, mode]);

  const groupOptions = useMemo(
    () =>
      optionOrNone(groups, (group) => ({
        value: group.id,
        label: group.code || group.name || 'Group',
        description: group.name || undefined,
        keywords: `${group.code || ''} ${group.name || ''}`
      })),
    [groups]
  );

  const instructorOptions = useMemo(
    () =>
      optionOrNone(instructors, (instructor) => ({
        value: instructor.id,
        label: instructor.name,
        description: instructor.email || instructor.phone || undefined,
        keywords: `${instructor.name} ${instructor.email || ''} ${instructor.phone || ''}`
      })),
    [instructors]
  );

  const roomOptions = useMemo(
    () =>
      optionOrNone(rooms, (room) => ({
        value: room.id,
        label: room.code || room.name || 'Room',
        description: [room.name, room.building].filter(Boolean).join(' • ') || undefined,
        keywords: `${room.code || ''} ${room.name || ''} ${room.building || ''}`
      })),
    [rooms]
  );

  const meta = MODE_META[mode];
  const showBasics = mode === 'create' || mode === 'title' || mode === 'full' || mode === 'duplicate';
  const showSchedule = mode === 'create' || mode === 'time' || mode === 'full' || mode === 'duplicate';
  const showAssignments = mode === 'create' || mode === 'room' || mode === 'full' || mode === 'duplicate';
  const showStatus = mode === 'create' || mode === 'full' || mode === 'duplicate';
  const dayLabel = DAY_OPTIONS.find((option) => option.value === form.day)?.label ?? 'Choose day';
  const groupLabel = groupOptions.find((option) => option.value === form.groupId)?.label ?? 'Unassigned';
  const instructorLabel = instructorOptions.find((option) => option.value === form.instructorId)?.label ?? 'Unassigned';
  const roomLabel = roomOptions.find((option) => option.value === form.roomId)?.label ?? 'Unassigned';

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (showBasics) {
      if (!form.course.trim()) nextErrors.course = 'Course title is required.';
      if ((mode === 'create' || mode === 'full' || mode === 'duplicate') && !form.code.trim()) nextErrors.code = 'Course code is required.';
    }

    if (showSchedule) {
      if (!form.day) nextErrors.day = 'Choose a day.';
      if (form.start >= form.end) nextErrors.time = 'End time must be after the start time.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError('Please fix the highlighted fields and try again.');
      return false;
    }

    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError('');
    try {
      await onSave(
        {
          code: form.code.trim(),
          course: form.course.trim(),
          status: form.status,
          day: form.day,
          time: `${form.start} → ${form.end}`,
          groupId: sanitizeOptionalValue(form.groupId),
          instructorId: sanitizeOptionalValue(form.instructorId),
          roomId: sanitizeOptionalValue(form.roomId)
        },
        initialData?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title={meta.title}
      subtitle={meta.subtitle}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} isLoading={saving} className="w-full sm:w-auto">
            {meta.saveLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5 pb-1">
        <section className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:grid-cols-[1.25fr_0.95fr] md:p-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">Scheduling flow</div>
            <h3 className="mt-1 text-lg font-black tracking-tight text-white">Build the course in one connected pass</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Fill the essentials first, then refine schedule and assignments. Required fields are highlighted when you try to save, while room, group, and instructor can stay flexible until planning is final.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--gold)]/25 bg-[var(--gold-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)]">Primary CTA stays pinned</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">Optional assignments can be added later</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryPill icon="calendar_today" label="Day" value={dayLabel} highlight={showSchedule} />
            <SummaryPill icon="schedule" label="Time" value={`${form.start} → ${form.end}`} highlight={showSchedule} />
            <SummaryPill icon="groups" label="Group" value={groupLabel} />
            <SummaryPill icon="school" label="Instructor" value={instructorLabel} />
            <SummaryPill icon="meeting_room" label="Room" value={roomLabel} />
          </div>
        </section>

        {showBasics ? (
          <SectionCard
            eyebrow="Course identity"
            title={mode === 'title' ? 'Rename this course' : 'Course basics'}
            description="Start with the name and code students will recognize in the timetable and exports."
          >
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <Input
                label="Course code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                placeholder="MATH-201"
                error={fieldErrors.code}
                helperText={mode === 'title' ? 'Code stays visible for reference even if you are only renaming.' : 'Use the short academic code used in your institution.'}
              />
              <Input
                label="Course title"
                value={form.course}
                onChange={(event) => setForm((current) => ({ ...current, course: event.target.value }))}
                placeholder="Electrical Machines & Industrial Electronics"
                error={fieldErrors.course}
                helperText="This is the primary label students will see across the workspace."
              />
            </div>
          </SectionCard>
        ) : null}

        {showSchedule ? (
          <SectionCard
            eyebrow="Schedule"
            title={mode === 'time' ? 'Pick the session slot' : 'Day and time'}
            description="Use a tap-friendly day picker and quick time controls so scheduling works well on both phone and desktop."
          >
            <div className="space-y-4">
              <DayPicker value={form.day} onChange={(day) => setForm((current) => ({ ...current, day }))} errorText={fieldErrors.day} />
              <TimeRangeField
                start={form.start}
                end={form.end}
                onStartChange={(value) => setForm((current) => ({ ...current, start: value, end: current.end <= value ? '10:00' : current.end }))}
                onEndChange={(value) => setForm((current) => ({ ...current, end: value }))}
                helperText="Quarter-hour increments keep timetable placement cleaner and reduce overlap mistakes."
                errorText={fieldErrors.time}
              />
              {showStatus ? (
                <AppSelect
                  label="Course status"
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value as Row['status'] }))}
                  options={STATUS_OPTIONS}
                  helperText="Use Draft while you are still refining the course before publishing it as active."
                />
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {showAssignments ? (
          <SectionCard
            eyebrow="Assignments"
            title={mode === 'room' ? 'Room assignment' : 'Group, instructor, and room'}
            description={
              mode === 'room'
                ? 'Move the course to another room or leave it unassigned until the final slot is confirmed.'
                : 'Choose who teaches the course, where it happens, and which group it belongs to.'
            }
          >
            {mode === 'room' ? (
              <AppSelect
                label="Room"
                value={form.roomId}
                onChange={(value) => setForm((current) => ({ ...current, roomId: value }))}
                options={roomOptions}
                placeholder="Choose a room"
                searchable
                searchPlaceholder="Find room"
                helperText="You can keep the course unassigned while room planning is still in progress."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <AppSelect
                  label="Group"
                  value={form.groupId}
                  onChange={(value) => setForm((current) => ({ ...current, groupId: value }))}
                  options={groupOptions}
                  placeholder="Choose a group"
                  searchable
                  searchPlaceholder="Find group"
                  helperText="Optional — leave unassigned if the group is not finalized yet."
                />
                <AppSelect
                  label="Instructor"
                  value={form.instructorId}
                  onChange={(value) => setForm((current) => ({ ...current, instructorId: value }))}
                  options={instructorOptions}
                  placeholder="Choose an instructor"
                  searchable
                  searchPlaceholder="Find instructor"
                  helperText="Optional — assign later if staffing is still in flux."
                />
                <AppSelect
                  label="Room"
                  value={form.roomId}
                  onChange={(value) => setForm((current) => ({ ...current, roomId: value }))}
                  options={roomOptions}
                  placeholder="Choose a room"
                  searchable
                  searchPlaceholder="Find room"
                  helperText="Optional — useful for drafts before room allocation is final."
                />
              </div>
            )}
          </SectionCard>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-[24px] border border-[var(--danger)]/50 bg-[linear-gradient(135deg,var(--danger-muted),transparent)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <div>{error}</div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
