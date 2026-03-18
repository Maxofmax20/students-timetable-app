import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';
import { planningAssignmentInclude } from '@/lib/planning';

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  academicTermId: z.string().cuid(),
  courseId: z.string().cuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  estimatedMinutes: z.number().int().positive().max(1440).optional().nullable()
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

async function validateRelations(workspaceId: string, academicTermId: string, courseId: string) {
  const [term, course] = await Promise.all([
    prisma.academicTerm.findFirst({ where: { id: academicTermId, workspaceId }, select: { id: true } }),
    prisma.course.findFirst({ where: { id: courseId, workspaceId }, select: { id: true } })
  ]);
  if (!term) throw new ApiError(400, 'INVALID_ACADEMIC_TERM');
  if (!course) throw new ApiError(400, 'INVALID_COURSE');
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? undefined;
    const { workspace, access } = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.assignment.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: planningAssignmentInclude
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, access, items } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'ASSIGNMENTS_FETCH_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const { workspace } = await resolveWorkspace(session.userId, body.workspaceId);
    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);
    await validateRelations(workspace.id, body.academicTermId, body.courseId);

    const created = await prisma.assignment.create({
      data: {
        workspaceId: workspace.id,
        academicTermId: body.academicTermId,
        courseId: body.courseId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        priority: body.priority ?? 'MEDIUM',
        status: body.status ?? 'TODO',
        estimatedMinutes: body.estimatedMinutes ?? null
      },
      include: planningAssignmentInclude
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'ASSIGNMENT_CREATE_FAILED' }, { status: 500 });
  }
}
