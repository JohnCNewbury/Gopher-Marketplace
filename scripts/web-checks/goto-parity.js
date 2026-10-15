/* GO-To parity (audit 10/15; John: "App wins; bugs fixed on both"):
   - AGE-12: the editor's age-restricted toggle is for accounts that may carry
     it (under 21 sees nothing A/R), and an under-21 GO-To that names an
     age-restricted item is a dead stop -- as the app's step-flow GO-To.
   - MONEY-38: the GO-To review prices the GO-To's OWN category/A/R, no promo
     (driven 10/15: Delivery GO-To at $20 -> Request Fees $2.67, total $22.67,
     the app's figure; it showed $23.75).
   - D-55: a GO-To send carries its saved pick-up, drop-off, purchase and A/R,
     as the app posts the full stored body. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok(/canSeeAgeRestricted\(\)\) \? `\s*<button type="button" class="goto-tog \$\{draft\.ageRestricted/.test(src),
   'AGE-12: the GO-To A/R toggle renders only for accounts that may carry it');
ok(/ageRestricted:  tog\('ageRestricted'\) && \(typeof canSeeAgeRestricted === 'function' && canSeeAgeRestricted\(\)\),/.test(src),
   'AGE-12: A/R is never saved for an account that cannot carry it');
ok(/!canSeeAgeRestricted\(\)\s*&& typeof findAgeRestrictedKeyword === 'function' && findAgeRestrictedKeyword\(rec\.details\)\)\{\s*if\(window\.G40_REQ && G40_REQ\.ageRestrictedNotEligible\) G40_REQ\.ageRestrictedNotEligible\(\);\s*return;/.test(src),
   'AGE-12: an under-21 GO-To naming an age-restricted item is a dead stop');
ok(/state\.category = window\.__mapHistoryCategory \? window\.__mapHistoryCategory\(rec\.category\)[\s\S]{0,400}state\.promoApplied = false;\s*return computeRequestFee\(workerPayNum \+ goodsNum\);\s*\} finally \{ state\.category = keep\.c;/.test(src),
   'MONEY-38: the GO-To review prices its own category, no promo, then restores the form');
const send = src.slice(src.indexOf('function launchGoToNow('), src.indexOf('function launchGoToNow(') + 2500);
for (const f of ['pickups:', 'dropoffs:', 'itemsPurchased:', 'costOfItems:', 'ageRestricted:'])
  ok(send.includes(f), `D-55: a GO-To send carries ${f.replace(':', '')}`);
const again = src.slice(src.indexOf('window.__startRequestAgainFast = function'), src.indexOf('window.__startRequestAgainNow = function'));
ok(/if\(prev\.itemsPurchased\)\{/.test(again) && /if\(prev\.ageRestricted && state\.category === 'delivery'/.test(again),
   'D-55: the prefill takes the purchase and (Delivery-only, gated) A/R');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — GO-To set-up, price and send match the app (AGE-12, MONEY-38, D-55)');
process.exit(bad ? 1 : 0);
