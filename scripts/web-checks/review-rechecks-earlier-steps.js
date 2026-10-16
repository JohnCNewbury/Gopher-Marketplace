/* PL-321 (audit 10/15; John: "App wins; bugs fixed on both"): Review and
   Submit re-check EVERY earlier step, as the Request app does (YardStepNav.js
   goToReview: firstProblemStep + every step's checks). The page used to run
   only the gates of the step it was on, so a tab-jump to Review -- and Request
   Again / Request NOW / GO To NOW / a Deal, which all land on Review --
   submitted with no age prompt, no under-21 block and empty fields.

   Driven in a browser on 10/15 (local copy of the page):
     - Request NOW, no addresses        -> stopped on Step 4 "Add a pick-up address…"
     - Request NOW, "a 12 pack of beer" -> stopped on Step 2, "This looks age-restricted"
     - Step-2 edit to add "beer", then the Review tab -> stopped on Step 2, same sheet
     - Request NOW, clean               -> Step 7 "Submitted!"
   This check guards the wiring that made those true. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

/* 0. Why the walk exists: the shared gate module, asked about Review, only
      checks Review's own gates. If this ever starts failing, the module grew
      cross-step checks and the walk can be revisited -- not before. */
global.window = {};
const mod = require(path.join(R, 'Final/assets/js/gopher-step-gates.js'));
const G = (mod && mod.evaluate) ? mod : global.window.GopherStepGates;
const host = { isVisible: () => true, bidsAllowed: () => true, placeOf: () => null,
               identityVerified: () => true, customerAge: () => 30 };
const r6 = G.evaluate({ step: 6, category: 'delivery', description: '', pickupStops: [''],
                        dropoffStops: [''], payMode: 'set', payAmount: '20', waiverChecked: true,
                        scheduleType: 'now' }, host, 'request');
ok(r6 && r6.ok === true, 'the gate module alone passes an EMPTY request at Review (why the walk is needed)');

/* 1. The walk replays Continue from Step 1, calling the handler DIRECTLY. */
const walk = src.slice(src.indexOf('function walkEarlierStepsOk()'), src.indexOf('function jumpToReviewChecked()'));
ok(walk.length > 0, 'walkEarlierStepsOk() exists');
ok(/state\.step = 1;\s*render\(\);/.test(walk), 'it starts at Step 1');
ok(/onContinue\(\);/.test(walk) && !/\$btnNext\.click\(\)/.test(walk),
   'it calls onContinue() directly (element.click() is a no-op inside its own click)');
ok(/if\(state\.step === before\) return false;/.test(walk), 'it stops on the first step that does not pass');

/* 2. Continue is the named function the walk calls. */
ok(/function onContinue\(\)\{/.test(src) && /\$btnNext\.addEventListener\('click', onContinue\);/.test(src),
   'the Continue button runs onContinue');

/* 3. Submit walks before Review's own gates. */
ok(/if\(state\.step === 6 && !__walkingSteps && !walkEarlierStepsOk\(\)\) return;\s*\n\s*\/\/ Universal gate/.test(src),
   'Submit (Continue on Review) walks every earlier step first');

/* 4. Both kinds of step tab walk on the way to Review. */
const tabWalks = src.match(/if\(target === 6 && state\.step !== 6\)\{ jumpToReviewChecked\(\); return; \}/g) || [];
ok(tabWalks.length === 2, `both step-tab rows walk before Review (${tabWalks.length}/2)`);

/* 5. Request Again carries the old addresses (the app's requestAgain.js does). */
const again = src.slice(src.indexOf('window.__startRequestAgainFast = function'), src.indexOf('window.__startRequestAgainNow = function'));
ok(/state\.pickupStops = prev\.pickups\.slice\(\);/.test(again) && /state\.dropoffStops = prev\.dropoffs\.slice\(\);/.test(again),
   'Request Again carries pick-up and drop-off');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — Review re-checks every earlier step (PL-321)');
process.exit(bad ? 1 : 0);
