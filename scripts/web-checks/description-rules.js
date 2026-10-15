/* Description rules, as the Request app has them (audit 10/15; John: "App wins;
   bugs fixed on both"):
   - The app caps the description at 300 on Moving and Custom Task only
     (MovingDetails.js / CustomTaskDetails.js maxCharLimit 300; no other flow sets
     one), paste included, with "Max characters reached".
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

ok(/const DESC_CAP_CATEGORIES = \['moving', 'other'\];/.test(src), 'the 300 cap applies to Moving and Custom Task only');
ok(/maxlength="300"/.test(src) && /\$desc\.value = \$desc\.value\.slice\(0, 300\);/.test(src), 'the cap holds when typing and pasting');
ok(/data-desc-cap[\s\S]{0,120}Max characters reached/.test(src), 'the "Max characters reached" note');

const fn = src.slice(src.indexOf('function ageAnswerFollowsText('), src.indexOf('function ageAnswerFollowsText(') + 1200);
ok(fn.length > 100, 'ageAnswerFollowsText() exists');
ok(/if\(state\.ageAnswer && state\.ageAnswer\.text === nextText\)\{\s*state\.ageKeywordAck = true;/.test(fn), 'returning to the answered words restores the answer');
ok(/state\.ageKeywordDeclined = state\.ageAnswer\.declined;/.test(fn), '...and the D6 flags');
ok(/\} else \{\s*state\.ageKeywordAck = false;/.test(fn), 'a real change asks again');
ok(/ageAnswerFollowsText\(prevDesc, \$desc\.value\);/.test(src), 'the description uses it');
ok(/if\(state\.category === 'ride'\)\{ ageAnswerFollowsText\(prevSi, \$si\.value\); \}/.test(src), "Ride's special instructions use it");

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — description cap + age answer per wording match the app');
process.exit(bad ? 1 : 0);
