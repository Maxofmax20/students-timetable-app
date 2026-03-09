import { NextRequest, NextResponse } from "next/server";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";

const patchSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  title: z.string().min(2).max(140).optional(),
  groupId: z.string().cuid().nullable().optional(),
  instructorId: z.string().cuid().nullable().optional(),
  roomId: z.string().cuid().nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  creditHours: z.number().int().positive().max(12).nullable().optional(),
  status: z.string().max(24).optional(),
  day: z.string().trim().max(24).nullable().optional(),
  time: z.string().trim().max(32).nullable().optional()
});

const courseInclude = {
  group: { select: { id: true, code: true, name: true } },
  instructor: { select: { id: true, name: true } },
  room: { select: { id: true, code: true, name: true } },
  sessions: {
    orderBy: [{ day: "asc" }, { startMinute: "asc" }],
    include: {
      group: { select: { id: true, code: true, name: true } },
      instructor: { select: { id: true, name: true } },
      room: { select: { id: true, code: true, name: true } }
    }
  }
} satisfies Prisma.CourseInclude;

function parseTimeLabel(label: string) {
  const [hours, minutes] = label.trim().split(":").map((value) => Number(value));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new ApiError(400, "INVALID_SESSION_TIME");
  }
  return hours * 60 + minutes;
}

function parseTimeRange(value?: string | null) {
  if (!value) return null;
  const parts = value.split(/→|->|-/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) throw new ApiError(400, "INVALID_SESSION_TIME");
  const startMinute = parseTimeLabel(parts[0]);
  const endMinute = parseTimeLabel(parts[1]);
  if (endMinute <= startMinute) throw new ApiError(400, "INVALID_SESSION_TIME");
  return { startMinute, endMinute };
}

function normalizeDay(day?: string | null) {
  if (!day) return null;
  const normalized = day.trim().toLowerCase();
  const map: Record<string, string> = {
    sat: "Sat",
    saturday: "Sat",
    السبت: "Sat",
    sun: "Sun",
    sunday: "Sun",
    الأحد: "Sun",
    mon: "Mon",
    monday: "Mon",
    الإثنين: "Mon",
    الاثنين: "Mon",
    tue: "Tue",
    tuesday: "Tue",
    الثلاثاء: "Tue",
    wed: "Wed",
    wednesday: "Wed",
    الأربعاء: "Wed",
    الاربعاء: "Wed",
    thu: "Thu",
    thursday: "Thu",
    الخميس: "Thu",
    fri: "Fri",
    friday: "Fri",
    الجمعة: "Fri"
  };
  return map[normalized] ?? day.trim();
}

async function getCourseOrThrow(id: string) {
  const item = await prisma.course.findUnique({ where: { id }, include: { sessions: { orderBy: [{ day: "asc" }, { startMinute: "asc" }] } } });
  if (!item) throw new ApiError(404, "COURSE_NOT_FOUND");
  return item;
}

async function assertForeignBelongsToWorkspace(workspaceId: string, groupId?: string | null, instructorId?: string | null, roomId?: string | null) {
  if (groupId) {
    const group = await prisma.academicGroup.findFirst({ where: { id: groupId, workspaceId } });
    if (!group) throw new ApiError(400, "INVALID_GROUP");
  }

  if (instructorId) {
    const instructor = await prisma.instructor.findFirst({ where: { id: instructorId, workspaceId } });
    if (!instructor) throw new ApiError(400, "INVALID_INSTRUCTOR");
  }

  if (roomId) {
    const room = await prisma.room.findFirst({ where: { id: roomId, workspaceId } });
    if (!room) throw new ApiError(400, "INVALID_ROOM");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getCourseOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    await assertForeignBelongsToWorkspace(current.workspaceId, body.groupId, body.instructorId, body.roomId);

    const normalizedDay = body.day === undefined ? undefined : normalizeDay(body.day);
    const parsedTime = body.time === undefined ? undefined : parseTimeRange(body.time);

    const updated = await prisma.$transaction(async (tx) => {
      const course = await tx.course.update({
        where: { id },
        data: {
          code: body.code,
          title: body.title,
          groupId: body.groupId,
          instructorId: body.instructorId,
          roomId: body.roomId,
          color: body.color ?? undefined,
          creditHours: body.creditHours,
          status: body.status
        }
      });

      const primarySession = current.sessions[0] ?? null;
      const shouldTouchSession = body.day !== undefined || body.time !== undefined || body.groupId !== undefined || body.instructorId !== undefined || body.roomId !== undefined;

      if (shouldTouchSession) {
        const shouldDeleteSession = normalizedDay === null || parsedTime === null;

        if (shouldDeleteSession) {
          if (primarySession) {
            await tx.sessionEntry.delete({ where: { id: primarySession.id } });
          }
        } else {
          const nextDay = normalizedDay ?? primarySession?.day ?? null;
          const nextTime = parsedTime ?? (primarySession ? { startMinute: primarySession.startMinute, endMinute: primarySession.endMinute } : null);

          if (nextDay && nextTime) {
            const sessionData = {
              workspaceId: current.workspaceId,
              courseId: id,
              day: nextDay,
              startMinute: nextTime.startMinute,
              endMinute: nextTime.endMinute,
              groupId: body.groupId ?? course.groupId,
              instructorId: body.instructorId ?? course.instructorId,
              roomId: body.roomId ?? course.roomId
            };

            if (primarySession) {
              await tx.sessionEntry.update({ where: { id: primarySession.id }, data: sessionData });
            } else {
              await tx.sessionEntry.create({ data: sessionData });
            }
          }
        }
      }

      return tx.course.findUniqueOrThrow({ where: { id }, include: courseInclude });
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, message: "COURSE_CODE_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "COURSE_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getCourseOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "COURSE_DELETE_FAILED" }, { status: 500 });
  }
}
