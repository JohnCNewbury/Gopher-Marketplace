/* The Custom Task port (John 10/13: "Web `other` gets the app's Custom Task
   logic, A/R switch hidden from under-21"; 10/15 "App wins; bugs fixed on
   both"). Web `other` = the live Request app's Custom Task (customTaskFlowSteps.js,
   CustomTaskDetails.js, CustomTaskPickupSwitch.js, customtaskflow.json):
   - B-2 / B-36: Step 4 is a pick-up switch "No pick up — work happens on site"
     (ON by default; OFF = a pick-up + a destination), Unit/Apt under the
     destination only, no stairs, no same-place check, no trip distance.
   - B-15 / D-46 / B-19: the three worker choices, First available the default;
     no crew control.
   - CT-1 / CT-2 / D-7 / MONEY-5: an A/R switch, drawn only for accounts that may
     carry it; on, it carries the $1.99 fee and the TrustShield $1 as the server
     prices `age_restricted?`; no keyword prompt once it is on (owner 10/14 R2).
   - CT-1 / CT-3 / D-24: a purchase switch + cost of items; bids turn the
     purchase off, and the cost check is skipped while bids are on.
   Driven in a browser 10/15 (local copy of the page): Custom Task $40, A/R,
   TrustShield -> Total $46.50 (the app/server figure; was $45.35). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
global.window = global.window || {};
const FR = require(path.join(R, 'Final/assets/js/gopher-flow-rules.js'));
const G = require(path.join(R, 'Final/assets/js/gopher-step-gates.js'));
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

/* 1. Visibility: the shared module's Request base, and the page's own table. */
ok(FR.isVisible('workerSelectChoice', 'other') && !FR.isVisible('workerSetup', 'other'),
   'module: Custom Task shows the worker choice and no crew (B-15, B-19)');
ok(FR.isVisible('pickupSection', 'other') && FR.isVisible('noSpecificPickup', 'other') && !FR.isVisible('destStairs', 'other'),
   'module: Custom Task has the pick-up switch + pick-up and no stairs (B-2, B-36)');
for (const sf of ['connect', 'prototype'])
  ok(!FR.isVisible('workerSelectChoice', 'other', sf) && FR.isVisible('workerSetup', 'other', sf)
     && !FR.isVisible('pickupSection', 'other', sf) && FR.isVisible('destStairs', 'other', sf),
     `module: ${sf} is not ported -- its Custom Task rows did not move`);
