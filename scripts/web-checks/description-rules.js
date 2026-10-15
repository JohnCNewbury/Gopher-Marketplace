/* Description rules, as the Request app has them (audit 10/15; John: "App wins;
   bugs fixed on both"):
   - 300 characters on EVERY category (John 10/15, "300 on every category"; the
     app had it on Moving and Custom Task only and gets it everywhere in the same
     pass), paste included, with "Max characters reached".
   - D10 (John 10/13 + 10/15): a phone number in the description or Ride's
     special instructions is MASKED as typed (**********) with the web's wider
     pattern, never a dead stop, and the "Phone number hidden" notice shows.
   - AGE-8: the age answer is kept PER WORDING (app ageKeywordCheck.js): an edit
     that returns to the answered words keeps the answer and the D6 flags; a real
     change asks again.
   Driven 10/15: Moving 400 chars -> 300 + note; Delivery uncapped; "beer" ->
   No -> Submit as-is, then space+delete -> Continue goes on with no re-ask; then
   "a bottle of wine" -> asked again for "wine". */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok(/const DESC_CAP_CATEGORIES = \['delivery', 'home', 'junk', 'labor', 'moving', 'other', 'ride', 'yard'\];/.test(src), 'the 300 cap applies to every category');
ok(/maxlength="300"/.test(src) && /\$desc\.value = \$desc\.value\.slice\(0, 300\);/.test(src), 'the cap holds when typing and pasting');
ok(/data-desc-cap[\s\S]{0,120}Max characters reached/.test(src), 'the "Max characters reached" note');

const fn = src.slice(src.indexOf('function ageAnswerFollowsText('), src.indexOf('function ageAnswerFollowsText(') + 1200);
ok(fn.length > 100, 'ageAnswerFollowsText() exists');
ok(/if\(state\.ageAnswer && state\.ageAnswer\.text === nextText\)\{\s*state\.ageKeywordAck = true;/.test(fn), 'returning to the answered words restores the answer');
ok(/state\.ageKeywordDeclined = state\.ageAnswer\.declined;/.test(fn), '...and the D6 flags');
ok(/\} else \{\s*state\.ageKeywordAck = false;/.test(fn), 'a real change asks again');
ok(/ageAnswerFollowsText\(prevDesc, \$desc\.value\);/.test(src), 'the description uses it');
ok(/if\(state\.category === 'ride'\)\{ ageAnswerFollowsText\(prevSi, \$si\.value\); \}/.test(src), "Ride's special instructions use it");

/* D10, executed: the page's own pattern + mask, lifted out and run. */
const pat = src.match(/const PHONE_PATTERN = (\/.+\/g);/);
ok(!!pat, 'PHONE_PATTERN is defined (global)');
if (pat) {
  const P = eval(pat[1]);
  const mask = (t) => String(t).replace(P, '**********');
  for (const [t, want] of [
    ['call me 919-555-1234 thanks', 'call me ********** thanks'], ['(919) 555-1234', '**********'],
    ['919.555.1234', '**********'], ['+1 919 555 1234', '**********'], ['9195551234', '**********'],
    ['2 couches and $1,250 cash', '2 couches and $1,250 cash'], ['zip 27540', 'zip 27540'],
  ]) ok(mask(t) === want, `mask("${t}") -> "${want}"`);
}
ok(/maskInputPhones\(\$desc\);/.test(src) && /maskInputPhones\(\$si\);/.test(src), 'both boxes mask as typed');
ok(!/G40_REQ\.phoneEntered\(\); return;/.test(src), 'a phone number is no longer a dead stop on Continue');
ok(/<h4>Phone number hidden<\/h4><p class="gr-modal-sub">For your privacy we don’t broadcast phone numbers\. Once your request is submitted you can text or call your Gopher in-app\.<\/p>/.test(src),
   'the "Phone number hidden" notice, the owner\'s words');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — description cap, age answer per wording and phone masking match the rulings');
process.exit(bad ? 1 : 0);
