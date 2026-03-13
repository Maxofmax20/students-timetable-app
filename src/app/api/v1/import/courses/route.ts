import { NextRequest, NextResponse } from 'next/server';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, getOrCreatePersonalWorkspace, requireSession, requireWorkspaceRole } from '@/lib/workspace-v1';
import { buildImportSummary, getCsvValue, parseCsvText, type ImportExecutionMode, type ImportPreviewItem, type ImportPreviewPayload } from '@/lib/bulk-import';
import { inferSessionType, type SessionTypeValue } from '@/lib/course-sessions';
import { normalizeGroupCode } from '@/lib/group-room-model';
import { writeWorkspaceAudit } from '@/lib/workspace-audit';

const schema = z.object({
  workspaceId: z.string().cuid().optional(),
  csv: z.string().min(1),
  mode: z.enum(['preview', 'import']).default('preview'),
  importMode: z.enum(['create_only', 'update_existing', 'create_update']).default('create_only')
});

type PreparedSession = {
  type: SessionTypeValue;
  day: string;
  startMinute: number;
  endMinute: number;
  groupId: string | null;
  instructorId: string | null;
  roomId: string | null;
  onlinePlatform: string | null;
  onlineLink: string | null;
  note: string | null;
};

type PendingCourse = {
  code: string;
  title: string;
  status: string;
  sessions: PreparedSession[];
  sessionKeys: Set<string>;
  sourceRows: number[];
  errors: string[];
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

function parseTimeLabel(label: string) {
  const [hours, minutes] = label.trim().split(':').map((value) => Number(value));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new ApiError(400, 'INVALID_SESSION_TIME');
  }
  return hours * 60 + minutes;
}

function normalizeDay(day?: string | null) {
  if (!day) return null;
  const normalized = day.trim().toLowerCase();
  const map: Record<string, string> = {
    sat: 'Sat',
    saturday: 'Sat',
    السبت: 'Sat',
    sun: 'Sun',
    sunday: 'Sun',
    الأحد: 'Sun',
    mon: 'Mon',
    monday: 'Mon',
    الإثنين: 'Mon',
    الاثنين: 'Mon',
    tue: 'Tue',
    tuesday: 'Tue',
    الثلاثاء: 'Tue',
    wed: 'Wed',
    wednesday: 'Wed',
    الأربعاء: 'Wed',
    الاربعاء: 'Wed',
    thu: 'Thu',
    thursday: 'Thu',
    الخميس: 'Thu',
    fri: 'Fri',
    friday: 'Fri',
    الجمعة: 'Fri'
  };
  return map[normalized] ?? day.trim();
}

function normalizeCourseStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) return 'ACTIVE';
  if (normalized === 'ACTIVE' || normalized === 'DRAFT' || normalized === 'CONFLICT') return normalized;
  throw new ApiError(400, 'INVALID_COURSE_STATUS');
}

function firstIfSame(values: Array<string | null>) {
  if (!values.length) return null;
  const first = values[0] ?? null;
  return values.every((value) => (value ?? null) === first) ? first : null;
}

