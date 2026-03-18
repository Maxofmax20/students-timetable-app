import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession } from '@/lib/workspace-v1';
import { requireWorkspaceReadAccess } from '@/lib/workspace-access';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  theme: z.enum(['SYSTEM', 'LIGHT', 'DARK']).optional(),
  timetableView: z.enum(['WEEK', 'DAY', 'AGENDA']).optional(),
  dashboardLayout: z.enum(['OVERVIEW', 'FOCUS', 'COMPACT']).optional(),
  weekStartsOn: z.enum(['SATURDAY', 'SUNDAY', 'MONDAY']).optional(),
  reduceMotion: z.boolean().optional()
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

    const item = await prisma.userPreference.upsert({
      where: { userId_workspaceId: { userId: session.userId, workspaceId: workspace.id } },
      create: { userId: session.userId, workspaceId: workspace.id },
      update: {}
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, access, item } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'PREFERENCES_FETCH_FAILED' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const { workspace } = await resolveWorkspace(session.userId, body.workspaceId);

    const item = await prisma.userPreference.upsert({
      where: { userId_workspaceId: { userId: session.userId, workspaceId: workspace.id } },
      create: {
        userId: session.userId,
        workspaceId: workspace.id,
        theme: body.theme ?? 'SYSTEM',
        timetableView: body.timetableView ?? 'WEEK',
        dashboardLayout: body.dashboardLayout ?? 'OVERVIEW',
        weekStartsOn: body.weekStartsOn ?? 'SATURDAY',
        reduceMotion: body.reduceMotion ?? false
      },
      update: {
        ...(body.theme ? { theme: body.theme } : {}),
        ...(body.timetableView ? { timetableView: body.timetableView } : {}),
        ...(body.dashboardLayout ? { dashboardLayout: body.dashboardLayout } : {}),
        ...(body.weekStartsOn ? { weekStartsOn: body.weekStartsOn } : {}),
        ...(typeof body.reduceMotion === 'boolean' ? { reduceMotion: body.reduceMotion } : {})
      }
    });

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: 'PREFERENCES_UPDATE_FAILED' }, { status: 500 });
  }
}
