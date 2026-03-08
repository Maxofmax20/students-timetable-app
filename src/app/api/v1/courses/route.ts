import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
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
  status: z.string().max(24).optional()
});

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
      include: {
        group: { select: { id: true, code: true, name: true } },
        instructor: { select: { id: true, name: true } },
        room: { select: { id: true, code: true, name: true } }
      }
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
        status: body.status ?? "ACTIVE"
      },
      include: {
        group: { select: { id: true, code: true, name: true } },
        instructor: { select: { id: true, name: true } },
        room: { select: { id: true, code: true, name: true } }
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "COURSE_CODE_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "COURSE_CREATE_FAILED" }, { status: 500 });
  }
}
