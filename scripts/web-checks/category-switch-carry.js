/* John 10/15, "Carry words + photos, not addresses": every category switch, web
   and app (tiles, tabs, the category nudge's Switch, the age "Yes" move) carries
   the description, Ride's instructions and the photos, and clears the addresses.
   Supersedes the 7/19 note that kept addresses. Driven 10/15: Delivery with words
   + both addresses -> Junk: words kept, Step 4 destination empty. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };
const fn = src.slice(src.indexOf('function switchCategory(cat){'), src.indexOf('function switchCategory(cat){') + 1400);
ok(/\['pickupStops', 'dropoffStops', 'pickupUnit', 'destUnit'\]\.forEach/.test(fn), 'a switch clears pick-up, drop-off and both units');
ok(!/'description'|'picThumbs'|'specialInstructions'/.test(fn.slice(0, fn.indexOf('state.step = 2;'))), 'a switch does NOT clear the words or the photos');
const callers = (src.match(/switchCategory\(/g) || []).length;
ok(callers >= 5, `every user-driven switch goes through switchCategory() (${callers - 1} callers)`);
console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — a category switch carries words + photos, not addresses');
process.exit(bad ? 1 : 0);
