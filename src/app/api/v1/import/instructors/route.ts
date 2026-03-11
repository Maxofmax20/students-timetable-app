import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { buildImportSummary, getCsvValue, parseCsvText, type ImportPreviewItem, type ImportPreviewPayload } from '@/lib/bulk-import';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  csv: z.string().min(1),
  mode: z.enum(['preview', 'import']).default('preview'),
  importMode: z.enum(['create_only', 'update_existing', 'create_update']).default('create_only')
});

type PreparedInstructor = {
  name: string;
  email: string | null;
  phone: string | null;
};

async function resolveWorkspace(userId: string, workspaceId?: string) {
  if (!workspaceId) return getOrCreatePersonalWorkspace(userId);
  await requireWorkspaceRole(userId, workspaceId, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER, WorkspaceRole.STUDENT, WorkspaceRole.VIEWER]);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
  return workspace;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function prepareInstructor(record: Record<string, string>) {
  const name = getCsvValue(record, ['name', 'instructorName', 'fullName']).trim();
  const emailRaw = getCsvValue(record, ['email', 'instructorEmail']).trim();
  const phone = getCsvValue(record, ['phone', 'mobile', 'contact']).trim() || null;

  if (!name) throw new ApiError(400, 'INSTRUCTOR_NAME_REQUIRED');
  if (name.length < 2 || name.length > 120) throw new ApiError(400, 'INSTRUCTOR_NAME_INVALID');

  let email: string | null = null;
  if (emailRaw) {
    const parsed = z.string().email().safeParse(emailRaw);
    if (!parsed.success) throw new ApiError(400, 'INSTRUCTOR_EMAIL_INVALID');
    email = normalizeEmail(emailRaw);
  }

  return { name, email, phone } satisfies PreparedInstructor;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);
    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const parsed = parseCsvText(body.csv);
    const existing = await prisma.instructor.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, email: true, phone: true }
    });

    const existingByEmail = new Map(existing.filter((item) => item.email).map((item) => [normalizeEmail(item.email!), item]));
    const existingByName = new Map<string, typeof existing>();
    for (const item of existing) {
      const key = normalizeName(item.name);
      const current = existingByName.get(key) || [];
      current.push(item);
      existingByName.set(key, current);
    }

    const seenRowKeys = new Set<string>();
    const items: ImportPreviewItem[] = [];
    const createRows: PreparedInstructor[] = [];
    const updateRows: Array<{ id: string; patch: Partial<PreparedInstructor> }> = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      try {
        const prepared = prepareInstructor(record);
        const rowKey = prepared.email ? `email:${prepared.email}` : `name:${normalizeName(prepared.name)}`;
        if (seenRowKeys.has(rowKey)) {
          items.push({
            key: `${rowKey}-${sourceRow}`,
            status: 'duplicate',
            label: prepared.name,
            detail: prepared.email || prepared.phone || 'No contact details',
            sourceRows: [sourceRow],
            messages: ['Instructor appears multiple times in this CSV file. Keep only one row per instructor identifier.']
          });
          return;
        }
        seenRowKeys.add(rowKey);

        let matched = prepared.email ? existingByEmail.get(prepared.email) || null : null;
        if (!matched) {
          const byName = existingByName.get(normalizeName(prepared.name)) || [];
          if (byName.length > 1) {
            items.push({
              key: `conflict-${rowKey}-${sourceRow}`,
              status: 'conflict',
              label: prepared.name,
              detail: prepared.email || prepared.phone || 'No contact details',
              sourceRows: [sourceRow],
              messages: ['Name matches multiple existing instructors. Provide email to disambiguate safely.']
            });
            return;
          }
          matched = byName[0] || null;
        }

        if (!matched) {
          if (body.importMode === 'update_existing') {
            items.push({
              key: `${rowKey}-${sourceRow}`,
              status: 'skipped',
              label: prepared.name,
              detail: prepared.email || prepared.phone || 'No contact details',
              sourceRows: [sourceRow],
              messages: ['Valid row skipped because mode is update-existing only and instructor does not exist yet.']
            });
            return;
          }

          createRows.push(prepared);
          items.push({
            key: `${rowKey}-${sourceRow}`,
            status: body.mode === 'import' ? 'created' : 'ready_create',
            label: prepared.name,
            detail: prepared.email || prepared.phone || 'No contact details',
            sourceRows: [sourceRow]
          });
          return;
        }

        if (body.importMode === 'create_only') {
          items.push({
            key: `${rowKey}-${sourceRow}`,
            status: 'duplicate_skipped',
            label: prepared.name,
            detail: prepared.email || prepared.phone || 'No contact details',
            sourceRows: [sourceRow],
            messages: ['Instructor already exists. Create-only mode skips existing rows.']
          });
          return;
        }

        const patch: Partial<PreparedInstructor> = {};
        if (!matched.email && prepared.email) patch.email = prepared.email;
        if (!matched.phone && prepared.phone) patch.phone = prepared.phone;
        if (!matched.name && prepared.name) patch.name = prepared.name;

        if (!Object.keys(patch).length) {
          items.push({
            key: `${rowKey}-${sourceRow}`,
            status: 'duplicate_skipped',
            label: prepared.name,
            detail: prepared.email || prepared.phone || 'No contact details',
            sourceRows: [sourceRow],
            messages: ['No safe gap-filling update found for this existing instructor row.']
          });
          return;
        }

        updateRows.push({ id: matched.id, patch });
        items.push({
          key: `${rowKey}-${sourceRow}`,
          status: body.mode === 'import' ? 'updated' : 'ready_update',
          label: prepared.name,
          detail: prepared.email || prepared.phone || 'No contact details',
          sourceRows: [sourceRow],
          messages: ['Safe update will fill only missing contact fields.']
        });
      } catch (error) {
        items.push({
          key: `invalid-instructor-${sourceRow}`,
          status: 'invalid',
          label: `CSV row ${sourceRow}`,
          sourceRows: [sourceRow],
          messages: [error instanceof ApiError ? error.message : 'INSTRUCTOR_IMPORT_ROW_INVALID']
        });
      }
    });

    if (body.mode === 'import') {
      await prisma.$transaction(async (tx) => {
        if (createRows.length) {
          await tx.instructor.createMany({
            data: createRows.map((row) => ({
              workspaceId: workspace.id,
              name: row.name,
              email: row.email,
              phone: row.phone,
              color: '#0ea5e9'
            }))
          });
        }
        for (const row of updateRows) {
          await tx.instructor.update({ where: { id: row.id }, data: row.patch });
        }
      });
    }

    const payload: ImportPreviewPayload = {
      entity: 'instructors',
      mode: body.mode,
      importMode: body.importMode,
      summary: buildImportSummary(items, parsed.rows.length, body.mode),
      items
    };

    return NextResponse.json({ ok: true, data: payload });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    if (error instanceof ApiError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, message: 'INSTRUCTOR_IMPORT_FAILED' }, { status: 500 });
  }
}
