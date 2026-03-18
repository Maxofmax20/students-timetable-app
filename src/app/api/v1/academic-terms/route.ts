import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';
import { planningTermInclude } from '@/lib/planning';

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  season: z.enum(['SPRING', 'SUMMER', 'FALL', 'WINTER']),
  academicYear: z.string().min(4).max(24),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional()
});

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) {
    const workspace = await getOrCreatePersonalWorkspace(userId);
    const access = await requireWorkspaceReadAccess(userId, workspace.id);
    return { workspace, access };
  }

  const access = await requireWorkspaceReadAccess(userId, workspaceId);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
  return { workspace, access };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? undefined;
    const { workspace, access } = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.academicTerm.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'asc' }, { createdAt: 'asc' }],
      include: planningTermInclude
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, access, items } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'ACADEMIC_TERMS_FETCH_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const { workspace } = await resolveWorkspace(session.userId, body.workspaceId);
    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const created = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.academicTerm.updateMany({ where: { workspaceId: workspace.id, isActive: true }, data: { isActive: false } });
      }

      return tx.academicTerm.create({
        data: {
          workspaceId: workspace.id,
          userId: session.userId,
          name: body.name.trim(),
          season: body.season,
          academicYear: body.academicYear.trim(),
          startsAt: body.startsAt ? new Date(body.startsAt) : null,
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          isActive: body.isActive ?? false
        },
        include: planningTermInclude
      });
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'ACADEMIC_TERM_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'ACADEMIC_TERM_CREATE_FAILED' }, { status: 500 });
  }
}
