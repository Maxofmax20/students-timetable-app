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

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const workspace = await resolveWorkspace(session.userId, workspaceId);

    const [items, courseCounts, sessionCounts] = await Promise.all([
      prisma.instructor.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { name: "asc" }
      }),
      prisma.course.groupBy({
        by: ["instructorId"],
        where: { workspaceId: workspace.id, instructorId: { not: null } },
        _count: { _all: true }
      }),
      prisma.sessionEntry.groupBy({
        by: ["instructorId"],
        where: { workspaceId: workspace.id, instructorId: { not: null } },
        _count: { _all: true }
      })
    ]);

    const courseCountMap = new Map(courseCounts.map((entry) => [entry.instructorId, entry._count._all]));
    const sessionCountMap = new Map(sessionCounts.map((entry) => [entry.instructorId, entry._count._all]));

    const enriched = items.map((item) => ({
      ...item,
      courseCount: courseCountMap.get(item.id) || 0,
      sessionCount: sessionCountMap.get(item.id) || 0,
      assignmentStatus: (sessionCountMap.get(item.id) || 0) > 0 || (courseCountMap.get(item.id) || 0) > 0 ? 'assigned' : 'unassigned'
    }));

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, items: enriched } });
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

    const normalizedEmail = normalizeEmail(body.email);
    if (normalizedEmail) {
      const exists = await prisma.instructor.findFirst({
        where: { workspaceId: workspace.id, email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true }
      });
      if (exists) {
        throw new ApiError(409, 'INSTRUCTOR_EMAIL_EXISTS');
      }
    }

    const created = await prisma.instructor.create({
      data: {
        workspaceId: workspace.id,
        name: body.name.trim(),
        email: normalizedEmail,
        phone: body.phone?.trim() || null,
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
