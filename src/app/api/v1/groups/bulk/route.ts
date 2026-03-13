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

/** DELETE /api/v1/groups/bulk — bulk delete groups */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = bulkDeleteSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.TEACHER,
    ]);

    const owned = await prisma.academicGroup.findMany({
      where: { id: { in: body.ids }, workspaceId: workspace.id },
      select: { id: true },
    });

    if (owned.length === 0) {
      return NextResponse.json({ ok: false, message: "NO_GROUPS_FOUND" }, { status: 404 });
    }

    const ownedIds = owned.map((g) => g.id);
    const { count } = await prisma.academicGroup.deleteMany({
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

