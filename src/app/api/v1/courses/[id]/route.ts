import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
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
  status: z.string().max(24).optional()
});

async function getCourseOrThrow(id: string) {
  const item = await prisma.course.findUnique({ where: { id } });
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

    const updated = await prisma.course.update({
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
      },
      include: {
        group: { select: { id: true, code: true, name: true } },
        instructor: { select: { id: true, name: true } },
        room: { select: { id: true, code: true, name: true } }
      }
    });

    return NextResponse.json({ ok: true, data: updated });
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
