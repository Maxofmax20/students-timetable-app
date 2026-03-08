import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  locale: z.string().trim().min(2).max(8).optional(),
  weekStart: z.enum(["SATURDAY", "SUNDAY", "MONDAY"]).optional(),
  timeFormat: z.enum(["H12", "H24", "BOTH"]).optional(),
  conflictMode: z.enum(["WARNING", "STRICT", "OFF"]).optional()
});

async function getWorkspaceOrThrow(id: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return workspace;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    await requireWorkspaceRole(session.userId, id, [WorkspaceRole.OWNER]);
    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        title: body.title,
        locale: body.locale,
        weekStart: body.weekStart,
        timeFormat: body.timeFormat,
        conflictMode: body.conflictMode
      }
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const workspace = await getWorkspaceOrThrow(id);

    if (workspace.ownerId !== session.userId) {
      throw new ApiError(403, "FORBIDDEN");
    }

    await prisma.workspace.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_DELETE_FAILED" }, { status: 500 });
  }
}
