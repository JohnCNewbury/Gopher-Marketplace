# Phase 2 — shared decision layer: findings

**Status 2026-08-22.** The visibility rule set is extracted, tested and enforced, and the money
constants are pinned. **Five findings** came out of comparing the surfaces — including a revenue
leak that contradicts an owner ruling, and three separate ways the app prototype has fallen behind
the web builds. **Four need your decision.** Nothing was changed in a deployed file.

Run it yourself:

```
python3 docs/handoff/request-app-parity/run_parity_harness.py
node    docs/handoff/request-app-parity/test-flow-rules.js
```

---

## What Phase 2 is for

Four surfaces will consume the same flow (Request app, Request web, Connect web, plus Gopher Go
reading the result). If each implements the flow's decisions privately, they drift — and this
project has already paid for that: three copies of the age-keyword list once drifted ~90 entries
apart, and the category-mismatch nudge sat **completely dead** on one page for weeks because that
page carried its own inline copy.

So the decisions move into shared, tested modules, and the parity harness fails a run when a
surface disagrees. Phase 3's parallel tracks are only safe once this exists.

---

## Finding 1 — the app prototype is stale on Moving pricing ⚠️ HARNESS FAILS

**Moving joined `PRICED_CATEGORIES` on 2026-08-08.** The web builds show the iQ pay suggestion for
Moving; the prototype still hides it, from before that work landed.

```
prototype aiPaySuggest hidden for: home, labor, moving, other, yard
module    aiPaySuggest hidden for: home, labor,         other, yard
```

⚠️ **Read that as a HIDE list.** `FIELD_HIDDEN_FOR` names the categories a field is hidden *for*,
so listing `'moving'` is what suppresses the suggestion, and the fix is to **remove** it. The
adjacent comment in the prototype says *"Delivery + Ride + Junk"* — the visible set — which is the
opposite polarity and easy to misread at a glance.

**Effect if shipped:** the app offers no pay suggestion on Moving requests, silently. Nothing
errors; the control simply never appears.

**The rule that makes it detectable, now encoded:** the categories showing `aiPaySuggest` must be
exactly the priced categories. Offering a suggestion where no model exists is a broken promise;
withholding one where a model does exist silently drops a feature. The harness fails on any
violation, so the next category added to pricing cannot repeat this.

**Fix:** remove `'moving'` from `aiPaySuggest` in the prototype's `FIELD_HIDDEN_FOR`. One entry.

**Left unfixed deliberately** — the prototype is on the deploy allowlist, and nothing goes to
production without your approval. This is the one thing keeping the harness red.

---

## Finding 2 — `multiStop` is built and switched off (informational)

Both web surfaces **implement** multi-stop — six `isVisible('multiStop')` call sites each — but:

| Surface | Visible for |
|---|---|
| Request | *nothing* — hidden for all eight categories |
| Connect | delivery, ride |
| Prototype | field absent entirely |

So in the consumer flow this is a **finished feature deliberately switched off**, not a missing
one. It is modelled as a Connect surface override and pinned by a test, so nobody "tidies up" a
dark-but-intentional feature — or, equally, assumes Request lost something.

Request also carries a **vestigial `laborMgmt` row that nothing reads** (0 call sites); the feature
is Connect-only. Harmless, worth knowing before someone treats the table as authoritative.

---

## Finding 3 — Connect is missing four gates Request enforces ⚠️ NEEDS A RULING

`stepGate()` decides what blocks Continue. Comparing the surfaces:

| Gate | Request | Connect |
|---|---|---|
| Step 2 · **Identity verification** | ✅ | ❌ |
| Step 4 · Addresses must differ | ✅ | ❌ |
| Step 6 · Addresses must differ | ✅ | ❌ |
| Step 6 · Schedule time chosen | ✅ | ❌ |

The last three are data-quality gates: a Connect user can submit with pickup and drop-off identical,
or schedule a request without picking a time.

**The first one needs your decision, and here is the full picture rather than my guess.**

Connect **does** support age-restricted delivery — 29 references, the banner, TrustShield hooks, and
canon gives it its **own A/R fee of $2.99** against Request's $1.99. It is a first-class path, not
an edge case.

But the two products verify identity at different moments:

- **Request** gates at Step 2 — TrustShield, or a submitted/on-file ID, before the request can be
  submitted. It has a full ID-capture path (`idVerification`, 29 refs).
- **Connect** has **no ID-capture path at all** (`idVerification`: 1 ref, only the scoped-keys
  entry) and no submit-time gate. It sets `idRequiredAtCompletion` and tells the user *"This request
  requires a picture of the front of a valid ID before items can be exchanged"* — i.e. the worker
  checks ID at handoff.

**That may be entirely correct.** A consumer ordering age-restricted goods proves their own age up
front; a business account is not the person receiving, so ID at handoff is arguably the right model.

**But canon does not say.** `connect-flows-granular.html` mentions age-restricted 36 times and is
**silent on identity verification** — no D-029, no "Submit Identification", no verification language
anywhere. So no one can tell whether Connect's behaviour is the design or an omission.

