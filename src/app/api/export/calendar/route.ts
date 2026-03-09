import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { WorkspaceRole } from '@prisma/client';

const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function formatDateValue(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getUTCDate()}`.padStart(2, '0');
  const hh = `${date.getUTCHours()}`.padStart(2, '0');
  const mi = `${date.getUTCMinutes()}`.padStart(2, '0');
  const ss = `${date.getUTCSeconds()}`.padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function nextWeekdayAnchor(day: string, startMinute: number) {
  const now = new Date();
  const target = dayMap[day] ?? 0;
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  let delta = (target - base.getUTCDay() + 7) % 7;
  const candidate = new Date(base);
  candidate.setUTCDate(candidate.getUTCDate() + delta);
  candidate.setUTCHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 7);
  return candidate;
}

async function resolveWorkspace(userId: string, workspaceId?: string | null) {
  if (workspaceId) {
    await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER, WorkspaceRole.STUDENT, WorkspaceRole.VIEWER]);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
    return workspace;
  }

  const candidate = await prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    orderBy: [
      { sessions: { _count: 'desc' } },
      { courses: { _count: 'desc' } },
      { updatedAt: 'desc' }
    ]
  });

  return candidate ?? getOrCreatePersonalWorkspace(userId);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const requestedWorkspaceId = request.nextUrl.searchParams.get('workspaceId');
    let workspace = await resolveWorkspace(session.userId, requestedWorkspaceId);

    const loadCourses = async (workspaceId: string) => prisma.course.findMany({
      where: { workspaceId },
      include: {
        instructor: { select: { name: true } },
        room: { select: { code: true, name: true } },
        group: { select: { code: true, name: true } },
        sessions: {
          include: {
            instructor: { select: { name: true } },
            room: { select: { code: true, name: true } },
            group: { select: { code: true, name: true } }
          },
          orderBy: [{ day: 'asc' }, { startMinute: 'asc' }]
        }
      },
      orderBy: [{ code: 'asc' }, { title: 'asc' }]
    });

    let courses = await loadCourses(workspace.id);

    if (!courses.some((course) => course.sessions.length > 0) && requestedWorkspaceId) {
      const fallback = await resolveWorkspace(session.userId, null);
      if (fallback.id !== workspace.id) {
        workspace = fallback;
        courses = await loadCourses(workspace.id);
      }
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Students Timetable//Workspace Calendar Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcs(workspace.title)}`,
      `X-WR-CALDESC:${escapeIcs('Weekly timetable export generated from Students Timetable.')}`
    ];

    const stamp = formatDateValue(new Date());

    for (const course of courses) {
      for (const sessionItem of course.sessions) {
        const start = nextWeekdayAnchor(sessionItem.day, sessionItem.startMinute);
        const end = new Date(start.getTime() + (sessionItem.endMinute - sessionItem.startMinute) * 60_000);
        const room = sessionItem.room?.code || course.room?.code || course.room?.name || 'TBA';
        const group = sessionItem.group?.code || course.group?.code || '—';
        const instructor = sessionItem.instructor?.name || course.instructor?.name || '—';
        const summary = `${course.title} (${group})`;
        const description = [`Course code: ${course.code}`, `Group: ${group}`, `Instructor: ${instructor}`, `Room: ${room}`].join('\n');
        const uid = `${course.id}-${sessionItem.id}@students-timetable`;
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${stamp}`,
          `SUMMARY:${escapeIcs(summary)}`,
          `DESCRIPTION:${escapeIcs(description)}`,
          `LOCATION:${escapeIcs(room)}`,
          `DTSTART:${formatDateValue(start)}`,
          `DTEND:${formatDateValue(end)}`,
          'RRULE:FREQ=WEEKLY;COUNT=16',
          'END:VEVENT'
        );
      }
    }

    lines.push('END:VCALENDAR');

    return new NextResponse(lines.join('\r\n'), {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="${workspace.title.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'workspace'}-${Date.now()}.ics"`
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'CALENDAR_EXPORT_FAILED' }, { status: 500 });
  }
}
