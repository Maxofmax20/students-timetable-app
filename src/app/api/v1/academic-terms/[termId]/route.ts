import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';

const updateSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(2).max(120).optional(),
  season: z.enum(['SPRING', 'SUMMER', 'FALL', 'WINTER']).optional(),
  academicYear: z.string().min(4).max(24).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ termId: string }> }) {
  try {
    const session = await requireSession(request);
    const { termId } = await params;
    const body = updateSchema.parse(await request.json());

    const access = await requireWorkspaceReadAccess(session.userId, body.workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, body.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.academicTerm.findFirst({ where: { id: termId, workspaceId: body.workspaceId } });
    if (!existing) throw new ApiError(404, 'ACADEMIC_TERM_NOT_FOUND');

    const item = await prisma.$transaction(async (tx) => {
      if (body.isActive === true) {
        await tx.academicTerm.updateMany({ where: { workspaceId: body.workspaceId, isActive: true }, data: { isActive: false } });
      }
      return tx.academicTerm.update({
        where: { id: termId },
        data: {
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.season ? { season: body.season } : {}),
          ...(body.academicYear ? { academicYear: body.academicYear.trim() } : {}),
          ...(body.startsAt !== undefined ? { startsAt: body.startsAt ? new Date(body.startsAt) : null } : {}),
          ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
          ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {})
        },
        include: { _count: { select: { exams: true, assignments: true } } }
      });
    });

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'ACADEMIC_TERM_UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ termId: string }> }) {
  try {
    const session = await requireSession(request);
    const { termId } = await params;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ApiError(400, 'WORKSPACE_ID_REQUIRED');

    const access = await requireWorkspaceReadAccess(session.userId, workspaceId);
    if (!access.canWrite) throw new ApiError(403, 'FORBIDDEN');
    await requireWorkspaceRole(session.userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const existing = await prisma.academicTerm.findFirst({ where: { id: termId, workspaceId } });
    if (!existing) throw new ApiError(404, 'ACADEMIC_TERM_NOT_FOUND');

    await prisma.academicTerm.delete({ where: { id: termId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'ACADEMIC_TERM_DELETE_FAILED' }, { status: 500 });
  }
}
