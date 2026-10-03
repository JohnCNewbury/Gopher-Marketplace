#!/usr/bin/env node
/**
 * A GO-To's `gid` is the key for EVERY action on its card -- Edit, Save,
 * Remove, and Submit. So a gid that collides with one already in the store
 * does not merely confuse the UI: Submit sends the OTHER record. A real
 * request, to a real Gopher, for the wrong job, charged to the other record's
 * saved card.
 *
 * That shipped. The mint was `'GT-' + (++goToSeq)` with `goToSeq = 0`, which is
 * only safe while the store starts EMPTY -- true of the repo seed (`goTos: []`)
 * and false of every real account, which loads its saved GO-To's from the
 * server. Reproduced 2026-10-03: with GT-1/GT-2 seeded, the first GO-To a user
 * created minted a second GT-1, and Edit on it opened the seeded record.
 *
 * This asserts the mint still scans the store. It cannot prove uniqueness at
 * runtime -- that is what the browser regression does -- but it does catch the
 * one-line revert back to a blind counter.
 *
 *   node scripts/web-checks/check-goto-id-mint.js Final/gopher-request.html ...
 */
const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: check-goto-id-mint.js <html...>');
  process.exit(2);
}

let failed = false;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // Only look at real code: a mention inside a comment must not satisfy a check.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

  const hasStore = /const\s+GoTos\s*=/.test(code);
  if (!hasStore) {
    console.log(`  skip ${file}  (no GoTos store)`);
    continue;
  }

  const blindMint = /gid\s*:\s*'GT-'\s*\+\s*\(\s*\+\+\s*goToSeq\s*\)/.test(code);
  const hasMintFn = /function\s+mintGoToId\s*\(/.test(code);
  const mintScans = /function\s+mintGoToId\s*\([\s\S]{0,400}?DASH_DATA\.goTos[\s\S]{0,400}?\}/.test(code);
  const mintUsed  = /gid\s*:\s*mintGoToId\(\)/.test(code);

  const checks = [
    ['no blind `GT- + (++goToSeq)` mint', !blindMint],
    ['mintGoToId() defined',              hasMintFn],
    ['mint reads DASH_DATA.goTos',        mintScans],
    ['store mints via mintGoToId()',      mintUsed],
  ];

  for (const [label, ok] of checks) {
    if (!ok) failed = true;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${file}  ${label}`);
  }
}

if (failed) {
  console.error('\nA colliding gid makes Submit send a DIFFERENT GO-To.');
  console.error('The mint must skip ids already present in DASH_DATA.goTos.');
  process.exit(1);
}
console.log('\nGO-To id mint scans the store before minting.');
