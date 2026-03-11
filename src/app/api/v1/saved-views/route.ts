import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole, SavedViewSurface } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';

const querySchema = z.object({
  workspaceId: z.string().cuid().optional(),
  surface: z.nativeEnum(SavedViewSurface).optional()
});

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  surface: z.nativeEnum(SavedViewSurface),
  name: z.string().trim().min(1).max(80),
  stateJson: z.record(z.string(), z.unknown())
});

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);

  await requireWorkspaceRole(userId, workspaceId, [
    WorkspaceRole.OWNER,
    WorkspaceRole.TEACHER,
    WorkspaceRole.STUDENT,
    WorkspaceRole.VIEWER
  ]);

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
  return workspace;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const parsed = querySchema.parse({
      workspaceId: request.nextUrl.searchParams.get('workspaceId') ?? undefined,
      surface: request.nextUrl.searchParams.get('surface') ?? undefined
    });
    const workspace = await resolveWorkspace(session.userId, parsed.workspaceId);

    const items = await prisma.savedView.findMany({
      where: {
        userId: session.userId,
        workspaceId: workspace.id,
        ...(parsed.surface ? { surface: parsed.surface } : {})
      },
      orderBy: [{ updatedAt: 'desc' }]
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, items } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message || 'INVALID_QUERY' }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'SAVED_VIEWS_FETCH_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    const created = await prisma.savedView.create({
      data: {
        userId: session.userId,
        workspaceId: workspace.id,
        surface: body.surface,
        name: body.name,
        stateJson: body.stateJson as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message || 'INVALID_PAYLOAD' }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'SAVED_VIEW_NAME_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'SAVED_VIEW_CREATE_FAILED' }, { status: 500 });
  }
}
