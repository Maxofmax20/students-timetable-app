import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { buildImportSummary, getCsvValue, parseCsvText, type ImportPreviewItem, type ImportPreviewPayload } from '@/lib/bulk-import';
import { inferParentGroupCode, normalizeGroupCode } from '@/lib/group-room-model';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  csv: z.string().min(1),
  mode: z.enum(['preview', 'import']).default('preview'),
  importMode: z.enum(['create_only', 'update_existing', 'create_update']).default('create_only')
});

type PreparedGroup = { code: string; name: string; parentCode: string | null };

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);
  await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER, WorkspaceRole.STUDENT, WorkspaceRole.VIEWER]);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
  return workspace;
}

function prepareGroup(record: Record<string, string>) {
  const code = normalizeGroupCode(getCsvValue(record, ['code', 'groupCode']));
  const explicitParent = normalizeGroupCode(getCsvValue(record, ['parentCode', 'mainGroupCode', 'parentGroupCode']));
  if (!code) throw new ApiError(400, 'GROUP_CODE_REQUIRED');
  const parentCode = explicitParent || inferParentGroupCode(code) || null;
  const name = getCsvValue(record, ['name', 'groupName']) || (parentCode ? `Subgroup ${code}` : `Main Group ${code}`);
  return { code, name, parentCode } satisfies PreparedGroup;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);
    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const parsed = parseCsvText(body.csv);
    const existingGroups = await prisma.academicGroup.findMany({ where: { workspaceId: workspace.id }, select: { id: true, code: true, name: true, parentGroupId: true } });
    const existingByCode = new Map(existingGroups.map((g) => [normalizeGroupCode(g.code), g]));

    const seenCodes = new Set<string>();
    const csvMainCodes = new Set<string>();
    const items: ImportPreviewItem[] = [];
    const createRows: Array<{ sourceRow: number; group: PreparedGroup }> = [];
    const updateRows: Array<{ id: string; patch: { name?: string; parentGroupId?: string | null }; sourceRow: number; code: string }> = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      try {
        const group = prepareGroup(record);
        if (seenCodes.has(group.code)) {
          items.push({ key: `${group.code}-${sourceRow}`, status: 'duplicate', label: `${group.code} — ${group.name}`, detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group', sourceRows: [sourceRow], messages: ['Group code is duplicated inside this CSV file.'] });
          return;
        }

        seenCodes.add(group.code);
        if (!group.parentCode) csvMainCodes.add(group.code);

        const existing = existingByCode.get(group.code);

        if (group.parentCode) {
          const parentFromDb = existingByCode.get(group.parentCode);
          const parentExistsAsMain = !!(parentFromDb && !parentFromDb.parentGroupId);
          const parentExistsInCsvAsMain = csvMainCodes.has(group.parentCode);
          if (!parentExistsAsMain && !parentExistsInCsvAsMain) {
            items.push({
              key: `conflict-parent-${group.code}-${sourceRow}`,
              status: 'conflict',
              label: `${group.code} — ${group.name}`,
              detail: `Subgroup under ${group.parentCode}`,
              sourceRows: [sourceRow],
              messages: [`Parent group ${group.parentCode} is missing or not a main group. Add/fix the parent row first.`]
            });
            return;
          }
        }

        if (!existing) {
          if (body.importMode === 'update_existing') {
            items.push({
              key: `${group.code}-${sourceRow}`,
              status: 'skipped',
              label: `${group.code} — ${group.name}`,
              detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group',
              sourceRows: [sourceRow],
              messages: ['Row is valid but skipped because mode is update-existing only and this group does not exist yet.']
            });
            return;
          }

          createRows.push({ sourceRow, group });
          items.push({ key: `${group.code}-${sourceRow}`, status: body.mode === 'import' ? 'created' : 'ready_create', label: `${group.code} — ${group.name}`, detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group', sourceRows: [sourceRow] });
          return;
        }

        if (body.importMode === 'create_only') {
          items.push({ key: `${group.code}-${sourceRow}`, status: 'duplicate_skipped', label: `${group.code} — ${group.name}`, detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group', sourceRows: [sourceRow], messages: ['Group exists. Create-only mode skips existing rows.'] });
          return;
        }

        const patch: { name?: string; parentGroupId?: string | null } = {};
        const defaultMainName = `Main Group ${group.code}`;
        const defaultSubName = `Subgroup ${group.code}`;
        if ((existing.name === defaultMainName || existing.name === defaultSubName) && group.name && group.name !== existing.name) patch.name = group.name;

        if (!existing.parentGroupId && group.parentCode) {
          const parent = existingByCode.get(group.parentCode);
          if (parent && !parent.parentGroupId) {
            patch.parentGroupId = parent.id;
          } else if (csvMainCodes.has(group.parentCode)) {
            items.push({
              key: `conflict-upgrade-parent-${group.code}-${sourceRow}`,
              status: 'conflict',
              label: `${group.code} — ${group.name}`,
              detail: `Subgroup under ${group.parentCode}`,
              sourceRows: [sourceRow],
              messages: ['Cannot safely re-link an existing group to a parent that is only being created in this same import batch. Import parent first, then run update mode.']
            });
            return;
          }
        }

        if (!Object.keys(patch).length) {
          items.push({ key: `${group.code}-${sourceRow}`, status: 'duplicate_skipped', label: `${group.code} — ${group.name}`, detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group', sourceRows: [sourceRow], messages: ['No safe group upgrade changes found.'] });
          return;
        }

        updateRows.push({ id: existing.id, patch, sourceRow, code: group.code });
        items.push({ key: `${group.code}-${sourceRow}`, status: body.mode === 'import' ? 'updated' : 'ready_update', label: `${group.code} — ${group.name}`, detail: group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group', sourceRows: [sourceRow], messages: ['Safe upgrade will only fill missing parent/name metadata.'] });
      } catch (error) {
        items.push({ key: `invalid-group-${sourceRow}`, status: 'invalid', label: `CSV row ${sourceRow}`, sourceRows: [sourceRow], messages: [error instanceof ApiError ? error.message : 'GROUP_IMPORT_ROW_INVALID'] });
      }
    });

    if (body.mode === 'import') {
      await prisma.$transaction(async (tx) => {
        const createdMain = new Map<string, string>();
        for (const row of createRows.filter((entry) => !entry.group.parentCode)) {
          const created = await tx.academicGroup.create({ data: { workspaceId: workspace.id, code: row.group.code, name: row.group.name, color: '#2563eb', parentGroupId: null } });
          createdMain.set(row.group.code, created.id);
        }

        const existingMain = await tx.academicGroup.findMany({ where: { workspaceId: workspace.id, parentGroupId: null }, select: { id: true, code: true } });
        const existingMainByCode = new Map(existingMain.map((g) => [normalizeGroupCode(g.code), g.id]));

        for (const row of createRows.filter((entry) => entry.group.parentCode)) {
          const parentId = createdMain.get(row.group.parentCode!) || existingMainByCode.get(row.group.parentCode!);
          if (!parentId) continue;
          await tx.academicGroup.create({ data: { workspaceId: workspace.id, code: row.group.code, name: row.group.name, color: '#2563eb', parentGroupId: parentId } });
        }

        for (const row of updateRows) {
          await tx.academicGroup.update({ where: { id: row.id }, data: row.patch });
        }
      });
    }

    const payload: ImportPreviewPayload = { entity: 'groups', mode: body.mode, importMode: body.importMode, summary: buildImportSummary(items, parsed.rows.length, body.mode), items };
    return NextResponse.json({ ok: true, data: payload });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ ok: false, message: 'GROUP_CODE_EXISTS' }, { status: 409 });
    return NextResponse.json({ ok: false, message: 'GROUP_IMPORT_FAILED' }, { status: 500 });
  }
}
