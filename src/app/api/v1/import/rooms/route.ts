import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { buildImportSummary, getCsvValue, parseCsvText, parseOptionalPositiveInt, type ImportPreviewItem, type ImportPreviewPayload } from '@/lib/bulk-import';
import { formatRoomLevel, normalizeRoomFields, roomDisplaySummary } from '@/lib/group-room-model';
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  csv: z.string().min(1),
  mode: z.enum(['preview', 'import']).default('preview'),
  importMode: z.enum(['create_only', 'update_existing', 'create_update']).default('create_only')
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
  await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER, WorkspaceRole.STUDENT, WorkspaceRole.VIEWER]);
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

  const normalized = normalizeRoomFields({ code, buildingCode, roomNumber });
  if (!normalized.code || !normalized.buildingCode || !normalized.roomNumber) throw new ApiError(400, 'ROOM_STRUCTURE_INVALID');

  return {
    code: normalized.code,
    name: name.trim() || `Room ${normalized.code}`,
    capacity: parseOptionalPositiveInt(capacityValue, 2000, 'ROOM_CAPACITY_INVALID'),
    building: building.trim() || null,
    buildingCode: normalized.buildingCode,
    roomNumber: normalized.roomNumber,
    level: normalized.level
  } satisfies PreparedRoom;
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
    const existingRooms = await prisma.room.findMany({ where: { workspaceId: workspace.id } });
    const existingByCode = new Map(existingRooms.map((room) => [room.code.toUpperCase(), room]));

    const seenCodes = new Set<string>();
    const items: ImportPreviewItem[] = [];
    const createRows: PreparedRoom[] = [];
    const updateRows: Array<{ id: string; patch: Partial<PreparedRoom>; code: string; sourceRow: number }> = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      try {
        const room = prepareRoom(record);
        const code = room.code.toUpperCase();
        if (seenCodes.has(code)) {
          items.push({ key: `${code}-${sourceRow}`, status: 'duplicate', label: `${room.code} — ${room.name}`, detail: buildDetail(room), sourceRows: [sourceRow], messages: ['Room code is duplicated inside this CSV file. Keep only one row per room.'] });
          return;
        }
        seenCodes.add(code);

        const existing = existingByCode.get(code);
        if (!existing) {
          if (body.importMode === 'update_existing') {
            items.push({
              key: `${code}-${sourceRow}`,
              status: 'skipped',
              label: `${room.code} — ${room.name}`,
              detail: buildDetail(room),
              sourceRows: [sourceRow],
              messages: ['Row is valid but skipped because mode is update-existing only and this room does not exist yet.']
            });
            return;
          }

          createRows.push(room);
          items.push({ key: `${code}-${sourceRow}`, status: body.mode === 'import' ? 'created' : 'ready_create', label: `${room.code} — ${room.name}`, detail: buildDetail(room), sourceRows: [sourceRow] });
          return;
        }

        if (body.importMode === 'create_only') {
          items.push({ key: `${code}-${sourceRow}`, status: 'duplicate_skipped', label: `${room.code} — ${room.name}`, detail: buildDetail(room), sourceRows: [sourceRow], messages: ['Room exists. Create-only mode skips existing rows.'] });
          return;
        }

        const patch: Partial<PreparedRoom> = {};
        if ((!existing.name || existing.name.trim() === '' || existing.name.trim().toLowerCase() === `room ${code}`.toLowerCase()) && room.name) patch.name = room.name;
        if (!existing.building && room.building) patch.building = room.building;
        if (existing.capacity == null && room.capacity != null) patch.capacity = room.capacity;
        if (!existing.buildingCode && room.buildingCode) patch.buildingCode = room.buildingCode;
        if (!existing.roomNumber && room.roomNumber) patch.roomNumber = room.roomNumber;
        if (existing.level == null && room.level != null) patch.level = room.level;

        if (!Object.keys(patch).length) {
          items.push({ key: `${code}-${sourceRow}`, status: 'duplicate_skipped', label: `${room.code} — ${room.name}`, detail: buildDetail(room), sourceRows: [sourceRow], messages: ['No safe gap-filling changes found for this existing room.'] });
          return;
        }

        updateRows.push({ id: existing.id, patch, code, sourceRow });
        items.push({ key: `${code}-${sourceRow}`, status: body.mode === 'import' ? 'updated' : 'ready_update', label: `${room.code} — ${room.name}`, detail: buildDetail(room), sourceRows: [sourceRow], messages: ['Safe upgrade will fill missing fields only.'] });
      } catch (error) {
        items.push({ key: `invalid-room-${sourceRow}`, status: 'invalid', label: `CSV row ${sourceRow}`, sourceRows: [sourceRow], messages: [error instanceof ApiError ? error.message : 'ROOM_IMPORT_ROW_INVALID'] });
      }
    });

    if (body.mode === 'import') {
      await prisma.$transaction(async (tx) => {
        if (createRows.length) {
          await tx.room.createMany({ data: createRows.map((room) => ({ workspaceId: workspace.id, ...room, color: '#22c55e' })) });
        }
        for (const row of updateRows) {
          await tx.room.update({ where: { id: row.id }, data: row.patch });
        }
      });
    }

    const payload: ImportPreviewPayload = {
      entity: 'rooms',
      mode: body.mode,
      importMode: body.importMode,
      summary: buildImportSummary(items, parsed.rows.length, body.mode),
      items
    };

    if (body.mode === 'import') {
      await writeWorkspaceAudit({ workspaceId: workspace.id, actorUserId: session.userId, entityType: 'IMPORT', actionType: 'IMPORT_APPLIED', summary: `Applied rooms import (${body.importMode})`, metadata: { entity: 'rooms', importMode: body.importMode, summary: payload.summary } });
    }

    return NextResponse.json({ ok: true, data: payload });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ ok: false, message: 'ROOM_CODE_EXISTS' }, { status: 409 });
    return NextResponse.json({ ok: false, message: 'ROOM_IMPORT_FAILED' }, { status: 500 });
  }
}
