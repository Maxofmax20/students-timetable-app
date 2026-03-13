import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const SESSION_SUFFIX_PATTERN = /\s+[—-]\s+(lecture|lec\d*|section|sec|lab|online|hybrid)$/i;
const SESSION_CODE_SUFFIX_PATTERN = /-(lecture|lec\d*|section|sec|lab|online|hybrid)$/i;

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((entry) => entry.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL_NOT_FOUND');
  return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '');
}

function stripLegacySessionSuffix(title) {
  return title.replace(SESSION_SUFFIX_PATTERN, '').trim();
}

function stripLegacyCodeSuffix(code) {
  return code.replace(SESSION_CODE_SUFFIX_PATTERN, '').trim();
}

function inferSessionType(value = '') {
  const source = value.trim().toLowerCase();
  if (!source) return 'LECTURE';
  if (/(^|\b)(section|sec)(\b|$)/.test(source)) return 'SECTION';
  if (/(^|\b)lab(\b|$)/.test(source)) return 'LAB';
  if (/(^|\b)online(\b|$)/.test(source)) return 'ONLINE';
  if (/(^|\b)hybrid(\b|$)/.test(source)) return 'HYBRID';
  return 'LECTURE';
}

function inferLegacySessionType(title, code) {
  const fromTitle = inferSessionType(title);
  return fromTitle === 'LECTURE' ? inferSessionType(code) : fromTitle;
}

function uniqueNonNull(values) {
  return Array.from(new Set(values.filter((value) => value)));
}

(async () => {
  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const dryRun = process.argv.includes('--dry-run');
  const summary = {
    dryRun,
    groupsMerged: 0,
    duplicateCoursesDeleted: 0,
    sessionRowsReassigned: 0,
    sessionsRetyped: 0,
    coursesNormalized: 0,
    changedCourseIds: []
  };

  try {
    await client.query('BEGIN');

    const courseResult = await client.query(`
      select c.id, c."workspaceId", c.code, c.title, c.status, c."groupId", c."instructorId", c."roomId", c."createdAt",
        coalesce(
          json_agg(
            json_build_object(
              'id', s.id,
              'type', s.type,
              'groupId', s."groupId",
              'instructorId', s."instructorId",
              'roomId', s."roomId"
            )
            order by s."day", s."startMinute", s.id
          ) filter (where s.id is not null),
          '[]'::json
        ) as sessions
      from "Course" c
      left join "SessionEntry" s on s."courseId" = c.id
      group by c.id
      order by c."workspaceId", c."createdAt", c.code, c.id
    `);

    const courses = courseResult.rows.map((row) => ({
      ...row,
      baseTitle: stripLegacySessionSuffix(row.title),
      baseCode: stripLegacyCodeSuffix(row.code),
      inferredType: inferLegacySessionType(row.title, row.code),
      sessions: row.sessions || []
    }));

    const groups = new Map();
    for (const course of courses) {
      const key = `${course.workspaceId}::${course.baseCode}::${course.baseTitle.toLowerCase()}`;
      const bucket = groups.get(key) || [];
      bucket.push(course);
      groups.set(key, bucket);
    }

    for (const bucket of groups.values()) {
      bucket.sort((a, b) => {
        if (a.code === a.baseCode && b.code !== b.baseCode) return -1;
        if (b.code === b.baseCode && a.code !== a.baseCode) return 1;
        const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        const codeDiff = a.code.localeCompare(b.code);
        if (codeDiff !== 0) return codeDiff;
        return a.id.localeCompare(b.id);
      });

      const canonical = bucket[0];
      const duplicateCourses = bucket.slice(1);
      const shouldMerge = duplicateCourses.length > 0;

      for (const course of bucket) {
        for (const session of course.sessions) {
          const targetSessionType = shouldMerge
            ? course.inferredType
            : (session.type && session.type !== 'LECTURE' ? session.type : course.inferredType);
          const nextGroupId = session.groupId ?? course.groupId ?? null;
          const nextInstructorId = session.instructorId ?? course.instructorId ?? null;
          const nextRoomId = targetSessionType === 'ONLINE' ? null : (session.roomId ?? course.roomId ?? null);
          const needsRetype = session.type !== targetSessionType || session.groupId !== nextGroupId || session.instructorId !== nextInstructorId || session.roomId !== nextRoomId || (shouldMerge && course.id !== canonical.id);
          if (!needsRetype) continue;

          await client.query(
            `update "SessionEntry"
             set "courseId" = $1,
                 type = $2,
                 "groupId" = $3,
                 "instructorId" = $4,
                 "roomId" = $5,
                 "updatedAt" = now()
             where id = $6`,
            [canonical.id, targetSessionType, nextGroupId, nextInstructorId, nextRoomId, session.id]
          );
          if (course.id !== canonical.id) summary.sessionRowsReassigned += 1;
          if (session.type !== targetSessionType) summary.sessionsRetyped += 1;
        }
      }

      const outsiderConflict = courses.some((course) => course.workspaceId === canonical.workspaceId && course.baseCode === canonical.baseCode && course.id !== canonical.id && !bucket.some((candidate) => candidate.id === course.id));
      const targetCode = outsiderConflict ? canonical.code : canonical.baseCode;
      const targetTitle = canonical.baseTitle;

      const sessionScope = await client.query(
        `select id, type, "groupId", "instructorId", "roomId" from "SessionEntry" where "courseId" = $1 order by "day", "startMinute", id`,
        [canonical.id]
      );
      const sessionRows = sessionScope.rows;
      const commonGroupIds = uniqueNonNull(sessionRows.map((session) => session.groupId));
      const commonInstructorIds = uniqueNonNull(sessionRows.map((session) => session.instructorId));
      const commonRoomIds = uniqueNonNull(sessionRows.map((session) => session.roomId));

      const nextGroupId = commonGroupIds.length === 1 ? commonGroupIds[0] : null;
      const nextInstructorId = commonInstructorIds.length === 1 ? commonInstructorIds[0] : null;
      const nextRoomId = commonRoomIds.length === 1 ? commonRoomIds[0] : null;

      if (canonical.code !== targetCode || canonical.title !== targetTitle || canonical.groupId !== nextGroupId || canonical.instructorId !== nextInstructorId || canonical.roomId !== nextRoomId) {
        await client.query(
          `update "Course"
           set code = $1,
               title = $2,
               "groupId" = $3,
               "instructorId" = $4,
               "roomId" = $5,
               "updatedAt" = now()
           where id = $6`,
          [targetCode, targetTitle, nextGroupId, nextInstructorId, nextRoomId, canonical.id]
        );
        summary.coursesNormalized += 1;
        summary.changedCourseIds.push(canonical.id);
      }

      if (shouldMerge) {
        const duplicateIds = duplicateCourses.map((course) => course.id);
        await client.query(`delete from "Course" where id = any($1::text[])`, [duplicateIds]);
        summary.groupsMerged += 1;
        summary.duplicateCoursesDeleted += duplicateIds.length;
      }
    }

    if (dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
