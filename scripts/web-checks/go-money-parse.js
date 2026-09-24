#!/usr/bin/env node
/*
 * Does the Go prototype still read a typed decimal as the money it is?
 *
 * WHY THIS EXISTS. Until 2026-09-01 every money field in
 * _prototypes/Go/gopher-go-prototype.html was read with
 *     parseInt(value.replace(/[^0-9]/g,''))
 * which does not REJECT a decimal point — it DELETES it. A worker who typed
 * 61.40 into the cost-adjustment sheet sent 6140, and the requester was asked
 * to approve $6,666.83 against an agreed $87.47. `inputmode="numeric"` is a
 * keyboard HINT, not a filter, so the period was typeable on desktop, on
 * Android's numeric pad, and by paste. Confirmed with real keystrokes.
 *
 * ⛔ THIS TEST MUST BE ABLE TO FAIL. It does not mock the prototype: it reads
 * the real file, extracts the real parseMoney/fmtMoney source, and evaluates
 * it. Two of the assertions below are ANTI-REGRESSION checks that re-run the
 * OLD idiom and require it to give the WRONG answer — if that ever stops being
 * wrong, this test is no longer testing anything and says so.
 *
 * It also guards the ROUND TRIP, which is where the first fix attempt would
 * have leaked: `j.amt` is a display STRING ("$52"), so a value written with
 * cents has to survive being read back. Format then re-parse must be lossless.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', '_prototypes', 'Go', 'gopher-go-prototype.html');
const src = fs.readFileSync(FILE, 'utf8');

const a = src.indexOf('function parseMoney(v){');
const b = src.indexOf('function showModal(html){');
if (a < 0 || b < 0 || b < a) {
  console.error('FAIL — could not find parseMoney/fmtMoney in the Go prototype.');
  console.error('       They are the money helpers this guard exists to protect.');
  console.error('       If they were renamed or removed, update this check ON PURPOSE.');
  process.exit(1);
}
// eslint-disable-next-line no-eval
eval(src.slice(a, b));

let failed = 0;
const ok = (cond, label, got, want) => {
  if (cond) return;
  failed++;
  console.error(`  ✗ ${label}` + (arguments.length > 2 ? `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}` : ''));
};
function eq(label, got, want) {
  const same = (typeof want === 'number') ? Math.abs(got - want) < 1e-9 : got === want;
  if (!same) { failed++; console.error(`  ✗ ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

/* 1. parseMoney — value, to the cent. */
const CASES = [
  ['61.40', 61.40], ['61.4', 61.40], ['48', 48], ['$52', 52], ['0', 0], ['', 0],
  ['abc', 0], ['1,250.75', 1250.75], [' $61.40 ', 61.40], ['61.4.5', 61.45],
  ['.5', 0.5], ['32.999', 33], ['32.005', 32.01], [null, 0], [undefined, 0],
  [61.4, 61.40], [32, 32], ['$0.99', 0.99], ['$97.50', 97.5],
];
CASES.forEach(([input, want]) => eq(`parseMoney(${JSON.stringify(input)})`, parseMoney(input), want));

/* 2. fmtMoney — whole dollars stay bare so existing copy is unchanged. */
[['61.40','61.40'],['61.4','61.40'],['32','32'],[32,'32'],[0,'0'],['0.99','0.99'],
 [97.5,'97.50'],['1,250.75','1250.75'],['.5','0.50']]
  .forEach(([input, want]) => eq(`fmtMoney(${JSON.stringify(input)})`, fmtMoney(input), want));

/* 3. ROUND TRIP — j.amt is a STRING. Write it, read it back, get the same money.
      This is the assertion the first fix attempt would have failed. */
[61.40, 32, 0.99, 1250.75, 20, 97.5].forEach((n) => {
  eq(`round-trip $${n}`, parseMoney('$' + fmtMoney(n)), n);
});

/* 4. ANTI-REGRESSION — prove the guard is pointed at something real.
      The OLD idiom must still be demonstrably wrong; if it isn't, this file is
      asserting nothing and the failure below says exactly that. */
const oldWay = (v) => parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
if (oldWay('61.40') !== 6140) {
  failed++;
  console.error('  ✗ the OLD digit-stripping idiom no longer returns 6140 for "61.40" —');
  console.error('    this guard can no longer fail, so it proves nothing. Fix the test.');
}
if (parseMoney('61.40') === oldWay('61.40')) {
  failed++;
  console.error('  ✗ parseMoney agrees with the OLD broken idiom — the fix is gone.');
}

/* 5. Every money READ still goes through parseMoney.
      ⚠️ An earlier version of this section stripped comments and then counted
      `replace(/[^0-9]/g,'')` occurrences. It did not work and it MASKED A REAL
      REGRESSION: on a 2.8 MB single-file prototype full of embedded CSS, data
      URIs and http:// links, the naive `//` line-comment regex ate 82% of the
      file (2,871,768 chars -> 533,085), taking two of the three genuine matches
      with it. The mutation test that reverted a call site to the old idiom
      PASSED. Caught by running the mutation, not by reading the code.

      So this asserts the CALL SITES BY NAME instead. If one regresses to
      digit-stripping, its required text is gone and the failure says which. */
const REQUIRED = [
  ['cost adjustment — new item cost',   'const newCost=costEl?parseMoney(costEl.value):curCost;'],
  ['cost adjustment — new offer',       'const newOffer=parseMoney(offerEl.value);'],
  ['cost adjustment — receipt trigger', 'const c=parseMoney(costEl.value);'],
  ['cost adjustment — running total',   'const o=parseMoney(offerEl.value);'],
  ['counter offer — typed amount',      'coVal=parseMoney(coin.value);'],
  ['job card — offer read from j.amt',  'const amtNum=parseMoney(j.amt)||40;'],
  ['adjust sheet — current offer',      'const curOffer = parseMoney(j.amt) || amtNum || 0;'],
];
REQUIRED.forEach(([label, snippet]) => {
  if (src.indexOf(snippet) === -1) {
    failed++;
    console.error(`  \u2717 ${label} no longer reads through parseMoney.`);
    console.error(`    expected to find: ${snippet}`);
  }
});

/* 6. Pin the RAW count of the old idiom. Raw text, no comment stripping — the
      number is small and every one of them is accounted for, so an unexplained
      change is worth a human look either way. */
const EXPECTED_STRIPS = 4;   // 1 in this fix's own doc comment + 2 phone-digit readers + cleanAmt
const strips = (src.match(/replace\(\/\[\^0-9\]\/g?,\s*''\)/g) || []).length;
if (strips !== EXPECTED_STRIPS) {
  failed++;
  console.error(`  \u2717 found ${strips} digit-stripping reads, expected exactly ${EXPECTED_STRIPS}.`);
  console.error('    Digits are for PHONE NUMBERS. Money uses parseMoney(). If a new one is');
  console.error('    legitimately not money, add it here on purpose and say why.');
}

if (failed) { console.error(`FAIL — ${failed} money check(s) failed`); process.exit(1); }
console.log(`PASS — ${CASES.length + 9 + 6 + 2 + REQUIRED.length + 1} money checks (parse, format, round-trip, anti-regression, call sites, strip count)`);
