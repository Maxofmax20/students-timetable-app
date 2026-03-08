import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/workspace-v1';
import { DAY_CODES } from '@/lib/constants';

const timeLabelSchema = z.string().regex(/^\d{2}:\d{2}$/);

const daySchema = z.object({
  id: z.enum(DAY_CODES),
  name: z.string().min(2).max(24),
  shortLabel: z.string().min(2).max(6),
  enabled: z.boolean(),
  isOff: z.boolean(),
  order: z.number().int().min(0).max(20)
});

const courseSchema = z.object({
  id: z.string().min(2).max(128),
  name: z.string().min(1).max(140),
  group: z.string().min(1).max(48),
  instructor: z.string().max(120).optional().default(''),
  location: z.string().min(1).max(120),
  dayId: z.enum(DAY_CODES),
  startTime: timeLabelSchema,
  endTime: timeLabelSchema,
  color: z.string().min(3).max(32),
  notes: z.string().max(500).optional().default('')
});

const snapshotSchema = z
  .object({
    title: z.string().min(2).max(120),
    owner: z.string().max(80).nullable().optional(),
    startTime: timeLabelSchema,
    endTime: timeLabelSchema,
    intervalMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)]),
    style: z.string().min(2).max(48),
    days: z.array(daySchema).min(1).max(7),
    courses: z.array(courseSchema).max(1000),
    uiSettings: z.object({}).passthrough().optional()
  })
  .superRefine((data, ctx) => {
    const start = toMinutes(data.startTime);
    const end = toMinutes(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime']
      });
    }

    const daySet = new Set(data.days.map((day) => day.id));

    for (const [index, course] of data.courses.entries()) {
      if (!daySet.has(course.dayId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Course day is not part of day configuration',
          path: ['courses', index, 'dayId']
        });
      }

      if (toMinutes(course.endTime) <= toMinutes(course.startTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Course end time must be after start time',
          path: ['courses', index, 'endTime']
        });
      }
    }
  });

type BuilderSnapshot = z.infer<typeof snapshotSchema>;

const DAY_NAME_MAP: Record<string, string> = {
  sat: 'Saturday',
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday'
};

const DAY_SHORT_MAP: Record<string, string> = {
  sat: 'Sat',
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri'
};

const DEFAULT_UI_SETTINGS = {
  rowHeight: 52,
  columnWidth: 220,
  showGridLines: true,
  showTimeLabels: true,
  stickyTimeColumn: true,
  stickyDayHeader: true,
  primaryColor: '#2b6cee',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#f6f6f8',
  cardColor: '#ffffff',
  borderRadius: 14,
  shadowIntensity: 0.25,
  gridContrast: 0.2,
  mode: 'light',
  showInstructor: true,
  showLocation: true,
  showGroup: true,
  density: 'comfortable',
  snapToGrid: true,
  autoConflictDetection: true,
  autoPlacementSuggestions: true,
  keyboardShortcutsEnabled: true,
  animationsEnabled: true,
  miniMapEnabled: false,
  zoomLevel: 15
};

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map((part) => Number(part));
  return h * 60 + m;
}

function toTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = Math.floor(minutes % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
}

function asDayList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ['mon', 'tue', 'wed', 'thu', 'fri'];
  const onlyValid = raw.filter((item): item is (typeof DAY_CODES)[number] =>
    typeof item === 'string' ? (DAY_CODES as readonly string[]).includes(item) : false
  );
  return onlyValid.length ? onlyValid : ['mon', 'tue', 'wed', 'thu', 'fri'];
}

