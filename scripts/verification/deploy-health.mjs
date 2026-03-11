#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createReporter, httpGet, nowIso, runCmd } from './common.mjs';

const BASE_URL = process.env.ST_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000';
const SERVICE_NAME = process.env.ST_VERIFY_SERVICE || 'students-timetable.service';
const reporter = createReporter('deploy-health');

function checkBuildFreshness() {
  const buildIdPath = path.resolve('.next/BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    reporter.fail('Build artifact exists (.next/BUILD_ID)', 'missing; run npm run build before deploy verification');
    return;
  }

  reporter.pass('Build artifact exists (.next/BUILD_ID)');

  const headTs = Number(runCmd('git log -1 --format=%ct').out || 0) * 1000;
  const buildTs = fs.statSync(buildIdPath).mtimeMs;
  if (buildTs + 1000 >= headTs) {
    reporter.pass('Local build timestamp is not older than latest commit', `build=${new Date(buildTs).toISOString()} head=${new Date(headTs).toISOString()}`);
  } else {
    reporter.fail('Local build timestamp is not older than latest commit', `build=${new Date(buildTs).toISOString()} head=${new Date(headTs).toISOString()}`);
  }
}

async function checkRuntime() {
  const svc = runCmd(`systemctl is-active ${SERVICE_NAME}`, { allowFail: true });
  if (svc.ok && svc.out === 'active') {
    reporter.pass('systemd service is active', `${SERVICE_NAME}`);
  } else {
    reporter.fail('systemd service is active', `${SERVICE_NAME} returned ${svc.out || svc.err || 'unknown'}`);
  }

  const health = await httpGet(`${BASE_URL}/api/health`);
  let healthJson = null;
  try { healthJson = JSON.parse(health.text); } catch {}
  if (health.status === 200 && healthJson?.ok === true) {
    reporter.pass('Health endpoint returns ok=true', `status=${health.status}`);
  } else {
    reporter.fail('Health endpoint returns ok=true', `status=${health.status} body=${health.text.slice(0, 180)}`);
  }

  const routeChecks = [
    '/auth',
    '/workspace',
    '/workspace/dashboard',
    '/workspace/timetable',
    '/workspace/courses',
    '/workspace/history',
  ];

  for (const route of routeChecks) {
    const res = await httpGet(`${BASE_URL}${route}`);
    if (res.status >= 200 && res.status < 400) {
      reporter.pass(`Route reachable: ${route}`, `status=${res.status}`);
    } else if (res.status >= 400 && res.status < 500 && route.startsWith('/workspace')) {
      reporter.pass(`Route auth-gated but reachable: ${route}`, `status=${res.status}`);
    } else {
      reporter.fail(`Route reachable: ${route}`, `status=${res.status}`);
    }
  }
}

async function main() {
  const head = runCmd('git rev-parse HEAD').out;
  console.log(`Deploy health check @ ${nowIso()}`);
  console.log(`Target base URL: ${BASE_URL}`);
  console.log(`Expected commit: ${head}`);

  checkBuildFreshness();
  await checkRuntime();

  reporter.skip('Runtime commit fingerprint parity check', 'application does not currently expose runtime commit hash; stale runtime detection is limited to build freshness + live route/health behavior');

  const summary = reporter.summary({ baseUrl: BASE_URL, serviceName: SERVICE_NAME, expectedCommit: head });
  console.log('\nSUMMARY_JSON_START');
  console.log(JSON.stringify(summary, null, 2));
  console.log('SUMMARY_JSON_END');

  if (reporter.hasFailures()) process.exit(1);
}

main().catch((error) => {
  console.error('FATAL deploy-health error', error);
  process.exit(1);
});
