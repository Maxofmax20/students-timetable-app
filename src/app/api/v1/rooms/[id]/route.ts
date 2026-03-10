import { NextRequest, NextResponse } from "next/server";
import { Prisma, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, requireSession, requireWorkspaceRole } from "@/lib/workspace-v1";
import { normalizeRoomFields } from "@/lib/group-room-model";

const patchSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120).optional(),
  capacity: z.number().int().positive().max(2000).nullable().optional(),
  building: z.string().max(80).nullable().optional(),
  buildingCode: z.string().max(16).nullable().optional(),
  roomNumber: z.string().max(16).nullable().optional(),
  color: z.string().max(32).nullable().optional()
});

async function getRoomOrThrow(id: string) {
  const item = await prisma.room.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, "ROOM_NOT_FOUND");
  return item;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const current = await getRoomOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const normalized = normalizeRoomFields({
      code: body.code ?? current.code,
      buildingCode: body.buildingCode === undefined ? current.buildingCode : body.buildingCode,
      roomNumber: body.roomNumber === undefined ? current.roomNumber : body.roomNumber,
      level: current.level
    });

    const updated = await prisma.room.update({
      where: { id },
      data: {
        code: normalized.code || undefined,
        name: body.name?.trim(),
        capacity: body.capacity,
        building: body.building === undefined ? undefined : body.building?.trim() || null,
        buildingCode: normalized.buildingCode,
        roomNumber: normalized.roomNumber,
        level: normalized.level,
        color: body.color
      }
    });

    return NextResponse.json({ ok: true, data: updated });
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
    return NextResponse.json({ ok: false, message: "ROOM_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(request);
    const { id } = await params;

    const current = await getRoomOrThrow(id);
    await requireWorkspaceRole(session.userId, current.workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "ROOM_DELETE_FAILED" }, { status: 500 });
  }
}
