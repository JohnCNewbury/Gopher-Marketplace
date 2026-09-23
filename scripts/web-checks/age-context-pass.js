/* The age gate's CONTEXT pass — a flavour beside a product form.

   Why it exists: the taxonomy ships 522 "Context Dependent" flavour rows and the
   generator holds back the ambiguous product forms (pouch, dip, can, pack…).
   Both lists were inert — nothing combined them — so a request reading
   "Need 5 cans for grizly wintergreen pouches" passed the age gate in silence:
   the flavour is held back, the form is held back, and the brand is misspelt one
   letter past the literal list. Reported from the investor-deck walkthrough.

   The window is MEASURED, not chosen. Scored against all 64,668 production order
   titles in Documentation/Dashboard/data/master/Orders.csv, flavour+form within
   3 tokens newly flags 12 titles (0.019%) and every one is a true positive —
   including two real orders reading "a can of Gizzly wintergreen pouches".
   Unwindowed it false-positives on "Can someone bring me a coffee please".
   Re-measure before widening; do not re-argue. */
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
const L = win.GopherRequestLogic;
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok((win.GopherAgeFlavors || []).length > 100, `flavour list ships (${(win.GopherAgeFlavors||[]).length})`);
ok((win.GopherAgeForms || []).length > 10,    `form list ships (${(win.GopherAgeForms||[]).length})`);

const CASES = [
  ['Need 5 cans for grizly wintergreen pouches', true,  'the reported miss'],
  ["I'd like a can of Gizzly wintergreen pouches", true, 'real production order'],
  ['12 pack tropical trully',              true,  'real production order (x7)'],
  ['Other - Pack of crowns menthol 100',   true,  'real production order'],
  ['2 Cans of Zyn Coffee 6 mg',            true,  'real order, via the zyn literal'],
  ['Can someone bring me a coffee please', false, 'THE reason the window exists'],
  ['a pouch of coffee beans',              false, 'grocery collision'],
  ['a can of peaches',                     false, 'grocery collision'],
  ['wintergreen mints',                    false, 'a flavour alone must not flag'],
  ['pick up my dry cleaning',              false, 'ordinary errand'],
  ['2 bags of ice and paper towels',       false, 'ordinary errand'],
  ['marlboro reds',                        true,  'regression: literal pass'],
  ['need cigarettes',                      true,  'regression: literal pass'],
  ['case of white claw',                   true,  'regression: alcohol'],
];
for (const [t, want, why] of CASES) {
  const got = L.findAgeRestrictedKeyword(t);
  ok((!!got) === want, `${want ? 'FLAG   ' : 'no flag'} ${JSON.stringify(t)} -> ${got === null ? 'null' : JSON.stringify(got)}  (${why})`);
}

/* MUTATION — with the flavour list emptied, the reported miss must go back to
   passing silently. If it still flags, this suite is testing something else. */
const saved = win.GopherAgeFlavors;
win.GopherAgeFlavors = [];
vm.runInContext(fs.readFileSync(path.join(R, 'Final/assets/js/gopher-request-logic.js'), 'utf8'), win);
const leaked = win.GopherRequestLogic.findAgeRestrictedKeyword('Need 5 cans for grizly wintergreen pouches');
win.GopherAgeFlavors = saved;
ok(leaked === null, 'MUTATION: with no flavour list the reported miss passes again — the pass is load-bearing');

console.log(bad ? `\nFAIL — ${bad} check(s)` : `\nPASS — ${CASES.length + 3} checks`);
process.exit(bad ? 1 : 0);
