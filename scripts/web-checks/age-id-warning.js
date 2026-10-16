/* G40-628 (D6, John 10/15): a 21+ "No" on an age-restricted word opens
   "You'll need your ID for this one". Only "Submit as-is" there goes on, and it
   DOUBLE-FLAGS the request (ID required at completion + the word, tracked).
   The Request app does the same (stepFlow/ageKeywordCheck.js, !510 709737a49).

   The words are the owner's, approved verbatim. Spec: docs/handoff/
   request-app-parity/APP-DIVERGENCE-2026-10-13.md "D6 SPEC". */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const block = (id) => {
  const i = src.indexOf(`id="${id}"`);
  const j = i < 0 ? -1 : src.indexOf('</div>\n</div>', i);
  return i < 0 || j < 0 ? '' : src.slice(i, j);
};

/* 1. The first sheet's note: NON-REFUNDABLE, as the app's. */
const first = text(block('ageKwOverlay'));
ok(first.includes('The order is non-refundable: it pays your worker for their time and anything they bought for you, and repeat issues can lead to account review.'),
   'first sheet: the non-refundable note');
ok(!/may be canceled|may still be charged/.test(first), 'first sheet: the old "may be canceled / may still be charged" note is gone');

/* 2. The second sheet, verbatim. */
const warn = block('ageIdWarnOverlay');
const w = text(warn).replace(/[“"]?this item[”"]?/, '"X"').replace(/[“”]/g, '"');
ok(!!warn, 'the second sheet exists (#ageIdWarnOverlay)');
for (const line of [
  'You’ll need your ID for this one',
  'Your request mentions "X", which is almost always an age-restricted item. Only submit it if you can show a valid ID proving you’re 21 or older when it’s delivered.',
  'If you can’t show ID, your worker can’t hand over the items. The order is non-refundable: it pays your worker for their time and anything they bought for you.',
  'Flagged by mistake? Sorry about that. Age-restricted items are tightly regulated, and these checks protect you, your worker and Gopher. A real person reviews every request flagged like this.',
]) ok(w.includes(line), `second sheet says: "${line.slice(0, 60)}…"`);
ok(/id="ageIdWarnEdit"[^>]*>Edit my request</.test(warn) && /class="gr-modal-btn" id="ageIdWarnEdit"/.test(warn),
   'Edit my request is the PRIMARY pill');
ok(/class="gr-modal-btn gr-modal-btn-secondary" id="ageIdWarnSubmit"[^>]*>Submit as-is</.test(warn),
   'Submit as-is is the outlined secondary');

/* 3. "No" opens the sheet; it no longer flags and goes on by itself. */
const noStart = src.indexOf("if(noBtn) noBtn.addEventListener('click'");
const noBody = noStart < 0 ? '' : src.slice(noStart, src.indexOf("const editBtn", noStart));
ok(/ageIdWarnOverlay/.test(noBody) && /warn\.hidden = false/.test(noBody), '"No" opens the ID warning');
ok(!/state\.idRequiredAtCompletion = true;\s*\n\s*overlay\.hidden = true;\s*\n\s*advanceFromJobDetails/.test(src),
   '"No" no longer sets the ID flag and goes straight on');

/* 4. Submit as-is: double-flagged. Edit: nothing acknowledged. */
const subStart = src.indexOf("if(submitBtn) submitBtn.addEventListener('click'");
const subBody = subStart < 0 ? '' : src.slice(subStart, subStart + 900);
ok(/state\.idRequiredAtCompletion = true/.test(subBody) && /state\.ageKeywordDeclined = true/.test(subBody)
   && /state\.ageKeyword = String\(kw\)\.trim\(\)\.slice\(0, 100\)/.test(subBody),
   'Submit as-is sets idRequiredAtCompletion + ageKeywordDeclined + ageKeyword (max 100)');
const editStart = src.indexOf("if(editBtn) editBtn.addEventListener('click'");
const editBody = editStart < 0 ? '' : src.slice(editStart, subStart);
ok(!!editBody && !/ageKeywordAck = true/.test(editBody) && /setSelectionRange/.test(editBody),
   'Edit my request acknowledges nothing and selects the word in the box');

/* 5. Reset with the answer; carried on the request record. */
ok(/state\.ageKeywordAck = false;\s*\n\s*state\.idRequiredAtCompletion = false;\s*\n\s*state\.ageKeywordDeclined = false;\s*\n\s*state\.ageKeyword = '';/.test(src),
   'editing the description resets the double flag with the answer');
ok(/ageKeywordDeclined: !state\.ageRestricted && !!state\.ageKeywordDeclined/.test(src),
   'the saved request carries ageKeywordDeclined (never on an age-restricted request)');
ok(/ageKeywordDeclined: !!data\.ageKeywordDeclined/.test(src) && /ageKeyword: data\.ageKeywordDeclined \?/.test(src),
   'the dashboard record keeps ageKeywordDeclined + ageKeyword');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — the ID warning (G40-628 web)');
process.exit(bad ? 1 : 0);
