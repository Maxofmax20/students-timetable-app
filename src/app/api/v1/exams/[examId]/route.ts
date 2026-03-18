import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';
import { parseMinuteLabel } from '@/lib/planning';

const updateSchema = z.object({
  workspaceId: z.string().cuid(),
  title: z.string().min(2).max(160).optional(),
  examType: z.enum(['QUIZ', 'MIDTERM', 'FINAL', 'PRACTICAL', 'ORAL', 'OTHER']).optional(),
  examDate: z.string().datetime().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  courseId: z.string().cuid().optional(),
  academicTermId: z.string().cuid().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const session = await requireSession(request);
    const { examId } = await params;
    const body = updateSchema.parse(await request.json());

    const access = await requireWorkspaceReadAccess(session.userId, body.workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, body.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.exam.findFirst({ where: { id: examId, workspaceId: body.workspaceId } });
    if (!existing) throw new ApiError(404, 'EXAM_NOT_FOUND');

    const startMinute = body.startTime !== undefined ? parseMinuteLabel(body.startTime) : undefined;
    const endMinute = body.endTime !== undefined ? parseMinuteLabel(body.endTime) : undefined;
    if (startMinute != null && endMinute != null && endMinute <= startMinute) throw new ApiError(400, 'INVALID_EXAM_TIME');

    const item = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.examType ? { examType: body.examType } : {}),
        ...(body.examDate ? { examDate: new Date(body.examDate) } : {}),
        ...(body.startTime !== undefined ? { startMinute: startMinute ?? null } : {}),
        ...(body.endTime !== undefined ? { endMinute: endMinute ?? null } : {}),
        ...(body.location !== undefined ? { location: body.location?.trim() || null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
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
    return NextResponse.json({ ok: false, message: 'EXAM_UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const session = await requireSession(request);
    const { examId } = await params;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ApiError(400, 'WORKSPACE_ID_REQUIRED');

    const access = await requireWorkspaceReadAccess(session.userId, workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.exam.findFirst({ where: { id: examId, workspaceId } });
    if (!existing) throw new ApiError(404, 'EXAM_NOT_FOUND');

    await prisma.exam.delete({ where: { id: examId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'EXAM_DELETE_FAILED' }, { status: 500 });
  }
}
