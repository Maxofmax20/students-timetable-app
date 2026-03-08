import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const session = await getRequestSession(request);

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      timetable: {
        include: {
          events: { orderBy: [{ day: 'asc' }, { startMinute: 'asc' }] },
          members: true
        }
      }
    }
  });

  if (!link || link.revoked) {
    return NextResponse.json({ ok: false, message: 'الرابط غير صالح' }, { status: 404 });
  }

  if (link.type === 'PRIVATE' && !session) {
    return NextResponse.json({ ok: false, message: 'الرابط الخاص يتطلب تسجيل الدخول' }, { status: 401 });
  }

  let role = link.role;

  if (session) {
    if (link.timetable.ownerId === session.userId) {
      role = 'OWNER';
    } else {
      const membership = link.timetable.members.find((member) => member.userId === session.userId);
      if (membership) {
        role = membership.role;
      } else if (link.type === 'PRIVATE') {
        await prisma.timetableMember.upsert({
          where: {
            timetableId_userId: {
              timetableId: link.timetableId,
              userId: session.userId
            }
          },
          update: {
            role: link.role
          },
          create: {
            timetableId: link.timetableId,
            userId: session.userId,
            role: link.role
          }
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timetable: {
      ...link.timetable,
      role,
      linkType: link.type,
      token: link.token
    }
  });
}
