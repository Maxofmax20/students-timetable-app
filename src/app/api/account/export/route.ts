import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      ownedTimetables: {
        include: {
          events: true,
          members: true,
          shareLinks: true
        }
      }
    }
  });

  return NextResponse.json({ ok: true, data: user });
}
