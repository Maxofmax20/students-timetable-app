import { NextRequest, NextResponse } from "next/server";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";

const patchSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120).optional(),
  yearLabel: z.string().max(32).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  parentGroupId: z.string().cuid().nullable().optional()
});

const groupInclude = {
  parentGroup: { select: { id: true, code: true, name: true } },
  _count: { select: { childGroups: true } }
} satisfies Prisma.AcademicGroupInclude;

async function getGroupOrThrow(id: string) {
  const item = await prisma.academicGroup.findUnique({ where: { id }, include: groupInclude });
  if (!item) throw new ApiError(404, "GROUP_NOT_FOUND");
  return item;
}

async function validateParentGroup(workspaceId: string, id: string, parentGroupId?: string | null) {
  if (parentGroupId === undefined) return undefined;
  if (!parentGroupId) return null;
  if (parentGroupId === id) throw new ApiError(400, "GROUP_CANNOT_PARENT_ITSELF");

  const parent = await prisma.academicGroup.findFirst({
    where: { id: parentGroupId, workspaceId },
    select: { id: true, parentGroupId: true }
  });
  if (!parent) throw new ApiError(400, "INVALID_PARENT_GROUP");
  if (parent.parentGroupId) throw new ApiError(400, "PARENT_GROUP_MUST_BE_MAIN_GROUP");
  return parent.id;
}

function mapGroup(item: Prisma.AcademicGroupGetPayload<{ include: typeof groupInclude }>) {
  return {
    ...item,
    childCount: item._count.childGroups
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getGroupOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    const parentGroupId = await validateParentGroup(current.workspaceId, id, body.parentGroupId);

    const updated = await prisma.academicGroup.update({
      where: { id },
      data: {
        code: body.code?.trim().toUpperCase(),
        name: body.name?.trim(),
        yearLabel: body.yearLabel === undefined ? undefined : body.yearLabel?.trim() || null,
        color: body.color,
        parentGroupId
      },
      include: groupInclude
    });

    return NextResponse.json({ ok: true, data: mapGroup(updated) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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

    if (current._count.childGroups > 0) {
      throw new ApiError(409, "GROUP_HAS_CHILDREN");
    }

    await prisma.academicGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "GROUP_DELETE_FAILED" }, { status: 500 });
  }
}
