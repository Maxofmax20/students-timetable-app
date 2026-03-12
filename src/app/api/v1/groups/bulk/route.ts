import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const schema = z.object({ action: z.literal('delete'), ids: z.array(z.string().cuid()).min(1).max(500) });

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const rows = await prisma.academicGroup.findMany({ where: { id: { in: body.ids } }, include: { _count: { select: { childGroups: true } } } });
    if (!rows.length) throw new ApiError(404, 'GROUP_NOT_FOUND');
    const workspaceId = rows[0].workspaceId;
    if (rows.some((r) => r.workspaceId !== workspaceId)) throw new ApiError(400, 'CROSS_WORKSPACE_IDS_NOT_ALLOWED');
    await requireWorkspaceRole(session.userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const foundIds = new Set(rows.map((r) => r.id));
    const missing = body.ids.filter((id) => !foundIds.has(id));
    const successIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const row of rows) {
      if (row._count.childGroups > 0) {
        failed.push({ id: row.id, reason: 'GROUP_HAS_CHILDREN' });
        continue;
      }
      try {
        await prisma.$transaction(async (tx) => {
          await tx.academicGroup.delete({ where: { id: row.id } });
          await writeWorkspaceAudit({ tx, workspaceId, actorUserId: session.userId, entityType: 'GROUP', entityId: row.id, actionType: 'DELETE', summary: `Bulk deleted group ${row.code}`, before: { code: row.code, name: row.name, parentGroupId: row.parentGroupId } });
        });
        successIds.push(row.id);
      } catch (error) {
        failed.push({ id: row.id, reason: error instanceof Error ? error.message : 'FAILED' });
      }
    }

    for (const id of missing) failed.push({ id, reason: 'NOT_FOUND' });
    return NextResponse.json({ ok: failed.length === 0, action: 'delete', requested: body.ids.length, successCount: successIds.length, successIds, failed });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'GROUP_BULK_FAILED' }, { status: 500 });
  }
}
