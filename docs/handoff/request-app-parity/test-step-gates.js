#!/usr/bin/env node
/* Tests for the shared step-gate rule set (gopher-step-gates.js).
   Run: node docs/handoff/request-app-parity/test-step-gates.js   (exit 0 = pass)

   Two things are being asserted, and the second matters more than the first:

     1. The gates fire when they should.
     2. EXTRACTION DID NOT CHANGE BEHAVIOUR. Each surface's enable list must
        reproduce what that surface does today — including the gates it does NOT
        have. The prototype has no addresses-differ and no schedule-time gate;
        if this module quietly gave it those, the extraction would be a silent
        product change wearing a refactor's clothes.

   Per the standing rule in this repo, every assertion here was checked against a
   deliberately broken module first. A green test that cannot fail proves nothing —
   which is not a slogan here: on 2026-08-22 two successive versions of the parity
   harness's guard check passed on code that had been gutted, and only mutation
   testing showed it.
*/
'use strict';

var path = require('path');
var G = require(path.join(__dirname, '..', '..', '..', 'Final', 'assets', 'js', 'gopher-step-gates.js'));

var pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (detail ? '  → ' + detail : '')); }
}
function section(t) { console.log('\n' + t); }

/* A host with every helper present and permissive, so a gate only fires on state. */
function host(over) {
  var h = {
    isVisible: function () { return true; },
    bidsAllowed: function () { return false; },
    identityVerified: function () { return true; },
    findAgeRestrictedKeyword: function () { return null; },
    customerAge: function () { return 40; }
  };
  for (var k in (over || {})) h[k] = over[k];
  return h;
}
function state(over) {
  var s = {
    step: 1, category: 'delivery', description: 'x', itemsPurchased: false,
    costOfItems: '', ageRestricted: false, ageKeywordAck: false,
    noSpecificPickup: false, pickupStops: ['1 A St'], dropoffStops: ['2 B St'],
    payMode: 'set', payAmount: '40', scheduleType: 'now', timeSlot: '',
    waiverChecked: true
  };
  for (var k in (over || {})) s[k] = over[k];
  return s;
}
var ev = function (s, h, surface) { return G.evaluate(s, h || host(), surface || 'request'); };

/* ═══ 1. Catalogue integrity ══════════════════════════════════════════════════ */
section('1. Catalogue');
(function () {
  ok(G.GATES.length === 12, 'twelve distinct gates', String(G.GATES.length));
  ok(G.assertInvariants().length === 0, 'module passes its own self-check',
     JSON.stringify(G.assertInvariants()));
  ok(G.gatesFor('request').length === 11, 'request enables 11');
  ok(G.gatesFor('connect').length === 11, 'connect enables 11');
  ok(G.gatesFor('prototype').length === 10, 'prototype enables 10',
     String(G.gatesFor('prototype').length));
  ok(G.gateById('nope') === null, 'unknown id returns null, does not throw');
})();

/* ═══ 2. Each gate fires on its own condition ═════════════════════════════════ */
section('2. Gates fire');
(function () {
  ok(ev(state({ step: 1, category: '' })).id === 'category', 'step 1 blocks with no category');
  ok(ev(state({ step: 1 })).ok === true, 'step 1 passes with a category');

  ok(ev(state({ step: 2, description: '   ' })).id === 'description',
     'blank description blocks (whitespace is not a description)');
  ok(ev(state({ step: 2, itemsPurchased: true, costOfItems: '' })).id === 'costOfItems',
     'purchase toggled on with no cost blocks');
  ok(ev(state({ step: 2, itemsPurchased: true, costOfItems: '$12.50' })).ok === true,
     'a currency-formatted cost is accepted');
  ok(ev(state({ step: 2, itemsPurchased: true, costOfItems: '0' })).id === 'costOfItems',
     'zero cost blocks');

  var idBlocked = ev(state({ step: 2, ageRestricted: true }),
                     host({ identityVerified: function () { return false; } }));
  ok(idBlocked.id === 'identity', 'age-restricted delivery blocks without identity');
  ok(ev(state({ step: 2, ageRestricted: true })).ok === true,
     'satisfied identity lets it through');
  ok(ev(state({ step: 2, ageRestricted: true, category: 'moving' }),
        host({ identityVerified: function () { return false; } })).ok === true,
     'identity gate is DELIVERY-only — moving is never gated on it');
  ok(ev(state({ step: 2, ageRestricted: false }),
        host({ identityVerified: function () { return false; } })).ok === true,
     'slider OFF is never gated, even with a keyword in the description');

  ok(ev(state({ step: 5, payAmount: '0' })).id === 'workerPay', '$0 offer blocks at step 5');
  ok(ev(state({ step: 5, payMode: 'bids' }),
        host({ bidsAllowed: function () { return true; } })).ok === true,
     'a REAL bids job needs no amount');
  ok(ev(state({ step: 5, payMode: 'bids', payAmount: '0' })).id === 'workerPay',
     'a STALE bids choice on a no-bids category still needs an amount');

  ok(ev(state({ step: 6, scheduleType: 'scheduled', timeSlot: '' })).id === 'scheduleTime',
     'scheduled with no time blocks at submit');
  ok(ev(state({ step: 6, scheduleType: 'scheduled', timeSlot: '6:00 AM' })).ok === true,
     'scheduled with a time passes');
  ok(ev(state({ step: 6, waiverChecked: false })).id === 'waiver', 'unchecked waiver blocks');
})();

