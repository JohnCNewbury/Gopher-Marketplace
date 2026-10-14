/* The age gate's RULED false-positive cuts, and the hits they must never cost.

   Owner ruling 2026-10-14 (John), term by term, each measured before applying
   over all 65,325 production orders in Documentation/Dashboard/data/master/
   Orders.csv:
     P1  drop the keyword "on the"  (generator AMBIGUOUS list; regenerated)
     P2  "game" exceptions          (gopher-age-supplement.js GopherAgeExceptions)
     P4  1792 / corona / wine       (same table)
     P3  "weed" exceptions          DECLINED — "weed eater" stays flagged
   Measured with the real code, old vs new, over every description: 217 orders
   that were not age-restricted are released, 0 newly flagged, and 0 real ones
   lost (the 37 age-restricted orders "on the" also released hold no
   age-restricted word at all — their own switch made them age-restricted).

   Why it matters: since the 10/11 under-21 block, a false hit is a DEAD END for
   an under-21 requester ("leave it on the porch" could not be submitted).

   Both halves are asserted. A cut that loses a real hit is worse than no cut —
   it opens the compliance gate — so every exception carries the real orders it
   must still catch. Re-measure before adding a word; do not re-argue. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..', '..');
const win = {}; win.window = win; vm.createContext(win);
for (const f of ['Final/assets/js/gopher-age-keywords.js',
                 'Final/assets/js/gopher-age-supplement.js',
                 'Final/assets/js/gopher-request-logic.js']) {
  vm.runInContext(fs.readFileSync(path.join(R, f), 'utf8'), win);
}
const find = win.GopherRequestLogic.findAgeRestrictedKeyword;
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

// ---- released by the ruling ------------------------------------------------
const FREE = [
  ['leave it on the porch',                         'P1: everyday English'],
  ['I live on the 3rd floor, knock on the door',    'P1: production phrasing'],
  ['bring a board game for a birthday',             'P2'],
  ['pick up a video game',                          'P2'],
  ['spikeball game set',                            'P2: production phrasing'],
  ['game day snacks',                               'P2'],
  ['1792 Maple Ave',                                'P4: street number'],
  ['pick up a package at 1792 N Main St',           'P4: street number, direction first'],
  ['corona virus signage',                          'P4'],
  ['deliver corona virus test kits',                'P4'],
  ['a wine fridge',                                 'P4'],
  ['haul away an old wine rack',                    'P4'],
  ['pick up wine glasses',                          'P4'],
  ['grab food from Barcelona Wine Bar',             'P4: production phrasing (a restaurant)'],
];
for (const [t, why] of FREE) ok(find(t) === null, `released (${why}): ${JSON.stringify(t)} -> ${find(t)}`);

// ---- must STILL flag: the real orders each cut sits next to -------------------
const STILL = [
  ['on the rocks margarita',            'on the rocks', 'P1 dropped only the bare phrase'],
  ['game grape',                        'game', 'Game cigarillos, production'],
  ['a game cigarello',                  'game', 'production: no articles in `before`'],
  ['game blue rellos',                  'game', 'production'],
  ['bottle of 1792 bourbon',            '1792', '1792 Bourbon'],
  ['1792 small batch',                  '1792', 'no street word within 3'],
  ['case of corona',                    'corona', 'the beer'],
  ['corona extra 12 pack',              'corona', 'production'],
  ['bottle of wine',                    'wine', 'the drink'],
  ['wine cooler',                       'wine', 'a DRINK: "cooler" must never be an exception'],
  ['wine glasses and a bottle of wine', 'wine', 'an excepted hit is skipped, the next one still flags'],
  ['weed eater',                        'weed', 'P3 DECLINED by the owner: stays flagged'],
  ['pick up some weed',                 'weed', 'P3 declined'],
];
for (const [t, want, why] of STILL) {
  const got = find(t);
  ok(got !== null && got.toLowerCase() === want, `still flags "${want}" (${why}): ${JSON.stringify(t)} -> ${got}`);
}

// ---- WHERE it matched: the under-21 sheet's word selection (owner 10/13, "Both") ---
// The sheet names nothing, so the page selects the word in the requester's own box.
// It must be the occurrence that TRIPPED the gate, and findAgeRestrictedMatch must never
// disagree with findAgeRestrictedKeyword (it is the same pass; one wraps the other).
const match = win.GopherRequestLogic.findAgeRestrictedMatch;
ok(typeof match === 'function', 'findAgeRestrictedMatch is exported');
{
  const t = 'wine glasses and a bottle of wine', m = match(t);
  ok(m && m.start === 29 && t.slice(m.start, m.end) === 'wine',
     `the SECOND "wine" is the one selected in ${JSON.stringify(t)} -> ${JSON.stringify(m)}`);
}
for (const [t] of FREE) ok(match(t) === null, `nothing to select: ${JSON.stringify(t)}`);
for (const t of [...STILL.map(r => r[0]), 'Please pick up beer for me', 'I need some Tito’s',
                 'Other - Black and milds', 'a can of Gizzly wintergreen pouches']) {
  const m = match(t), k = find(t);
  const placed = m && m.start >= 0 &&
    (t.slice(m.start, m.end) === m.term ||                       // literal / normalised pass
     (t.slice(m.start, m.end).toLowerCase().match(/[a-z0-9]+/g) || []).join(' ') === m.term);  // context pass
  ok(m && m.term === k && placed, `selects exactly what tripped: ${JSON.stringify(t)} -> ${JSON.stringify(m)}`);
}

// ---- the data is what the ruling says, and nothing more ------------------------
const EX = win.GopherAgeExceptions || {};
ok(JSON.stringify(Object.keys(EX).sort()) === JSON.stringify(['1792', 'corona', 'game', 'wine']),
   `exceptions cover exactly the ruled terms: ${JSON.stringify(Object.keys(EX).sort())}`);
ok(!('weed' in EX), 'no "weed" exception (P3 declined)');
ok(!((EX.wine && EX.wine.after) || []).includes('cooler'), '"wine cooler" is never excepted');
ok(!(win.GopherAgeKeywords || []).includes('on the'), 'the bare keyword "on the" is gone (P1)');
ok((win.GopherAgeKeywords || []).includes('on the rocks'), '"on the rocks" is still a keyword');

console.log(bad ? `\nFAIL — ${bad} of the ruled cases broke` : '\nPASS — ruled cuts hold, and every real hit beside them still flags');
process.exit(bad ? 1 : 0);