function deriveSnapshotFromTimetable(timetable: {
  title: string;
  days: unknown;
  startMinute: number;
  endMinute: number;
  snapMinutes: number;
  events: Array<{
    id: string;
    title: string;
    day: string;
    startMinute: number;
    durationMinutes: number;
    color: string;
  }>;
}): BuilderSnapshot {
  const enabledDays = asDayList(timetable.days);

  const days = DAY_CODES.map((id, order) => ({
    id,
    name: DAY_NAME_MAP[id] || id,
    shortLabel: DAY_SHORT_MAP[id] || id.slice(0, 3),
    enabled: enabledDays.includes(id),
    isOff: id === 'sun',
    order
  }));

  return {
    title: timetable.title,
    owner: null,
    startTime: toTimeLabel(timetable.startMinute),
    endTime: toTimeLabel(timetable.endMinute),
    intervalMinutes: [5, 10, 15, 20, 30].includes(timetable.snapMinutes)
      ? (timetable.snapMinutes as 5 | 10 | 15 | 20 | 30)
      : 15,
    style: 'modern-glass',
    days,
    courses: timetable.events.map((event) => ({
      id: event.id,
      name: event.title,
      group: 'A1',
      instructor: '',
      location: 'TBD',
      dayId: (DAY_CODES as readonly string[]).includes(event.day) ? (event.day as (typeof DAY_CODES)[number]) : 'mon',
      startTime: toTimeLabel(event.startMinute),
      endTime: toTimeLabel(event.startMinute + event.durationMinutes),
      color: event.color || '#2b6cee',
      notes: ''
    })),
    uiSettings: DEFAULT_UI_SETTINGS
  };
}

async function getOrCreateUserTimetable(userId: string) {
  const existing = await prisma.timetable.findFirst({
    where: { ownerId: userId },
    include: { events: { orderBy: [{ day: 'asc' }, { startMinute: 'asc' }] } }
  });

  if (existing) return existing;

  return prisma.timetable.create({
    data: {
      ownerId: userId,
      title: 'جدولي الدراسي',
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      startMinute: 8 * 60,
      endMinute: 22 * 60,
      snapMinutes: 15,
      allowOverlap: false,
      members: {
        create: {
          userId,
          role: 'OWNER'
        }
      }
    },
    include: { events: true }
  });
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request);

  const timetable = await getOrCreateUserTimetable(session.userId);

  const latestSnapshotLog = await prisma.auditLog.findFirst({
    where: {
      timetableId: timetable.id,
      action: 'BUILDER_SNAPSHOT_SAVE'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (latestSnapshotLog?.payload && typeof latestSnapshotLog.payload === 'object') {
    const parsed = snapshotSchema.safeParse(latestSnapshotLog.payload);
    if (parsed.success) {
      return NextResponse.json({ ok: true, source: 'audit', snapshot: parsed.data });
    }
  }

  return NextResponse.json({
    ok: true,
    source: 'derived',
    snapshot: deriveSnapshotFromTimetable(timetable)
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);

  try {
    const snapshot = snapshotSchema.parse(await request.json());
    const timetable = await getOrCreateUserTimetable(session.userId);

    const enabledDays = snapshot.days
      .filter((day) => day.enabled)
      .sort((a, b) => a.order - b.order)
      .map((day) => day.id);

    const normalizedDays = enabledDays.length ? enabledDays : ['mon', 'tue', 'wed', 'thu', 'fri'];

    const startMinute = toMinutes(snapshot.startTime);
    const endMinute = toMinutes(snapshot.endTime);

    const result = await prisma.$transaction(async (tx) => {
      const updatedTimetable = await tx.timetable.update({
        where: { id: timetable.id },
        data: {
          title: snapshot.title,
          days: normalizedDays,
          startMinute,
          endMinute,
          snapMinutes: snapshot.intervalMinutes,
          allowOverlap: false,
          version: { increment: 1 }
        }
      });

      await tx.timetableEvent.deleteMany({ where: { timetableId: updatedTimetable.id } });

      if (snapshot.courses.length > 0) {
        await tx.timetableEvent.createMany({
          data: snapshot.courses.map((course) => {
            const start = toMinutes(course.startTime);
            const end = toMinutes(course.endTime);
            const duration = Math.max(snapshot.intervalMinutes, end - start);

            return {
              id: course.id,
              timetableId: updatedTimetable.id,
              title: course.name,
              day: course.dayId,
              startMinute: start,
              durationMinutes: duration,
              color: course.color || '#2b6cee',
              version: 1,
              createdById: session.userId,
              updatedById: session.userId
            };
          })
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          timetableId: updatedTimetable.id,
          action: 'BUILDER_SNAPSHOT_SAVE',
          payload: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue
        }
      });

      return updatedTimetable;
    });

    return NextResponse.json({ ok: true, timetableId: result.id, saved: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, message: 'Failed to save builder snapshot' }, { status: 500 });
  }
}
