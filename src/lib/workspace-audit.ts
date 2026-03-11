import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SENSITIVE_KEYS = new Set(['password', 'passwordhash', 'token', 'otp', 'secret', 'authorization', 'cookie']);

function cleanValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null as unknown as Prisma.InputJsonValue;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const out = value.map((v) => cleanValue(v)).filter((v) => v !== undefined);
    return out as Prisma.InputJsonValue;
  }
  if (typeof value === 'object') {
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
      const cleaned = cleanValue(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return undefined;
}

export type WorkspaceAuditWrite = {
  workspaceId: string;
  actorUserId?: string | null;
  entityType: 'COURSE' | 'GROUP' | 'ROOM' | 'INSTRUCTOR' | 'IMPORT' | 'MEMBERSHIP';
  entityId?: string | null;
  actionType: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  tx?: Prisma.TransactionClient;
};

export async function writeWorkspaceAudit(entry: WorkspaceAuditWrite) {
  const db = entry.tx ?? prisma;
  return db.workspaceAuditEntry.create({
    data: {
      workspaceId: entry.workspaceId,
      actorUserId: entry.actorUserId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actionType: entry.actionType,
      summary: entry.summary,
      beforeJson: cleanValue(entry.before ?? null),
      afterJson: cleanValue(entry.after ?? null),
      metadataJson: cleanValue(entry.metadata ?? null)
    }
  });
}

export function summarizeCourseForAudit(course: {
  id: string; code: string; title: string; status: string; groupId?: string | null; instructorId?: string | null; roomId?: string | null; creditHours?: number | null;
}) {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    status: course.status,
    groupId: course.groupId ?? null,
    instructorId: course.instructorId ?? null,
    roomId: course.roomId ?? null,
    creditHours: course.creditHours ?? null
  };
}

export function summarizeSessions(sessions: Array<{ type: string; day: string; startMinute: number; endMinute: number; groupId?: string | null; instructorId?: string | null; roomId?: string | null; }>) {
  return sessions.map((s) => ({
    type: s.type,
    day: s.day,
    startMinute: s.startMinute,
    endMinute: s.endMinute,
    groupId: s.groupId ?? null,
    instructorId: s.instructorId ?? null,
    roomId: s.roomId ?? null
  }));
}
