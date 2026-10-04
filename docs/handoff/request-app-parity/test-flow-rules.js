#!/usr/bin/env node
/* Tests for the shared flow rule set (gopher-flow-rules.js).
   Run: node docs/handoff/request-app-parity/test-flow-rules.js   (exit 0 = pass)

   The module holds three things three surfaces currently duplicate: which fields a
   category shows, which fields a category owns, and which categories are priced.

   Two of these tests exist because of real defects rather than theory:
     - `aiPaySuggest` must be visible for exactly the priced categories. The app
       prototype broke this when Moving joined PRICED_CATEGORIES on 2026-08-08 and
       its visibility table was not updated, so the app would ship without Moving
       pay suggestions.
     - `multiStop` is BUILT in both web surfaces but switched off in the consumer
       flow. A test pins that, so nobody "tidies up" a dark-but-deliberate feature.

   Per the standing rule in this repo, the invariant checker is also proven to FAIL
   on a broken table — a green test that cannot fail proves nothing.
*/
'use strict';

var path = require('path');
var R = require(path.join(__dirname, '..', '..', '..', 'Final', 'assets', 'js', 'gopher-flow-rules.js'));

var pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (detail ? '  → ' + detail : '')); }
}
function section(t) { console.log('\n' + t); }

/* ═══ 1. The category vocabulary ══════════════════════════════════════════════ */
section('1. Categories — the enum the backend category_id work adopts');
(function () {
  ok(R.CATEGORIES.length === 8, 'exactly 8 canonical categories', String(R.CATEGORIES.length));

  var keys = R.CATEGORIES.map(function (c) { return c.key; });
  var slugs = R.CATEGORIES.map(function (c) { return c.slug; });
  ok(new Set(keys).size === 8, 'keys are unique');
  ok(new Set(slugs).size === 8, 'slugs are unique');
  ok(R.CATEGORIES.every(function (c) { return c.key && c.slug && c.label; }),
     'every category has key, slug and label');

  /* The slugs must match the classifier vocabulary already shipping in
     gopher-request-logic.js, or the category id would disagree with iQ. */
  ok(R.categoryBy('key', 'junk').slug === 'junk_removal', 'junk → junk_removal');
  ok(R.categoryBy('key', 'ride').slug === 'ride_sharing', 'ride → ride_sharing');
  ok(R.categoryBy('key', 'yard').slug === 'yard_work_outdoor_projects', 'yard → yard_work_outdoor_projects');
  ok(R.categoryBy('key', 'labor').slug === 'hourly_day_labor', 'labor → hourly_day_labor');
  ok(R.categoryBy('slug', 'home_services').key === 'home', 'reverse lookup by slug works');
  ok(R.categoryBy('key', 'nope') === null, 'unknown lookup returns null, does not throw');
})();

/* ═══ 2. Visibility — the consumer baseline ═══════════════════════════════════ */
section('2. Visibility — baseline behaviour');
(function () {
  ok(R.isVisible('describe', 'delivery') === true, 'describe shows for delivery');
  ok(R.isVisible('describe', 'ride') === false, 'describe hidden for ride');
  ok(R.isVisible('riderInfo', 'ride') === true, 'rider info shows only for ride');
  ok(R.isVisible('riderInfo', 'delivery') === false, 'rider info hidden for delivery');
  ok(R.isVisible('hazardous', 'junk') === true, 'hazardous is junk-only');
  ok(R.isVisible('hazardous', 'moving') === false, 'hazardous hidden for moving');
  ok(R.isVisible('itemInfo', 'moving') === true && R.isVisible('itemInfo', 'junk') === true,
     'item info shows for moving AND junk');

  /* Defensive: an unknown field must not throw. A surface asking for a field its
     table lacks is exactly how `FIELD_HIDDEN_FOR[field].includes()` crashes. */
  ok(R.isVisible('somethingNobodyDefined', 'delivery') === true,
     'unknown field is visible and does NOT throw');

  ok(R.visibleCategories('deliveryType').join(',') === 'delivery',
     'deliveryType is delivery-only');
})();

