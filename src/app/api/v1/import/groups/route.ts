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
  mode: z.enum(['preview', 'import']).default('preview')
});

type PreparedGroup = {
  code: string;
  name: string;
  parentCode: string | null;
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

function prepareGroup(record: Record<string, string>) {
  const code = normalizeGroupCode(getCsvValue(record, ['code', 'groupCode']));
  const explicitParent = normalizeGroupCode(getCsvValue(record, ['parentCode', 'mainGroupCode', 'parentGroupCode']));
  if (!code) throw new ApiError(400, 'GROUP_CODE_REQUIRED');

  const inferredParent = inferParentGroupCode(code);
  const parentCode = explicitParent || inferredParent || null;
  const name = getCsvValue(record, ['name', 'groupName']) || (parentCode ? `Subgroup ${code}` : `Main Group ${code}`);

  return {
    code,
    name,
    parentCode
  } satisfies PreparedGroup;
}

function buildLabel(group: PreparedGroup) {
  return `${group.code} — ${group.name}`;
}

function buildDetail(group: PreparedGroup) {
  return group.parentCode ? `Subgroup under ${group.parentCode}` : 'Main group';
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const parsed = parseCsvText(body.csv);
    const existingGroups = await prisma.academicGroup.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, code: true, parentGroupId: true }
    });

    const existingByCode = new Map(existingGroups.map((group) => [normalizeGroupCode(group.code), group]));
    const seenCodes = new Set<string>();
    const pending: Array<{ sourceRow: number; group: PreparedGroup }> = [];
    const items: ImportPreviewItem[] = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      try {
        const group = prepareGroup(record);
        if (existingByCode.has(group.code)) {
          items.push({
            key: `${group.code}-${sourceRow}`,
            status: 'duplicate',
            label: buildLabel(group),
            detail: buildDetail(group),
            sourceRows: [sourceRow],
            messages: ['Group code already exists in this workspace. Imports are create-only and will skip it.']
          });
          return;
        }

        if (seenCodes.has(group.code)) {
          items.push({
            key: `${group.code}-${sourceRow}`,
            status: 'duplicate',
            label: buildLabel(group),
            detail: buildDetail(group),
            sourceRows: [sourceRow],
            messages: ['Group code is duplicated inside this CSV file. Keep only one row per group.']
          });
          return;
        }

        seenCodes.add(group.code);
        pending.push({ sourceRow, group });
      } catch (error) {
        items.push({
          key: `invalid-group-${sourceRow}`,
          status: 'invalid',
          label: `CSV row ${sourceRow}`,
          sourceRows: [sourceRow],
          messages: [error instanceof ApiError ? error.message : 'GROUP_IMPORT_ROW_INVALID']
        });
      }
    });

    const pendingMainCodes = new Set(pending.filter((entry) => !entry.group.parentCode).map((entry) => entry.group.code));
    const readyGroups: PreparedGroup[] = [];

    for (const entry of pending) {
      const { sourceRow, group } = entry;
      const parentCode = group.parentCode;
      const existingParent = parentCode ? existingByCode.get(parentCode) : null;

      if (parentCode) {
        if (existingParent && existingParent.parentGroupId) {
          items.push({
            key: `${group.code}-${sourceRow}`,
            status: 'invalid',
            label: buildLabel(group),
            detail: buildDetail(group),
            sourceRows: [sourceRow],
            messages: ['Parent group must be a main group, not another subgroup.']
          });
          continue;
        }

        if (!existingParent && !pendingMainCodes.has(parentCode)) {
          items.push({
            key: `${group.code}-${sourceRow}`,
            status: 'invalid',
            label: buildLabel(group),
            detail: buildDetail(group),
            sourceRows: [sourceRow],
            messages: ['Subgroup parent could not be resolved from an existing main group or a main-group row in this CSV.']
          });
          continue;
        }
      }

      readyGroups.push(group);
      items.push({
        key: `${group.code}-${sourceRow}`,
        status: body.mode === 'import' ? 'imported' : 'ready',
        label: buildLabel(group),
        detail: buildDetail(group),
        sourceRows: [sourceRow],
        messages: group.name === `Subgroup ${group.code}` || group.name === `Main Group ${group.code}`
          ? ['Group name was not provided, so the import will use a safe default name.']
          : undefined
      });
    }

    if (body.mode === 'import' && readyGroups.length) {
      await prisma.$transaction(async (tx) => {
        const createdMainGroups = new Map<string, string>();
        const existingMainGroups = await tx.academicGroup.findMany({
          where: { workspaceId: workspace.id, parentGroupId: null },
          select: { id: true, code: true }
        });
        const existingMainByCode = new Map(existingMainGroups.map((group) => [normalizeGroupCode(group.code), group.id]));

        for (const group of readyGroups.filter((item) => !item.parentCode)) {
          const created = await tx.academicGroup.create({
            data: {
              workspaceId: workspace.id,
              code: group.code,
              name: group.name,
              color: '#2563eb',
              parentGroupId: null
            }
          });
          createdMainGroups.set(group.code, created.id);
        }

        for (const group of readyGroups.filter((item) => item.parentCode)) {
          const resolvedParentId = createdMainGroups.get(group.parentCode!) || existingMainByCode.get(group.parentCode!);
          if (!resolvedParentId) {
            throw new ApiError(400, 'INVALID_PARENT_GROUP');
          }

          await tx.academicGroup.create({
            data: {
              workspaceId: workspace.id,
              code: group.code,
              name: group.name,
              color: '#2563eb',
              parentGroupId: resolvedParentId
            }
          });
        }
      });
    }

    const payload: ImportPreviewPayload = {
      entity: 'groups',
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
      return NextResponse.json({ ok: false, message: 'GROUP_CODE_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'GROUP_IMPORT_FAILED' }, { status: 500 });
  }
}
