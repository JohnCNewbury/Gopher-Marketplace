/* PL-291 (John 10/15): after a hire, the request's "total" is what the
   REQUESTER pays, never worker pay.

   The defect: startJob() printed the SUM OF WORKER PAY as "$X total". Accepting
   Tess B.'s $85.31 counter on GR-00129 read "$28.00 total" directly above a
   recap saying Total $85.31; a bid hire read the bare bid over a recap still
   showing the pre-bid deal. The app shows the order's total_charge after every
   hire (offer + items + fees − discounts: livePriceRows.js "Total").

   This runs the page's OWN functions (extracted from gopher-request.html, not
   re-implemented here) on the numbers from the browser reproduction, and checks
   that startJob() calls them. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

/* The text of `<head> = function(...){ ... };`, by brace matching. */
function extract(head) {
  const i = src.indexOf(head);
  if (i < 0) return null;
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1) + ';';
  }
  return null;
}
const parts = [
  'window.__isBidsRequest = function',
  'window.__bidBreakdown = function',
  'window.__agreedTotalFor = function',
  'window.__applyHiredBid = function',
].map((h) => [h, extract(h)]);
parts.forEach(([h, code]) => ok(!!code, `the page defines ${h.replace(' = function', '')}`));
if (bad) process.exit(1);

const win = { Math, Number, Object, isFinite };
win.window = win;
/* The page's one ITF formula (G40-625): 8% of the base, nearest cent. */
win.__itfCents = (d) => Math.round(Math.round((Number(d) || 0) * 100) * 0.08) / 100;
vm.createContext(win);
parts.forEach(([, code]) => vm.runInContext(code, win));

const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
const feeFor = (cogOffer, age = 0, ts = 0) => {
  const itf = win.__itfCents(cogOffer + 0.99 + age);
  return {
    gopherFee: 0.99, fullGopherFee: 0.99, ageFee: age, fullAgeFee: age,
    instantTransfer: itf, fullInstantTransfer: itf, promo: null, promoDiscount: 0,
    trustShieldDiscount: ts, cogOffer, gmvTotal: cogOffer + 0.99 + age + itf - ts,
  };
};

/* 1. A counter (acceptCounterOffer writes snap.total = the counter's total). */
{
  const fee = feeFor(78);
  const r = { perWorkerCost: 28, reviewSnapshot: { costOfItems: 50, workerPay: 28, total: fee.gmvTotal, fee } };
  ok(money(win.__agreedTotalFor(r)) === '85.31', `counter on GR-00129: $${money(win.__agreedTotalFor(r))} total (was $28.00)`);
}
/* 2. Set price: $30 offer + $20 items. */
{
  const fee = feeFor(50);
  const r = { perWorkerCost: 30, reviewSnapshot: { costOfItems: 20, workerPay: 30, total: fee.gmvTotal, fee } };
  ok(money(win.__agreedTotalFor(r)) === '55.07', `set price: $${money(win.__agreedTotalFor(r))} total (was $30.00)`);
}
/* 3. A bid of $149 on $20 of items: the hired bid becomes the deal. */
{
  const fee = feeFor(20);
  const r = { bidsMode: true, perWorkerCost: 0, reviewSnapshot: { costOfItems: 20, workerPay: 0, bidsMode: true, total: fee.gmvTotal, fee } };
  const w = { name: 'Tess B.', bidAmount: 149 };
  ok(win.__applyHiredBid(r, w) === true, 'a hired bid is written onto the frozen deal');
  ok(money(win.__agreedTotalFor(r)) === '183.59', `bid: $${money(win.__agreedTotalFor(r))} total (was $149.00)`);
  ok(r.reviewSnapshot.workerPay === 149 && money(r.reviewSnapshot.fee.instantTransfer) === '13.60',
     'the recap shows the bid as the offer, with its own transfer fee');
  ok(r.perWorkerCost === 149, "the worker's agreed pay is the bid, as a counter sets it");
  win.__applyHiredBid(r, w);
  ok(money(win.__agreedTotalFor(r)) === '183.59', 'idempotent: a second call lands on the same total');
}
/* 4. A TrustShield holder's bid on an age-restricted request keeps the $1 off. */
{
  const fee = feeFor(20, 3.99, 1);
  const r = { bidsMode: true, reviewSnapshot: { costOfItems: 20, workerPay: 0, bidsMode: true, total: fee.gmvTotal, fee } };
  ok(money(win.__bidBreakdown(r, { bidAmount: 149 }).tsDiscount) === '1.00',
     'the bid breakdown reads trustShieldDiscount (computeRequestFee\'s key)');
  win.__applyHiredBid(r, { bidAmount: 149 });
  ok(money(win.__agreedTotalFor(r)) === '186.90', `TrustShield bid: $${money(win.__agreedTotalFor(r))} total (not $187.90)`);
}
/* 5. No snapshot (a seeded demo row): no total is invented. */
ok(win.__agreedTotalFor({ perWorkerCost: 40 }) === null, 'no snapshot -> null, the caller keeps its label');

/* startJob() must use these, never the old worker-pay sum. */
const sj = extract('function startJob(r, opts)');
ok(!!sj && /window\.__applyHiredBid\(r, hiredList\[0\]\)/.test(sj), 'startJob() applies a hired bid');
ok(!!sj && /window\.__agreedTotalFor\(r\)/.test(sj), 'startJob() takes the total from __agreedTotalFor(r)');
ok(!!sj && !/__agreedTotalFor\(r,\s*hiredList\)/.test(sj), 'startJob() no longer sums worker pay as the total');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — post-hire total (PL-291)');
process.exit(bad ? 1 : 0);
