import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";

const patchSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(2).max(120).optional(),
  yearLabel: z.string().max(32).nullable().optional(),
  color: z.string().max(32).nullable().optional()
});

async function getGroupOrThrow(id: string) {
  const item = await prisma.academicGroup.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "GROUP_NOT_FOUND");
  return item;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getGroupOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const updated = await prisma.academicGroup.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        yearLabel: body.yearLabel,
        color: body.color
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
      return NextResponse.json({ ok: false, message: "GROUP_CODE_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "GROUP_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getGroupOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    await prisma.academicGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "GROUP_DELETE_FAILED" }, { status: 500 });
  }
}
