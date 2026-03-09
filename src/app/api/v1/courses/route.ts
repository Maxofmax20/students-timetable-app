import { NextRequest, NextResponse } from "next/server";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  getOrCreatePersonalWorkspace,
  requireSession,
  requireWorkspaceRole
} from "@/lib/workspace-v1";

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  code: z.string().min(1).max(32),
  title: z.string().min(2).max(140),
  groupId: z.string().cuid().nullable().optional(),
  instructorId: z.string().cuid().nullable().optional(),
  roomId: z.string().cuid().nullable().optional(),
  color: z.string().max(32).optional(),
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

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);

  await requireWorkspaceRole(userId, workspaceId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.TEACHER,
    WorkspaceRole.STUDENT,
    WorkspaceRole.VIEWER
  ]);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return workspace;
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

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const workspace = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.course.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ code: "asc" }, { title: "asc" }],
      include: courseInclude
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, items } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "COURSES_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    await assertForeignBelongsToWorkspace(workspace.id, body.groupId, body.instructorId, body.roomId);

    const normalizedDay = normalizeDay(body.day);
    const parsedTime = parseTimeRange(body.time);

    const created = await prisma.course.create({
      data: {
        workspaceId: workspace.id,
        code: body.code,
        title: body.title,
        groupId: body.groupId ?? null,
        instructorId: body.instructorId ?? null,
        roomId: body.roomId ?? null,
        color: body.color ?? "#3b82f6",
        creditHours: body.creditHours ?? null,
        status: body.status ?? "ACTIVE",
        sessions: normalizedDay && parsedTime ? {
          create: [{
            workspaceId: workspace.id,
            day: normalizedDay,
            startMinute: parsedTime.startMinute,
            endMinute: parsedTime.endMinute,
            groupId: body.groupId ?? null,
            instructorId: body.instructorId ?? null,
            roomId: body.roomId ?? null
          }]
        } : undefined
      },
      include: courseInclude
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
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
    return NextResponse.json({ ok: false, message: "COURSE_CREATE_FAILED" }, { status: 500 });
  }
}