/* ═══ 3. Surface overrides — Connect is a different product ═══════════════════ */
section('3. Surface overrides');
(function () {
  ok(R.visibleCategories('multiStop').length === 0,
     'multiStop is dark in the consumer flow (built, switched off)');
  ok(R.visibleCategories('multiStop', 'connect').join(',') === 'delivery,ride',
     'multiStop is live in Connect for delivery and ride');
  ok(R.isVisible('multiStop', 'delivery') === false &&
     R.isVisible('multiStop', 'delivery', 'connect') === true,
     'the same field differs by surface — which is the point of the override layer');

  /* ⚠️ UPDATED 2026-10-04 (G40-576). These two were 'multiStop is the ONLY dark
     field' and 'exactly ONE field differs' — true when written, and both went red
     when the baseline was corrected to Request's real values. They are kept as
     EXACT-SET comparisons rather than relaxed to counts, so a FOURTH difference
     still fails here instead of landing silently. */
  ok(R.darkFields().join(',') === 'multiStop,serviceElevator',
     'exactly multiStop + serviceElevator are dark in the baseline', R.darkFields().join(','));
  ok(R.darkFields('connect').length === 0, 'Connect has no dark fields');

  /* 14 of 17 fields are identical across surfaces; these three legitimately differ. */
  var base = R.tableFor(), connect = R.tableFor('connect');
  var differing = Object.keys(base).filter(function (f) {
    return base[f].join(',') !== connect[f].join(',');
  });
  ok(differing.join(',') === 'multiStop,serviceElevator,workerSelectChoice',
     'exactly THREE fields differ between the surfaces', differing.join(','));

  /* The two rulings behind the new overrides, asserted as behaviour and not as
     table shape — a future edit that flips either one fails here by name. */
  ok(R.visibleCategories('serviceElevator').length === 0 &&
     R.visibleCategories('serviceElevator', 'connect').join(',') === 'moving',
     'service elevator is a CONNECT feature for Moving and is never shown on Request (MV-11)',
     'request=' + R.visibleCategories('serviceElevator').join(',') +
     ' connect=' + R.visibleCategories('serviceElevator', 'connect').join(','));
  ok(R.isVisible('workerSelectChoice', 'moving') === true &&
     R.isVisible('workerSelectChoice', 'moving', 'connect') === false,
     'Request offers Moving the worker-select choice; Connect does not (owner ruled 2026-10-04: deliberate, Connect uses eligibleWorkers)');

  /* G40-578 / JR-34, 2026-10-04. Both are owner rulings, pinned as BEHAVIOUR so
     that reverting either one fails here by name rather than as a table diff. */
  ok(R.isVisible('workerSelectChoice', 'labor') === true,
     'Labor shows the worker-select choice on Request (G40-578)');
  ok(R.isVisible('workerSelectChoice', 'labor', 'connect') === false,
     'Connect hides it for Labor too -- no "Prioritize MY Gopher(s)" row by design (owner ruled 2026-10-04)');
  ok(R.isVisible('destStairs', 'junk') === false &&
     R.isVisible('destStairs', 'junk', 'connect') === false,
     'Junk asks NO stairs question on either dashboard (JR-34)',
     'request=' + R.isVisible('destStairs', 'junk') + ' connect=' + R.isVisible('destStairs', 'junk', 'connect'));
  ok(R.isVisible('destStairs', 'labor') === true,
     'Labor DOES keep its destination stairs question (INV-13) -- JR-34 is Junk only');
})();

/* ═══ 4. The pricing invariant — the one that caught a real defect ════════════ */
section('4. Pricing invariant');
(function () {
  ok(R.PRICED_CATEGORIES.slice().sort().join(',') === 'delivery,junk,moving,ride',
     'priced categories are delivery, ride, moving, junk (moving joined 2026-08-08)');
  ok(R.isPricedCategory('moving') === true, 'moving IS priced');
  ok(R.isPricedCategory('home') === false, 'home services is not priced');

  var payVisible = R.visibleCategories('aiPaySuggest').slice().sort().join(',');
  var priced = R.PRICED_CATEGORIES.slice().sort().join(',');
  ok(payVisible === priced,
     'aiPaySuggest is visible for EXACTLY the priced categories', payVisible + ' vs ' + priced);

  ok(R.assertInvariants().length === 0,
     'the module passes its own self-check', JSON.stringify(R.assertInvariants()));
})();

/* ═══ 5. Prove the checker can FAIL ══════════════════════════════════════════ */
section('5. The invariant checker is not vacuous');
(function () {
  /* Reproduce the prototype's actual defect — hide aiPaySuggest for moving — and
     confirm the checker catches it. Mutating a copy, never the live table. */
  var saved = R.BASE_HIDDEN_FOR.aiPaySuggest;
  R.BASE_HIDDEN_FOR.aiPaySuggest = saved.concat(['moving']);
  var broken = R.assertInvariants();
  R.BASE_HIDDEN_FOR.aiPaySuggest = saved;   // restore before anything else runs

  ok(broken.length === 1 && /aiPaySuggest/.test(broken[0]),
     'hiding aiPaySuggest for moving IS caught — the prototype\'s real defect',
     JSON.stringify(broken));
  ok(R.assertInvariants().length === 0, 'and the table was restored cleanly');

  /* An unknown category name in a table is a typo that would silently show a
     field everywhere. */
  var savedD = R.BASE_HIDDEN_FOR.describe;
  R.BASE_HIDDEN_FOR.describe = ['rideshare'];      // typo: should be 'ride'
  var typo = R.assertInvariants();
  R.BASE_HIDDEN_FOR.describe = savedD;
  ok(typo.some(function (p) { return /unknown category/.test(p); }),
     'a mistyped category name is caught');
})();

/* ═══ 6. Category-scoped keys ════════════════════════════════════════════════ */
section('6. Category-scoped state');
(function () {
  var k = R.categoryScopedKeys();
  ok(k.length > 20, 'the scoped key set is populated (' + k.length + ')');
  ok(k.indexOf('junkTier') !== -1, 'junkTier is scoped — it must not survive a switch');
  ok(k.indexOf('movingTier') !== -1, 'movingTier is scoped');
  ok(k.indexOf('payAmount') !== -1, 'payAmount is scoped — the fair-range model is per category');
  ok(k.indexOf('idVerification') !== -1, 'idVerification is scoped');

  /* Deliberately NOT scoped — user-typed, category-agnostic input. */
  ['description', 'picThumbs', 'pickupStops', 'dropoffStops', 'specialInstructions'].forEach(function (f) {
    ok(k.indexOf(f) === -1, f + ' is NOT reset on a category switch');
  });

  k.push('mutated');
  ok(R.categoryScopedKeys().indexOf('mutated') === -1,
     'categoryScopedKeys returns a copy — callers cannot corrupt the rule');
})();

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
