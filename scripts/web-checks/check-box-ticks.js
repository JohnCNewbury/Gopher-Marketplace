#!/usr/bin/env node
/**
 * Every control that reuses `.prev-check-box` must have a rule that DRAWS the
 * tick when it is checked. The tick is not on the box -- it is on an ancestor
 * class (`.prev-check-row.checked .prev-check-box::after`), so any new control
 * that does not carry that exact class highlights while its box stays empty.
 *
 * That has now shipped twice. The owner reported it on the GO-To toggles on
 * 2026-10-03; the fix covered `.goto-tog` only, and the Review sheet's payment
 * list AND liability waiver were still silently broken -- the waiver being the
 * control that gates Save.
 *
 *   node scripts/web-checks/check-box-ticks.js Final/gopher-request.html ...
 *
 * ⛔ The first version of this script reported ALL OK while .gtr-waiver was
 * still broken: it only considered ancestors whose class literally contained
 * `checked` or a `${...}`, and the waiver's class is applied at RUNTIME via
 * classList. It skipped the one control it was written to catch. So:
 * every box must be ATTRIBUTED to an owner, and an unattributed box is a
 * FAILURE, never a silent skip. A guard that can quietly examine nothing is
 * indistinguishable from a guard that passes.
 */
const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: check-box-ticks.js <html...>');
  process.exit(2);
}

let failed = false;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const owners = new Map();
  let boxes = 0, unattributed = 0;

  const boxRe = /<span class="prev-check-box"/g;
  let m;
  while ((m = boxRe.exec(src))) {
    boxes++;
    const back = src.slice(Math.max(0, m.index - 800), m.index);
    const tags = [...back.matchAll(/<(?:button|div|label|li)\b[^>]*class="([^"]*)"[^>]*>/g)];
    // Nearest enclosing control with a class -- no assumption about HOW the
    // `checked` state gets there (template literal, or classList at runtime).
    let base = null;
    for (let i = tags.length - 1; i >= 0 && !base; i--) {
      base = tags[i][1].replace(/\$\{[^}]*\}/g, '')
                       .split(/\s+/).filter(w => w && w !== 'checked')[0] || null;
    }
    if (base) owners.set(base, (owners.get(base) || 0) + 1);
    else unattributed++;
  }

  if (!boxes) {
    console.error(`  FAIL ${file}  no .prev-check-box found at all -- the probe examined nothing.`);
    failed = true;
    continue;
  }
  if (unattributed) {
    console.error(`  FAIL ${file}  ${unattributed} box(es) with no identifiable owner -- probe blind spot.`);
    failed = true;
  }

  for (const [cls, count] of [...owners].sort()) {
    const drawn = new RegExp('\\.' + cls + '\\.checked[^{]*\\.prev-check-box::after').test(src);
    if (!drawn) failed = true;
    console.log(`  ${drawn ? 'ok  ' : 'FAIL'} ${file}  .${cls}  (x${count})` +
                (drawn ? '' : '  <- highlights but draws NO tick'));
  }
}

if (failed) {
  console.error('\nA checked control with no tick reads as "my tap did nothing".');
  console.error("Add a `.<class>.checked .prev-check-box::after { content:'\\u2713'; ... }` rule.");
  process.exit(1);
}
console.log('\nAll .prev-check-box controls draw a tick when checked.');
