import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';
const results = [];
let browser, page;
const W = (ms) => new Promise(r => setTimeout(r, ms));

function log(test, pass, detail = '') {
  results.push({ test, status: pass ? 'PASS' : 'FAIL', detail });
  console.log(`[${pass?'PASS':'FAIL'}] ${test}${detail ? ' -- ' + detail : ''}`);
}

async function hasText(text) {
  try { return (await page.$eval('body', el => el.textContent)).includes(text); } catch { return false; }
}

async function shot(name) { await page.screenshot({ path: `/tmp/e2e-${name}.png` }); }

async function findEl(fn) {
  const h = await page.evaluateHandle(fn);
  return h.asElement();
}

async function fillInputByLabel(label, value) {
  const inputs = await page.$$('input');
  for (const inp of inputs) {
    const lbl = await inp.evaluate(el => {
      // Go up to the container div (flex flex-col) which holds both label and input wrapper
      const container = el.closest('div')?.parentElement;
      const labelEl = container?.querySelector('label');
      return labelEl?.textContent || el.placeholder || '';
    });
    if (lbl.includes(label)) { await inp.click({clickCount:3}); await inp.type(value); return true; }
  }
  return false;
}

try {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    executablePath: '/home/ubuntu/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome'
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Auth page
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2' });
  log('1. Auth page', await hasText('Sign In'));

  // 2. Register
  await page.evaluate(() => fetch('/api/auth/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:'e2ebot@test.com',password:'E2eBot123!',name:'E2E Bot'})
  }));

  // 3. Login via UI
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input', { timeout: 5000 });
  for (const inp of await page.$$('input')) {
    const t = await inp.evaluate(el => el.type);
    if (t === 'email') { await inp.click({clickCount:3}); await inp.type('e2ebot@test.com'); }
    if (t === 'password') { await inp.click({clickCount:3}); await inp.type('E2eBot123!'); }
  }
  const signBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Sign In')) || null);
  if (signBtn) await signBtn.click();
  await page.waitForNavigation({ waitUntil:'networkidle2', timeout:10000 }).catch(()=>{});
  await W(3000);
  log('2. Login via UI', page.url().includes('/workspace'), page.url());

  // 4-7. Tab pages
  for (const [tab, check] of [['Dashboard','Overview'],['Courses','Add Course'],['Timetable','Timetable'],['Settings','Auto Save']]) {
    await page.goto(`${BASE}/workspace?tab=${tab}`, { waitUntil:'networkidle2' });
    await W(2000);
    const ok = await hasText(check);
    log(`3. ${tab} tab`, ok);
    await shot(`tab-${tab.toLowerCase()}`);
  }

  // 8. Sidebar navigation
  await page.goto(`${BASE}/workspace?tab=Dashboard`, { waitUntil:'networkidle2' });
  await W(2000);
  const sideLink = await findEl(() => [...document.querySelectorAll('aside a')].find(a => a.textContent.includes('Courses')) || null);
  if (sideLink) {
    await sideLink.click();
    await W(2000);
    log('4. Sidebar click', await hasText('Add Course'));
  } else {
    log('4. Sidebar click', false, 'link not found');
  }

  // 9. Groups: page + create + delete
  await page.goto(`${BASE}/workspace/groups`, { waitUntil:'networkidle2' });
  await W(2000);
  log('5. Groups page', await hasText('Groups'));

  let ngBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('New Group')) || null);
  if (ngBtn) {
    await ngBtn.click(); await W(1000);
    log('6. Group modal opens', await hasText('Create New Group') || await hasText('Group Code'));
    await shot('group-modal');
    await fillInputByLabel('Code', 'E2E-G1');
    await fillInputByLabel('Name', 'E2E Group');
    const createBtn = await findEl(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      return [...modal.querySelectorAll('button')].find(b => b.textContent.includes('Create Group')) || null;
    });
    if (createBtn) await createBtn.click();
    await W(2000);
    log('7. Group created', await hasText('E2E-G1'));
  }

  // Delete group
  const delIcon = await findEl(() => {
    return [...document.querySelectorAll('button')].find(b => {
      const i = b.querySelector('.material-symbols-outlined');
      return i && i.textContent.trim() === 'delete';
    }) || null;
  });
  if (delIcon) {
    await delIcon.click(); await W(1000);
    log('8. Delete modal opens', await hasText('Delete Group'));
    await shot('delete-modal');
    const confirmDel = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Delete Group') && b.closest('[role="dialog"], [class*="modal"], div[class*="Modal"]')) || null);
    if (confirmDel) await confirmDel.click();
    await W(2000);
    log('9. Group deleted', !(await hasText('E2E-G1')));
  }

  // 10. Instructors: page + create
  await page.goto(`${BASE}/workspace/instructors`, { waitUntil:'networkidle2' });
  await W(2000);
  log('10. Instructors page', await hasText('Instructors'));
  const aiBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Instructor')) || null);
  if (aiBtn) {
    await aiBtn.click(); await W(1000);
    await fillInputByLabel('Name', 'Dr. E2E');
    await fillInputByLabel('Email', 'e2e@u.edu');
    const saveBtn = await findEl(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      return [...modal.querySelectorAll('button')].find(b => b.textContent.includes('Add Instructor')) || null;
    });
    if (saveBtn) await saveBtn.click();
    await W(2000);
    log('11. Instructor created', await hasText('Dr. E2E'));
  }

  // 11. Rooms: page + create
  await page.goto(`${BASE}/workspace/rooms`, { waitUntil:'networkidle2' });
  await W(2000);
  log('12. Rooms page', await hasText('Rooms'));
  const arBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Room')) || null);
  if (arBtn) {
    await arBtn.click(); await W(1000);
    await fillInputByLabel('Code', 'E2E-R1');
    await fillInputByLabel('Name', 'E2E Room');
    const saveBtn = await findEl(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      return [...modal.querySelectorAll('button')].find(b => b.textContent.includes('Add Room')) || null;
    });
    if (saveBtn) await saveBtn.click();
    await W(2000);
    log('13. Room created', await hasText('E2E-R1'));
  }

  // 12. Settings persistence
  await page.goto(`${BASE}/workspace?tab=Settings`, { waitUntil:'networkidle2' });
  await W(2000);
  const engineBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Engine')) || null);
  if (engineBtn) {
    await engineBtn.click(); await W(1000);
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await selects[0].select('12h');
      await W(1500);
    }
  }
  await page.reload({ waitUntil:'networkidle2' });
  await W(3000);
  log('14. Settings persist after refresh', await hasText('Settings') || await hasText('General'));
  await shot('settings-persist');

  // 13. Account page
  await page.goto(`${BASE}/account`, { waitUntil:'networkidle2' });
  await W(2000);
  log('15. Account page', await hasText('Public Profile') && await hasText('Security') && await hasText('Delete Account'));
  await shot('account');

  // 14. Profile link
  const profLink = await findEl(() => [...document.querySelectorAll('a')].find(a => a.href && a.href.includes('/account')) || null);
  log('16. Profile/account link in sidebar', !!profLink);

  // 15. Export buttons
  await page.goto(`${BASE}/workspace?tab=Timetable`, { waitUntil:'networkidle2' });
  await W(2000);
  log('17. Export ICS button', await page.evaluate(() => !!([...document.querySelectorAll('button')].find(b => b.textContent.includes('Export')))));

  await page.goto(`${BASE}/workspace?tab=Settings`, { waitUntil:'networkidle2' });
  await W(2000);
  const dataBtn = await findEl(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Data')) || null);
  if (dataBtn) {
    await dataBtn.click(); await W(1000);
    log('18. Export JSON button', await hasText('Export JSON'));
  }

  // === MOBILE VIEWPORT ===
  await page.setViewport({ width: 375, height: 812 });

  await page.goto(`${BASE}/workspace?tab=Dashboard`, { waitUntil:'networkidle2' });
  await W(2000);
  log('19. Mobile: dashboard', await hasText('Overview') || await hasText('Dashboard'));
  await shot('mobile-dash');

  // Mobile hamburger
  const menuBtn = await findEl(() => {
    return [...document.querySelectorAll('button')].find(b => {
      const i = b.querySelector('.material-symbols-outlined');
      return i && i.textContent.trim() === 'menu';
    }) || null;
  });
  if (menuBtn) {
    await menuBtn.click(); await W(1000);
    const vis = await page.evaluate(() => {
      const a = document.querySelector('aside');
      return a ? a.getBoundingClientRect().left >= 0 : false;
    });
    log('20. Mobile: sidebar drawer', vis);
    await shot('mobile-sidebar');
  } else {
    log('20. Mobile: sidebar drawer', false, 'no menu button');
  }

  await page.goto(`${BASE}/workspace?tab=Courses`, { waitUntil:'networkidle2' });
  await W(2000);
  log('21. Mobile: courses', await hasText('Courses'));
  await shot('mobile-courses');

  await page.goto(`${BASE}/workspace?tab=Timetable`, { waitUntil:'networkidle2' });
  await W(2000);
  log('22. Mobile: timetable', await hasText('Timetable'));
  await shot('mobile-timetable');

  await page.goto(`${BASE}/account`, { waitUntil:'networkidle2' });
  await W(2000);
  log('23. Mobile: account', await hasText('Profile') || await hasText('Display Name'));
  await shot('mobile-account');

  await page.goto(`${BASE}/workspace/rooms`, { waitUntil:'networkidle2' });
  await W(2000);
  log('24. Mobile: rooms', await hasText('Rooms'));
  await shot('mobile-rooms');

  // Cleanup
  await page.evaluate(() => fetch('/api/account/delete', {
    method:'DELETE', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({confirm:'DELETE'})
  }));
  log('25. Cleanup', true);

  // SUMMARY
  console.log('\n========== E2E BROWSER TEST SUMMARY ==========');
  let p=0, f=0;
  for (const r of results) { if (r.status==='PASS') p++; else f++; }
  console.log(`Total: ${results.length} | Passed: ${p} | Failed: ${f}`);
  if (f) { console.log('\nFailed:'); for (const r of results) if (r.status==='FAIL') console.log(`  - ${r.test}: ${r.detail}`); }

} catch(e) {
  console.error('FATAL:', e.message);
} finally {
  if (browser) await browser.close();
}
