/* The harness relay loop must schedule ITSELF EXACTLY ONCE PER PASS.

   This is the highest-consequence regression in web-split-screen.html and it has
   already happened: an earlier version scheduled the next pass inside the try
   block AND in the finally, so every parked pass queued TWO ticks and the loop
   doubled every 600ms — 1,369,180 passes in about a minute. It starved the event
   loop badly enough that the web pane never finished loading, and the blank pane
   was misread as "Connect's bridge is broken". It was not; the loop was eating
   the page.

   The reschedule must live in the `finally`, because a reschedule placed after
   the catch only runs if the catch itself completes — and the catch throwing on
   a cross-realm error object is exactly what killed this loop the first time.

   The DELAY may vary (it is 80ms while parked and 600ms once live, so boot is
   not quantised to 600ms rounds). The NUMBER of schedulers may not. */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', '_prototypes', 'web-split-screen.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL'} ${m}`); if (!c) bad++; };

const sched = src.match(/setTimeout\(\s*tick\s*,/g) || [];
ok(sched.length === 1, `exactly one setTimeout(tick, …) in the file (found ${sched.length})`);

/* It must be inside the finally, not after the catch. */
const fin = src.indexOf('}finally{');
const at = src.search(/setTimeout\(\s*tick\s*,/);
ok(fin > -1 && at > fin, 'the reschedule sits inside the finally block');

/* The tick body must RETURN when parked rather than scheduling its own retry. */
const body = src.slice(src.indexOf('function tick()'), src.indexOf('function tickBody()'));
ok(/if\(!signedIn\)\{[^}]*return;/.test(body.replace(/\s+/g, ' ').replace(/ /g, '')) ||
   /parked\+\+;\s*return;/.test(body),
   'a parked pass returns and lets the finally reschedule it');

/* And the boot poll must actually be faster than the steady-state one, or the
   panes sit blank through 600ms rounds while the frames are already loaded. */
const m = src.match(/setTimeout\(\s*tick\s*,\s*([^)]+)\)/);
ok(!!m && /\?/.test(m[1]), `the delay adapts between boot and steady state (${m ? m[1].trim() : 'n/a'})`);

console.log(bad ? `\nFAIL — ${bad} check(s)` : '\nPASS — one scheduler, in the finally, adaptive delay');
process.exit(bad ? 1 : 0);
