import { execSync } from 'node:child_process';

export function nowIso() {
  return new Date().toISOString();
}

export function withTimeout(promise, ms, label = 'operation') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

export async function httpGet(url, opts = {}) {
  const res = await withTimeout(fetch(url, { redirect: 'manual', ...opts }), opts.timeoutMs ?? 15000, `GET ${url}`);
  const text = await res.text();
  return { status: res.status, ok: res.ok, headers: res.headers, text };
}

export function runCmd(command, { allowFail = false } = {}) {
  try {
    const out = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return { ok: true, out };
  } catch (error) {
    if (!allowFail) throw error;
    return {
      ok: false,
      out: String(error?.stdout || '').trim(),
      err: String(error?.stderr || '').trim(),
      code: error?.status ?? 1,
    };
  }
}

export function createReporter(name) {
  const checks = [];
  let failed = 0;
  let skipped = 0;

  function push(status, check, detail = '') {
    checks.push({ status, check, detail });
    if (status === 'FAIL') failed += 1;
    if (status === 'SKIP') skipped += 1;
    const suffix = detail ? ` -- ${detail}` : '';
    console.log(`${status}: ${check}${suffix}`);
  }

  return {
    pass: (check, detail = '') => push('PASS', check, detail),
    fail: (check, detail = '') => push('FAIL', check, detail),
    skip: (check, detail = '') => push('SKIP', check, detail),
    summary(extra = {}) {
      console.log(`\n${name} summary: ${checks.length - skipped - failed} passed, ${failed} failed, ${skipped} skipped`);
      if (extra.note) console.log(`Note: ${extra.note}`);
      return { name, at: nowIso(), failed, skipped, checks, ...extra };
    },
    hasFailures: () => failed > 0,
  };
}
