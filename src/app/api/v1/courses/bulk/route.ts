import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  getOrCreatePersonalWorkspace,
  requireSession,
  requireWorkspaceRole,
} from "@/lib/workspace-v1";

const bulkDeleteSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  ids: z.array(z.string().cuid()).min(1).max(200),
});

const bulkStatusSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  ids: z.array(z.string().cuid()).min(1).max(200),
  status: z.enum(["ACTIVE", "DRAFT"]),
});

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);
  await requireWorkspaceRole(userId, workspaceId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.TEACHER,
  ]);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return workspace;
}

/** DELETE /api/v1/courses/bulk — bulk delete courses */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = bulkDeleteSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.TEACHER,
    ]);

    // Verify all IDs belong to this workspace before deleting
    const owned = await prisma.course.findMany({
      where: { id: { in: body.ids }, workspaceId: workspace.id },
      select: { id: true },
    });
    const ownedIds = owned.map((c) => c.id);

    if (ownedIds.length === 0) {
      return NextResponse.json({ ok: false, message: "NO_COURSES_FOUND" }, { status: 404 });
    }

    const { count } = await prisma.course.deleteMany({
      where: { id: { in: ownedIds }, workspaceId: workspace.id },
    });

    return NextResponse.json({ ok: true, data: { deleted: count } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "BULK_DELETE_FAILED" }, { status: 500 });
  }
}

/** PATCH /api/v1/courses/bulk — bulk status update */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = bulkStatusSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.TEACHER,
    ]);

    const owned = await prisma.course.findMany({
      where: { id: { in: body.ids }, workspaceId: workspace.id },
      select: { id: true },
    });
    const ownedIds = owned.map((c) => c.id);

    if (ownedIds.length === 0) {
      return NextResponse.json({ ok: false, message: "NO_COURSES_FOUND" }, { status: 404 });
    }

    const { count } = await prisma.course.updateMany({
      where: { id: { in: ownedIds }, workspaceId: workspace.id },
      data: { status: body.status },
    });

    return NextResponse.json({ ok: true, data: { updated: count } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "BULK_STATUS_FAILED" }, { status: 500 });
  }
}
