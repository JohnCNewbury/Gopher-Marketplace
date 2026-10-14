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

// The web's Ride model is inline in the page. Lift its own constants and functions verbatim;
// if any of them has moved, say so rather than compare against a guess.
const page = fs.readFileSync(path.join(root, 'Final/gopher-request.html'), 'utf8');
const grab = (re) => { const m = page.match(re); if (!m) throw new Error('web ride model not found: ' + re); return m[0]; };
let webRide;
try {
  const fee = (page.match(/const GOPHER_FEE = \{[\s\S]*?\bride:\s*([0-9.]+)/) || [])[1];
  const itf = (page.match(/const INSTANT_TRANSFER_RATE = ([0-9.]+)/) || [])[1];
  if (!fee || !itf) throw new Error('GOPHER_FEE.ride / INSTANT_TRANSFER_RATE not found');
  const src = `const GOPHER_FEE={ride:${fee}}; const INSTANT_TRANSFER_RATE=${itf};\n` +
    grab(/const RIDE_RATES = \{[\s\S]*?\n  \};/) + '\n' + grab(/const RIDE_MILE_TIERS = [^\n]*/) + '\n' +
    grab(/function rideMileageCost\(miles\)\{[\s\S]*?\n  \}/) + '\n' +
    grab(/function rideSuggestedOffer\(miles, minutes, scheduled\)\{[\s\S]*?\n  \}/) +
    '\nmodule.exports = rideSuggestedOffer;';
  const m = { exports: null };
  new Function('module', src)(m);
  webRide = m.exports;
} catch (e) {
  console.log(JSON.stringify({ error: String(e.message || e) }));
  process.exit(0);
}

const b = (o) => (o ? [o.low, o.suggested, o.generous] : null);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const tierOf = (x) => (x && typeof x === 'object' ? (x.tier || x.key) : x);

const out = { junk: [], moving: [], detect: [], delivery: [], ride: [] };
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
for (const c of [0, 10, 25, 50, 100, 150, 200, 300, 500]) {
  const w = b(L.suggestedOffer(c, true)), s = b(srv({ request_type: 'Delivery', service_cost: c }));
  out.delivery.push({ cost: c, web: w, server: s, same: same(w, s) });
}
for (const [mi, mn, sc] of [[4.3, 13, false], [12, 20, false], [15.1, 24, false], [15.1, 24, true], [30, 40, false]]) {
  const w = b(webRide(mi, mn, sc)), s = b(srv({ request_type: 'Need a Ride', trip_distance: mi, trip_duration: mn, request_schedule_later: sc }));
  out.ride.push({ trip: `${mi}mi/${mn}min${sc ? ' sched' : ''}`, web: w, server: s, same: same(w, s) });
}
console.log(JSON.stringify(out));
