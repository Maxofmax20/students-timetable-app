import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession } from "@/lib/workspace-v1";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  locale: z.string().min(2).max(8).optional(),
  weekStart: z.enum(["SATURDAY", "SUNDAY", "MONDAY"]).optional(),
  timeFormat: z.enum(["H12", "H24", "BOTH"]).optional(),
  conflictMode: z.enum(["WARNING", "STRICT", "OFF"]).optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const owned = await prisma.workspace.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { courses: true, sessions: true, groups: true } }
      }
    });

    const member = await prisma.workspaceMember.findMany({
      where: { userId: session.userId },
      include: {
        workspace: {
          include: {
            _count: { select: { courses: true, sessions: true, groups: true } }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const memberWorkspaces = member
      .map((item) => ({ ...item.workspace, role: item.role }))
      .filter((item) => item.ownerId !== session.userId);

    return NextResponse.json({
      ok: true,
      data: {
        owned,
        member: memberWorkspaces
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "WORKSPACES_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());

    const created = await prisma.workspace.create({
      data: {
        ownerId: session.userId,
        title: body.title,
        locale: body.locale ?? "en",
        weekStart: body.weekStart ?? "SATURDAY",
        timeFormat: body.timeFormat ?? "BOTH",
        conflictMode: body.conflictMode ?? "WARNING",
        members: {
          create: {
            userId: session.userId,
            role: WorkspaceRole.OWNER
          }
        }
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
    return NextResponse.json({ ok: false, message: "WORKSPACE_CREATE_FAILED" }, { status: 500 });
  }
}
