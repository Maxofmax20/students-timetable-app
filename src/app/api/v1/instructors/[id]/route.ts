import { NextRequest, NextResponse } from "next/server";
import { SessionType, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  color: z.string().max(32).nullable().optional()
});

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

async function getInstructorOrThrow(id: string) {
  const item = await prisma.instructor.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "INSTRUCTOR_NOT_FOUND");
  return item;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
  const minute = (minutes % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getInstructorOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.TEACHER,
      WorkspaceRole.STUDENT,
      WorkspaceRole.VIEWER
    ]);

    const [courseCount, sessions] = await Promise.all([
      prisma.course.count({ where: { workspaceId: current.workspaceId, instructorId: id } }),
      prisma.sessionEntry.findMany({
        where: { workspaceId: current.workspaceId, instructorId: id },
        include: {
          course: { select: { id: true, code: true, title: true } },
          group: { select: { id: true, code: true, name: true } },
          room: { select: { id: true, code: true, name: true } }
        }
      })
    ]);

    const dayCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    let onlineSessionsCount = 0;
    let physicalSessionsCount = 0;

    for (const sessionItem of sessions) {
      dayCounts.set(sessionItem.day, (dayCounts.get(sessionItem.day) || 0) + 1);
      typeCounts.set(sessionItem.type, (typeCounts.get(sessionItem.type) || 0) + 1);

      const isOnline = sessionItem.type === SessionType.ONLINE || (!sessionItem.roomId && (!!sessionItem.onlineLink || !!sessionItem.onlinePlatform));
      if (isOnline) onlineSessionsCount += 1;
      else physicalSessionsCount += 1;
    }

    const busiestDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;

    const schedule = sessions
      .sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.startMinute - b.startMinute;
      })
      .map((sessionItem) => ({
        id: sessionItem.id,
        day: sessionItem.day,
        startMinute: sessionItem.startMinute,
        endMinute: sessionItem.endMinute,
        startTime: minutesToTime(sessionItem.startMinute),
        endTime: minutesToTime(sessionItem.endMinute),
        type: sessionItem.type,
        course: sessionItem.course,
        group: sessionItem.group,
        room: sessionItem.room,
        onlinePlatform: sessionItem.onlinePlatform,
        onlineLink: sessionItem.onlineLink
      }));

    return NextResponse.json({
      ok: true,
      data: {
        ...current,
        impact: {
          courseCount,
          sessionCount: sessions.length,
          assignmentStatus: sessions.length > 0 || courseCount > 0 ? 'assigned' : 'unassigned'
        },
        workload: {
          assignedCoursesCount: courseCount,
          assignedSessionsCount: sessions.length,
          sessionsByType: Object.fromEntries(typeCounts.entries()),
          busiestDay: busiestDay ? { day: busiestDay[0], count: busiestDay[1] } : null,
          onlineSessionsCount,
          physicalSessionsCount
        },
        schedule
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'INSTRUCTOR_FETCH_FAILED' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getInstructorOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const normalizedEmail = body.email === undefined ? undefined : normalizeEmail(body.email);
    if (normalizedEmail) {
      const exists = await prisma.instructor.findFirst({
        where: {
          workspaceId: current.workspaceId,
          id: { not: id },
          email: { equals: normalizedEmail, mode: 'insensitive' }
        },
        select: { id: true }
      });
      if (exists) {
        throw new ApiError(409, 'INSTRUCTOR_EMAIL_EXISTS');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.instructor.update({
        where: { id },
        data: {
          name: body.name?.trim(),
          email: normalizedEmail,
          phone: body.phone === undefined ? undefined : (body.phone?.trim() || null),
          color: body.color
        }
      });
      await writeWorkspaceAudit({ tx, workspaceId: current.workspaceId, actorUserId: session.userId, entityType: 'INSTRUCTOR', entityId: id, actionType: 'UPDATE', summary: `Updated instructor ${item.name}`, before: { name: current.name, email: current.email, phone: current.phone }, after: { name: item.name, email: item.email, phone: item.phone } });
      return item;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "INSTRUCTOR_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getInstructorOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    await prisma.$transaction(async (tx) => {
      await tx.instructor.delete({ where: { id } });
      await writeWorkspaceAudit({ tx, workspaceId: current.workspaceId, actorUserId: session.userId, entityType: 'INSTRUCTOR', entityId: id, actionType: 'DELETE', summary: `Deleted instructor ${current.name}`, before: { name: current.name, email: current.email, phone: current.phone, color: current.color }, metadata: { restorable: true } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "INSTRUCTOR_DELETE_FAILED" }, { status: 500 });
  }
}
