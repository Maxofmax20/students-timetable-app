import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const role = await requireWorkspaceRole(session.userId, id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 100), 200);
    const cursor = request.nextUrl.searchParams.get('cursor') || undefined;

    const where: Record<string, unknown> = { workspaceId: id };
    if (role !== WorkspaceRole.OWNER) {
      where.entityType = { in: ['COURSE', 'GROUP', 'ROOM', 'INSTRUCTOR', 'IMPORT'] };
    }

    const entries = await prisma.workspaceAuditEntry.findMany({
      where,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    const userIds = [...new Set(entries.map((e) => e.actorUserId).filter(Boolean) as string[])];
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = entries.map((entry) => ({
      ...entry,
      actor: entry.actorUserId ? userMap.get(entry.actorUserId) || null : null,
      canRestore: role === WorkspaceRole.OWNER && Boolean((entry.metadataJson as Record<string, unknown> | null)?.restorable) && entry.actionType === 'DELETE'
    }));

    return NextResponse.json({ ok: true, data: { items: data, nextCursor: entries.length === limit ? entries[entries.length - 1].id : null, role } });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'HISTORY_FETCH_FAILED' }, { status: 500 });
  }
}
