/**
 * test-age-normalization.js
 *
 * Run: node docs/handoff/request-app-parity/test-age-normalization.js
 *
 * WHY THIS FILE EXISTS — a literal matcher was letting real 21+ orders through
 *   Owner request 2026-09-04, prompted by a support question ("can a driver
 *   deliver a bong from a smoke shop?"). The keyword corpus was far better than
 *   reported — "smoke shop", "head shop", "hookah", "rolling papers" were all
 *   already present, and that exact sentence already flagged on "smoke". The
 *   real defect was narrower and worse: `findAgeRestrictedKeyword` matched
 *   LITERALLY, so a trailing plural, a moved space or a dropped hyphen defeated
 *   it even when the keyword WAS in the corpus.
 *
 *   These are production order titles that did NOT age-gate before the fix:
 *     "Other - Black and milds"   (corpus had "black and mild")
 *     "Other - American spirits"  (corpus had "american spirit")
 *     "White Claws" / "whiteclaw" (corpus had "white claw")
 *   Each one is an untracked 21+ handoff — no ID check, no waiver, no gate.
 *
 *   Measured over all 64,071 production order titles: +35 flagged, 0 lost, and
 *   every gain a true positive.
 *
 * ⚠️ THE GUARDS AT THE BOTTOM ARE THE POINT. The normalisation is deliberately
 *   restricted, and without those restrictions it adds 66 FALSE positives. A
 *   false positive here is a needless ID check on a legitimate order; keep both.
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');   // docs/handoff/request-app-parity -> repo root
const w = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'Final/assets/js/gopher-age-keywords.js'), 'utf8'))(w);
new Function('window', fs.readFileSync(path.join(ROOT, 'Final/assets/js/gopher-age-supplement.js'), 'utf8'))(w);
new Function('window', 'document', fs.readFileSync(path.join(ROOT, 'Final/assets/js/gopher-request-logic.js'), 'utf8'))(
  w, { createElement: () => ({}), addEventListener() {} }
);
const find = w.GopherRequestLogic.findAgeRestrictedKeyword;

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}`);
  if (!cond) { fail++; if (detail) console.log(`         ${detail}`); }
};
const flags = (t) => { const r = find(t); return { hit: !!r, r }; };

console.log('Age-restricted matcher — normalisation + paraphernalia\n');

console.log('  real production titles that used to slip through:');
[
  'Other - Black and milds',
  'Other - American spirits',
  'Other - Butane',
  'White Claws',
  'whiteclaw',
  'Other - Two geekbars',
  'Other - X3 Mavericks',
  'Other - Airbar',
].forEach((t) => { const f = flags(t); ok(`"${t}" gates`, f.hit, `no keyword matched`); });

console.log('\n  paraphernalia the corpus genuinely lacked:');
[
  'bong', 'bongs', 'two bongs', 'a water bong', 'dab rig', 'chillum',
  'one-hitter', 'paraphernalia', 'herb grinder', 'zippo fluid', 'tobacconist',
  'king palms', 'hookah lounge', '4Loko',
].forEach((t) => { const f = flags(t); ok(`"${t}" gates`, f.hit); });

console.log('\n  the sentence that prompted this (already worked — keep it working):');
ok('bong-from-a-smoke-shop question gates',
  flags('Can a delivery driver be able to deliver a bong from a smoke shop?').hit);

/* ---- the guards. Without the two rules in findAgeRestrictedKeyword these fail,
   and each represents a needless ID check on an ordinary delivery. ---- */
console.log('\n  MUST STAY QUIET — ambiguity guards (see AMBIGUOUS_REQUIRE_CONTEXT):');
[
  ['deliver a dozen roses', 'plural of the wine word "rose" — flowers, not wine'],
  ['weeds in the yard', 'plural of "weed"'],
  ['On-call driver, 9am-5pm, 7/31-8/02', 'the nicotine brand is "on!" — the punctuation IS the keyword'],
  ['pipe fitting for the sink', 'bare "pipe" is held back by the generator'],
  ['kitchen grinder', 'bare "grinder" is held back; only qualified forms were added'],
  ['coffee percolator', 'deliberately NOT added — too ambiguous'],
  ['oil rig equipment', 'bare "rig" deliberately NOT added'],
  ['water bubbler for the office', 'deliberately NOT added'],
  ['lighter fluid for the grill', 'deliberately NOT added — charcoal starter'],
  ['mixing bowl', 'bare "bowl" never added'],
].forEach(([t, why]) => { const f = flags(t); ok(`"${t}" stays quiet`, !f.hit, `matched ${JSON.stringify(f.r)} — ${why}`); });

/* Known PRE-EXISTING false positive, asserted so it is not mistaken for a
   regression from this change: "bread and butter" is a wine brand in the corpus
   and matches the pickle. Untouched here — removing it is a corpus decision. */
console.log('\n  known pre-existing behaviour (documented, not introduced here):');
ok('"bread and butter pickles" still matches the wine brand (pre-existing)',
  flags('bread and butter pickles').hit);

console.log(`\n${fail === 0 ? 'ALL PASS' : `${fail} FAILURE(S)`}\n`);
process.exit(fail === 0 ? 0 : 1);
