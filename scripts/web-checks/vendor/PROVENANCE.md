# Vendored — do not edit

`noShow.js` is a **byte-identical** copy of the requester app's no-show rule:

    gopher-mobile-request/src/helpers/noShow.js

vendored 2026-08-31 at sha256 `fa395db281f4c3728ac804b925dd1a816d353fef1431b79c9cd5c9a3a7781dbf` (recorded in `noShow.js.sha256`).

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

## Three implementations, one rule

As of 2026-08-31 there are three, and all three are held together by tests:

| # | implementation | bound by |
|---|---|---|
| 1 | `vendor/noShow.js` (byte-identical mobile rule) | the reference |
| 2 | `Final/gopher-request.html` — `noShowStateFrom` | `noshow-parity.js`, 84 cases |
| 3 | `_prototypes/Go/gopher-go-prototype.html` — `noShowWindowFrom` | `noshow-three-way.js` |

The prototype deliberately does NOT share the others' signature: it takes a
deadline (it has no aasm state and no backend reminder — the Gopher opens the
window by tapping "Customer not present") and returns `msLeft` rather than a
formatted clock, because it renders `M:SS` and the mobile helper `MM:SS`. That is
a display difference, not a rule difference. `noshow-three-way.js` therefore
compares **expiry and the displayed second**, never formatting — so nobody is
pushed to change the prototype's visuals to satisfy a test.

## ⚠️ The boundary that must not move

This helper takes `aasmState` as a **parameter**. The web→aasm mapping
(`status 'in-progress'` → `'purchased'`) lives OUTSIDE it, in
`Final/gopher-request.html` (`aasmStateForNoShow`). If that mapping is ever
pushed inside this file, the copy stops being upstream's and the sha check
becomes theatre. `noshow-parity.js` asserts the boundary explicitly.

## Re-vendor log

| date | sha256 | what changed upstream |
|---|---|---|
| 2026-08-31 | `797ca3aa…` | first vendoring |
| 2026-08-31 | `fa395db2…` | **comment only** — upstream added a ⛔ block pointing back at this copy. Rule untouched, confirmed by the 84-case matrix passing unchanged after re-vendoring. First live exercise of the loop, raised deliberately by the Current Sprint - TrustShield session so its first firing would be on something harmless. |

## Updating

Only when upstream's rule changes, and only as a whole file:

    cp "…/Dev/gopher-mobile-request/src/helpers/noShow.js" scripts/web-checks/vendor/noShow.js
    shasum -a 256 scripts/web-checks/vendor/noShow.js | awk '{print $1}' > scripts/web-checks/vendor/noShow.js.sha256

then run `./scripts/web-checks/run-all.sh` — the parity test will tell you
whether the web port still matches.
