/* Proves PT can never activate on a production host.

   This is the load-bearing safety property of the whole web↔Go playground:
   `Final/` is rsynced to the live hosts WHOLESALE, so gopher-web-pt-bridge.js
   ships whether or not anyone intends to publish it. The ?pt=1 flag alone would
   leave a mode on a public site that anyone could enter by guessing a query
   parameter — and entering it EMPTIES the visible dashboard.

   So PT requires ?pt=1 AND a development host. This asserts that, including the
   near-misses a naive substring check would let through.

   ⚠️ EVERY CASE MUST CARRY A pathname. Since 2026-09-02 one allowlist entry is
   host + PATH PREFIX — the prototype twin at
   johncnewbury.github.io/Gopher-Marketplace-Prototype/ shares its HOSTNAME with
   production at /Gopher-Marketplace/. A case that omits pathname makes the twin
   rule test the literal string "undefined", so it returns false and the
   production assertions pass for the wrong reason: a green that could never have
   gone red. The pathname column is load-bearing, not cosmetic. */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'Final', 'assets', 'js', 'gopher-web-pt-bridge.js'), 'utf8');

const CASES = [
  // [hostname, pathname, search, expected]
  // dev hosts — PT allowed, path irrelevant
  ['127.0.0.1',                 '/x.html',                                  '?pt=1', true],
  ['localhost',                 '/x.html',                                  '?pt=1', true],
  ['mac.local',                 '/x.html',                                  '?pt=1', true],
  ['abc-def.trycloudflare.com', '/x.html',                                  '?pt=1', true],
  // no flag — never on, on any host
  ['127.0.0.1',                 '/x.html',                                  '',       false],
  ['localhost',                 '/x.html',                                  '?foo=1', false],
  // THE PROTOTYPE TWIN — allowed, and only under its own path prefix
  ['johncnewbury.github.io', '/Gopher-Marketplace-Prototype/_prototypes/web-split-screen.html', '?pt=1', true],
  ['johncnewbury.github.io', '/Gopher-Marketplace-Prototype/gopher-request.html',               '?pt=1', true],
  ['johncnewbury.github.io', '/Gopher-Marketplace-Prototype/gopher-connect.html',               '?pt=1', true],
  // …but the twin still needs the flag
  ['johncnewbury.github.io', '/Gopher-Marketplace-Prototype/gopher-request.html',               '',      false],
  // PRODUCTION hosts — must be false EVEN WITH the flag
  ['johncnewbury.github.io',    '/Gopher-Marketplace/gopher-request.html',   '?pt=1', false],
  ['johncnewbury.github.io',    '/Gopher-Marketplace/',                      '?pt=1', false],
  ['johncnewbury.github.io',    '/',                                         '?pt=1', false],
  ['gophergo.io',               '/gopher-request.html',                      '?pt=1', false],
  ['www.gophergo.io',           '/gopher-request.html',                      '?pt=1', false],
  ['gopher-deals.netlify.app',  '/',                                         '?pt=1', false],
  // path near-misses on the shared hostname — the separating slash is the guard
  ['johncnewbury.github.io',    '/Gopher-Marketplace-Prototype',             '?pt=1', false],
  ['johncnewbury.github.io',    '/Gopher-Marketplace-Prototypex/a.html',     '?pt=1', false],
  ['johncnewbury.github.io',    '/Gopher-Marketplace/Gopher-Marketplace-Prototype/a.html', '?pt=1', false],
  // host spoofing near-misses
  ['trycloudflare.com.evil.example',  '/x.html', '?pt=1', false],
  ['localhost.evil.example',          '/x.html', '?pt=1', false],
  ['notlocalhost',                    '/x.html', '?pt=1', false],
  ['johncnewbury.github.io.evil.com', '/Gopher-Marketplace-Prototype/a.html', '?pt=1', false],
];

let bad = 0;
for (const [hostname, pathname, search, expected] of CASES) {
  const win = { location: { hostname, pathname, search }, URLSearchParams };
  let got;
  try {
    got = new Function('window', 'location', 'URLSearchParams',
      src + '\n;return window.GopherWebPT.on();')(win, win.location, URLSearchParams);
  } catch (e) { got = 'THREW ' + e.message; }
  const ok = got === expected;
  if (!ok) bad++;
  console.log(`  ${ok ? '✓' : '✗ FAIL'} ${hostname.padEnd(30)}${pathname.padEnd(56)}${(search || '(no flag)').padEnd(9)}-> ${got}`);
}
console.log(bad ? `\nFAIL — ${bad} of ${CASES.length}` : `\nPASS — ${CASES.length} passed, 0 failed`);
process.exit(bad ? 1 : 0);
