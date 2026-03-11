import puppeteer from 'puppeteer';
import { execSync } from 'node:child_process';

const BASE = 'https://demostb.duckdns.org';
const OWNER_EMAIL = 'mahmmed24128q05@gmail.com';
const OWNER_PASSWORD = '1211982Samir?';
const stamp = Date.now();
const editor = { email: `qa.editor.batch7.${stamp}@example.com`, password: 'QaEditor123!' };
const viewer = { email: `qa.viewer.batch7.${stamp}@example.com`, password: 'QaViewer123!' };

const out = { checks: [], errors: [] };
const log = (name, pass, detail = '') => { out.checks.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}${detail ? ` -- ${detail}` : ''}`); };

async function registerUser(page, email, password, name) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2' });
  const result = await page.evaluate(async ({ email, password, name }) => {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  }, { email, password, name });
  return result;
}

async function login(page, email, password) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.type('input[type="email"]', email);
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', password);
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Sign In'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('Sign In button not found');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null);
  const url = page.url();
  if (!url.includes('/workspace')) {
    throw new Error(`Login failed for ${email}: ${url}`);
  }
}

async function api(page, fn, arg) {
  return page.evaluate(fn, arg);
}

function getVerificationCode(email) {
  try {
    const cmd = `sudo journalctl -u students-timetable.service --since '20 minutes ago' --no-pager | grep -F "Code for ${email}:" | tail -n 1`;
    const line = execSync(cmd, { encoding: 'utf8' }).trim();
    const match = line.match(/:\s(\d{6})$/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const anon = await browser.newPage();
  const r1 = await registerUser(anon, editor.email, editor.password, 'QA Editor Batch7');
  const r2 = await registerUser(anon, viewer.email, viewer.password, 'QA Viewer Batch7');
  log('Temporary editor account exists/created', r1.ok || r1.status === 409, `status ${r1.status}`);
  log('Temporary viewer account exists/created', r2.ok || r2.status === 409, `status ${r2.status}`);

  const editorCode = getVerificationCode(editor.email);
  const viewerCode = getVerificationCode(viewer.email);
  const verifyEditor = await api(anon, async ({ email, code }) => {
    const res = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }, { email: editor.email, code: editorCode });
  const verifyViewer = await api(anon, async ({ email, code }) => {
    const res = await fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }, { email: viewer.email, code: viewerCode });
  log('Temporary QA accounts verified through existing auth flow', Boolean(editorCode && viewerCode) && verifyEditor.ok && verifyViewer.ok, `codes ${editorCode ? 'ok' : 'missing'}/${viewerCode ? 'ok' : 'missing'}`);

  const ownerCtx = await browser.createBrowserContext();
  const ownerPage = await ownerCtx.newPage();
  await ownerPage.setViewport({ width: 1440, height: 900 });
  await login(ownerPage, OWNER_EMAIL, OWNER_PASSWORD);

  const ownerWorkspace = await api(ownerPage, async () => {
    const res = await fetch('/api/v1/courses', { credentials: 'include' });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  });
  if (!ownerWorkspace.ok) throw new Error('Owner failed to load workspace');
  const workspaceId = ownerWorkspace.data.data.workspaceId;
  log('Owner can access workspace + resolve workspaceId', Boolean(workspaceId));

  const addEditor = await api(ownerPage, async ({ workspaceId, email }) => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, role: 'TEACHER' }) });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }, { workspaceId, email: editor.email });
  const addViewer = await api(ownerPage, async ({ workspaceId, email }) => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, role: 'VIEWER' }) });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }, { workspaceId, email: viewer.email });
  log('Owner can add editor member by email', addEditor.ok || addEditor.status === 409, `status ${addEditor.status}`);
  log('Owner can add viewer member by email', addViewer.ok || addViewer.status === 409, `status ${addViewer.status}`);

  const members1 = await api(ownerPage, async ({ workspaceId }) => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { credentials: 'include' });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }, { workspaceId });
  const editorMember = members1.data.data.items.find((m) => m.user.email === editor.email);
  const viewerMember = members1.data.data.items.find((m) => m.user.email === viewer.email);
  log('Owner can access member list', members1.ok && Array.isArray(members1.data?.data?.items));

  const flipRole = await api(ownerPage, async ({ workspaceId, memberId }) => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ role: 'VIEWER' }) });
    const data = await res.json();
    if (res.ok) {
      await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ role: 'TEACHER' }) });
    }
    return { status: res.status, ok: res.ok, data };
  }, { workspaceId, memberId: editorMember?.id });
  log('Owner can assign/update roles', Boolean(editorMember?.id) && flipRole.ok, `status ${flipRole.status}`);

  const removeViewer = await api(ownerPage, async ({ workspaceId, memberId, email }) => {
    const del = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
    const delData = await del.json();
    const readd = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, role: 'VIEWER' }) });
    const readdData = await readd.json();
    return { delStatus: del.status, delOk: del.ok, readdStatus: readd.status, readdOk: readd.ok, delData, readdData };
  }, { workspaceId, memberId: viewerMember?.id, email: viewer.email });
  log('Owner can remove allowed members', Boolean(viewerMember?.id) && removeViewer.delOk, `delete ${removeViewer.delStatus}`);

  const ownerSeed = await api(ownerPage, async ({ workspaceId, codeSuffix }) => {
    const roomRes = await fetch('/api/v1/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, code: `QAR${codeSuffix}`, name: `QA Room ${codeSuffix}` }) });
    const roomData = await roomRes.json();
    const insRes = await fetch('/api/v1/instructors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, name: `QA Owner Instructor ${codeSuffix}`, email: `qa.owner.${codeSuffix}@example.com` }) });
    const insData = await insRes.json();
    const viewRes = await fetch('/api/v1/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, surface: 'TIMETABLE', name: `owner-view-${codeSuffix}`, stateJson: { selectedTypes: ['Lecture'], selectedGroupId: 'ALL', deliveryFilter: 'ALL', showConflictLayer: true } }) });
    const viewData = await viewRes.json();
    return { roomRes: { ok: roomRes.ok, status: roomRes.status, data: roomData }, insRes: { ok: insRes.ok, status: insRes.status, data: insData }, viewRes: { ok: viewRes.ok, status: viewRes.status, data: viewData } };
  }, { workspaceId, codeSuffix: String(stamp).slice(-6) });
  log('Owner can create room/instructor and timetable saved view', ownerSeed.roomRes.ok && ownerSeed.insRes.ok && ownerSeed.viewRes.ok);

  await ownerPage.goto(`${BASE}/workspace/rooms`, { waitUntil: 'networkidle2' });
  const ownerRoomsUI = await ownerPage.evaluate(() => !![...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Room')));
  log('Owner desktop UI exposes room write actions', ownerRoomsUI);

  const editorCtx = await browser.createBrowserContext();
  const editorPage = await editorCtx.newPage();
  await editorPage.setViewport({ width: 1366, height: 768 });
  await login(editorPage, editor.email, editor.password);

  const editorChecks = await api(editorPage, async () => {
    const coursesRes = await fetch('/api/v1/courses', { credentials: 'include' });
    const coursesData = await coursesRes.json();
    const workspaceId = coursesData?.data?.workspaceId;

    const memberRes = await fetch(`/api/v1/workspaces/${workspaceId}/members`, { credentials: 'include' });
    let memberData = null; try { memberData = await memberRes.json(); } catch {}

    const roomCreate = await fetch('/api/v1/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, code: `EDR${Date.now().toString().slice(-5)}`, name: 'Editor Created Room' }) });
    const roomCreateData = await roomCreate.json();

    const insCreate = await fetch('/api/v1/instructors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, name: `Editor Instructor ${Date.now().toString().slice(-4)}` }) });
    const insCreateData = await insCreate.json();

    const svCreate = await fetch('/api/v1/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, surface: 'TIMETABLE', name: `editor-view-${Date.now().toString().slice(-5)}`, stateJson: { selectedTypes: ['Lecture'], selectedGroupId: 'ALL', deliveryFilter: 'ALL', showConflictLayer: false } }) });
    const svData = await svCreate.json();

    return {
      workspaceId,
      memberStatus: memberRes.status,
      memberOk: memberRes.ok,
      roomStatus: roomCreate.status,
      roomOk: roomCreate.ok,
      roomId: roomCreateData?.data?.id,
      insStatus: insCreate.status,
      insOk: insCreate.ok,
      svStatus: svCreate.status,
      svOk: svCreate.ok,
      svName: svData?.data?.name
    };
  });
  log('Editor can perform allowed normal data operations (rooms/instructors)', editorChecks.roomOk && editorChecks.insOk, `room ${editorChecks.roomStatus}, instructor ${editorChecks.insStatus}`);
  log('Editor cannot access owner-only member management API', editorChecks.memberStatus === 403, `status ${editorChecks.memberStatus}`);

  await editorPage.goto(`${BASE}/workspace/instructors`, { waitUntil: 'networkidle2' });
  const editorInstructorButton = await editorPage.evaluate(() => !![...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Instructor')));
  log('Editor desktop UI keeps instructor write actions available', editorInstructorButton);

  const viewerCtx = await browser.createBrowserContext();
  const viewerPage = await viewerCtx.newPage();
  await viewerPage.setViewport({ width: 1366, height: 768 });
  await login(viewerPage, viewer.email, viewer.password);

  const viewerChecks = await api(viewerPage, async () => {
    const roomsRes = await fetch('/api/v1/rooms', { credentials: 'include' });
    const roomsData = await roomsRes.json();
    const workspaceId = roomsData?.data?.workspaceId;
    const roomId = roomsData?.data?.items?.[0]?.id;

    const denyRoomCreate = await fetch('/api/v1/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, code: `VR${Date.now().toString().slice(-4)}`, name: 'Viewer Should Fail' }) });
    const denyRoomPatch = roomId ? await fetch(`/api/v1/rooms/${roomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: 'x' }) }) : { status: 0, ok: false };
    const denyRoomDelete = roomId ? await fetch(`/api/v1/rooms/${roomId}`, { method: 'DELETE', credentials: 'include' }) : { status: 0, ok: false };

    const denyInsCreate = await fetch('/api/v1/instructors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, name: 'Viewer Should Fail' }) });
    const denyImportRooms = await fetch('/api/v1/import/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, mode: 'preview', importMode: 'create_only', csv: 'code,name\nX101,X room' }) });

    const viewerSv = await fetch('/api/v1/saved-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ workspaceId, surface: 'TIMETABLE', name: `viewer-view-${Date.now().toString().slice(-5)}`, stateJson: { selectedTypes: ['Lecture'], selectedGroupId: 'ALL', deliveryFilter: 'ALL', showConflictLayer: true } }) });
    const viewerSvData = await viewerSv.json();

    const viewsRes = await fetch(`/api/v1/saved-views?workspaceId=${workspaceId}&surface=TIMETABLE`, { credentials: 'include' });
    const viewsData = await viewsRes.json();

    return {
      workspaceId,
      denyRoomCreate: denyRoomCreate.status,
      denyRoomPatch: denyRoomPatch.status,
      denyRoomDelete: denyRoomDelete.status,
      denyInsCreate: denyInsCreate.status,
      denyImportRooms: denyImportRooms.status,
      viewerSvStatus: viewerSv.status,
      viewerSvName: viewerSvData?.data?.name,
      viewNames: (viewsData?.data?.items || []).map((v) => v.name)
    };
  });

  log('Viewer server-side blocks room/instructor writes', viewerChecks.denyRoomCreate === 403 && viewerChecks.denyRoomPatch === 403 && viewerChecks.denyRoomDelete === 403 && viewerChecks.denyInsCreate === 403, `room ${viewerChecks.denyRoomCreate}/${viewerChecks.denyRoomPatch}/${viewerChecks.denyRoomDelete}, instructor ${viewerChecks.denyInsCreate}`);
  log('Viewer server-side blocks import endpoints', viewerChecks.denyImportRooms === 403, `status ${viewerChecks.denyImportRooms}`);

  await viewerPage.goto(`${BASE}/workspace/rooms`, { waitUntil: 'networkidle2' });
  const viewerRoomsUi = await viewerPage.evaluate(() => {
    const addRoom = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Room'));
    const importBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Import CSV'));
    return {
      addDisabled: Boolean(addRoom?.hasAttribute('disabled')),
      importDisabled: Boolean(importBtn?.hasAttribute('disabled')),
      hasBanner: document.body.textContent?.includes('Viewer mode. Room records are read-only') || false
    };
  });
  await viewerPage.goto(`${BASE}/workspace/instructors`, { waitUntil: 'networkidle2' });
  const viewerInstructorUi = await viewerPage.evaluate(() => {
    const addInstructor = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Instructor'));
    const importBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Import CSV'));
    return {
      addDisabled: Boolean(addInstructor?.hasAttribute('disabled')),
      importDisabled: Boolean(importBtn?.hasAttribute('disabled')),
      hasBanner: document.body.textContent?.includes('Viewer mode. Instructor records are read-only') || false
    };
  });
  await viewerPage.goto(`${BASE}/workspace/timetable`, { waitUntil: 'networkidle2' });
  const viewerTimetableUi = await viewerPage.evaluate(() => ({
    hasTimetable: document.body.textContent?.includes('Timetable') || false,
    hasBanner: document.body.textContent?.includes('Viewer mode. Timetable stays fully browsable') || false
  }));
  log('Viewer UI read-only coverage on Rooms/Instructors/Timetable', viewerRoomsUi.addDisabled && viewerRoomsUi.importDisabled && viewerRoomsUi.hasBanner && viewerInstructorUi.addDisabled && viewerInstructorUi.importDisabled && viewerInstructorUi.hasBanner && viewerTimetableUi.hasTimetable && viewerTimetableUi.hasBanner);

  const ownerViews = await api(ownerPage, async ({ workspaceId }) => {
    const res = await fetch(`/api/v1/saved-views?workspaceId=${workspaceId}&surface=TIMETABLE`, { credentials: 'include' });
    const data = await res.json();
    return { status: res.status, ok: res.ok, names: (data?.data?.items || []).map((v) => v.name) };
  }, { workspaceId });

  const viewerSeesOnlyOwn = !viewerChecks.viewNames.some((name) => String(name).startsWith('owner-view-') || String(name).startsWith('editor-view-'));
  const ownerSeesOnlyOwn = !ownerViews.names.some((name) => String(name).startsWith('viewer-view-') || String(name).startsWith('editor-view-'));
  log('Saved views remain personal per user inside shared workspace', viewerSeesOnlyOwn && ownerSeesOnlyOwn, `viewer=${viewerChecks.viewNames.length}, owner=${ownerViews.names.length}`);

  // Mobile spot-check with viewer account
  await viewerPage.setViewport({ width: 390, height: 844 });
  await viewerPage.goto(`${BASE}/workspace/rooms`, { waitUntil: 'networkidle2' });
  const mobileViewer = await viewerPage.evaluate(() => ({
    hasRooms: document.body.textContent?.includes('Rooms') || false,
    hasBanner: document.body.textContent?.includes('Viewer mode. Room records are read-only') || false
  }));
  log('Mobile viewer read-only rooms experience remains usable', mobileViewer.hasRooms && mobileViewer.hasBanner);

  console.log('\nSUMMARY_JSON_START');
  console.log(JSON.stringify({ out, tempUsers: { editor: editor.email, viewer: viewer.email } }, null, 2));
  console.log('SUMMARY_JSON_END');
} catch (error) {
  console.error('FATAL', error);
  out.errors.push(String(error));
  console.log('SUMMARY_JSON_START');
  console.log(JSON.stringify({ out, tempUsers: { editor: editor.email, viewer: viewer.email } }, null, 2));
  console.log('SUMMARY_JSON_END');
  process.exitCode = 1;
} finally {
  await browser.close();
}
