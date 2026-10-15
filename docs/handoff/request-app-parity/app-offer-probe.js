#!/usr/bin/env node
/* Web vs the LIVE server: the suggested offer the Request app shows.

   node app-offer-probe.js <Code repo root> <dir holding the server's helpers/suggested_pricing.js,
                                              deals_geo.js and served_zips.js>

   Called by run_parity_harness.py §8, which extracts those three files from gopher-backend-api
   `origin/production` into a temp dir. The app computes no suggestion itself: it shows what
   POST orders/smart_price returns, and that is priceForCategory() in suggested_pricing.js, a pure
   module with no database. So both sides are RUN here, not read: the server's module as-is, and the
   web's real files (the shared logic module, plus the Ride model lifted verbatim out of
   gopher-request.html, where it lives inline). Prints one JSON line. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const [root, apiDir] = process.argv.slice(2);

const S = require(path.join(apiDir, 'suggested_pricing.js'));
const srv = (body) => { const r = S.priceForCategory(body); return r && (r.band || r); };

const win = {};
const store = { getItem() { return null; }, setItem() {} };
const ctx = vm.createContext({ window: win, console, localStorage: store });
vm.runInContext(fs.readFileSync(path.join(root, 'Final/assets/js/gopher-request-logic.js'), 'utf8'), ctx);
const L = win.GopherRequestLogic;

// D11 + D12 (built 2026-10-15): Request's Delivery and Ride suggestions DELEGATE to the
// shared module's copies of the server's models. Prove the page still delegates, so a model
// pasted back inline (the old drift) fails here instead of quietly diverging.
const page = fs.readFileSync(path.join(root, 'Final/gopher-request.html'), 'utf8');
const delegates =
  /function suggestedOffer\(itemCost\)\{\s*return window\.GopherRequestLogic\.deliverySuggestedOffer\(itemCost\);\s*\}/.test(page) &&
  /function rideSuggestedOffer\(miles, minutes, scheduled\)\{\s*return window\.GopherRequestLogic\.rideWorkerPayOffer\(miles, minutes, scheduled\);\s*\}/.test(page);
if (typeof L.deliverySuggestedOffer !== 'function' || typeof L.rideWorkerPayOffer !== 'function') {
  console.log(JSON.stringify({ error: 'shared module lacks deliverySuggestedOffer / rideWorkerPayOffer' }));
  process.exit(0);
}

const b = (o) => (o ? [o.low, o.suggested, o.generous] : null);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const tierOf = (x) => (x && typeof x === 'object' ? (x.tier || x.key) : x);

const out = { junk: [], moving: [], detect: [], delivery: [], ride: [], delegates };
for (const t of ['single', 'half', 'full']) {
  const w = b(L.suggestedJunkOffer(t)), s = b(srv({ request_type: 'Junk Removal', iq_tier: t, iq_tier_source: 'corrected' }));
  out.junk.push({ tier: t, web: w, server: s, same: same(w, s) });
}
for (const t of (L.MOVING_TIER_ORDER || [])) {
  const w = b(L.suggestedMovingOffer(t)), s = b(srv({ request_type: 'Moving', iq_tier: t, iq_tier_source: 'corrected' }));
  out.moving.push({ tier: t, web: w, server: s, same: same(w, s) });
}
for (const d of ['haul away an old couch', 'clean out my garage, about half a truck',
  'full truckload of junk from an estate', 'one mattress', 'move a couch and two boxes',
  'studio apartment move', '3 bedroom house move', 'need a truck for a dresser']) {
  const j = [tierOf(L.detectJunkVolumeTier(d)), tierOf(S.detectJunkVolumeTier(d))];
  const mv = [tierOf(L.detectMovingTier(d)), tierOf(S.detectMovingTier(d))];
  out.detect.push({ text: d, junk: j, moving: mv, same: j[0] === j[1] && mv[0] === mv[1] });
}
for (const c of [0, 5, 10, 12.5, 25, 37, 50, 99.99, 100, 150, 200, 250, 300, 500, 1000]) {
  const w = b(L.deliverySuggestedOffer(c)), s = b(srv({ request_type: 'Delivery', service_cost: c }));
  out.delivery.push({ cost: c, web: w, server: s, same: same(w, s) });
}
/* [miles, minutes or null (= not measured), scheduled]. null minutes exercises the server's
   minutes-from-miles fit; 0 miles is "no route yet" (the $8 floor); 1 mi scheduled is the
   floor-then-uplift order ($9.20, not $8). */
for (const [mi, mn, sc] of [[4.3, 13, false], [12, 20, false], [15.1, 24, false], [15.1, 24, true],
  [30, 40, false], [0, null, false], [1, 2, true], [8, null, false], [45, 55, true], [60, null, false]]) {
  const body = { request_type: 'Need a Ride', request_schedule_later: sc };
  if (mi) body.trip_distance = mi;
  if (mn != null) body.trip_duration = mn;
  const w = b(L.rideWorkerPayOffer(mi, mn == null ? undefined : mn, sc)), s = b(srv(body));
  out.ride.push({ trip: `${mi}mi/${mn == null ? 'est' : mn}min${sc ? ' sched' : ''}`, web: w, server: s, same: same(w, s) });
}
console.log(JSON.stringify(out));
