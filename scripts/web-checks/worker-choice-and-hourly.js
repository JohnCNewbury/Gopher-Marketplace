/* D13 + D14 + B-17 (John 10/13 rulings; 10/15 "App wins; bugs fixed on both"),
   as the Request app has them:
   - D13: Yard shows the app's two worker choices (I'll select / Prioritize MY
     Gophers), no First Available (app yardFlowSteps.js Y-05).
   - D14: pay by the hour on LABOR ONLY (app: paying_by_hour only in laborflow),
     and paying by the hour turns bids off (laborFlowSteps.js bidsAllowed = !isHourly).
   - B-17: a default of Prioritize MY Gophers hand-picks EVERY saved Gopher
     (favgophercheckbox.js initialFavGopherSelection).
   Driven in a browser 10/15: hourly toggle only on Labor; Yard shows select + my
   (my default, all 3 saved Gophers listed); Junk/Delivery unchanged. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
global.window = {};
const FR = require(path.join(R, 'Final/assets/js/gopher-flow-rules.js'));
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

/* D13 */
ok(FR.isVisible('workerSelectChoice', 'yard'), 'module: Yard shows the worker choice (request)');
/* The CT port (10/15) gave Custom Task the app's three choices, so no Request
   category hides the choice now (custom-task-port.js checks the three). */
ok(FR.isVisible('workerSelectChoice', 'other'), 'module: Custom Task shows the worker choice (CT port)');
ok(/workerSelectChoice: \[\],/.test(src), 'page table: workerSelectChoice hidden for no category');
ok(/const NO_FIRST_AVAILABLE = \['moving', 'junk', 'labor', 'home', 'yard'\];/.test(src), 'Yard has no First Available');

/* D14 */
ok(/const noHourly = state\.category !== 'labor';/.test(src), 'the hourly toggle renders for Labor only');
ok(/const bidsAllowed = \(\) => isVisible\('bidsOption'\) && !state\.payByHour;/.test(src), 'paying by the hour turns bids off');
ok(/if\(state\.payByHour && state\.category !== 'labor'\) state\.payByHour = false;/.test(src),
   'a stale payByHour on another category is cleared before pricing');

/* B-17 */
ok(/if\(state\.workerSelection === 'my' && !\(state\.hireAgainGophers && state\.hireAgainGophers\.length\)\)\{\s*state\.hireAgainGophers = \(window\.__myGopherNames/.test(src),
   'a default of Prioritize MY Gophers seeds every saved Gopher');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — worker choice + hourly match the app (D13, D14, B-17)');
process.exit(bad ? 1 : 0);
