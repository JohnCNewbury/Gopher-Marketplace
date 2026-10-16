/* Three money details, as the app/server have them (audit 10/15; John: "App
   wins; bugs fixed on both"). Driven in a browser 10/15:
   - MONEY-2: "0.004" typed in the offer -> "0.00" (two decimals, as the app's
     currency field). It used to pass the > $0 check as a sub-cent offer.
   - MONEY-17: Delivery with $100 of items, offer $10 -> the app's note under the
     field; $20 -> hidden; Continue goes on (no pop-up).
   - MONEY-26: Yard $20 (total $25.91) -> "bringing the hold to $31.10", the
     server's authorisation (total + ceil 20%); it showed $31.09. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok((src.match(/v\.slice\(firstDot\+1\)\.replace\(\/\\\.\/g,''\)\.slice\(0, 2\);/g) || []).length === 2,
   'MONEY-2: the offer and cost fields keep two decimals');

const hf = src.match(/const holdFor = \(total\) => \{\s*const c = Math\.round\(Number\(total \|\| 0\) \* 100\);\s*return \(c \+ Math\.ceil\(c \* 20 \/ 100\)\) \/ 100;\s*\};/);
ok(!!hf, 'MONEY-26: holdFor() is the server rule (cents + ceil 20%)');
if (hf) {
  const holdFor = (total) => { const c = Math.round(Number(total || 0) * 100); return (c + Math.ceil(c * 20 / 100)) / 100; };
  for (const [t, h] of [[25.91, 31.10], [25.86, 31.04], [25.92, 31.11], [10, 12]]) ok(holdFor(t) === h, `hold for $${t} = $${h.toFixed(2)}`);
}
ok(/bringing the hold to <b>\$\{fmt\(holdFor\(totalNum\)\)\}<\/b>/.test(src), 'MONEY-26: the Review sentence uses it');

ok(!/__openLowOfferNotice\(offerModel\)\) return;/.test(src), 'MONEY-17: the low offer no longer stops Continue');
ok(src.includes('That’s a little on the low side for a request like this. An offer in the “fair” range gets accepted faster — but you can still send as-is if you prefer.'),
   "MONEY-17: the app's words, under the field");
ok(/data-low-offer-ack/.test(src) && /syncLowOfferNote\(\);\s*\/\/ MONEY-17: the note follows the typing/.test(src),
   'MONEY-17: "Send as-is" dismisses it, and it follows the typing');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — offer precision, low-offer note and hold match the app (MONEY-2/17/26)');
process.exit(bad ? 1 : 0);
