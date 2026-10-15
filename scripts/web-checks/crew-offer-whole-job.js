/* RQ-51 (John 10/15, "Whole job (app)"): on Yard, Moving and Junk the offer
   is for the WHOLE job; only Labor is per Gopher x the crew -- as the app
   (laborFlowSteps.js multiplies; yard/moving/junk send the offer unchanged) and
   the server (one Gopher hired, one offer paid) have it.

   Driven in a browser on 10/15 (local copy of the page):
     Yard  $50, 3 workers -> Review total $58.31 (app/server $58.31; was $166.31)
     Labor $20, 3 workers -> offer $60.00, total $68.03 (unchanged) */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok(/const payCrew = \(\) => state\.category === 'labor' \? crewCount\(\) : 1;/.test(src),
   'payCrew() multiplies by the crew for Labor only');
for (const [name, re] of [
  ['the frozen deal', /const snapWorkerPay = perWorker \* payCrew\(\);/],
  ['the request record total', /var tot = perWorker \* payCrew\(\) \+ cog;/],
  ['Review', /const workerPayNum = perWorkerPay \* payCrew\(\);/],
  ['Step 7', /const s7workerPayNum = s7perWorkerPay \* payCrew\(\);/],
]) ok(re.test(src), `${name} prices with payCrew()`);
ok(!/perWorkerPay \* workerCount|s7perWorkerPay \* s7workerCount|perWorker \* workersNeeded/.test(src),
   'no price multiplies by the head count any more');
ok(/!isCompletedFlow\(\) && payCrew\(\) > 1 && !bidsMode/.test(src),
   'the per-worker breakdown shows for Labor crews only');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — crew offer is the whole job except Labor (RQ-51)');
process.exit(bad ? 1 : 0);
