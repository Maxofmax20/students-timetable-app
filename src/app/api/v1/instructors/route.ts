import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  getOrCreatePersonalWorkspace,
  requireSession,
  requireWorkspaceRole
} from "@/lib/workspace-v1";

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  color: z.string().max(32).optional()
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
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return workspace;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const workspace = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.instructor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, items } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "INSTRUCTORS_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const created = await prisma.instructor.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        email: body.email || null,
        phone: body.phone ?? null,
        color: body.color ?? "#0ea5e9"
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "INSTRUCTOR_CREATE_FAILED" }, { status: 500 });
  }
}
