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
import { requireWorkspaceReadAccess } from "@/lib/workspace-access";

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  yearLabel: z.string().max(32).optional(),
  color: z.string().max(32).optional(),
  parentGroupId: z.string().cuid().nullable().optional()
});

const groupInclude = {
  parentGroup: { select: { id: true, code: true, name: true } },
  _count: { select: { childGroups: true } }
} satisfies Prisma.AcademicGroupInclude;

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) {
    const workspace = await getOrCreatePersonalWorkspace(userId);
    const access = await requireWorkspaceReadAccess(userId, workspace.id);
    return { workspace, access };
  }

  const access = await requireWorkspaceReadAccess(userId, workspaceId);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return { workspace, access };
}

async function validateParentGroup(workspaceId: string, parentGroupId?: string | null) {
  if (!parentGroupId) return null;
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

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const { workspace, access } = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.academicGroup.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ parentGroupId: "asc" }, { code: "asc" }, { name: "asc" }],
      include: groupInclude
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, access, items: items.map(mapGroup) } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "GROUPS_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const { workspace } = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    const parentGroupId = await validateParentGroup(workspace.id, body.parentGroupId ?? null);

    const created = await prisma.academicGroup.create({
      data: {
        workspaceId: workspace.id,
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        yearLabel: body.yearLabel?.trim() || null,
        color: body.color ?? "#2563eb",
        parentGroupId
      },
      include: groupInclude
    });

    return NextResponse.json({ ok: true, data: mapGroup(created) }, { status: 201 });
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
    return NextResponse.json({ ok: false, message: "GROUP_CREATE_FAILED" }, { status: 500 });
  }
}
