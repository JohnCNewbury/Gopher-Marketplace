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
// REPO is .../All New Gopher/Documentation/Claude Code Review:Cleanup/Code
// so the sibling Dev/ tree is three levels up, not two.
const LIVE = path.join(REPO, '..', '..', '..', 'Dev', 'gopher-mobile-request', 'src', 'helpers', 'noShow.js');
const WEB  = path.join(REPO, 'Final', 'gopher-request.html');

function loadLive() {
  if (!fs.existsSync(LIVE)) return null;                 // clone absent — see note below
  const src = fs.readFileSync(LIVE, 'utf8').replace(/\bexport\s+/g, '');
  return new Function(src + '\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};')();
}

function loadWeb() {
  const html = fs.readFileSync(WEB, 'utf8');
  const win = html.match(/const NO_SHOW_WINDOW_MS = [^\n]+/);
  const sts = html.match(/const NO_SHOW_STATES = [^\n]+/);
  const fn  = html.match(/function noShowStateFrom\(reminded, remindedAt, aasmState, nowMs\)\{[\s\S]*?\n  \}/);
  if (!win || !sts || !fn) {
    console.log('  ✗ could not extract the web port — did buildNoShowBlock change shape?');
    process.exit(1);
  }
  return new Function(`${win[0]}\n${sts[0]}\n${fn[0]}\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};`)();
}

const live = loadLive();
if (!live) {
  console.log('  ⚠ SKIPPED — gopher-mobile-request clone not found at ' + LIVE);
  console.log('    The web port is unverified against live in this checkout. Not a pass.');
  process.exit(0);
}
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
  : `PASS — ${CASES.length} cases, web port matches gopher-mobile-request/src/helpers/noShow.js exactly`);
process.exit(bad ? 1 : 0);
