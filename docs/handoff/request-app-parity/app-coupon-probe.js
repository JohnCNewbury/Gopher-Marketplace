#!/usr/bin/env node
/* Web vs the LIVE server: what a promo code takes off (D9, ruled 2026-10-15).

   node app-coupon-probe.js <Code repo root> <dir holding helpers/coupon_discount.js,
                                                constants/index.js and shared/Logger.js>

   Called by run_parity_harness.py section 8, which extracts the server's
   helpers/coupon_discount.js and constants/index.js from gopher-backend-api
   `origin/production` into a temp dir (with a silent Logger). couponDiscount() is
   pure, so BOTH sides are RUN on the same inputs: the server's function as-is and
   the web's copy in the shared logic module. Prints one JSON line. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const [root, apiDir] = process.argv.slice(2);
const { couponDiscount: srv } = require(path.join(apiDir, 'helpers', 'coupon_discount.js'));
const win = {};
vm.runInContext(fs.readFileSync(path.join(root, 'Final/assets/js/gopher-request-logic.js'), 'utf8'),
  vm.createContext({ window: win, console, localStorage: { getItem() { return null; }, setItem() {} } }));
const L = win.GopherRequestLogic;
if (!L || typeof L.couponDiscount !== 'function') {
  console.log(JSON.stringify({ error: 'shared module lacks couponDiscount' }));
  process.exit(0);
}
// The web page must USE it (a promo rule pasted back inline is the old drift).
const page = fs.readFileSync(path.join(root, 'Final/gopher-request.html'), 'utf8');
const delegates = /GopherRequestLogic\.couponDiscount\(/.test(page) && !/feeMultiplier/.test(page);

const cases = [];
// Gopher fees of every category, the ITF of a few totals, A/R portions (0, 0.99 with TrustShield, 1.99).
for (const fee of [0.99, 1.99, 2.99, 3.99, 4.99])
  for (const itf of [0.88, 1.2, 2.04, 9.99])
    for (const ar of [0, 0.99, 1.99])
      for (const [type, value] of [['percentOff', 10], ['percentOff', 50], ['percentOff', 100],
        ['amountOff', 0.5], ['amountOff', 1], ['amountOff', 2], ['amountOff', 5], ['amountOff', 25]])
        for (const flag of [false, true]) {
          const coupon = { type, value, reduces: 'both', age_restricted_discount: flag };
          const w = L.couponDiscount(fee, itf, coupon, ar).discount_amount;
          const s = srv(fee, itf, coupon, ar).discount_amount;
          cases.push({ fee, itf, ar, type, value, flag, web: w, server: s, same: w === s });
        }
console.log(JSON.stringify({ delegates, n: cases.length, diff: cases.filter((c) => !c.same) }));
