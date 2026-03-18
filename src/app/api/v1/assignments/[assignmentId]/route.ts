import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';

const updateSchema = z.object({
  workspaceId: z.string().cuid(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(1000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  estimatedMinutes: z.number().int().positive().max(1440).nullable().optional(),
  courseId: z.string().cuid().optional(),
  academicTermId: z.string().cuid().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const session = await requireSession(request);
    const { assignmentId } = await params;
    const body = updateSchema.parse(await request.json());

    const access = await requireWorkspaceReadAccess(session.userId, body.workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, body.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.assignment.findFirst({ where: { id: assignmentId, workspaceId: body.workspaceId } });
    if (!existing) throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND');

    const item = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.estimatedMinutes !== undefined ? { estimatedMinutes: body.estimatedMinutes } : {}),
        ...(body.courseId ? { courseId: body.courseId } : {}),
        ...(body.academicTermId ? { academicTermId: body.academicTermId } : {})
      },
      include: {
        course: { select: { id: true, code: true, title: true, color: true } },
        academicTerm: { select: { id: true, name: true, season: true, academicYear: true, isActive: true } }
      }
    });

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'ASSIGNMENT_UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const session = await requireSession(request);
    const { assignmentId } = await params;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ApiError(400, 'WORKSPACE_ID_REQUIRED');

    const access = await requireWorkspaceReadAccess(session.userId, workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.assignment.findFirst({ where: { id: assignmentId, workspaceId } });
    if (!existing) throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND');

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'ASSIGNMENT_DELETE_FAILED' }, { status: 500 });
  }
}
