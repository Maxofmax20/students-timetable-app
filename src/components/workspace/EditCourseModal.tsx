'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
import { TimeRangeField } from '@/components/ui/TimeRangeField';
import { cn } from '@/lib/utils';
import {
  formatSessionType,
  SESSION_TYPE_OPTIONS,
  sessionSupportsOnline,
  sessionSupportsRoom,
  stripLegacySessionSuffix
} from '@/lib/course-sessions';
import { groupHierarchyPath, groupKindLabel, roomDisplaySummary, sortGroupsForDisplay } from '@/lib/group-room-model';
import type {
  CourseSessionWritePayload,
  GroupApiItem,
  InstructorApiItem,
  RoomApiItem,
  Row,
  SessionTypeValue
} from '@/types';

export type EditCourseMode = 'create' | 'title' | 'time' | 'room' | 'full' | 'duplicate';

export type EditCourseInitialData = Partial<Row> & {
  sessions?: CourseSessionWritePayload[];
};

export type EditCourseSubmitData = Partial<Row> & {
  sessions: CourseSessionWritePayload[];
};

type EditCourseModalProps = {
  open: boolean;
  onClose: () => void;
  mode: EditCourseMode;
  initialData?: EditCourseInitialData;
  groups: GroupApiItem[];
  instructors: InstructorApiItem[];
  rooms: RoomApiItem[];
  onSave: (data: EditCourseSubmitData, originalId?: string) => Promise<void>;
};

type SessionFormState = {
  id?: string;
  type: SessionTypeValue;
  day: string;
  start: string;
  end: string;
  groupId: string;
  instructorId: string;
  roomId: string;
  onlinePlatform: string;
  onlineLink: string;
  note: string;
};

type FieldErrors = Partial<Record<'code' | 'course' | 'sessions', string>>;

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
    subtitle: 'Create one course, then add all lecture, section, lab, online, or hybrid sessions inside it.',
    saveLabel: 'Create Course'
  },
  title: {
    title: 'Rename Course',
    subtitle: 'Update the shared course identity without recreating its sessions.',
    saveLabel: 'Save Title'
  },
  time: {
    title: 'Update Course Sessions',
    subtitle: 'Adjust the schedule for the sessions already attached to this course.',
    saveLabel: 'Save Sessions'
  },
  room: {
    title: 'Update Course Sessions',
    subtitle: 'Adjust session-level room and delivery details without splitting the course into duplicates.',
    saveLabel: 'Save Sessions'
  },
  full: {
    title: 'Edit Course',
    subtitle: 'Manage the course once, then organize all of its sessions in one connected flow.',
    saveLabel: 'Save Changes'
  },
  duplicate: {
    title: 'Duplicate Course',
    subtitle: 'Create a copy of the course with its sessions so you can adjust it safely.',
    saveLabel: 'Create Duplicate'
  }
};

