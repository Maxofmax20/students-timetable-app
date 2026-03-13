import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession } from "@/lib/workspace-v1";
import { requireWorkspaceOwnerAccess } from "@/lib/workspace-access";
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const updateSchema = z.object({
  role: z.enum([WorkspaceRole.TEACHER, WorkspaceRole.VIEWER, WorkspaceRole.STUDENT])
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const session = await requireSession(request);
    const { id, memberId } = await params;
    await requireWorkspaceOwnerAccess(session.userId, id);

    const body = updateSchema.parse(await request.json());
    const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId: id } });
    if (!member) throw new ApiError(404, "WORKSPACE_MEMBER_NOT_FOUND");
    if (member.role === WorkspaceRole.OWNER) throw new ApiError(400, "OWNER_ROLE_CHANGE_BLOCKED");

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.workspaceMember.update({
        where: { id: memberId },
        data: { role: body.role === WorkspaceRole.STUDENT ? WorkspaceRole.VIEWER : body.role },
        include: { user: { select: { id: true, email: true, name: true } } }
      });
      await writeWorkspaceAudit({ tx, workspaceId: id, actorUserId: session.userId, entityType: 'MEMBERSHIP', entityId: memberId, actionType: 'MEMBER_ROLE_CHANGED', summary: `Changed role for ${item.user.email}`, before: { role: member.role }, after: { role: item.role, targetUserId: item.userId } });
      return item;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message || "INVALID_INPUT" }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_MEMBER_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const session = await requireSession(request);
    const { id, memberId } = await params;
    await requireWorkspaceOwnerAccess(session.userId, id);

    const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId: id } });
    if (!member) throw new ApiError(404, "WORKSPACE_MEMBER_NOT_FOUND");
    if (member.role === WorkspaceRole.OWNER) throw new ApiError(400, "OWNER_REMOVE_BLOCKED");

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({ where: { id: memberId } });
      await writeWorkspaceAudit({ tx, workspaceId: id, actorUserId: session.userId, entityType: 'MEMBERSHIP', entityId: memberId, actionType: 'MEMBER_REMOVED', summary: `Removed member ${member.userId}`, before: { targetUserId: member.userId, role: member.role } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACE_MEMBER_REMOVE_FAILED" }, { status: 500 });
  }
}
