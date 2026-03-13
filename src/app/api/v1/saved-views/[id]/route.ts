import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession } from '@/lib/workspace-v1';

const updateSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  stateJson: z.record(z.string(), z.unknown()).optional()
}).refine((value) => value.name !== undefined || value.stateJson !== undefined, {
  message: 'Nothing to update'
});

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);
  const membership = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }]
    },
    select: { id: true }
  });
  if (!membership) throw new ApiError(403, 'FORBIDDEN');
  return membership;
}

async function findOwnedSavedView(id: string, userId: string, workspaceId: string) {
  return prisma.savedView.findFirst({
    where: { id, userId, workspaceId }
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    const existing = await findOwnedSavedView(id, session.userId, workspace.id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: 'SAVED_VIEW_NOT_FOUND' }, { status: 404 });
    }

    const updated = await prisma.savedView.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.stateJson !== undefined ? { stateJson: body.stateJson as Prisma.InputJsonValue } : {})
      }
    });

    return NextResponse.json({ ok: true, data: updated });
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
    return NextResponse.json({ ok: false, message: 'SAVED_VIEW_UPDATE_FAILED' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await context.params;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? undefined;
    const workspace = await resolveWorkspace(session.userId, workspaceId);

    const existing = await findOwnedSavedView(id, session.userId, workspace.id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: 'SAVED_VIEW_NOT_FOUND' }, { status: 404 });
    }

    await prisma.savedView.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'SAVED_VIEW_DELETE_FAILED' }, { status: 500 });
  }
}
