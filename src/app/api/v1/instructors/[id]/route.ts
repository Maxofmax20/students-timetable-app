import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  color: z.string().max(32).nullable().optional()
});

async function getInstructorOrThrow(id: string) {
  const item = await prisma.instructor.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "INSTRUCTOR_NOT_FOUND");
  return item;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getInstructorOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const updated = await prisma.instructor.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        color: body.color
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
    return NextResponse.json({ ok: false, message: "INSTRUCTOR_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getInstructorOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    await prisma.instructor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "INSTRUCTOR_DELETE_FAILED" }, { status: 500 });
  }
}
