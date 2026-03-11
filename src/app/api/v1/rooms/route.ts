import { NextRequest, NextResponse } from "next/server";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  getOrCreatePersonalWorkspace,
  requireSession,
  requireWorkspaceRole
} from "@/lib/workspace-v1";
import { requireWorkspaceReadAccess } from "@/lib/workspace-access";
import { normalizeRoomFields } from "@/lib/group-room-model";

const createSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120),
  capacity: z.number().int().positive().max(2000).nullable().optional(),
  building: z.string().max(80).nullable().optional(),
  buildingCode: z.string().max(16).nullable().optional(),
  roomNumber: z.string().max(16).nullable().optional(),
  color: z.string().max(32).optional()
});

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) {
    const workspace = await getOrCreatePersonalWorkspace(userId);
    const access = await requireWorkspaceReadAccess(userId, workspace.id);
    return { workspace, access };
  }

  const access = await requireWorkspaceReadAccess(userId, workspaceId);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND");
  return { workspace, access };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const { workspace, access } = await resolveWorkspace(session.userId, workspaceId);

    const items = await prisma.room.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ buildingCode: "asc" }, { roomNumber: "asc" }, { code: "asc" }, { name: "asc" }]
    });

    return NextResponse.json({ ok: true, data: { workspaceId: workspace.id, access, items } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "ROOMS_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = createSchema.parse(await request.json());
    const { workspace } = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const normalized = normalizeRoomFields({
      code: body.code,
      buildingCode: body.buildingCode,
      roomNumber: body.roomNumber
    });

    if (!normalized.code) throw new ApiError(400, "ROOM_CODE_REQUIRED");

    const created = await prisma.room.create({
      data: {
        workspaceId: workspace.id,
        code: normalized.code,
        name: body.name.trim(),
        capacity: body.capacity ?? null,
        building: body.building?.trim() || null,
        buildingCode: normalized.buildingCode,
        roomNumber: normalized.roomNumber,
        level: normalized.level,
        color: body.color ?? "#22c55e"
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, message: "ROOM_CODE_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "ROOM_CREATE_FAILED" }, { status: 500 });
  }
}
