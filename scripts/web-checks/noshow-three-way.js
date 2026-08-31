/* Holds ALL THREE implementations of the 10-minute no-show window to one rule.

     1. mobile   scripts/web-checks/vendor/noShow.js   (byte-identical copy of
                 gopher-mobile-request/src/helpers/noShow.js)
     2. web      Final/gopher-request.html             — noShowStateFrom
     3. prototype _prototypes/Go/gopher-go-prototype.html — noShowWindowFrom

   noshow-parity.js already binds 1↔2, which share a signature. This binds the
   prototype in, and it does NOT share one — deliberately, per the session that
   extracted it:

     • It takes a DEADLINE, not (reminded, remindedAt, aasmState). The prototype
       has no aasm state and no backend reminder — the Gopher opens the window by
       tapping "Customer not present" — so a deadline is the honest input. The
       mapping `deadlineMs = Date.parse(remindedAt) + NO_SHOW_WINDOW_MS` is
       applied HERE, outside all three functions, for the same reason the web→aasm
       mapping lives outside the ported helper.
     • It returns `msLeft`, not a formatted clock. The prototype renders M:SS and
       the mobile helper MM:SS. That is a DISPLAY difference, not a rule
       difference, and comparing strings would either report a divergence that
       isn't one or push someone to "fix" the prototype's visuals to satisfy a
       test. So this compares EXPIRY and the DISPLAYED SECOND, never formatting.

   Out of scope, stated rather than silently skipped: the mobile/web pair gate on
   `reminded` and on aasm state; the prototype has no equivalent concept, so
   cases that are inactive *because of that gate* have nothing to compare against
   and are counted separately below.                                            */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const RULE  = path.join(__dirname, 'vendor', 'noShow.js');
const WEB   = path.join(REPO, 'Final', 'gopher-request.html');
const PROTO = path.join(REPO, '_prototypes', 'Go', 'gopher-go-prototype.html');

function loadMobile() {
  const src = fs.readFileSync(RULE, 'utf8').replace(/\bexport\s+/g, '');
  return new Function(src + '\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};')();
}
function loadWeb() {
  const h = fs.readFileSync(WEB, 'utf8');
  const win = h.match(/const NO_SHOW_WINDOW_MS = [^\n]+/);
  const sts = h.match(/const NO_SHOW_STATES = [^\n]+/);
  const fn  = h.match(/function noShowStateFrom\(reminded, remindedAt, aasmState, nowMs\)\{[\s\S]*?\n  \}/);
  if (!win || !sts || !fn) { console.log('  ✗ could not extract the WEB port'); process.exit(1); }
  return new Function(`${win[0]}\n${sts[0]}\n${fn[0]}\n;return {noShowStateFrom, NO_SHOW_WINDOW_MS};`)();
}
function loadProto() {
  const h = fs.readFileSync(PROTO, 'utf8');
  const win = h.match(/const NO_SHOW_WINDOW_MS = [^\n]+/);
  const fn  = h.match(/function noShowWindowFrom\(deadlineMs, nowMs\)\{[\s\S]*?\n    \}/);
  if (!win || !fn) {
    console.log('  ✗ could not extract noShowWindowFrom from the Go prototype.');
    console.log('    If openNoShowTimer went back to counting ticks, that is the regression this exists to catch.');
    process.exit(1);
  }
  return new Function(`${win[0]}\n${fn[0]}\n;return {noShowWindowFrom, NO_SHOW_WINDOW_MS};`)();
}

const M = loadMobile(), W = loadWeb(), P = loadProto();

let bad = 0, compared = 0, gateOnly = 0;
const fail = (m) => { bad++; if (bad <= 8) console.log('  ✗ ' + m); };

// All three must agree the window is ten minutes.
[['web', W.NO_SHOW_WINDOW_MS], ['prototype', P.NO_SHOW_WINDOW_MS]].forEach(([n, v]) => {
  if (v !== M.NO_SHOW_WINDOW_MS) fail(`window differs: mobile ${M.NO_SHOW_WINDOW_MS} vs ${n} ${v}`);
});

