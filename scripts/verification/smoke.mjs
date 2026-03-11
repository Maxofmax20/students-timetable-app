#!/usr/bin/env node
import { chromium } from 'playwright';
import { createReporter, httpGet, nowIso } from './common.mjs';

const BASE_URL = process.env.ST_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000';
const VERIFY_EMAIL = process.env.ST_VERIFY_EMAIL || '';
const VERIFY_PASSWORD = process.env.ST_VERIFY_PASSWORD || '';

const reporter = createReporter('smoke');

async function checkPublicAndAuthGateReachability() {
  const checks = [
    ['/auth', 'auth reachability'],
    ['/workspace/dashboard', 'dashboard gate'],
    ['/workspace/timetable', 'timetable gate'],
    ['/workspace/courses', 'courses gate'],
    ['/workspace/groups', 'groups gate'],
    ['/workspace/rooms', 'rooms gate'],
    ['/workspace/instructors', 'instructors gate'],
    ['/workspace/import', 'imports gate'],
    ['/workspace/sharing', 'sharing gate'],
    ['/workspace/history', 'history gate'],
  ];

  for (const [route, label] of checks) {
    const res = await httpGet(`${BASE_URL}${route}`);
    if (res.status >= 200 && res.status < 400) {
      reporter.pass(`Route reachable (${label})`, `status=${res.status} ${route}`);
    } else if (res.status >= 400 && res.status < 500 && route.startsWith('/workspace/')) {
      reporter.pass(`Route auth-gated (${label})`, `status=${res.status} ${route}`);
    } else {
      reporter.fail(`Route reachable (${label})`, `status=${res.status} ${route}`);
    }
  }

  const health = await httpGet(`${BASE_URL}/api/health`);
  if (health.status === 200) reporter.pass('API health reachable', `status=${health.status}`);
  else reporter.fail('API health reachable', `status=${health.status}`);
}

async function runAuthenticatedChecks() {
  if (!VERIFY_EMAIL || !VERIFY_PASSWORD) {
    reporter.skip('Authenticated smoke coverage', 'set ST_VERIFY_EMAIL and ST_VERIFY_PASSWORD to enable authenticated dashboard/timetable/courses/groups/rooms/instructors/imports/sharing/history/export/saved-views checks');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[type="email"]', VERIFY_EMAIL);
    await page.fill('input[type="password"]', VERIFY_PASSWORD);

    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes('sign in'));
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) throw new Error('Sign in button not found');

    await page.waitForURL(/\/workspace(\/.*)?$/, { timeout: 25000 });
    reporter.pass('Login succeeds with provided verify credentials');

    const authedRoutes = [
      '/workspace/dashboard',
      '/workspace/timetable',
      '/workspace/courses',
      '/workspace/groups',
      '/workspace/rooms',
      '/workspace/instructors',
      '/workspace/import',
      '/workspace/sharing',
      '/workspace/history',
    ];

    for (const route of authedRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const hasErrorBanner = await page.locator('text=Application error').count();
      if (hasErrorBanner === 0) reporter.pass(`Authenticated UI load: ${route}`);
      else reporter.fail(`Authenticated UI load: ${route}`, 'application error marker found');
    }

    const apiResults = await page.evaluate(async () => {
      const out = {};
      const me = await fetch('/api/v1/auth/me', { credentials: 'include' });
      out.authMe = me.status;

      const resources = [
        ['courses', '/api/v1/courses'],
        ['groups', '/api/v1/groups'],
        ['rooms', '/api/v1/rooms'],
        ['instructors', '/api/v1/instructors'],
      ];

      for (const [key, url] of resources) {
        const res = await fetch(url, { credentials: 'include' });
        out[key] = { status: res.status };
      }

      const courses = await fetch('/api/v1/courses', { credentials: 'include' });
      const coursesData = await courses.json().catch(() => ({}));
      const workspaceId = coursesData?.data?.workspaceId;
      out.workspaceId = workspaceId || null;

      if (workspaceId) {
        const savedViews = await fetch(`/api/v1/saved-views?workspaceId=${workspaceId}&surface=TIMETABLE`, { credentials: 'include' });
        out.savedViews = savedViews.status;

        const members = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { credentials: 'include' });
        out.membersStatus = members.status;

        const history = await fetch(`/api/v1/workspaces/${workspaceId}/history`, { credentials: 'include' });
        out.historyStatus = history.status;
      }

      return out;
    });

    if (apiResults.authMe === 200) reporter.pass('Authenticated API: /api/v1/auth/me');
    else reporter.fail('Authenticated API: /api/v1/auth/me', `status=${apiResults.authMe}`);

    for (const key of ['courses', 'groups', 'rooms', 'instructors']) {
      const status = apiResults?.[key]?.status;
      if (status === 200) reporter.pass(`Authenticated API: ${key}`, `status=${status}`);
      else reporter.fail(`Authenticated API: ${key}`, `status=${status}`);
    }

    if (apiResults.workspaceId) {
      if (apiResults.savedViews === 200) reporter.pass('Saved views API reachable', `status=${apiResults.savedViews}`);
      else reporter.fail('Saved views API reachable', `status=${apiResults.savedViews}`);

      if (apiResults.historyStatus === 200) reporter.pass('History API reachable', `status=${apiResults.historyStatus}`);
      else reporter.fail('History API reachable', `status=${apiResults.historyStatus}`);

      if ([200, 403].includes(apiResults.membersStatus)) reporter.pass('Permission-gated members API is enforced', `status=${apiResults.membersStatus}`);
      else reporter.fail('Permission-gated members API is enforced', `status=${apiResults.membersStatus}`);
    } else {
      reporter.skip('Workspace scoped API checks', 'workspaceId could not be resolved from /api/v1/courses');
    }

    await page.goto(`${BASE_URL}/workspace/timetable`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const exportSurface = await page.evaluate(() => {
      const txt = (document.body?.innerText || '').toLowerCase();
      return txt.includes('export') || txt.includes('pdf');
    });
    if (exportSurface) reporter.pass('Export surface visible in timetable UI');
    else reporter.fail('Export surface visible in timetable UI', 'no export/pdf text found');

  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  console.log(`Smoke verification @ ${nowIso()}`);
  console.log(`Target base URL: ${BASE_URL}`);

  await checkPublicAndAuthGateReachability();
  await runAuthenticatedChecks();

  const summary = reporter.summary({
    baseUrl: BASE_URL,
    authenticatedChecksEnabled: Boolean(VERIFY_EMAIL && VERIFY_PASSWORD),
  });

  console.log('\nSUMMARY_JSON_START');
  console.log(JSON.stringify(summary, null, 2));
  console.log('SUMMARY_JSON_END');

  if (reporter.hasFailures()) process.exit(1);
}

main().catch((error) => {
  console.error('FATAL smoke error', error);
  process.exit(1);
});
