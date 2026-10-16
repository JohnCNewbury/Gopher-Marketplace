/* Scheduling, as the Request app has it (audit 10/15; John: "App wins; bugs fixed
   on both"):
   - B-27: an exact time from ONE HOUR from now up to 14 DAYS ahead (app
     datetimepicker.js: minDate now + 1 h, maxDate now + 14 days). The web booked
     from tomorrow with no end. Driven 10/15 ~5:55 PM: today bookable (first time
     7:00 PM), last day the 29th, next month locked.
   - B-29: a resumed draft whose exact time has passed becomes Need ASAP (app
     yardDraft.js); executed below on the real module.
   Not changed (owner picker-design question): the 30-min 6 AM-9 PM slot grid
   (the app allows any time in 5-min steps), B-26 and B-28. */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(R, 'Final/gopher-request.html'), 'utf8');
global.window = {};
const D = require(path.join(R, 'Final/assets/js/gopher-request-draft.js'));
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

ok(/const LEAD_MS = 60 \* 60 \* 1000;/.test(src) && /const MAX_DAYS_AHEAD = 14;/.test(src), 'B-27: one hour lead, 14 days ahead');
ok(/at\.getTime\(\) > lo && at\.getTime\(\) <= hi/.test(src), 'B-27: a slot must be strictly after now + 1 h and within 14 days');
ok(/const disabled = cellDate < minDate \|\| cellDate > maxDate \|\| !slotsFor\(iso\)\.length;/.test(src), 'B-27: days outside the window are disabled');
ok(/data-cal-nav="next" \$\{canNext\?'':'disabled'\}/.test(src), 'B-27: no month past the window');
ok(/slotsFor\(state\.schedDate\)\.map\(t =>/.test(src), "B-27: only the day's bookable times are offered");

const now = new Date(2026, 9, 15, 15, 0, 0);
const run = (o) => { const r = D.sanitizeOnResume(Object.assign({ category: 'delivery', description: 'x' }, o), now); const s = r.state || r.draft || r; return s; };
const past = run({ scheduleType: 'scheduled', schedDate: '2026-10-15', timeSlot: '9:00 AM', scheduleConfirmed: true });
ok(past.scheduleType === 'now' && !past.schedDate, 'B-29: today 9:00 AM resumed at 3 PM -> Need ASAP');
const yest = run({ scheduleType: 'scheduled', schedDate: '2026-10-14', timeSlot: '2:00 PM', scheduleConfirmed: true });
ok(yest.scheduleType === 'now', 'B-29: yesterday -> Need ASAP');
const fut = run({ scheduleType: 'scheduled', schedDate: '2026-10-15', timeSlot: '6:00 PM', scheduleConfirmed: true });
ok(fut.scheduleType === 'scheduled' && fut.timeSlot === '6:00 PM', 'B-29: a time still ahead is kept');
const flex = run({ scheduleType: 'flexible', flexibleWindow: 'week' });
ok(flex.scheduleType === 'flexible', 'B-29: flexible windows are untouched');

console.log(bad ? `\n${bad} FAILED` : '\nALL PASS — scheduling window + expired drafts match the app (B-27, B-29)');
process.exit(bad ? 1 : 0);
