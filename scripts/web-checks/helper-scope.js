#!/usr/bin/env node
/*
 * Are the shared worker helpers defined where BOTH call sites can see them?
 *
 * WHY THIS EXISTS — a bug that hid twice in one day, the second time behind
 * short-circuit evaluation.
 *
 * `needsDistanceApproval` is called from two sibling functions: the request
 * CREATE path (the auto-hire gate) and `renderRequestDetail` (the worker card's
 * "auto-match paused" note). Defining it inside either one is a ReferenceError
 * for the other.
 *
 * On Request that failed loudly — the detail body rendered empty.
 * ⛔ On Connect it failed SILENTLY, because the call site reads
 *       const farApproval = (firstAvailable && needsDistanceApproval(w))
 *   and JS never evaluates the right operand while `firstAvailable` is false. No
 *   seeded Connect request was First Available, so the broken code shipped to
 *   production and sat there looking healthy. It surfaced only when a First
 *   Available fixture was added — i.e. the fault was invisible until the exact
 *   data that triggers it existed.
 *
 * A parse check cannot see this: the file parses perfectly either way. So this
 * checks PLACEMENT instead.
 *
 * ⚠️ INDENTATION IS A PROXY, and a deliberate one. In these files a two-space
 * `function` is top level within the script block; four spaces means nested
 * inside another function. That is exactly the difference between the working
 * and the broken version, it is stable across both files, and it costs nothing.
 * If the files are ever reformatted this check must be rewritten rather than
 * relaxed — a placement rule that stops matching is worse than none.
 */
const fs = require('fs');
const path = require('path');

const HELPERS = ['isStandardTier', 'needsDistanceApproval'];
const FILES = ['Final/gopher-request.html', 'Final/gopher-connect.html'];

let failed = 0;
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  for (const fn of HELPERS) {
    const topLevel = src.includes(`\n  function ${fn}(`);
    const nested   = src.includes(`\n    function ${fn}(`);
    if (!topLevel || nested) {
      failed++;
      console.error(`  ✗ ${rel}: ${fn} is ${nested ? 'NESTED inside another function' : 'not defined at block top level'}`);
      console.error(`    Both the create path and renderRequestDetail call it; a nested definition is`);
      console.error(`    a ReferenceError for whichever one does not contain it — and on Connect that`);
      console.error(`    error hides until a First Available request exists.`);
    }
  }
  // The call site must stay short-circuited on firstAvailable — not for safety,
  // but because reordering it would change WHICH failure you get, and the
  // comment above documents the one you get today.
  // Request carries an extra `!isLive` term; Connect does not. What matters is
  // that `firstAvailable` still guards the call — that is the short-circuit which
  // hid the ReferenceError, and the reason this guard exists at all.
  if (!/firstAvailable &&[^)]*needsDistanceApproval\(w\)/.test(src)) {
    failed++;
    console.error(`  ✗ ${rel}: the farApproval call site no longer reads \`firstAvailable && needsDistanceApproval(w)\`.`);
    console.error(`    Not necessarily wrong — but this guard's reasoning is written around that shape,`);
    console.error(`    so update the guard deliberately rather than letting it drift.`);
  }
}

if (failed) { console.error(`FAIL — ${failed} helper-scope problem(s)`); process.exit(1); }
console.log(`PASS — ${HELPERS.length * FILES.length} helper placements + ${FILES.length} call sites verified`);
