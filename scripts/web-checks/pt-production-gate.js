/* Proves PT can never activate on a production host.

   This is the load-bearing safety property of the whole web↔Go playground:
   `Final/` is rsynced to the live hosts WHOLESALE, so gopher-web-pt-bridge.js
   ships whether or not anyone intends to publish it. The ?pt=1 flag alone would
   leave a mode on a public site that anyone could enter by guessing a query
   parameter — and entering it EMPTIES the visible dashboard.

   So PT requires ?pt=1 AND a development host. This asserts that, including the
   near-misses a naive substring check would let through. */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'Final', 'assets', 'js', 'gopher-web-pt-bridge.js'), 'utf8');

const CASES = [
  // dev hosts — PT allowed
  ['127.0.0.1',                    '?pt=1', true],
  ['localhost',                    '?pt=1', true],
  ['mac.local',                    '?pt=1', true],
  ['abc-def.trycloudflare.com',    '?pt=1', true],
  // no flag — never on
  ['127.0.0.1',                    '',       false],
  ['localhost',                    '?foo=1', false],
  // PRODUCTION hosts — must be false EVEN WITH the flag
  ['johncnewbury.github.io',       '?pt=1', false],
  ['gophergo.io',                  '?pt=1', false],
  ['www.gophergo.io',              '?pt=1', false],
  ['gopher-deals.netlify.app',     '?pt=1', false],
  // spoofing near-misses
  ['trycloudflare.com.evil.example', '?pt=1', false],
  ['localhost.evil.example',         '?pt=1', false],
  ['notlocalhost',                   '?pt=1', false],
];

let bad = 0;
for (const [hostname, search, expected] of CASES) {
  const win = { location: { hostname, search }, URLSearchParams };
  let got;
  try {
    got = new Function('window', 'location', 'URLSearchParams',
      src + '\n;return window.GopherWebPT.on();')(win, win.location, URLSearchParams);
  } catch (e) { got = 'THREW ' + e.message; }
  const ok = got === expected;
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗ FAIL'} ${hostname.padEnd(32)}${(search || '(no flag)').padEnd(10)}-> ${got}`);
}
console.log(bad ? `\nFAIL — ${bad} of ${CASES.length}` : `\nPASS — ${CASES.length} passed, 0 failed`);
process.exit(bad ? 1 : 0);