// clock "MM:SS" -> whole seconds, so we compare the SECOND SHOWN, not its padding.
const clockSecs = (c) => { const m = /^(\d+):(\d\d)$/.exec(c || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

const T0 = Date.UTC(2026, 7, 31, 12, 0, 0);
const iso = (ms) => new Date(ms).toISOString();
const OFFSETS = [0, 1, 999, 1000, 59_000, 60_000, 61_000, 5 * 60_000,
                 10 * 60_000 - 1, 10 * 60_000, 10 * 60_000 + 1, 30 * 60_000];

for (const off of OFFSETS) {
  const remindedAt = iso(T0 - off);                 // reminder fired `off` ms ago
  const deadlineMs = Date.parse(remindedAt) + M.NO_SHOW_WINDOW_MS;

  const m = M.noShowStateFrom(true, remindedAt, 'purchased', T0);
  const w = W.noShowStateFrom(true, remindedAt, 'purchased', T0);
  const p = P.noShowWindowFrom(deadlineMs, T0);

  if (JSON.stringify(m) !== JSON.stringify(w)) fail(`mobile≠web at -${off}ms: ${JSON.stringify(m)} vs ${JSON.stringify(w)}`);
  if (!m.active) { gateOnly++; continue; }
  compared++;

  if (m.expired !== p.expired)
    fail(`EXPIRY disagrees at -${off}ms: mobile ${m.expired}, prototype ${p.expired}`);

  if (!m.expired) {
    const ms = clockSecs(m.clock);
    const ps = Math.floor(p.msLeft / 1000);
    if (ms !== ps) fail(`SECOND SHOWN disagrees at -${off}ms: mobile "${m.clock}" (${ms}s), prototype ${ps}s`);
  }
}

/* GATE CASES — stated, not silently skipped. The mobile/web pair refuse to
   activate when `reminded` is false or the aasm state is wrong; the prototype
   has no equivalent concept, so there is nothing to compare. Exercise them
   anyway and COUNT them, so the number reported at the end is real rather than
   a zero that could never be anything else. The pair's own behaviour on these is
   covered by the 84-case noshow-parity.js. */
const GATE = [
  [false, 'purchased'],   // reminder never fired
  [true,  'accepted'],    // wrong state — worker not out yet
  [true,  'delivered'],   // wrong state — already finished
  [true,  ''],            // no state at all
];
for (const [reminded, state] of GATE) {
  const remindedAt = iso(T0 - 60_000);
  const m = M.noShowStateFrom(reminded, remindedAt, state, T0);
  const w = W.noShowStateFrom(reminded, remindedAt, state, T0);
  if (JSON.stringify(m) !== JSON.stringify(w))
    fail(`mobile≠web on gate case (reminded=${reminded}, state="${state}")`);
  if (m.active) fail(`gate case should be inactive: reminded=${reminded}, state="${state}"`);
  gateOnly++;
}

// The prototype's own degradation: no deadline => not active. Nothing to compare
// against mobile (which degrades on a missing timestamp instead), so assert it directly.
[null, undefined, 0, NaN, Infinity].forEach((d) => {
  const r = P.noShowWindowFrom(d, T0);
  if (r.active || r.expired) fail(`prototype should be inactive for deadline ${String(d)}, got ${JSON.stringify(r)}`);
});

// ⛔ The regression that started all this: elapsed time must come from the CLOCK,
// not from ticks. Same function, zero ticks fired, only `now` advances.
const dl = T0 + M.NO_SHOW_WINDOW_MS;
if (P.noShowWindowFrom(dl, T0 + 5 * 60_000).msLeft !== 5 * 60_000)
  fail('prototype did not advance with the clock across 5 minutes with no ticks');
if (!P.noShowWindowFrom(dl, T0 + 10 * 60_000).expired)
  fail('prototype did not expire on the clock at 10 minutes with no ticks');

console.log(bad
  ? `\nFAIL — ${bad} divergence(s). The three implementations of the no-show window no longer agree.`
  : `PASS — 3 implementations agree (${compared} timing cases compared, ${gateOnly} gate case(s) verified inactive on the pair, no prototype counterpart)`);
process.exit(bad ? 1 : 0);
