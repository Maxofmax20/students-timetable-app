#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { nowIso, runCmd } from './common.mjs';

const steps = [
  ['deploy-health', ['scripts/verification/deploy-health.mjs']],
  ['smoke', ['scripts/verification/smoke.mjs']],
];

console.log(`Release verification @ ${nowIso()}`);
console.log(`Commit under verification: ${runCmd('git rev-parse HEAD').out}`);

let failed = false;
for (const [name, args] of steps) {
  console.log(`\n=== Running ${name} ===`);
  const res = spawnSync('node', args, { stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    console.error(`Step failed: ${name} (exit=${res.status})`);
    failed = true;
    break;
  }
  console.log(`Step passed: ${name}`);
}

if (failed) {
  console.error('\nRelease verification: FAIL');
  process.exit(1);
}

console.log('\nRelease verification: PASS');
