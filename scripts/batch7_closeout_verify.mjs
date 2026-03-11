#!/usr/bin/env node

console.error('[DEPRECATED] scripts/batch7_closeout_verify.mjs has been retired in Batch 9.');
console.error('Use the Batch 9 verification commands instead:');
console.error('  npm run verify:health');
console.error('  npm run verify:smoke');
console.error('  npm run verify:release');
console.error('No credentials are embedded in this repository. Provide ST_VERIFY_EMAIL/ST_VERIFY_PASSWORD at runtime when authenticated smoke coverage is needed.');
process.exit(1);
