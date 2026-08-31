/* Holds the web no-show block to the LIVE requester app's rule — by BEHAVIOUR,
   not by a comment.

   Why this exists (code-33, G40-192, 2026-08-31): there are now three
   implementations of the same 10-minute window — the mobile helper, this web
   port, and the Go prototype. The prototype is the one that already drifted
   (tick counter vs wall clock). A provenance comment records intent; it cannot
   fail. This can.

   It extracts `noShowStateFrom` from BOTH sources and runs them over the same
   input matrix, asserting identical {active, expired, clock}. Behavioural
   equivalence rather than text matching, so reformatting the helper does not
   raise a false alarm but changing its RULE does.

   Live source: gopher-mobile-request/src/helpers/noShow.js
   Web port:    Final/gopher-request.html  (buildNoShowBlock's helper)          */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
/* The rule is read from the VENDORED byte-identical copy, never from a sibling
   clone. Reading the clone made this test SKIP whenever it was absent — i.e. in
   most checkouts, and exactly when someone edits the web port with no way to
   notice drift. Parity is now unconditional; staleness is what degrades, and
   noshow-freshness.js owns that. See vendor/PROVENANCE.md. */
const RULE = path.join(__dirname, 'vendor', 'noShow.js');
const WEB  = path.join(REPO, 'Final', 'gopher-request.html');

function loadRule() {
  const src = fs.readFileSync(RULE, 'utf8').replace(/\bexport\s+/g, '');
  /* ⚠️ BOUNDARY: the vendored helper takes `aasmState` as a PARAMETER; the
     web→aasm mapping lives outside it, in gopher-request.html. If that mapping
     is ever pushed in here the copy stops being upstream's and the sha check
     becomes theatre — so assert the vendored file carries no web vocabulary.

     COMMENTS ARE STRIPPED FIRST, deliberately. Upstream's own header now points
     BACK at this copy and names `Final/gopher-request.html`; documenting the
     boundary must never trip the check that enforces it. Scanning raw text would
     make the first person to describe the mapping in prose hit a hard failure
     for doing the right thing — and a check that cries wolf gets deleted. Test
     the CODE, not the commentary. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (': //' in a URL survives)
  if (/in-progress|GWeb|reviewSnapshot|dashState/.test(code)) {
    console.log('  ✗ vendored rule contains WEB vocabulary IN CODE — the mapping has leaked inside it');
    process.exit(1);
  }
  return new Function(src + '\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};')();
}

function loadWeb() {
  const html = fs.readFileSync(WEB, 'utf8');
  const win = html.match(/const NO_SHOW_WINDOW_MS = [^\n]+/);
  const sts = html.match(/const NO_SHOW_STATES = [^\n]+/);
  const fn  = html.match(/function noShowStateFrom\(reminded, remindedAt, aasmState, nowMs\)\{[\s\S]*?\n  \}/);
  if (!win || !sts || !fn) {
    console.log('  \u2717 could not extract the web port — did buildNoShowBlock change shape?');
    process.exit(1);
  }
  return new Function(`${win[0]}\n${sts[0]}\n${fn[0]}\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};`)();
}

const live = loadRule();
const web = loadWeb();

const T0 = Date.UTC(2026, 7, 31, 12, 0, 0);
const iso = ms => new Date(ms).toISOString();
const CASES = [];
for (const reminded of [true, false])
  for (const remindedAt of [null, '', 'not-a-date', iso(T0), iso(T0 - 9 * 60000), iso(T0 - 10 * 60000), iso(T0 - 11 * 60000)])
    for (const state of ['purchased', 'picked_up', 'accepted', 'delivered', '', undefined])
      CASES.push([reminded, remindedAt, state, T0]);

let bad = 0;
if (live.NO_SHOW_WINDOW_MS !== web.NO_SHOW_WINDOW_MS) {
  bad++;
  console.log(`  ✗ window differs: live ${live.NO_SHOW_WINDOW_MS} vs web ${web.NO_SHOW_WINDOW_MS}`);
}
for (const c of CASES) {
  const a = JSON.stringify(live.noShowStateFrom(...c));
  const b = JSON.stringify(web.noShowStateFrom(...c));
  if (a !== b) {
    bad++;
    if (bad <= 6) console.log(`  ✗ ${JSON.stringify(c)}\n      live ${a}\n      web  ${b}`);
  }
}
console.log(bad
  ? `\nFAIL — ${bad} divergence(s) across ${CASES.length} cases. The web port no longer matches the live rule.`
  : `PASS — ${CASES.length} cases, web port matches the vendored requester-app rule exactly`);
process.exit(bad ? 1 : 0);
