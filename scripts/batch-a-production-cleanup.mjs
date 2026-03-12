#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DRY_RUN = process.argv.includes('--dry-run');

const SAFE_WORKSPACE_IDS = [
  'cmmmn17750004a6qnhdvqbm92',
  'cmmml0hed0000y0qnyevtwf8r',
  'cmmmfq6420004wwqn2l1udz2p',
  'cmmlyr5vw000cllqnos7w4f2j',
  'cmmlku00d00082rqnvef6om7s',
  'cmmjsv6bd0003ooqnnvdsmhkr',
  'cmmj6b34p000j0uqnmlu6f16c',
  'cmmj6b292000h0uqnzqkb9yj9',
  'cmmj6980p000c0uqnm5q8xn8g',
  'cmmj696sg000a0uqndne56a82',
  'cmmj6870j00050uqnax1ah6hj',
  'cmmj6865n00030uqnyru83sq1',
  'cmmi6yhsp0003pwqno63zsu68',
  'cmmi6wrwb00082vqnm8xpyta5',
  'cmmi6vsti00032vqnda5jthzb',
  'cmmi64dfa0008f3qn3hzsup2u',
  'cmmi63viz0003f3qngz9dqkaw',
  'cmmi60qne000sjoqnds63vd24',
  'cmmi60156000njoqn0rhma3nm',
  'cmmi5yklj000ijoqng080xj0w',
  'cmmi5y9c8000djoqnjrcxk9bw',
  'cmmi5u9w10008joqni6jthfhq',
  'cmmi5rmls0003joqn95us6hmw',
  'cmmi5ohan000gyfqnw3m6cqdn',
  'cmmi5js6w000byfqns90ihj3d',
  'cmmi5jcgi0006yfqnphssuw4q',
  'cmmi584j2000dfmqn1aj20f51',
  'cmmi57ov40008fmqn2u3a6fql',
  'cmmi4zk260003fmqnottyqo6l',
  'cmmi3ui4p00033nqnz1dcgygb',
  'cmmh53bpq0000o8f5pyx4bp93'
];

async function countByTable(client) {
  const { rows } = await client.query(`
    select 'Workspace' as table, count(*)::int as count from "Workspace"
    union all select 'WorkspaceMember', count(*)::int from "WorkspaceMember"
    union all select 'AcademicGroup', count(*)::int from "AcademicGroup"
    union all select 'Instructor', count(*)::int from "Instructor"
    union all select 'Room', count(*)::int from "Room"
    union all select 'Course', count(*)::int from "Course"
    union all select 'SessionEntry', count(*)::int from "SessionEntry"
    union all select 'WorkspaceAuditEntry', count(*)::int from "WorkspaceAuditEntry"
    union all select 'OtpCode', count(*)::int from "OtpCode"
  `);
  return rows;
}

async function run() {
  const client = await pool.connect();
  try {
    const before = await countByTable(client);

    const candidateRows = (
      await client.query(
        `select w.id,w.title,u.email,w."updatedAt"
         from "Workspace" w
         join "User" u on u.id=w."ownerId"
         where w.id = any($1::text[])
         order by w."updatedAt" desc`,
        [SAFE_WORKSPACE_IDS]
      )
    ).rows;

    const expiredOtp = (
      await client.query('select count(*)::int as c from "OtpCode" where "expiresAt" < now()')
    ).rows[0].c;

    console.log(JSON.stringify({
      dryRun: DRY_RUN,
      before,
      candidates: {
        workspaces: candidateRows.length,
        rows: candidateRows,
        expiredOtpCodes: expiredOtp
      }
    }, null, 2));

    if (DRY_RUN) return;

    await client.query('begin');
    const deletedWs = (
      await client.query(
        'delete from "Workspace" where id = any($1::text[]) returning id',
        [SAFE_WORKSPACE_IDS]
      )
    ).rowCount;

    const deletedOtp = (
      await client.query('delete from "OtpCode" where "expiresAt" < now()')
    ).rowCount;

    await client.query('commit');

    const after = await countByTable(client);
    console.log(JSON.stringify({ deletedWs, deletedOtp, after }, null, 2));
  } catch (error) {
    try { await client.query('rollback'); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
