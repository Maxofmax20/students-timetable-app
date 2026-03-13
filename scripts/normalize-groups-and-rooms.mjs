import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env');
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((entry) => entry.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL_NOT_FOUND');
  return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '');
}

function normalizeGroupCode(code = '') {
  return code.trim().toUpperCase();
}

function inferParentGroupCode(code = '') {
  const match = normalizeGroupCode(code).match(/^([A-Z]+)(\d+)$/);
  return match ? match[1] : null;
}

function parseRoomCode(code = '') {
  const compact = code.trim().toUpperCase().replace(/\s+/g, '');
  const match = compact.match(/^([A-Z]+)-?(\d{1,4})$/);
  if (!match) return null;
  return {
    buildingCode: match[1],
    roomNumber: match[2],
    code: `${match[1]}${match[2]}`
  };
}

function deriveRoomLevel(roomNumber) {
  const numeric = Number.parseInt((roomNumber || '').trim(), 10);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (numeric < 200) return 0;
  return Math.floor(numeric / 100) - 1;
}

(async () => {
  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const dryRun = process.argv.includes('--dry-run');
  const summary = {
    dryRun,
    groupsLinkedToParent: 0,
    roomsStructured: 0,
    changedGroupIds: [],
    changedRoomIds: []
  };

  try {
    await client.query('BEGIN');

    const groupsRes = await client.query('select id, "workspaceId", code, name, "parentGroupId" from "AcademicGroup" order by "workspaceId", code, id');
    const groups = groupsRes.rows;
    const byWorkspaceAndCode = new Map(groups.map((group) => [`${group.workspaceId}::${normalizeGroupCode(group.code)}`, group]));

    for (const group of groups) {
      const parentCode = inferParentGroupCode(group.code);
      if (!parentCode) continue;
      const parent = byWorkspaceAndCode.get(`${group.workspaceId}::${parentCode}`);
      if (!parent || parent.id === group.id) continue;
      if (group.parentGroupId === parent.id) continue;
      if (parent.parentGroupId) continue;

      await client.query(
        'update "AcademicGroup" set "parentGroupId" = $1, "updatedAt" = now() where id = $2',
        [parent.id, group.id]
      );
      summary.groupsLinkedToParent += 1;
      summary.changedGroupIds.push(group.id);
    }

    const roomsRes = await client.query('select id, code, building, "buildingCode", "roomNumber", level from "Room" order by code, id');
    for (const room of roomsRes.rows) {
      const parsed = parseRoomCode(room.code);
      const nextBuildingCode = parsed?.buildingCode ?? room.buildingCode ?? null;
      const nextRoomNumber = parsed?.roomNumber ?? room.roomNumber ?? null;
      const nextCode = parsed?.code ?? room.code;
      const nextLevel = deriveRoomLevel(nextRoomNumber);

      if (room.code === nextCode && room.buildingCode === nextBuildingCode && room.roomNumber === nextRoomNumber && room.level === nextLevel) {
        continue;
      }

      await client.query(
        'update "Room" set code = $1, "buildingCode" = $2, "roomNumber" = $3, level = $4, "updatedAt" = now() where id = $5',
        [nextCode, nextBuildingCode, nextRoomNumber, nextLevel, room.id]
      );
      summary.roomsStructured += 1;
      summary.changedRoomIds.push(room.id);
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
