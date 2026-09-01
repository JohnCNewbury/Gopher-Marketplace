# Vendored — do not edit

`noShow.js` is a **byte-identical** copy of the requester app's no-show rule:

    gopher-mobile-request/src/helpers/noShow.js

vendored 2026-08-31 at sha256 `e7c6c1100a1b39853f0cf69a63fa4ccee1dd159c2488b8ae60a5785947cf3a56` (recorded in `noShow.js.sha256`).

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
| 2026-08-31 | `e7c6c110…` | **comment only** — upstream header extended to name all three implementations, which test binds which, and WHY the two signature differences are deliberate. It spells out the web→aasm mapping, so it contains web vocabulary in prose: the boundary scan strips comments before testing, and this re-vendor is the live proof that works. Code confirmed identical with comments stripped; 84-case parity and the 12+4 three-way both passed unchanged. |
| 2026-08-31 | `fa395db2…` | **comment only** — upstream added a ⛔ block pointing back at this copy. Rule untouched, confirmed by the 84-case matrix passing unchanged after re-vendoring. First live exercise of the loop, raised deliberately by the Current Sprint - TrustShield session so its first firing would be on something harmless. |
| 2026-09-01 | `797ca3aa…` | **comment only, and a REGRESSION in the documentation** — upstream's header is back to its original 13-line form: the ⛔ block naming all three implementations, which test binds which, and why the two signature differences are deliberate is **gone**. Rule untouched (see below). Re-vendored so the check goes green on the truth rather than on a stale copy. |

### ⚠️ What the 2026-09-01 firing actually found — read this before trusting the loop

**The rule has never moved.** With comments stripped, `production`, the current feature branch, the
upstream working tree and this vendored copy are all **code-sha `23cbeb66bba0f204`**. Three firings
of the freshness check, three comment-only changes. That is good news about the rule and a fair
warning about the check: so far it is a **comment-churn detector** that has not yet had to catch a
real divergence.

**The documentation header exists ONLY in this vendored copy.** It is on no branch — not
`production`, not the feature branch — and it is no longer in the upstream working tree either. So
it was an uncommitted working-tree edit at the moment it was vendored, and has since been discarded.

**Why that matters more than it looks.** The sha check can only fire for someone who has
`gopher-mobile-request` checked out beside the Code repo. Between those moments, the *only* thing
telling an upstream editor that two other implementations are bound to this file was that header
comment — and it is gone from the place an upstream editor would read. The safety chain is now one
link shorter, and nothing about that failure is loud.

**Also worth knowing: `main` does not contain this file at all.** A `git show main:…noShow.js`
fails, and a comparison loop that does not check for that failure hashes the empty output and
reports a difference that is not there. That happened during this investigation and produced a
false "the rule differs across branches" reading, retracted after re-measuring. `main` being frozen
and behind is expected; the lesson is to surface git's stderr rather than pipe past it.

**Recommendation, not applied:** restore the ⛔ header upstream and **commit** it, so the human link
survives a branch switch. Not done here — `gopher-mobile-request` is a live app repo and the edit
belongs to whoever owns that branch.

## Updating

Only when upstream's rule changes, and only as a whole file:

    cp "…/Dev/gopher-mobile-request/src/helpers/noShow.js" scripts/web-checks/vendor/noShow.js
    shasum -a 256 scripts/web-checks/vendor/noShow.js | awk '{print $1}' > scripts/web-checks/vendor/noShow.js.sha256

then run `./scripts/web-checks/run-all.sh` — the parity test will tell you
whether the web port still matches.
