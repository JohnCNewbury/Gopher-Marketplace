/* Is the VENDORED no-show rule still what upstream ships?

   This is the half that is ALLOWED to degrade. noshow-parity.js proves the web
   port matches the vendored rule and never skips; this proves the vendored rule
   matches upstream, and skips loudly when the clone is absent.

   That ordering is deliberate. Behavioural parity is what protects users, so it
   must hold in every checkout. Staleness is the slower, more visible failure:
   worst case you are pinned to a correct older rule — versus a parity test that
   goes silent and pins you to nothing. See vendor/PROVENANCE.md.

   Two distinct failures are reported separately, because the fixes differ:
     TAMPERED — the vendored copy no longer matches its own recorded sha.
                Someone edited a file marked do-not-edit. Restore it.
     STALE    — upstream changed. Re-vendor, then let parity tell you whether
                the web port still matches the NEW rule.                        */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VENDOR = path.join(__dirname, 'vendor', 'noShow.js');
const SHAFILE = path.join(__dirname, 'vendor', 'noShow.js.sha256');

/* ⛔ UPSTREAM IS THE APP'S `origin/production`, READ THROUGH GIT — not the clone's
   working tree (changed 2026-10-13). Until then this read
   Dev/gopher-mobile-request/src/helpers/noShow.js off disk, and that checkout sat
   on a 2026-09-02 feature branch, a month behind production. It happened to hold
   the same noShow.js, so nothing was wrong yet — but "matches upstream exactly"
   was being graded against whatever was checked out. The clone is found from the
   MAIN Code clone so a worktree under /tmp resolves it; GOPHER_REQUEST_APP
   overrides. Same reader as run_parity_harness.py §8. */
const APP_REF = 'origin/production';
function appClone() {
  if (process.env.GOPHER_REQUEST_APP) return process.env.GOPHER_REQUEST_APP;
  let main = path.join(__dirname, '..', '..');
  try {
    const common = execFileSync('git', ['-C', main, 'rev-parse', '--path-format=absolute',
      '--git-common-dir'], { encoding: 'utf8' }).trim();
    main = path.dirname(common);
  } catch (e) { /* not a git checkout: fall back to this tree's own location */ }
  // main is .../All New Gopher/Documentation/Claude Code Review:Cleanup/Code
  return path.join(main, '..', '..', '..', 'Dev', 'gopher-mobile-request');
}
function upstreamBytes() {
  const clone = appClone();
  try {
    const ref = execFileSync('git', ['-C', clone, 'log', '-1', '--format=%h %ci', APP_REF],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const bytes = execFileSync('git', ['-C', clone, 'show', APP_REF + ':src/helpers/noShow.js'],
      { stdio: ['ignore', 'pipe', 'ignore'] });
    return { ref, bytes };
  } catch (e) {
    return null;
  }
}

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const shaBytes = b => crypto.createHash('sha256').update(b).digest('hex');

const recorded = fs.readFileSync(SHAFILE, 'utf8').trim();
const vendored = sha(VENDOR);

if (vendored !== recorded) {
  console.log('  ✗ TAMPERED — the vendored rule does not match its recorded sha.');
  console.log(`      recorded ${recorded}`);
  console.log(`      actual   ${vendored}`);
  console.log('    vendor/noShow.js is a byte-identical copy and must not be edited.');
  console.log('    Restore it from upstream, or re-record the sha if you re-vendored deliberately.');
  process.exit(1);
}
console.log(`  ✓ vendored rule intact (sha ${recorded.slice(0, 16)}…)`);

const upstream = upstreamBytes();
if (!upstream) {
  console.log(`  ⚠ SKIPPED the upstream comparison — no gopher-mobile-request clone with ${APP_REF}.`);
  console.log('    Behavioural parity still ran and passed; only STALENESS is unverified here.');
  process.exit(0);
}
console.log(`  · upstream = app ${APP_REF} @ ${upstream.ref} (last fetch)`);

const up = shaBytes(upstream.bytes);
if (up !== recorded) {
  console.log(`  ✗ STALE — upstream noShow.js (${APP_REF}) has changed since it was vendored.`);
  console.log(`      vendored ${recorded}`);
  console.log(`      upstream ${up}`);
  console.log('    Re-vendor, then re-run: the parity test will say whether the web port');
  console.log('    still matches the NEW rule. Do not edit the web port before re-vendoring.');
  process.exit(1);
}
console.log('  ✓ vendored rule matches upstream gopher-mobile-request exactly');
console.log('\nPASS — vendored rule intact and current');
