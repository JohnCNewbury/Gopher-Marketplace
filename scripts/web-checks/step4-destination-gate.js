/* Proves an EMPTY destination cannot advance past step 4 — for EVERY category.

   The bug (owner screenshot, 2026-09-29): on Junk Removal the destination was
   empty and Continue was still green and live.

   Root cause, and why it was wider than the screenshot: the `dropoffAddress`
   rule in gopher-step-gates.js opened with

       if (s.noSpecificPickup || !h.isVisible('pickupSection')) return false;

   FIVE of the eight categories hide the pick-up section — home, labor, junk,
   yard, other (FIELD_HIDDEN_FOR.pickupSection) — so the drop-off gate switched
   itself OFF alongside the pick-up gate, even though the Destination block is
   UNCONDITIONAL markup on all three surfaces (Request, Connect, prototype).
   `noSpecificPickup` was the same mistake: a flexible pick-up does not make the
   destination optional.

   ⚠️ This module is SHARED by Request, Connect and the Request prototype, so a
   regression here is a regression on three surfaces at once. That is the reason
   this check exists rather than a one-off fix.

   Verified to FAIL 6 of 18 against the pre-fix module — the five hidden-pickup
   categories plus the flexible-pickup case, each returning a bare {ok:true}.

   Run: node scripts/web-checks/step4-destination-gate.js
*/
'use strict';
const path = require('path');
const G = require(path.join(__dirname, '..', '..', 'Final', 'assets', 'js', 'gopher-step-gates.js'));

/* Mirrors FIELD_HIDDEN_FOR.pickupSection in the three host pages. If that list
   ever changes, this must change with it — that is the point of stating it. */
const HIDES_PICKUP = ['home', 'labor', 'junk', 'yard', 'other'];
const ALL = ['delivery', 'moving', 'ride', 'home', 'labor', 'junk', 'yard', 'other'];

function gate(cat, dropoffStops, pickupStops, noSpecificPickup) {
  return G.evaluate(
    { step: 4, category: cat, pickupStops, dropoffStops, noSpecificPickup: !!noSpecificPickup },
    {
      isVisible: f => (f === 'pickupSection' ? !HIDES_PICKUP.includes(cat) : true),
      bidsAllowed: () => false,
      identityVerified: () => true,
      customerAge: () => 35,
    },
    'request'
  );
}

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass += 1; console.log('  ok    ' + name); }
  else { fail += 1; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
};
const saysDropoff = r => /drop-off|destination/i.test((r && (r.message || r.label)) || '');

console.log('\n§1 an EMPTY destination blocks step 4 — every category');
ALL.forEach(c => {
  const r = gate(c, [''], ['218 Fayetteville St']);
  check(`1. ${c.padEnd(9)} empty destination is blocked`,
    r && r.ok === false && saysDropoff(r), JSON.stringify(r));
});

console.log('\n§2 a FILLED destination does not block');
ALL.forEach(c => {
  const r = gate(c, ['4101 NC-55, Apex, NC'], ['218 Fayetteville St']);
  check(`2. ${c.padEnd(9)} filled destination passes`, r && r.ok === true, JSON.stringify(r));
});

console.log('\n§3 ordering, and flexible pick-up');
check('3a. an empty pick-up reports BEFORE the drop-off',
  (() => { const r = gate('delivery', [''], ['']); return r && !r.ok && /pick-up/i.test(r.message || ''); })(),
  'the pick-up field should be the one called out first');
check('3b. a flexible pick-up still requires a destination',
  (() => { const r = gate('delivery', [''], [''], true); return r && !r.ok && saysDropoff(r); })(),
  'noSpecificPickup must not switch the destination gate off');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