const fhf = src.slice(src.indexOf('const FIELD_HIDDEN_FOR = {'), src.indexOf('bidsOption:', src.indexOf('const FIELD_HIDDEN_FOR = {')));
const row = (k) => { const m = new RegExp(k + ':\\s*\\[([^\\]]*)\\]').exec(fhf); return m ? m[1].replace(/['\s]/g, '').split(',').filter(Boolean).sort() : null; };
for (const f of ['workerSetup', 'workerSelectChoice', 'pickupSection', 'noSpecificPickup', 'destStairs'])
  ok(JSON.stringify(row(f)) === JSON.stringify(FR.tableFor()[f].slice().sort()), `page table ${f} == the module's Request base`);
ok(/const UNIT_CATEGORIES = \[[^\]]*'other'\]/.test(src) && !/const PICKUP_UNIT = \[[^\]]*'other'/.test(src),
   'Unit/Apt under the destination only (customtaskflow.json apt / dropoffapt; none at the pick-up)');
ok(!/const NO_FIRST_AVAILABLE = \[[^\]]*'other'/.test(src) && /workerSelection: 'first',/.test(src),
   'First available is offered and is the default (customtaskflow.json available defaultValue true)');

/* 2. The words are the app's. */
for (const w of ['Optional criteria', 'Slide if this custom task includes Age-restricted items',
                 'This task requires a purchase', 'Cost of items needed', 'No pick up — work happens on site',
                 'Requests for bids can’t include buying items, so no cost of items is sent.',
                 "'First available'", "'I&rsquo;ll select my worker'", "'Prioritize MY Gopher(s)'",
                 'the first worker to accept your request is off to the races'])
  ok(src.includes(w), `app words present: ${w.slice(0, 60)}`);
const ct2 = src.slice(src.indexOf("${state.category === 'other' ? `\n      <div class=\"step-section\">\n        <div class=\"step-section-title\">${sstIco('📋')}Optional criteria"));
ok(/^\$\{state\.category === 'other' \? `[\s\S]{0,200}Optional criteria<\/div>\s*\$\{canSeeAgeRestricted\(\) \? `/.test(ct2),
   'CT-2: the Custom Task A/R switch renders only for canSeeAgeRestricted() (under 21 / unknown age sees nothing A/R)');
ok(/function ctPickupDefault\(\)\{\s*if\(state\.category !== 'other'\) return;\s*state\.noSpecificPickup = !/.test(src),
   'B-2: Custom Task opens with "No pick up" ON unless it already has a pick-up');
const fn = src.slice(src.indexOf('function switchCategory(cat){'), src.indexOf('function switchCategory(cat){') + 1600);
ok(/ctPickupDefault\(\);/.test(fn), '... on every category switch');
ok(/state\.category = catKey;\s*ctPickupDefault\(\);/.test(src), '... from the home tiles / iQ (__startRequestWithCategory)');
const again = src.slice(src.indexOf('window.__startRequestAgainFast = function'), src.indexOf('window.__startRequestAgainNow = function'));
ok(/ctPickupDefault\(\);/.test(again), '... and on Request Again (customTaskReopenFields)');
ok(/if\(prev\.ageRestricted && AGE_SWITCH_CATEGORIES\.indexOf\(state\.category\) !== -1/.test(again),
   'Request Again keeps a Custom Task\'s A/R (gated), as customTaskRequestAgainData');

/* 3. Behaviour in the handlers. */
ok(/if\(key === 'ageRestricted' && state\.category === 'delivery' && state\.ageRestricted && !state\.itemsPurchased\)/.test(src),
   'the A/R switch turns the purchase on for DELIVERY only (Custom Task\'s criterion has no onSet)');
ok(/if\(key === 'payMode' && r\.dataset\.val === 'bids' && state\.category === 'other'\)\{\s*state\.itemsPurchased = false;\s*state\.costOfItems = '';/.test(src),
   'CT-3: choosing bids turns the purchase off and zeroes the cost (customtaskflow.json gopher_bid)');
ok(/state\.step === 2 && !state\.ageKeywordAck && !\(state\.category === 'delivery' && state\.ageRestricted\)\s*&& !\(state\.category === 'other' && state\.ageRestricted\)\)\{/.test(src),
   'R2: a Custom Task already marked A/R is not asked the keyword question; every category still scans');
ok(/const twoAddressRoute = \(\) => isVisible\('pickupSection'\) && !state\.noSpecificPickup\s*&& state\.category !== 'other';/.test(src)
   && /if\(!twoAddressRoute\(\)\) return false;/.test(src) && (src.match(/twoAddressRoute\(\)/g) || []).length >= 4,
   'no same-place lookup and no trip distance on a Custom Task');

/* 4. The shared gates (run, not read). */
const host = (bids) => ({ isVisible: (f) => FR.isVisible(f, 'other'), bidsAllowed: () => bids });
const st = (o) => Object.assign({ step: 2, category: 'other', description: 'x', itemsPurchased: true, costOfItems: '',
  payMode: 'set', pickupStops: [''], dropoffStops: [''], noSpecificPickup: false }, o);
ok(G.evaluate(st({}), host(true)).id === 'costOfItems', 'D-24: a Custom Task purchase needs its cost');
ok(G.evaluate(st({ payMode: 'bids' }), host(true)).ok === true, 'CT-3: ... unless bids are on (ctStepProblem: !gopher_bid)');
ok(G.evaluate(st({ payMode: 'bids' }), { isVisible: () => true }).id === 'costOfItems',
   '... and a host without bidsAllowed() keeps the gate (it blocks, never no-ops)');
ok(G.evaluate(st({ category: 'delivery', payMode: 'bids' }), host(false)).id === 'costOfItems',
   'Delivery keeps its cost check (no bids there)');
const same = { step: 4, pickupStops: ['123 Main St'], dropoffStops: ['123 Main St'], noSpecificPickup: false };
ok(G.evaluate(Object.assign({ category: 'other' }, same), { isVisible: () => true, bidsAllowed: () => true }).ok === true,
   'no same-place block on a Custom Task (app: no samePlace; server: no "Other" in TWO_ADDRESS_CATEGORIES)');
ok(G.evaluate(Object.assign({ category: 'delivery' }, same), { isVisible: () => true, bidsAllowed: () => true }).id === 'addressesDiffer',
   'Delivery still blocks the same place (G40-274)');
ok(G.evaluate({ step: 4, category: 'other', noSpecificPickup: false, pickupStops: [''], dropoffStops: ['2 B St'] },
   { isVisible: (f) => FR.isVisible(f, 'other') }).id === 'pickupAddress',
   'B-2: with the switch OFF the pick-up is required (ctStepProblem: "Please enter the pick-up address.")');
ok(G.evaluate({ step: 4, category: 'other', noSpecificPickup: true, pickupStops: [''], dropoffStops: ['2 B St'] },
   { isVisible: (f) => FR.isVisible(f, 'other') }).ok === true, '... and with it ON only the destination');

/* 5. The fee, RUN: the page's own fee block on a fake state. */
const a = src.indexOf('const GOPHER_FEE = {');
const b = src.indexOf('// ---- Age-restricted keyword backstop');
const L = {};
vm.runInContext(fs.readFileSync(path.join(R, 'Final/assets/js/gopher-request-logic.js'), 'utf8'),
  vm.createContext({ window: L, console, localStorage: { getItem() { return null; }, setItem() {} } }));
const price = (st0, ts) => {
  const ctx = vm.createContext({ window: { GopherRequestLogic: L.GopherRequestLogic, __hasTrustShield: () => ts }, state: st0, render() {} });
  vm.runInContext(src.slice(a, b) + '\n;this.__f = computeRequestFee;', ctx);
  return ctx.__f;
};
const money = (n) => Number(n).toFixed(2);
const base = { promoApplied: false, promoCode: '', fromDeal: false };
ok(a > 0 && b > a, 'the fee block is found');
ok(money(price(Object.assign({ category: 'other', ageRestricted: true }, base), true)(40).gmvTotal) === '46.50',
   'MONEY-5: Custom Task $40 + A/R + TrustShield = $46.50 (server: 40 + 1.99 + 1.99 + 3.52 - 1.00)');
ok(money(price(Object.assign({ category: 'other', ageRestricted: true }, base), false)(40).gmvTotal) === '47.50',
   'Custom Task $40 + A/R, no TrustShield = $47.50');
ok(money(price(Object.assign({ category: 'other', ageRestricted: false }, base), true)(40).gmvTotal) === '45.35',
   'Custom Task $40, no A/R: no fee, no TrustShield $1 = $45.35');
ok(money(price(Object.assign({ category: 'delivery', ageRestricted: true }, base), true)(50).gmvTotal) === '56.22',
   'Delivery A/R $50 + TrustShield unchanged = $56.22');
ok(money(price(Object.assign({ category: 'moving', ageRestricted: true }, base), true)(40).fullAgeFee) === '0.00',
   'a stale A/R flag on a category with no A/R switch carries no fee');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — web Custom Task runs the app\'s Custom Task logic (B-2, B-15, B-19, B-36, CT-1..3, D-7, D-24, D-46, MONEY-5)');
process.exit(bad ? 1 : 0);
