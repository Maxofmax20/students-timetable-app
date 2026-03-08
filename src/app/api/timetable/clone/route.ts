import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const source = await prisma.timetable.findFirst({
    where: { ownerId: session.userId },
    include: { events: true }
  });

  if (!source) {
    return NextResponse.json({ ok: false, message: 'لا يوجد جدول لنسخه' }, { status: 404 });
  }

  const clone = await prisma.$transaction(async (tx) => {
    const timetable = await tx.timetable.create({
      data: {
        ownerId: session.userId,
        title: `${source.title} (نسخة)`,
        days: source.days as Prisma.InputJsonValue,
        startMinute: source.startMinute,
        endMinute: source.endMinute,
        snapMinutes: source.snapMinutes,
        allowOverlap: source.allowOverlap,
        members: {
          create: {
            userId: session.userId,
            role: 'OWNER'
          }
        }
      }
    });

    if (source.events.length > 0) {
      await tx.timetableEvent.createMany({
        data: source.events.map((event) => ({
          timetableId: timetable.id,
          title: event.title,
          day: event.day,
          startMinute: event.startMinute,
          durationMinutes: event.durationMinutes,
          color: event.color,
          version: 1,
          createdById: session.userId,
          updatedById: session.userId
        }))
      });
    }

    return tx.timetable.findUnique({ where: { id: timetable.id }, include: { events: true } });
  });

  return NextResponse.json({ ok: true, timetable: clone });
}
