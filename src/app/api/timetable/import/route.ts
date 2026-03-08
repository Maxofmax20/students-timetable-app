import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';
import { DAY_CODES } from '@/lib/constants';

const eventSchema = z.object({
  id: z.string().min(4).max(128).optional(),
  title: z.string().min(1).max(140),
  day: z.enum(DAY_CODES),
  startMinute: z.number().int().min(0).max(24 * 60),
  durationMinutes: z.number().int().min(15).max(12 * 60),
  color: z.string().max(32).optional(),
  version: z.number().int().min(1).max(100000).optional()
});

const schema = z
  .object({
    title: z.string().min(2).max(120),
    days: z.array(z.enum(DAY_CODES)).min(1).max(7),
    startMinute: z.number().int().min(0).max(24 * 60),
    endMinute: z.number().int().min(0).max(24 * 60),
    snapMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    allowOverlap: z.boolean(),
    events: z.array(eventSchema).max(800)
  })
  .refine((data) => data.endMinute > data.startMinute, {
    message: 'وقت النهاية يجب أن يكون بعد وقت البداية'
  });

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());

    const timetable = await prisma.timetable.findFirst({ where: { ownerId: session.userId } });

    const result = await prisma.$transaction(async (tx) => {
      const target = timetable
        ? await tx.timetable.update({
            where: { id: timetable.id },
            data: {
              title: payload.title,
              days: payload.days,
              startMinute: payload.startMinute,
              endMinute: payload.endMinute,
              snapMinutes: payload.snapMinutes,
              allowOverlap: payload.allowOverlap,
              version: { increment: 1 }
            }
          })
        : await tx.timetable.create({
            data: {
              ownerId: session.userId,
              title: payload.title,
              days: payload.days,
              startMinute: payload.startMinute,
              endMinute: payload.endMinute,
              snapMinutes: payload.snapMinutes,
              allowOverlap: payload.allowOverlap,
              members: {
                create: {
                  userId: session.userId,
                  role: 'OWNER'
                }
              }
            }
          });

      await tx.timetableEvent.deleteMany({ where: { timetableId: target.id } });

      if (payload.events.length > 0) {
        await tx.timetableEvent.createMany({
          data: payload.events.map((event) => ({
            ...(event.id ? { id: event.id } : {}),
            timetableId: target.id,
            title: event.title,
            day: event.day,
            startMinute: event.startMinute,
            durationMinutes: event.durationMinutes,
            color: event.color || '#4f46e5',
            version: event.version || 1,
            createdById: session.userId,
            updatedById: session.userId
          }))
        });
      }

      return tx.timetable.findUnique({ where: { id: target.id }, include: { events: true } });
    });

    return NextResponse.json({ ok: true, timetable: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'فشل حفظ الجدول' }, { status: 500 });
  }
}
