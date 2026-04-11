import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { WorkspaceRole } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    await requireWorkspaceRole(session.userId, id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.TEACHER
    ]);

    // Use a transaction to clear everything related to the workspace's schedule
    await prisma.$transaction([
      // Delete all sessions
      prisma.sessionEntry.deleteMany({
        where: { workspaceId: id }
      }),
      // Delete all courses (which might have cascaded sessions anyway)
      prisma.course.deleteMany({
        where: { workspaceId: id }
      }),
      // Also clear the builder snapshot audit logs to be thorough
      prisma.auditLog.deleteMany({
        where: { 
          timetableId: id,
          action: 'BUILDER_SNAPSHOT_SAVE'
        }
      })
    ]);

    return NextResponse.json({ ok: true, message: 'WORKSPACE_CLEARED' });
  } catch (error) {
    console.error('[WorkspaceClear] Error:', error);
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