/* ═══ 3. Addresses — the normaliser is the subtle part ════════════════════════ */
section('3. Addresses');
(function () {
  var same = function (a, b, step) {
    return ev(state({ step: step || 4, pickupStops: [a], dropoffStops: [b] }));
  };
  ok(same('123 Main St, Raleigh, NC', '123 main st raleigh nc').id === 'addressesDiffer',
     'case + punctuation differences still count as the SAME address');
  ok(same('123 Main St', '  123   Main   St  ').id === 'addressesDiffer',
     'whitespace differences still count as the same');
  ok(same('123 Main St', '123 Main Street').ok === true,
     'St vs Street is NOT caught — the compare is case/space/punctuation only, by design');
  ok(same('123 Main St', '400 Oak Ave').ok === true, 'genuinely different addresses pass');
  ok(same('123 Main St', '123 Main St', 6).id === 'addressesDiffer',
     'the step-6 submit backstop fires too');

  ok(ev(state({ step: 4, pickupStops: [''] })).id === 'pickupAddress', 'empty pick-up blocks');
  ok(ev(state({ step: 4, pickupStops: [''] })).selector.indexOf('data-idx="0"') !== -1,
     'the selector points at the FIRST empty field, so the flash lands on it');
  ok(ev(state({ step: 4, dropoffStops: [''] })).id === 'dropoffAddress', 'empty drop-off blocks');
  ok(ev(state({ step: 4, pickupStops: [''], dropoffStops: [''] })).id === 'pickupAddress',
     'with both empty, pick-up is reported first (sequence, not both at once)');

  ok(ev(state({ step: 4, noSpecificPickup: true, pickupStops: [''] })).ok === true,
     '"any location" exempts the address gates entirely');
  ok(ev(state({ step: 4, pickupStops: ['1 A'], dropoffStops: ['1 A'] }),
        host({ isVisible: function (f) { return f !== 'pickupSection'; } })).ok === true,
     'single-location categories are exempt — no pickup section, no address rule');
})();

/* ═══ 4. Extraction did not change behaviour ══════════════════════════════════ */
section('4. Per-surface behaviour is PRESERVED');
(function () {
  var proto = G.SURFACE_GATES.prototype;
  ok(proto.indexOf('addressesDiffer') === -1,
     'prototype still has NO addresses-differ gate — it does not today');
  ok(proto.indexOf('scheduleTime') === -1,
     'prototype still has NO schedule-time gate — it does not today');
  ok(proto.indexOf('ageKeyword') !== -1,
     'prototype keeps the age-keyword gate — it is the only surface running it here');
  ok(G.SURFACE_GATES.request.indexOf('ageKeyword') === -1 &&
     G.SURFACE_GATES.connect.indexOf('ageKeyword') === -1,
     'the web pair do NOT get it — they run that scan from their Continue handler, '
     + 'so enabling it here would fire it twice rather than fix a gap');

  /* The identity gate is owner-ruled for all three (2026-08-22). */
  ok(['request', 'connect', 'prototype'].every(function (s) {
    return G.SURFACE_GATES[s].indexOf('identity') !== -1;
  }), 'all three surfaces carry the RULED identity gate');

  /* Same broken state, each surface's own answer. */
  var s = state({ step: 6, scheduleType: 'scheduled', timeSlot: '', waiverChecked: false });
  ok(ev(s, host(), 'request').id === 'scheduleTime',
     'request reports schedule-time before the waiver');
  ok(ev(s, host(), 'prototype').id === 'waiver',
     'the prototype has no schedule gate, so it reports the waiver — unchanged behaviour');
})();