function parseTimeRange(value?: string) {
  if (!value) return { start: '09:00', end: '10:00' };
  const parts = value.split(/\s*(?:→|->|–|—|-)\s*/).filter(Boolean);
  if (parts.length !== 2) return { start: '09:00', end: '10:00' };
  return { start: parts[0].trim(), end: parts[1].trim() };
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

function emptySession(seed?: Partial<SessionFormState>): SessionFormState {
  return {
    id: seed?.id,
    type: seed?.type || 'LECTURE',
    day: seed?.day || 'Sat',
    start: seed?.start || '09:00',
    end: seed?.end || '10:00',
    groupId: seed?.groupId || NONE_VALUE,
    instructorId: seed?.instructorId || NONE_VALUE,
    roomId: seed?.roomId || NONE_VALUE,
    onlinePlatform: seed?.onlinePlatform || '',
    onlineLink: seed?.onlineLink || '',
    note: seed?.note || ''
  };
}

function getCommonValue(values: Array<string | null>) {
  const normalized = Array.from(new Set(values.map((value) => value ?? null)));
  return normalized.length === 1 ? normalized[0] : null;
}

function serializeSessions(sessions: SessionFormState[]): CourseSessionWritePayload[] {
  return sessions.map((session) => ({
    id: session.id,
    type: session.type,
    day: session.day,
    startTime: session.start,
    endTime: session.end,
    groupId: sanitizeOptionalValue(session.groupId),
    instructorId: sanitizeOptionalValue(session.instructorId),
    roomId: sessionSupportsRoom(session.type) ? sanitizeOptionalValue(session.roomId) : null,
    onlinePlatform: sessionSupportsOnline(session.type) ? session.onlinePlatform.trim() || null : null,
    onlineLink: sessionSupportsOnline(session.type) ? session.onlineLink.trim() || null : null,
    note: session.note.trim() || null
  }));
}

function formatSessionSummary(count: number) {
  if (count <= 0) return 'No sessions yet';
  if (count === 1) return '1 session';
  return `${count} sessions`;
}

function DayPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
      {DAY_OPTIONS.map((day) => {
        const active = value === day.value;
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onChange(day.value)}
            aria-pressed={active}
            className={cn(
              'rounded-2xl border px-3 py-2 text-center text-sm font-bold transition-all',
              active
                ? 'border-[var(--gold)] bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white'
            )}
          >
            {day.badge}
          </button>
        );
      })}
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
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [status, setStatus] = useState<Row['status']>('Active');
  const [sessions, setSessions] = useState<SessionFormState[]>([emptySession()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;

    const initialSessions = initialData?.sessions?.length
      ? initialData.sessions.map((session) => {
          const start = session.startTime || '09:00';
          const end = session.endTime || '10:00';
          return emptySession({
            id: session.id,
            type: session.type || 'LECTURE',
            day: session.day || 'Sat',
            start,
            end,
            groupId: session.groupId || initialData.groupId || NONE_VALUE,
            instructorId: session.instructorId || initialData.instructorId || NONE_VALUE,
            roomId: session.roomId || initialData.roomId || NONE_VALUE,
            onlinePlatform: session.onlinePlatform || '',
            onlineLink: session.onlineLink || '',
            note: session.note || ''
          });
        })
      : [(() => {
          const times = parseTimeRange(initialData?.time);
          return emptySession({
            type: 'LECTURE',
            day: initialData?.day?.substring(0, 3) || 'Sat',
            start: times.start,
            end: times.end,
            groupId: initialData?.groupId || NONE_VALUE,
            instructorId: initialData?.instructorId || NONE_VALUE,
            roomId: initialData?.roomId || NONE_VALUE
          });
        })()];

    setCourseCode(initialData?.code || '');
    setCourseTitle(stripLegacySessionSuffix(initialData?.course || initialData?.courseName || ''));
    setStatus((initialData?.status as Row['status']) || 'Active');
    setSessions(initialSessions);
    setSaving(false);
    setError('');
    setFieldErrors({});
  }, [open, initialData, mode]);

  const meta = MODE_META[mode];
  const showBasics = mode !== 'time' && mode !== 'room';
  const showStatus = mode === 'create' || mode === 'full' || mode === 'duplicate';

  const groupOptions = useMemo(
    () =>
      optionOrNone(sortGroupsForDisplay(groups), (group) => ({
        value: group.id,
        label: group.parentGroupId ? `${group.code} — ${groupKindLabel(group)}` : `${group.code} — Main group`,
        description: `${groupHierarchyPath(group)} • ${group.name}`,
        keywords: `${group.code || ''} ${group.name || ''} ${group.parentGroup?.code || ''} ${group.parentGroup?.name || ''}`
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
        description: roomDisplaySummary(room),
        keywords: `${room.code || ''} ${room.name || ''} ${room.building || ''} ${room.buildingCode || ''} ${room.roomNumber || ''} ${room.level ?? ''}`
      })),
    [rooms]
  );

  const sessionSummary = useMemo(() => formatSessionSummary(sessions.length), [sessions.length]);

  const updateSession = (index: number, patch: Partial<SessionFormState>) => {
    setSessions((current) => current.map((session, sessionIndex) => (sessionIndex === index ? { ...session, ...patch } : session)));
  };

  const addSession = (seed?: Partial<SessionFormState>) => {
    setSessions((current) => [...current, emptySession(seed)]);
  };

  const duplicateSession = (index: number) => {
    const source = sessions[index];
    addSession({ ...source, id: undefined, note: '' });
  };

  const removeSession = (index: number) => {
    setSessions((current) => (current.length > 1 ? current.filter((_, sessionIndex) => sessionIndex !== index) : current));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (showBasics) {
      if (!courseTitle.trim()) nextErrors.course = 'Course title is required.';
      if ((mode === 'create' || mode === 'full' || mode === 'duplicate') && !courseCode.trim()) nextErrors.code = 'Course code is required.';
    }

    if (!sessions.length) {
      nextErrors.sessions = 'Add at least one session.';
    }

    const hasSessionError = sessions.some((session) => !session.day || session.start >= session.end);
    if (hasSessionError) {
      nextErrors.sessions = 'Each session needs a valid day and time range.';
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

    const serializedSessions = serializeSessions(sessions);
    const commonGroupId = getCommonValue(serializedSessions.map((session) => session.groupId ?? null));
    const commonInstructorId = getCommonValue(serializedSessions.map((session) => session.instructorId ?? null));
    const commonRoomId = getCommonValue(serializedSessions.map((session) => session.roomId ?? null));
    const primarySession = serializedSessions[0];

    setSaving(true);
    setError('');
    try {
      await onSave(
        {
          code: courseCode.trim(),
          course: courseTitle.trim(),
          status,
          groupId: commonGroupId,
          instructorId: commonInstructorId,
          roomId: commonRoomId,
          day: primarySession?.day ?? undefined,
          time: primarySession?.startTime && primarySession?.endTime ? `${primarySession.startTime} → ${primarySession.endTime}` : undefined,
          sessions: serializedSessions
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
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">Course architecture</div>
            <h3 className="mt-1 text-lg font-black tracking-tight text-white">One course, many sessions</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Keep the course identity once, then attach lecture, section, lab, online, or hybrid sessions under it. This avoids duplicate course rows and keeps the timetable mapping clean.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Sessions</div>
              <div className="mt-2 text-sm font-semibold text-white">{sessionSummary}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">Delivery mix</div>
              <div className="mt-2 text-sm font-semibold text-white">
                {Array.from(new Set(sessions.map((session) => formatSessionType(session.type)))).join(' • ')}
              </div>
            </div>
          </div>
        </section>

        {showBasics ? (
          <SectionCard
            eyebrow="Course identity"
            title={mode === 'duplicate' ? 'Duplicate course basics' : 'Course basics'}
            description="Define the course once, then manage all of its sessions below."
          >
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <Input
                label="Course code"
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value)}
                placeholder="MATH-201"
                error={fieldErrors.code}
                helperText="Use the shared academic code for the whole course."
              />
              <Input
                label="Course title"
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Electrical Machines & Industrial Electronics"
                error={fieldErrors.course}
                helperText="Lecture/section/lab names belong in session type, not in the course title."
              />
            </div>

            {showStatus ? (
              <AppSelect
                label="Course status"
                value={status}
                onChange={(value) => setStatus(value as Row['status'])}
                options={STATUS_OPTIONS}
                helperText="Use Draft while you are still refining the course before publishing it as active."
              />
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="Sessions"
          title="Manage all sessions here"
          description="Each session can carry its own type, time, room, group, instructor, and online details."
        >
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const supportsOnline = sessionSupportsOnline(session.type);
              const supportsRoom = sessionSupportsRoom(session.type);
              const groupLabel = groupOptions.find((option) => option.value === session.groupId)?.label ?? 'Unassigned';
              const instructorLabel = instructorOptions.find((option) => option.value === session.instructorId)?.label ?? 'Unassigned';
              const roomLabel = roomOptions.find((option) => option.value === session.roomId)?.label ?? 'Unassigned';

              return (
                <section key={session.id || `session-${index}`} className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Session {index + 1}</div>
                      <h4 className="mt-1 text-base font-black text-white">{formatSessionType(session.type)}</h4>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {session.day} • {session.start} → {session.end} • {groupLabel} • {instructorLabel} • {supportsRoom ? roomLabel : 'Online only'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => duplicateSession(index)} className="gap-2">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        Duplicate
                      </Button>
                      <Button type="button" variant="ghost-danger" onClick={() => removeSession(index)} disabled={sessions.length === 1} className="gap-2">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                      <AppSelect
                        label="Session type"
                        value={session.type}
                        onChange={(value) => updateSession(index, { type: value as SessionTypeValue, roomId: value === 'ONLINE' ? NONE_VALUE : session.roomId })}
                        options={SESSION_TYPE_OPTIONS}
                        helperText="Use the session type instead of encoding it into the course name."
                      />
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Day</label>
                        <DayPicker value={session.day} onChange={(day) => updateSession(index, { day })} />
                      </div>
                    </div>

                    <TimeRangeField
                      start={session.start}
                      end={session.end}
                      onStartChange={(value) => updateSession(index, { start: value, end: session.end <= value ? '10:00' : session.end })}
                      onEndChange={(value) => updateSession(index, { end: value })}
                      helperText="Quarter-hour increments keep timetable placement cleaner and reduce overlap mistakes."
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <AppSelect
                        label="Group"
                        value={session.groupId}
                        onChange={(value) => updateSession(index, { groupId: value })}
                        options={groupOptions}
                        placeholder="Choose a group"
                        searchable
                        searchPlaceholder="Find group"
                        helperText="Optional — assign only if this session belongs to a specific cohort."
                      />
                      <AppSelect
                        label="Instructor"
                        value={session.instructorId}
                        onChange={(value) => updateSession(index, { instructorId: value })}
                        options={instructorOptions}
                        placeholder="Choose an instructor"
                        searchable
                        searchPlaceholder="Find instructor"
                        helperText="Optional — useful when lecture and lab are taught by different instructors."
                      />
                      <AppSelect
                        label={supportsRoom ? 'Room' : 'Room (not needed for online)'}
                        value={supportsRoom ? session.roomId : NONE_VALUE}
                        onChange={(value) => updateSession(index, { roomId: value })}
                        options={roomOptions}
                        placeholder={supportsRoom ? 'Choose a room' : 'Online only'}
                        searchable
                        searchPlaceholder="Find room"
                        helperText={supportsRoom ? 'Optional — leave unassigned until room planning is finalized.' : 'Online sessions do not need a physical room.'}
                        disabled={!supportsRoom}
                      />
                    </div>

                    {supportsOnline ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Online platform"
                          value={session.onlinePlatform}
                          onChange={(event) => updateSession(index, { onlinePlatform: event.target.value })}
                          placeholder="Zoom, Google Meet, Teams..."
                          helperText="Useful for online and hybrid sessions."
                        />
                        <Input
                          label="Online link"
                          value={session.onlineLink}
                          onChange={(event) => updateSession(index, { onlineLink: event.target.value })}
                          placeholder="https://..."
                          helperText="Optional join link or platform URL."
                        />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Session notes</label>
                      <textarea
                        value={session.note}
                        onChange={(event) => updateSession(index, { note: event.target.value })}
                        placeholder="Optional notes for this session"
                        rows={3}
                        className="w-full rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                      />
                    </div>
                  </div>
                </section>
              );
            })}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Add another session</div>
                <div className="text-sm text-[var(--text-secondary)]">Lecture, section, lab, online, and hybrid sessions can all live under the same course.</div>
              </div>
              <Button type="button" variant="secondary" onClick={() => addSession({ groupId: sessions[sessions.length - 1]?.groupId, instructorId: sessions[sessions.length - 1]?.instructorId, roomId: sessions[sessions.length - 1]?.roomId })} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Session
              </Button>
            </div>

            {fieldErrors.sessions ? <div className="text-[11px] font-semibold text-[var(--danger)]">{fieldErrors.sessions}</div> : null}
          </div>
        </SectionCard>

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
