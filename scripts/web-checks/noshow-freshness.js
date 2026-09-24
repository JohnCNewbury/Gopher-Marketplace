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

const VENDOR = path.join(__dirname, 'vendor', 'noShow.js');
const SHAFILE = path.join(__dirname, 'vendor', 'noShow.js.sha256');
// REPO is .../All New Gopher/Documentation/Claude Code Review:Cleanup/Code
const UPSTREAM = path.join(__dirname, '..', '..', '..', '..', '..',
  'Dev', 'gopher-mobile-request', 'src', 'helpers', 'noShow.js');

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

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

if (!fs.existsSync(UPSTREAM)) {
  console.log('  ⚠ SKIPPED the upstream comparison — gopher-mobile-request clone not present.');
  console.log('    Behavioural parity still ran and passed; only STALENESS is unverified here.');
  process.exit(0);
}

const up = sha(UPSTREAM);
if (up !== recorded) {
  console.log('  ✗ STALE — upstream noShow.js has changed since it was vendored.');
  console.log(`      vendored ${recorded}`);
  console.log(`      upstream ${up}`);
  console.log('    Re-vendor, then re-run: the parity test will say whether the web port');
  console.log('    still matches the NEW rule. Do not edit the web port before re-vendoring.');
  process.exit(1);
}
console.log('  ✓ vendored rule matches upstream gopher-mobile-request exactly');
console.log('\nPASS — vendored rule intact and current');