/* ═══ 5. Step-6 ordering — a decision, pinned ═════════════════════════════════ */
section('5. Step-6 order');
(function () {
  var broken = state({ step: 6, pickupStops: ['1 A'], dropoffStops: ['1 A'], waiverChecked: false });
  ok(ev(broken, host(), 'request').id === 'addressesDiffer',
     'with addresses AND waiver both broken, the UPSTREAM fault is named');
  ok(ev(broken, host(), 'connect').id === 'addressesDiffer',
     'connect now matches request — this is the one behaviour the extraction changes');

  var l = G.SURFACE_GATES.connect;
  ok(l.indexOf('addressesDiffer') < l.indexOf('waiver'),
     'and the order is pinned by assertInvariants so it cannot drift back');
})();

/* ═══ 6. A missing host helper is LOUD ════════════════════════════════════════ */
section('6. Missing helpers fail loudly');
(function () {
  /* ⚠️ Match the MODULE's own diagnostic, not just the helper name. Removing the
     guard does not make this pass silently — `host.identityVerified(s)` then
     throws a TypeError whose message ALSO contains "identityVerified", so a
     looser assertion passes either way and proves nothing about the guard. Found
     by mutation testing: disabling the throw left this test green. */
  var msg = '';
  try {
    G.evaluate(state({ step: 2, ageRestricted: true }), { isVisible: function () { return true; } }, 'request');
  } catch (e) { msg = e.message; }
  ok(/gopher-step-gates/.test(msg) && /identityVerified/.test(msg),
     'a gate whose host helper is absent throws the MODULE\'s own diagnostic, '
     + 'not an incidental TypeError', msg || '(nothing thrown)');

  /* Why this is not pedantry: gopher-request.html's category classifier resolved
     to nothing inside an IIFE and fail-safed to null, so the mismatch nudge was
     dead on a live page for weeks and looked fine. A compliance gate that no-ops
     because a function is undefined is the same bug with worse consequences. */
  var quiet = false;
  try { G.evaluate(state({ step: 1, category: '' }), {}, 'request'); quiet = true; } catch (e) {}
  ok(quiet, 'but a gate that needs NO helper still works with an empty host');
})();

/* ═══ 7. Shape adapters ══════════════════════════════════════════════════════ */
section('7. Adapters preserve each surface\'s existing call sites');
(function () {
  var r = ev(state({ step: 1, category: '' }));
  var web = G.toWebShape(r), pro = G.toPrototypeShape(r);
  ok(web.label === 'Service category' && web.selector === '.cat-grid' && !!web.msg,
     'web shape is {ok,label,selector,msg} — what Request/Connect already consume');
  ok(pro.sel === '.cat-grid' && !!pro.msg && pro.label === undefined,
     'prototype shape is {ok,sel,msg} — no label, which its callers never read');
  ok(G.toWebShape({ ok: true }).ok === true && G.toPrototypeShape({ ok: true }).ok === true,
     'both adapters pass a clean result through');

  /* ageRestricted must be FALSE here. The keyword prompt exists to ASK whether a
     description is age-restricted; once the user has already said it is, there is
     nothing left to confirm and the gate correctly stands down (the identity gate
     takes over). A first version of this test set it true, got the identity gate,
     and read that as the module dropping the flag — the test was wrong, not the
     code. Worth keeping: the same misread would look like a real bug in review. */
  var age = G.evaluate(state({ step: 2, ageRestricted: false, ageKeywordAck: false }),
                       host({ findAgeRestrictedKeyword: function () { return 'wine'; },
                              identityVerified: function () { return false; } }), 'prototype');
  ok(age.id === 'ageKeyword', 'an unacknowledged keyword fires the age-keyword gate');
  ok(age.flags && age.flags.age === true, 'the age gate carries its flag…');
  ok(G.toPrototypeShape(age).age === true,
     '…and the adapter hoists it to the top level, where openAgeKwModal() reads it');
  ok(G.toPrototypeShape(age).tone === 'alert', 'tone survives the adapter');
})();

/* ═══ 8. The under-30 message — copy only, never the requirement ══════════════ */
section('8. Under-30 changes the MESSAGE, not the rule');
(function () {
  var blocked = host({ identityVerified: function () { return false; } });
  var s = state({ step: 2, ageRestricted: true });

  var young = G.evaluate(s, host({ identityVerified: function () { return false; },
                                   customerAge: function () { return 22; } }), 'request');
  var older = G.evaluate(s, blocked, 'request');
  ok(young.id === 'identity' && older.id === 'identity',
     'both ages are gated — the requirement is identical');
  ok(/TrustShield/.test(young.message) && /Submit identification/.test(older.message),
     'only the wording differs');

  var noDob = G.evaluate(s, host({ identityVerified: function () { return false; },
                                   customerAge: function () { return null; } }), 'request');
  ok(noDob.id === 'identity', 'unknown DOB is still gated (the safest path)');
  ok(/Submit identification/.test(noDob.message),
     'and gets the generic wording rather than a TrustShield-specific claim');
})();

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
