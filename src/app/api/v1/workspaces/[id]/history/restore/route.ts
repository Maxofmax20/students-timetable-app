import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const schema = z.object({ entryId: z.string().cuid() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    await requireWorkspaceRole(session.userId, id, [WorkspaceRole.OWNER]);
    const body = schema.parse(await request.json());

    const entry = await prisma.workspaceAuditEntry.findFirst({ where: { id: body.entryId, workspaceId: id } });
    if (!entry || entry.actionType !== 'DELETE') throw new ApiError(400, 'RESTORE_NOT_SUPPORTED');
    const before = (entry.beforeJson || {}) as Record<string, any>;

    await prisma.$transaction(async (tx) => {
      if (entry.entityType === 'COURSE' && before.course) {
        const course = before.course;
        const exists = await tx.course.findFirst({ where: { workspaceId: id, code: course.code } });
        if (exists) throw new ApiError(409, 'COURSE_CODE_EXISTS');
        const created = await tx.course.create({ data: { workspaceId: id, code: course.code, title: course.title, status: course.status || 'ACTIVE', groupId: course.groupId || null, instructorId: course.instructorId || null, roomId: course.roomId || null, creditHours: course.creditHours ?? null, color: '#3b82f6' } });
        const sessions = Array.isArray(before.sessions) ? before.sessions : [];
        if (sessions.length) {
          await tx.sessionEntry.createMany({ data: sessions.map((s: any) => ({ workspaceId: id, courseId: created.id, type: s.type || 'LECTURE', day: s.day, startMinute: s.startMinute, endMinute: s.endMinute, groupId: s.groupId || null, instructorId: s.instructorId || null, roomId: s.roomId || null })) });
        }
      } else if (entry.entityType === 'ROOM' && before.code) {
        const exists = await tx.room.findFirst({ where: { workspaceId: id, code: before.code } });
        if (exists) throw new ApiError(409, 'ROOM_CODE_EXISTS');
        await tx.room.create({ data: { workspaceId: id, code: before.code, name: before.name || `Room ${before.code}`, buildingCode: before.buildingCode || null, roomNumber: before.roomNumber || null, capacity: before.capacity ?? null, color: '#22c55e' } });
      } else if (entry.entityType === 'INSTRUCTOR' && before.name) {
        await tx.instructor.create({ data: { workspaceId: id, name: before.name, email: before.email || null, phone: before.phone || null, color: before.color || '#0ea5e9' } });
      } else {
        throw new ApiError(400, 'RESTORE_NOT_SUPPORTED');
      }

      await writeWorkspaceAudit({ tx, workspaceId: id, actorUserId: session.userId, entityType: entry.entityType as any, entityId: entry.entityId, actionType: 'RESTORE_SUCCESS', summary: `Restored ${entry.entityType.toLowerCase()} from history`, metadata: { sourceEntryId: entry.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'RESTORE_FAILED' }, { status: 500 });
  }
}
