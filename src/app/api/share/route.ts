import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';

const schema = z.object({
  timetableId: z.string(),
  type: z.enum(['PUBLIC', 'PRIVATE']),
  role: z.enum(['VIEWER', 'EDITOR'])
});

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const timetableId = request.nextUrl.searchParams.get('timetableId');
  if (!timetableId) {
    return NextResponse.json({ ok: false, message: 'timetableId is required' }, { status: 400 });
  }

  const timetable = await prisma.timetable.findFirst({
    where: {
      id: timetableId,
      OR: [{ ownerId: session.userId }, { members: { some: { userId: session.userId, role: { in: ['OWNER', 'EDITOR'] } } } }]
    }
  });

  if (!timetable) {
    return NextResponse.json({ ok: false, message: 'لا يوجد صلاحية' }, { status: 403 });
  }

  const links = await prisma.shareLink.findMany({
    where: { timetableId },
    orderBy: { createdAt: 'desc' }
  });

  const origin = request.nextUrl.origin;
  return NextResponse.json({
    ok: true,
    links: links.map((link) => ({
      ...link,
      url: `${origin}/s/${link.token}`
    }))
  });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());

    const timetable = await prisma.timetable.findFirst({
      where: {
        id: body.timetableId,
        OR: [{ ownerId: session.userId }, { members: { some: { userId: session.userId, role: { in: ['OWNER', 'EDITOR'] } } } }]
      }
    });

    if (!timetable) {
      return NextResponse.json({ ok: false, message: 'لا يوجد صلاحية للمشاركة' }, { status: 403 });
    }

    let link;
    for (let i = 0; i < 5; i += 1) {
      const token = nanoid(6);
      try {
        link = await prisma.shareLink.create({
          data: {
            token,
            timetableId: body.timetableId,
            type: body.type,
            role: body.role,
            createdById: session.userId
          }
        });
        break;
      } catch {
        // retry on collision
      }
    }

    if (!link) {
      return NextResponse.json({ ok: false, message: 'تعذر إنشاء الرابط' }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    return NextResponse.json({ ok: true, link: { ...link, url: `${origin}/s/${link.token}` } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'تعذر إنشاء الرابط' }, { status: 500 });
  }
}
