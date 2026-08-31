# Vendored — do not edit

`noShow.js` is a **byte-identical** copy of the requester app's no-show rule:

    gopher-mobile-request/src/helpers/noShow.js

vendored 2026-08-31 at sha256 `797ca3aadc6903ef0137036deb01f40733c183045cb3dbae2e9aafdf999a6512` (recorded in `noShow.js.sha256`).

## Why it is vendored rather than read from the clone

The web no-show block in `Final/gopher-request.html` is a PORT of this rule, and
`../noshow-parity.js` holds the two to identical behaviour. Reading the rule
straight out of a sibling clone made that test **skip** whenever the clone was
absent — which is most checkouts, and precisely the situation in which someone
edits the web copy with no way to notice drift. A parity test that goes quiet
exactly when drift is most likely is worse than none.

Vendoring inverts which half can degrade:

| check | needs the clone? | degrades to |
|---|---|---|
| `noshow-parity.js` — web port vs this rule | **no** | never skips |
| `noshow-freshness.js` — this rule vs upstream | yes | skips loudly |

Behavioural parity — the property that actually protects users — is now
unconditional. Staleness detection is what degrades, and staleness is the slower,
more visible failure: worst case you are pinned to a correct older rule, versus
pinned to nothing at all. (Shape proposed by the Current Sprint - TrustShield
session, mirroring how `gopher-step-gates.js` was vendored into the Request app.)

## ⚠️ The boundary that must not move

This helper takes `aasmState` as a **parameter**. The web→aasm mapping
(`status 'in-progress'` → `'purchased'`) lives OUTSIDE it, in
`Final/gopher-request.html` (`aasmStateForNoShow`). If that mapping is ever
pushed inside this file, the copy stops being upstream's and the sha check
becomes theatre. `noshow-parity.js` asserts the boundary explicitly.

## Updating

Only when upstream's rule changes, and only as a whole file:

    cp "…/Dev/gopher-mobile-request/src/helpers/noShow.js" scripts/web-checks/vendor/noShow.js
    shasum -a 256 scripts/web-checks/vendor/noShow.js | awk '{print $1}' > scripts/web-checks/vendor/noShow.js.sha256

then run `./scripts/web-checks/run-all.sh` — the parity test will tell you
whether the web port still matches.
