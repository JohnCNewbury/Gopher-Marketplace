# Phase 2 — shared decision layer: findings

**Status 2026-08-22.** The visibility rule set is extracted, tested and enforced. Three findings
came out of comparing the surfaces, and **two need an owner decision**. Nothing was changed in a
deployed file.

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

## What was built

| Artifact | What it does |
|---|---|
| `Final/assets/js/gopher-flow-rules.js` | The shared rule set: 8 canonical categories with the slugs the `category_id` work adopts, the visibility table, Connect's override, priced categories, category-scoped keys, and a self-check |
| `docs/handoff/request-app-parity/test-flow-rules.js` | 44 assertions — including two that prove the invariant checker **fails** when fed the prototype's real defect and a mistyped category |
| `run_parity_harness.py` §6 | Asserts every surface's inline table still agrees with the module, and warns on step-gate divergence |

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

## Next in Phase 2

1. **Your two rulings** — the prototype pricing fix, and Connect's identity gate.
2. **Rewire the surfaces** to delegate to the module rather than merely agreeing with it, one at a
   time with browser verification.
3. **Extract `stepGate()`** once Finding 3 is settled.