function sessionSignature(session: PreparedSession) {
  return [
    session.type,
    session.day,
    session.startMinute,
    session.endMinute,
    session.groupId || '-',
    session.roomId || '-',
    session.instructorId || '-',
    session.onlinePlatform || '-',
    session.onlineLink || '-'
  ].join('|');
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const body = schema.parse(await request.json());
    const workspace = await resolveWorkspace(session.userId, body.workspaceId);

    await requireWorkspaceRole(session.userId, workspace.id, [WorkspaceRole.OWNER, WorkspaceRole.TEACHER]);

    const parsed = parseCsvText(body.csv);
    const [existingCourses, groups, rooms, instructors] = await Promise.all([
      prisma.course.findMany({
        where: { workspaceId: workspace.id },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          sessions: {
            select: {
              type: true,
              day: true,
              startMinute: true,
              endMinute: true,
              groupId: true,
              instructorId: true,
              roomId: true,
              onlinePlatform: true,
              onlineLink: true
            }
          }
        }
      }),
      prisma.academicGroup.findMany({ where: { workspaceId: workspace.id }, select: { id: true, code: true } }),
      prisma.room.findMany({ where: { workspaceId: workspace.id }, select: { id: true, code: true } }),
      prisma.instructor.findMany({ where: { workspaceId: workspace.id }, select: { id: true, name: true, email: true } })
    ]);

    const existingByCode = new Map(existingCourses.map((course) => [course.code.toUpperCase(), course]));
    const groupsByCode = new Map(groups.map((group) => [normalizeGroupCode(group.code), group.id]));
    const roomsByCode = new Map(rooms.map((room) => [room.code.toUpperCase(), room.id]));
    const instructorsByEmail = new Map(instructors.filter((instructor) => instructor.email).map((instructor) => [instructor.email!.trim().toLowerCase(), instructor.id]));
    const instructorsByName = new Map<string, string[]>();
    for (const instructor of instructors) {
      const key = instructor.name.trim().toLowerCase();
      const current = instructorsByName.get(key) || [];
      current.push(instructor.id);
      instructorsByName.set(key, current);
    }

    const pending = new Map<string, PendingCourse>();
    const items: ImportPreviewItem[] = [];

    parsed.rows.forEach((record, index) => {
      const sourceRow = index + 2;
      const code = getCsvValue(record, ['courseCode', 'code']).trim().toUpperCase();
      const title = getCsvValue(record, ['courseTitle', 'title', 'courseName', 'name']).trim();

      if (!code || !title) {
        items.push({
          key: `invalid-course-row-${sourceRow}`,
          status: 'invalid',
          label: `CSV row ${sourceRow}`,
          sourceRows: [sourceRow],
          messages: ['Course code and course title are both required.']
        });
        return;
      }

      const statusValue = getCsvValue(record, ['status']);
      const sessionTypeValue = getCsvValue(record, ['sessionType', 'type']);
      const dayValue = getCsvValue(record, ['day']);
      const startTime = getCsvValue(record, ['startTime', 'start']);
      const endTime = getCsvValue(record, ['endTime', 'end']);
      const groupCode = normalizeGroupCode(getCsvValue(record, ['groupCode', 'group']));
      const roomCode = getCsvValue(record, ['roomCode', 'room']).trim().toUpperCase();
      const instructorEmail = getCsvValue(record, ['instructorEmail', 'email']).trim().toLowerCase();
      const instructorName = getCsvValue(record, ['instructorName', 'instructor']).trim();
      const onlinePlatform = getCsvValue(record, ['onlinePlatform', 'platform']).trim();
      const onlineLink = getCsvValue(record, ['onlineLink', 'link', 'url']).trim();
      const note = getCsvValue(record, ['note', 'sessionNote']).trim();

      const course = pending.get(code) || {
        code,
        title,
        status: statusValue ? normalizeCourseStatus(statusValue) : 'ACTIVE',
        sessions: [],
        sessionKeys: new Set<string>(),
        sourceRows: [],
        errors: []
      } satisfies PendingCourse;

      course.sourceRows.push(sourceRow);

      if (course.title !== title) {
        course.errors.push(`Course title mismatch at row ${sourceRow}. Keep one exact title per course code.`);
      }

      try {
        const normalizedStatus = statusValue ? normalizeCourseStatus(statusValue) : 'ACTIVE';
        if (course.status !== normalizedStatus) {
          course.errors.push(`Course status mismatch at row ${sourceRow}. Keep one status per course code.`);
        }

        const type = inferSessionType(sessionTypeValue);
        const day = normalizeDay(dayValue);
        if (!day) throw new ApiError(400, 'INVALID_SESSION_DAY');

        const startMinute = parseTimeLabel(startTime);
        const endMinute = parseTimeLabel(endTime);
        if (endMinute <= startMinute) throw new ApiError(400, 'INVALID_SESSION_TIME');

        const groupId = groupCode ? groupsByCode.get(groupCode) || null : null;
        if (groupCode && !groupId) throw new ApiError(400, 'INVALID_GROUP');

        const roomId = type === 'ONLINE' ? null : roomCode ? roomsByCode.get(roomCode) || null : null;
        if (type !== 'ONLINE' && roomCode && !roomId) throw new ApiError(400, 'INVALID_ROOM');

        let instructorId: string | null = null;
        if (instructorEmail) {
          instructorId = instructorsByEmail.get(instructorEmail) || null;
          if (!instructorId) throw new ApiError(400, 'INVALID_INSTRUCTOR');
        } else if (instructorName) {
          const matches = instructorsByName.get(instructorName.toLowerCase()) || [];
          if (!matches.length) throw new ApiError(400, 'INVALID_INSTRUCTOR');
          if (matches.length > 1) throw new ApiError(400, 'AMBIGUOUS_INSTRUCTOR');
          instructorId = matches[0];
        }

        const candidateSession: PreparedSession = {
          type,
          day,
          startMinute,
          endMinute,
          groupId,
          instructorId,
          roomId,
          onlinePlatform: type === 'ONLINE' || type === 'HYBRID' ? onlinePlatform || null : null,
          onlineLink: type === 'ONLINE' || type === 'HYBRID' ? onlineLink || null : null,
          note: note || null
        };

        const signature = sessionSignature(candidateSession);
        if (course.sessionKeys.has(signature)) {
          throw new ApiError(400, 'DUPLICATE_SESSION_ROW');
        }
        course.sessionKeys.add(signature);
        course.sessions.push(candidateSession);
      } catch (error) {
        course.errors.push(`Row ${sourceRow}: ${error instanceof ApiError ? error.message : 'COURSE_IMPORT_ROW_INVALID'}`);
      }

      pending.set(code, course);
    });

    const createCourses: PendingCourse[] = [];
    const updateCourses: Array<{
      id: string;
      code: string;
      appendSessions: PreparedSession[];
      sourceRows: number[];
      messages: string[];
    }> = [];

    for (const course of pending.values()) {
      if (course.sessions.length > 24) {
        course.errors.push('A single imported course cannot create more than 24 sessions.');
      }

      if (!course.sessions.length) {
        course.errors.push('No valid session rows were found for this course.');
      }

      if (course.errors.length) {
        items.push({
          key: `invalid-course-${course.code}`,
          status: 'invalid',
          label: `${course.code} — ${course.title}`,
          detail: `${course.sourceRows.length} CSV row${course.sourceRows.length === 1 ? '' : 's'} supplied`,
          sourceRows: course.sourceRows,
          messages: course.errors
        });
        continue;
      }

      const existing = existingByCode.get(course.code);
      if (!existing) {
        if (body.importMode === 'update_existing') {
          items.push({
            key: `skip-course-${course.code}`,
            status: 'skipped',
            label: `${course.code} — ${course.title}`,
            detail: `${course.sessions.length} session${course.sessions.length === 1 ? '' : 's'} in CSV`,
            sourceRows: course.sourceRows,
            messages: ['Row group is valid but skipped because mode is update-existing only and this course does not exist yet.']
          });
          continue;
        }

        createCourses.push(course);
        items.push({
          key: `create-course-${course.code}`,
          status: body.mode === 'import' ? 'created' : 'ready_create',
          label: `${course.code} — ${course.title}`,
          detail: `${course.sessions.length} session${course.sessions.length === 1 ? '' : 's'} ready to create`,
          sourceRows: course.sourceRows
        });
        continue;
      }

      if (body.importMode === 'create_only') {
        items.push({
          key: `duplicate-course-${course.code}`,
          status: 'duplicate_skipped',
          label: `${course.code} — ${course.title}`,
          detail: 'Course already exists',
          sourceRows: course.sourceRows,
          messages: ['Create-only mode skips existing course codes.']
        });
        continue;
      }

      const existingSessionSignatures = new Set(existing.sessions.map((session) => sessionSignature({
        type: session.type as SessionTypeValue,
        day: session.day,
        startMinute: session.startMinute,
        endMinute: session.endMinute,
        groupId: session.groupId,
        instructorId: session.instructorId,
        roomId: session.roomId,
        onlinePlatform: session.onlinePlatform,
        onlineLink: session.onlineLink,
        note: null
      })));

      const appendSessions = course.sessions.filter((sessionItem) => !existingSessionSignatures.has(sessionSignature(sessionItem)));
      const messages: string[] = [];

      if (existing.title !== course.title) {
        items.push({
          key: `conflict-course-title-${course.code}`,
          status: 'conflict',
          label: `${course.code} — ${course.title}`,
          detail: `${course.sourceRows.length} CSV row${course.sourceRows.length === 1 ? '' : 's'} supplied`,
          sourceRows: course.sourceRows,
          messages: [`Existing title is "${existing.title}". Course import upgrade mode does not rename existing courses automatically.`]
        });
        continue;
      }

      if (existing.status !== course.status) {
        items.push({
          key: `conflict-course-status-${course.code}`,
          status: 'conflict',
          label: `${course.code} — ${course.title}`,
          detail: `${course.sourceRows.length} CSV row${course.sourceRows.length === 1 ? '' : 's'} supplied`,
          sourceRows: course.sourceRows,
          messages: [`Existing status is ${existing.status}. Course import upgrade mode does not change status automatically.`]
        });
        continue;
      }

      if (appendSessions.length) {
        messages.push(`append ${appendSessions.length} new session${appendSessions.length === 1 ? '' : 's'}`);
      }

      if (!messages.length) {
        items.push({
          key: `matched-course-${course.code}`,
          status: 'duplicate_skipped',
          label: `${course.code} — ${course.title}`,
          detail: 'Existing course already matches and all sessions already exist',
          sourceRows: course.sourceRows,
          messages: ['No update needed.']
        });
        continue;
      }

      updateCourses.push({
        id: existing.id,
        code: course.code,
        appendSessions,
        sourceRows: course.sourceRows,
        messages
      });

      items.push({
        key: `update-course-${course.code}`,
        status: body.mode === 'import' ? 'updated' : 'ready_update',
        label: `${course.code} — ${course.title}`,
        detail: `${course.sourceRows.length} CSV row${course.sourceRows.length === 1 ? '' : 's'} supplied`,
        messages: ['Safe upgrade will append missing sessions only.'],
        sourceRows: course.sourceRows
      });
    }

    if (body.mode === 'import' && (createCourses.length || updateCourses.length)) {
      await prisma.$transaction(async (tx) => {
        for (const course of createCourses) {
          const commonGroupId = firstIfSame(course.sessions.map((sessionItem) => sessionItem.groupId));
          const commonInstructorId = firstIfSame(course.sessions.map((sessionItem) => sessionItem.instructorId));
          const commonRoomId = firstIfSame(course.sessions.map((sessionItem) => sessionItem.roomId));

          await tx.course.create({
            data: {
              workspaceId: workspace.id,
              code: course.code,
              title: course.title,
              status: course.status,
              groupId: commonGroupId,
              instructorId: commonInstructorId,
              roomId: commonRoomId,
              color: '#3b82f6',
              sessions: {
                create: course.sessions.map((sessionItem) => ({
                  workspaceId: workspace.id,
                  ...sessionItem
                }))
              }
            }
          });
        }

        for (const course of updateCourses) {
          await tx.course.update({
            where: { id: course.id },
            data: {
              ...(course.appendSessions.length
                ? {
                  sessions: {
                    create: course.appendSessions.map((sessionItem) => ({
                      workspaceId: workspace.id,
                      ...sessionItem
                    }))
                  }
                }
                : {})
            }
          });
        }
      });
    }

    const payload: ImportPreviewPayload = {
      entity: 'courses',
      mode: body.mode,
      importMode: body.importMode as ImportExecutionMode,
      summary: buildImportSummary(items, parsed.rows.length, body.mode),
      items
    };

    if (body.mode === 'import') {
      await writeWorkspaceAudit({ workspaceId: workspace.id, actorUserId: session.userId, entityType: 'IMPORT', actionType: 'IMPORT_APPLIED', summary: `Applied courses import (${body.importMode})`, metadata: { entity: 'courses', importMode: body.importMode, summary: payload.summary } });
    }

    return NextResponse.json({ ok: true, data: payload });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'COURSE_CODE_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: 'COURSE_IMPORT_FAILED' }, { status: 500 });
  }
}
