#!/usr/bin/env node
/*
 * Has anything this workstream PORTED FROM moved upstream?
 *
 * WHY THIS EXISTS. The project's designed way to learn that another session
 * touched your surface is the work registry — and that file's own text says the
 * quiet part: "A registry only knows what people wrote down. Git knows what
 * actually happened." On 2026-09-01 the vendored no-show rule's documentation
 * header was removed upstream and nobody said a word; the sha check is what
 * found it. That check covers ONE file. This covers the rest.
 *
 * ⚠️ WARN-ONLY, ON PURPOSE. A changed sha is a prompt to go and look, not a
 * verdict — most upstream edits will not touch the behaviour we ported. Failing
 * the build on every unrelated edit to a 5,000-line component would train
 * everyone to re-record without reading, which is worse than no check. The one
 * entry that BLOCKS is noShow.js, and it blocks in noshow-freshness.js, because
 * a real parity test is bound to it and can say whether the RULE moved.
 *
 * ⚠️ It cannot see a repo that is not checked out. Absent clones are reported as
 * UNCHECKED — never as "fine". A green from a check that could not run is the
 * failure mode this whole guard exists to avoid.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEV = path.join(process.env.HOME || '', 'Desktop', 'All New Gopher', 'Dev');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'upstream-watch.json'), 'utf8'));

let moved = 0, unchecked = 0, same = 0;
for (const e of manifest.watch) {
  const abs = path.join(DEV, e.path);
  if (!fs.existsSync(abs)) {
    unchecked++;
    console.log(`  ? UNCHECKED  ${e.path}`);
    console.log(`               clone not present — this says NOTHING about whether it changed.`);
    continue;
  }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  if (sha === e.sha256) { same++; continue; }
  moved++;
  console.log(`  ⚠ MOVED      ${e.path}`);
  console.log(`               ported into: ${e.portedInto}`);
  console.log(`               why it matters: ${e.why}`);
  console.log(`               recorded ${e.sha256.slice(0, 16)}…  now ${sha.slice(0, 16)}…`);
  console.log(`               GO READ THE DIFF before re-recording. Never re-record to silence it.`);
}

const bits = [`${same} unchanged`];
if (moved) bits.push(`${moved} MOVED`);
if (unchecked) bits.push(`${unchecked} unchecked`);
console.log(`${moved ? 'WARN' : 'PASS'} — upstream sources this workstream ported from: ${bits.join(', ')}`);
process.exit(0);   // warn-only — see the header
