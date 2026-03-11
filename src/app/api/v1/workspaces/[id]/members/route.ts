import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession } from "@/lib/workspace-v1";
import { requireWorkspaceOwnerAccess } from "@/lib/workspace-access";

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([WorkspaceRole.TEACHER, WorkspaceRole.VIEWER, WorkspaceRole.STUDENT]).default(WorkspaceRole.VIEWER)
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    await requireWorkspaceOwnerAccess(session.userId, id);

    const workspace = await prisma.workspace.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!workspace) return NextResponse.json({ ok: false, message: "WORKSPACE_NOT_FOUND" }, { status: 404 });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    return NextResponse.json({ ok: true, data: { items: members, ownerId: workspace.ownerId } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_MEMBERS_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    await requireWorkspaceOwnerAccess(session.userId, id);

    const body = addMemberSchema.parse(await request.json());
    const normalizedEmail = body.email.trim().toLowerCase();

    const workspace = await prisma.workspace.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, email: true, name: true } });
    if (!user) throw new ApiError(404, "USER_NOT_FOUND_BY_EMAIL");

    if (user.id === workspace.ownerId) {
      throw new ApiError(409, "USER_ALREADY_WORKSPACE_OWNER");
    }

    const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: id, userId: user.id } } });
    if (existing) throw new ApiError(409, "USER_ALREADY_WORKSPACE_MEMBER");

    const created = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: user.id,
        role: body.role === WorkspaceRole.STUDENT ? WorkspaceRole.VIEWER : body.role
      },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message || "INVALID_INPUT" }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_MEMBER_ADD_FAILED" }, { status: 500 });
  }
}
