/* ONE definition of "the hiring stage is over", used by every surface.

   The drift this exists to stop, observed 2026-09-23 on one day's work:

     request web   in-progress | active | scheduled          (no completed)
     connect       in-progress | active            (no scheduled, no completed)
     connect card  no test at all — "Remove" showed at every stage

   All three want the same thing. Missing 'completed' is why a finished request
   grew its "Remove" button back and re-showed the start-job bar under a banner
   reading "Request Completed by …". I fixed it in gopher-request.html and left
   gopher-connect.html broken — which is exactly the failure mode this guard
   names: a shared decision living in two 3 MB HTML files instead of one module.

   Same shape as the parity harness's DELEGATE check: the surfaces must CALL the
   shared function, not re-implement it. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..', '..');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

const win = {}; win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(R, 'Final/assets/js/gopher-request-logic.js'), 'utf8'), win);
const L = win.GopherRequestLogic;

ok(typeof L.jobHasStarted === 'function', 'the shared module exports jobHasStarted()');
for (const [st, want] of [['in-progress', true], ['active', true], ['scheduled', true],
                          ['completed', true], ['pending', false], ['', false]]) {
  ok(L.jobHasStarted({ status: st }) === want, `status ${JSON.stringify(st)} -> ${want}`);
}
ok(L.jobHasStarted(null) === false, 'null-safe');
ok((L.JOB_STARTED_STATUSES || []).indexOf('completed') > -1,
   "'completed' is IN the list — its absence is the original defect");

/* Neither surface may carry its own copy of the list. */
for (const f of ['Final/gopher-request.html', 'Final/gopher-connect.html']) {
  const src = fs.readFileSync(path.join(R, f), 'utf8');
  ok(/GopherRequestLogic\s*&&\s*window\.GopherRequestLogic\.jobHasStarted|GopherRequestLogic\.jobHasStarted/.test(src),
     `${path.basename(f)} calls the shared jobHasStarted()`);
  ok(/jobBlocksCancel/.test(src), `${path.basename(f)} calls the shared jobBlocksCancel()`);
  /* ⚠️ NOT asserting "only one status list in the file". Tried it; it counts
     SEMANTICALLY DIFFERENT tests as duplication — the cost-adjustment window
     (`in-progress` only), the substage map, "find the active request". They
     merely share a substring with the two decisions this guard owns. A guard
     that flags working code teaches people to ignore it. What IS asserted:
     both surfaces delegate, and the bare two-status form no longer appears
     where those two decisions are made. */
  ok(!/const _started = r\.status === 'in-progress' \|\| r\.status === 'active';/.test(src),
     `${path.basename(f)} no longer hard-codes the cancel rule inline`);
}

console.log(bad ? `\nFAIL — ${bad} check(s)` : '\nPASS — one lifecycle definition, both surfaces delegating');
process.exit(bad ? 1 : 0);
