import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { buildImportSummary, getCsvValue, parseCsvText, parseOptionalPositiveInt, type ImportPreviewItem, type ImportPreviewPayload } from '@/lib/bulk-import';
import { formatRoomLevel, normalizeRoomFields, roomDisplaySummary } from '@/lib/group-room-model';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  csv: z.string().min(1),
  mode: z.enum(['preview', 'import']).default('preview')
});

type PreparedRoom = {
  code: string;
  name: string;
  capacity: number | null;
  building: string | null;
  buildingCode: string | null;
  roomNumber: string | null;
  level: number | null;
};

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

function prepareRoom(record: Record<string, string>) {
  const code = getCsvValue(record, ['code', 'roomCode', 'fullCode']);
  const buildingCode = getCsvValue(record, ['buildingCode', 'building', 'buildingLetter']);
  const roomNumber = getCsvValue(record, ['roomNumber', 'number']);
  const building = getCsvValue(record, ['buildingName', 'buildingTitle']);
  const name = getCsvValue(record, ['name', 'roomName', 'title']);
  const capacityValue = getCsvValue(record, ['capacity', 'seats']);

  const normalized = normalizeRoomFields({
    code,
    buildingCode,
    roomNumber
  });

  if (!normalized.code || !normalized.buildingCode || !normalized.roomNumber) {
    throw new ApiError(400, 'ROOM_STRUCTURE_INVALID');
  }

  const parsedCapacity = parseOptionalPositiveInt(capacityValue, 2000, 'ROOM_CAPACITY_INVALID');
  const displayName = name.trim() || `Room ${normalized.code}`;

  return {
    code: normalized.code,
    name: displayName,
    capacity: parsedCapacity,
    building: building.trim() || null,
    buildingCode: normalized.buildingCode,
    roomNumber: normalized.roomNumber,
    level: normalized.level
  } satisfies PreparedRoom;
}

function buildLabel(room: PreparedRoom) {
  return `${room.code} — ${room.name}`;
}

function buildDetail(room: PreparedRoom) {
  return `${roomDisplaySummary(room)} • ${room.capacity ? `${room.capacity} seats` : 'Capacity not set'} • ${formatRoomLevel(room.level)}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const parsed = parseCsvText(body.csv);
    const existingRooms = await prisma.room.findMany({
      where: { workspaceId: workspace.id },
      select: { code: true }
    });

    const existingCodes = new Set(existingRooms.map((room) => room.code.toUpperCase()));
    const seenCodes = new Set<string>();
    const items: ImportPreviewItem[] = [];
    const readyRooms: PreparedRoom[] = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      try {
        const room = prepareRoom(record);
        const normalizedCode = room.code.toUpperCase();

        if (existingCodes.has(normalizedCode)) {
          items.push({
            key: `${normalizedCode}-${sourceRow}`,
            status: 'duplicate',
            label: buildLabel(room),
            detail: buildDetail(room),
            sourceRows: [sourceRow],
            messages: ['Room code already exists in this workspace. Imports are create-only and will skip it.']
          });
          return;
        }

        if (seenCodes.has(normalizedCode)) {
          items.push({
            key: `${normalizedCode}-${sourceRow}`,
            status: 'duplicate',
            label: buildLabel(room),
            detail: buildDetail(room),
            sourceRows: [sourceRow],
            messages: ['Room code is duplicated inside this CSV file. Keep only one row per room.']
          });
          return;
        }

        seenCodes.add(normalizedCode);
        readyRooms.push(room);
        items.push({
          key: `${normalizedCode}-${sourceRow}`,
          status: body.mode === 'import' ? 'imported' : 'ready',
          label: buildLabel(room),
          detail: buildDetail(room),
          sourceRows: [sourceRow],
          messages: room.name === `Room ${room.code}` ? ['Room name was not provided, so the import will use a safe default name.'] : undefined
        });
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'ROOM_IMPORT_ROW_INVALID';
        items.push({
          key: `invalid-room-${sourceRow}`,
          status: 'invalid',
          label: `CSV row ${sourceRow}`,
          sourceRows: [sourceRow],
          messages: [message]
        });
      }
    });

    if (body.mode === 'import' && readyRooms.length) {
      await prisma.$transaction(async (tx) => {
        await tx.room.createMany({
          data: readyRooms.map((room) => ({
            workspaceId: workspace.id,
            ...room,
            color: '#22c55e'
          }))
        });
      });
    }

    const payload: ImportPreviewPayload = {
      entity: 'rooms',
      mode: body.mode,
      summary: buildImportSummary(items, parsed.rows.length, body.mode),
      items
    };

    return NextResponse.json({ ok: true, data: payload });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'ROOM_CODE_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'ROOM_IMPORT_FAILED' }, { status: 500 });
  }
}
