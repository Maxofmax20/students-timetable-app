import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';
import { DAY_CODES, DEFAULT_TIMETABLE } from '@/lib/constants';

const settingsSchema = z
  .object({
    title: z.string().min(2).max(120),
    days: z.array(z.enum(DAY_CODES)).min(1).max(7),
    startMinute: z.number().int().min(0).max(24 * 60),
    endMinute: z.number().int().min(0).max(24 * 60),
    snapMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    allowOverlap: z.boolean()
  })
  .refine((data) => data.endMinute > data.startMinute, {
    message: 'وقت النهاية يجب أن يكون بعد وقت البداية'
  });

async function getOrCreateUserTimetable(userId: string) {
  const existing = await prisma.timetable.findFirst({
    where: { ownerId: userId },
    include: { events: { orderBy: [{ day: 'asc' }, { startMinute: 'asc' }] } }
  });

  if (existing) return existing;

  return prisma.timetable.create({
    data: {
      ownerId: userId,
      title: DEFAULT_TIMETABLE.title,
      days: DEFAULT_TIMETABLE.days,
      startMinute: DEFAULT_TIMETABLE.startMinute,
      endMinute: DEFAULT_TIMETABLE.endMinute,
      snapMinutes: DEFAULT_TIMETABLE.snapMinutes,
      allowOverlap: DEFAULT_TIMETABLE.allowOverlap,
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
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const timetable = await getOrCreateUserTimetable(session.userId);
  return NextResponse.json({ ok: true, timetable });
}

export async function PUT(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const data = settingsSchema.parse(await request.json());
    const timetable = await getOrCreateUserTimetable(session.userId);

    const updated = await prisma.timetable.update({
      where: { id: timetable.id },
      data: {
        title: data.title,
        days: data.days,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        snapMinutes: data.snapMinutes,
        allowOverlap: data.allowOverlap,
        version: { increment: 1 }
      },
      include: { events: true }
    });

    return NextResponse.json({ ok: true, timetable: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'تعذر تحديث الإعدادات' }, { status: 500 });
  }
}
