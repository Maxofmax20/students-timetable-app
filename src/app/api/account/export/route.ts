import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/workspace-v1';

export async function GET(request: NextRequest) {
  const session = await requireSession(request);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      accounts: {
        select: {
          provider: true,
          providerAccountId: true
        }
      },
      ownedWorkspaces: {
        include: {
          members: true,
          groups: true,
          instructors: true,
          rooms: true,
          courses: true,
          sessions: true,
          shares: true,
          revisions: true
        }
      },
      workspaceMemberships: true,
      ownedTimetables: {
        include: {
          events: true,
          members: true,
          shareLinks: true,
          auditLogs: true
        }
      },
      memberships: true,
      otpCodes: {
        select: {
          email: true,
          purpose: true,
          expiresAt: true,
          consumedAt: true,
          createdAt: true
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: 'USER_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    data: user
  }, {
    headers: {
      'Content-Disposition': `attachment; filename="students-timetable-export-${session.userId}.json"`
    }
  });
}