This is the same shape as the one-hire defect: **the doc was silent, the implementations diverged,
and a defect followed.** Per the standing rule that a silent doc *is* the bug, this wants a ruling
and a canon row either way.

**I did not extract `stepGate()` into the shared module because of this.** Extracting a rule set
containing an unresolved compliance divergence would bake in a guess. The harness now warns on the
divergence instead, so it cannot widen while the question is open.

---

## Finding 4 — the prototype over-discounts TrustShield ⚠️ MONEY, HARNESS FAILS

Found by a fee-parity check added while verifying the money constants. **The app prototype grants
the $1.00 TrustShield discount on every delivery, not only age-restricted ones.**

```
Request / Connect / canon:
    tsEligible = hasTS && ((category === 'delivery' && state.ageRestricted) || category === 'ride')

Prototype:
    tsEligible = hasTS && ( category === 'delivery'                          || category === 'ride')
                                                    ^^^^ missing && state.ageRestricted
```

**This contradicts an explicit owner ruling.** The canonical flow doc states the perk is *"a flat
$1.00 discount on age-restricted Delivery + all Ride Sharing orders (both editions; **not plain
delivery** — scope reconciled Jul 5 2026)"*. On 2026-07-05 the owner ruled the **narrow** build
scope authoritative and the canonical doc was corrected to match. The prototype still carries the
**broad** scope — the one that was rejected.

**Effect if the app is built from this blueprint:** every plain, non-age-restricted delivery placed
by a TrustShield holder is discounted $1.00 that canon says it should not be. It is a silent
revenue leak rather than a visible error, which is why it survived.

**Scope of the impact today — corrected 2026-08-22, my first framing understated it.** I originally
wrote "prototype only, not a live customer payment path". The second half is true: no real money
moves, because the prototype processes no payments. **But it is not internal.**
`_prototypes/Request/gopher-request-flow.html` is on the **deploy allowlist** and is served publicly
— verified live, HTTP 200, and the public copy carries both this bug and Finding 1 verbatim:

```
https://johncnewbury.github.io/Gopher-Marketplace/_prototypes/Request/gopher-request-flow.html
  const tsEligible = hasTS && (state.category==='delivery' || state.category==='ride');
  aiPaySuggest:['moving','home','labor','yard','other']
```

So this is the wrong discount **on a public URL the owner demos from**, computed into the displayed
fee breakdown. Not a revenue loss — a credibility one, in front of exactly the audience least able
to spot it. *(Public-exposure point raised by the Total SOW Priorities session; verified here
against the live URL rather than taken on report.)*

Request and Connect both implement the narrow scope correctly and were verified, including the
promo-first ordering and the cap that stops discounts exceeding total fees.

**Fix:** add `&& state.ageRestricted` to the delivery arm of `tsEligible`. One condition.

**Left unfixed deliberately** — same reason as Finding 1: the prototype is a deployed file.

---

## Finding 5 — the prototype never resets category-scoped state ⚠️ HARNESS FAILS

The web builds fixed this on **2026-07-19**. The prototype still has the pre-fix behaviour.

Switching category must snap category-**owned** fields back to their initial values, or the new
category silently inherits answers the user never gave it. Request and Connect both do this via
`CATEGORY_SCOPED_KEYS` (26 fields, identical on both, matching the module). **The prototype has no
such table and no `switchCategory` at all.** Its switch path is:

```js
state.category = cat.dataset.cat; state.openCatInfo = null;
if (state.payMode === 'bids' && !bidsAllowed()) state.payMode = 'set';
```

It resets `payMode`, and only when bids stop being valid. **22 of the 23 scoped fields it
implements carry straight across**, including `junkTier`, `payAmount`, `costOfItems`,
`itemsPurchased`, `itemCount`, `hazardous`, `numRiders`, `numBags`, `payByHour`, `numHours`, the
stairs/elevator access flags, and the age-gate acknowledgements.

**Concrete failure:** choose Junk → iQ detects a volume tier → the suggested pay comes from the
junk model → switch to Delivery → `junkTier` and `payAmount` both persist, so a Delivery request is
priced off a junk volume tier, with `hazardous` and `itemCount` still set from the junk job.

That is the exact scenario the July fix was written for: *"a category switch used to keep the
PREVIOUS category's answers, so the new category silently inherited gates the user had never
seen."*

**Fix:** port `CATEGORY_SCOPED_KEYS` and the reset into the prototype's category-change path —
now available from the shared module as `GopherFlowRules.categoryScopedKeys()`. Bigger than
Findings 1 and 4, but mechanical.

**Left unfixed deliberately** — deployed file, and unlike the other two this is a behavioural
change rather than a one-line correction, so it wants review.

---

## The pattern across Findings 1, 4 and 5

All three are the **app prototype lagging the web builds**, and all three would ship into the app:

| # | Drift | Fixed in web | Effect in the app |
|---|---|---|---|
| 1 | Moving missing from pay-suggestion visibility | 2026-08-08 | no Moving pay suggestion |
| 4 | TrustShield scope too broad | 2026-07-05 | $1.00 over-discount on plain delivery |
| 5 | No category-scoped reset | 2026-07-19 | stale pricing/answers after a category switch |

The prototype is the app's blueprint, so each of these is a defect waiting to be built. **They are
all in one file** (`_prototypes/Request/gopher-request-flow.html`) and could be fixed and verified
together. The harness now fails on all three, so they cannot be forgotten.

---

## Verified healthy — do not re-investigate

Recorded so the next person does not redo the work:

- **Fee constants match canon on all three surfaces.** Request $1.99 / Connect $2.99 age-restricted
  fee, 8% instant transfer everywhere, $1.00 TrustShield. The `$2.99` Connect difference is
  deliberate and documented as a HARD NOTE in canon.
- **Request's TrustShield logic is exactly right** — correct eligibility, promo applied first, and
  the discount capped so promo + TrustShield can never exceed total fees.
- **The 8% rate is a named constant** (`INSTANT_TRANSFER_RATE`), not a scattered literal. A raw
  count of `0.08` looks alarming (35 in Request) but all but one are CSS letter-spacing,
  transitions and an SVG path.
- **No surface calls `isVisible()` with a field missing from its own table** — that would throw,
  since the lookup is `FIELD_HIDDEN_FOR[field].includes(...)`. All three are clean.
- **The per-category fee tables are correct.** The prototype's `GOPHER_FEE` is identical to
  Request's ($0.99 delivery → $4.99 home), as it must be for the same product, and Connect's
  `GOPHER_FEE_BUSINESS` mirrors Request's base fees exactly — which is what canon asserts. Both
  relationships are now pinned by the harness.
- **Request and Connect agree on all 26 category-scoped keys**, matching the module.
- **The shared module works through both UMD paths** — CommonJS `require` and the browser global —
  so a surface can adopt it by script tag or bundler without a shim.

---

## What was built

| Artifact | What it does |
|---|---|
| `Final/assets/js/gopher-flow-rules.js` | The shared rule set: 8 canonical categories with the slugs the `category_id` work adopts, the visibility table, Connect's override, priced categories, category-scoped keys, and a self-check |
| `docs/handoff/request-app-parity/test-flow-rules.js` | 44 assertions — including two that prove the invariant checker **fails** when fed the prototype's real defect and a mistyped category |
| `run_parity_harness.py` §6 | Asserts every surface's inline table still agrees with the module, and warns on step-gate divergence |
| `run_parity_harness.py` §7 | Pins the money constants — age-restricted fee per edition, the 8% instant-transfer rate, and the TrustShield amount *and scope*. This is the check that caught Finding 4. |

**The design was measured, not assumed.** Request and Connect agree on **16 of 17** fields; the
prototype differs on exactly one. A single flat shared table would have been wrong — Connect is a
different product and legitimately differs — so the module carries a small surface-override layer
that matches reality instead of flattening it.

---

## Deliberately not done

- **No deployed file was modified.** Findings 1 and 3 both need approval.
- **`stepGate()` not extracted** — see Finding 3.
- **No surface rewired to use the module yet.** The harness asserts agreement first; rewiring is a
  reviewed step, not an overnight one.

---

## How a surface adopts the module (the Phase 3 step)

Nothing loads it yet — by design. The harness asserts each surface *agrees* with the module first;
rewiring is a reviewed change, not an overnight one. When you do rewire, it is small:

**Web surfaces** (`Final/gopher-request.html`, `Final/gopher-connect.html`) — add the script beside
the existing shared modules, then delete the inline table and point `isVisible` at the module:

```html
<script src="assets/js/gopher-flow-rules.js"></script>
```
```js
// replaces the inline FIELD_HIDDEN_FOR + isVisible pair
const FR = window.GopherFlowRules;
const isVisible = (field) => FR.isVisible(field, state.category /*, 'connect' */);
```

Connect passes `'connect'` as the third argument; Request and the app pass nothing. Everything else
— the 50 `isVisible()` call sites on each page — is untouched, because the signature is the same.

**React / Capacitor** — `import` or `require` it directly; the UMD wrapper covers CommonJS, AMD and
the browser global, and both paths are verified.

**Order matters:** the module must load *before* the flow script that calls `isVisible`, exactly
like `gopher-request-logic.js` today.

**Verify after rewiring** by running the harness (the surface must still match) and clicking one
category of each shape in a browser — a delivery (shows delivery type), a ride (hides describe), a
junk (shows hazardous), and a moving (shows stairs/elevator). Those four cover every distinct
visibility branch.

---

## Next in Phase 2

1. **Your rulings** — three prototype fixes (Findings 1, 4, 5) that all live in the same file and
   could be done and verified in one pass, plus Connect's identity gate (Finding 3), which needs a
   product decision and a canon row rather than a code change.
2. **Rewire the surfaces** to delegate to the module rather than merely agreeing with it, one at a
   time with browser verification.
3. **Extract `stepGate()`** once Finding 3 is settled.
