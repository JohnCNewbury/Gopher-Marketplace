# Reading DOB off the ID barcode — in-house replacement for iDenfy's `docDob`

**Status: SPEC, not built. 2026-08-23.**
Owner decisions are listed in §9. §9.1 (decoder) is **DECIDED — ML Kit, on-device, both
platforms**. Nothing should be implemented before the **real-card decode trial** in §9.1, which that
ruling does not close.

---

## 0. Scope — which surface, and the timing gap

**This targets the LAUNCH build, not the live apps.** TrustShield verification is app-only today
(the web modal routes users to the store), so the barcode read lands in the rebuilt client.

⚠️ **But the reason for the change is a *now* problem and launch is not a *now* thing.** iDenfy is
being retired because **TrustShield tokens are running out**. If they run dry before the launch
build ships:

- **Existing badge holders are unaffected** — `trust_shield_verified` is stored, nothing is revoked.
- **New verifications become impossible.**
- **Under-30 users lose age-restricted ordering entirely** — `trust_shield_required()` refuses an
  age-restricted order from anyone under 30 without the badge, and with no way to obtain one that is
  a hard block with **no remedy available in the product**. Same dead-end shape as Connect's missing
  ID-capture path (D-038 Part 1): an error naming a remedy the surface cannot offer.

**And the live apps cannot be patched quickly** — there is no OTA; every mobile client change needs
a store release.

### 0.1 The dates, and why there is NO config-only fix

**Credits run out in the LAST WEEK OF SEPTEMBER (~Sept 26–29)** — *re-dated 2026-08-23; see the burn-rate note below* — *hard numbers from the TrustShield session, 2026-08-23,
read off iDenfy's own dashboard:* **218 credits remaining** (3,370 limit − 3,152 used).

**PINNED BURN DEFINITION** — burn = **APPROVED** verifications (the billed event; DENIED/EXPIRED are
not billed), timestamped by **scan-ref creation**. Measured over clean windows: 7d **5.57/day**, 14d
**5.93/day**, 30d **6.30/day**, Aug-MTD excluding the Aug 7–9 outage **6.05/day**. **Central forward
estimate ~6.0/day → ~36 days → last week of September.**

⚠️ **Do not plan to the day.** And do not use the Aug-MTD figure of 5.25/day: it includes the
**Aug 7–9 outage** (~3 days at zero enrollments), which drags the mean down and would push the
projected cliff artificially LATE. Their DB count tracks iDenfy's billing credit-for-credit
this month (105 approved = iDenfy's "Verifications 105", exact match), so the figure is good to
within 1–2 credits between dashboard reads.

⚠️ **Two earlier dates in circulation are WRONG and should be disregarded.** *"~Aug 10"* was a slip —
it has not passed us into a gap. *Dec 30* is the **subscription term** expiry, which is later and is
**not** the binding constraint: **credits run out first.**

**Verification is live right now, verified empirically rather than assumed** — most recent approval
was user 142415 at 2026-08-23 18:43 UTC, 15 in the last 72 h, 105 in August. Live config
reconfirmed at the known-good state: `TRUSTSHIELD_MIN_AGE=30`,
`TRUSTSHIELD_TOKEN_GATED_AGES_ONLY=false`.

✅ **Existing badge holders are fully insulated, and this is now built, not assumed.**
`get_idenfy_files` serves the ID and selfie from **our own S3 mirror first** (merged `ed270b91`,
verified live returning `source:'mirror'`). Existing TrustShield badges keep working end-to-end
after iDenfy goes dark. **Only NEW enrollment depends on credits** — which narrows this whole
problem to one population.

⛔ **The failure mode at credit exhaustion is an INFINITE SPINNER, not an error.** When token
issuance fails, `idenfy.js` sits on `<Loader/>` with no error state. So the user-visible symptom of
running out is not "TrustShield is unavailable" — it is an app that appears to hang. **That is worse
than a refusal and it is the thing to fix first if the cliff is going to be crossed at all.**

⛔ **The obvious interim does not work, and the reason is a failure this project has already had.**
Dropping `TRUSTSHIELD_MIN_AGE` from 30 to 21 is an env var — instant, no deploy, no store release.
It fails because **the live app hardcodes the threshold**:

| Layer | Threshold | Changeable how |
|---|---|---|
| Backend order gate | `TRUSTSHIELD_MIN_AGE` (default 30) | env var — instant |
| Backend token gate | `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` | env var — instant |
| **Live requester app** | **`calculateAge() < 30`, hardcoded in TWO places** | **store release only** |

`RequestCategoryBlock.js:77` and `togglebutton.js:139` both carry the literal. An under-30
unverified user is blocked **client-side** whatever the backend says, so lowering the server
threshold alone recreates the **2026-08-06 deadlock** — the app demanding a badge the server no
longer requires, with the user stuck between them. See `age-gate-lives-in-three-layers`.

**Therefore: restoring under-30 age-restricted ordering after ~Sept 10 needs a CLIENT change, which
needs a store release, which has to start now.**

**Smallest change that closes it — align all three layers on 21 rather than 30:**
- Under-21 is unaffected: they already cannot see the tiles (`can_request_restricted_items`).
- 21–29 year-olds would order age-restricted **without** TrustShield — exactly how 30+ users work
  today, so this is not a new posture.
- Residual risk is a requester who lied about their DOB, caught by **the Gopher's physical ID check
  at the door** — the §2 threat model, unchanged.

This does **not** weaken the age floor; it removes a verification requirement that will shortly have
no way to be satisfied.

**The alternative is to do nothing** and accept that from the ~Sept 22–25 cliff, **new** under-30
enrollment stops — existing holders are unaffected (see the S3 mirror above), so the exposed
population is *new* under-30 users who want age-restricted delivery. That may be acceptable — ⚠️ **but nobody has pulled the number:
what share of age-restricted volume comes from requesters aged 21–29?** That single figure decides
between "ship a store release now" and "accept the gap". It is the highest-value missing input in
this document.

### 0.2 Who is actually exposed — measured, and the intuition inverts

**Order volume says the band is small. Enrollment says it is not. The second number is the one that
decides.**

**By order volume** — 2026 age-restricted orders (n=11,153), requester age *at order time*, from
`Dashboard/data/master/Orders.csv` + `Users.csv`:

| Band | Orders | Share |
|---|---|---|
| **Under 21** | **0** | **0.0%** |
| 21–29 | 1,275 | 11.4% |
| 30+ | 9,177 | 82.3% |
| Unknown DOB | 701 | 6.3% |

2025 agrees (12.7% in-band), and the **TrustShield session independently measured 10.2–12.0% off the
live production DB** across three windows. Two sources, two methods, same answer.

**⚠️ But that understates the exposure, and the reason is structural.** New TrustShield enrollments,
Aug 1–23 (live DB, TrustShield session): **21–29 = 76.7%**, 30+ = 19.2%, **under-21 = 0**.

**Why it flips:** 30+ place 84% of age-restricted orders but **the gate does not require the badge
for them**, so they almost never enroll. 21–29 place only ~10% of orders but **each one must verify
to participate at all**. The enrollment funnel is therefore ~77% 21–29 even though their order share
is ~11%.

✅ **Corroborated independently from the user export** (this session): among **6,894** current
TrustShield holders, **61.6% are aged 21–29** vs **19.8%** of all 140,367 users — a **3.1×
over-representation**, with 30-39 at 0.5× and 40+ at 0.4×. The stock (61.6%) sits below the flow
(76.7%) exactly as ageing predicts — a 25-year-old who enrolled in 2023 is 28 now, and some have
aged out into the 30-39 holders. **Two different measurements, two different sources, same
conclusion.**

**So the harm of crossing the cliff is NOT "≈11% of orders blink out".** Existing holders are
insulated by the S3 mirror. The exposed population is **new 21–29 first-timers**, at ~92 per 23 days
= **~4/day, ~28/week**, who cannot start at all — **and who hit the infinite spinner rather than a
refusal**. That compounds weekly until launch.

⛔ **This is the quantified case for shipping the error-state screen as a standalone small store
release, independent of the capture-flow timeline.** It converts a hung app into an honest
"verification temporarily unavailable" and makes the cliff crossable deliberately.

**Also measured, and relevant to D-038:** **0 age-restricted orders from under-21 requesters** in
2025 or 2026, and **0 under-21 TrustShield holders**. `can_request_restricted_items` and iDenfy's
under-21 refusal are both demonstrably working — **which is exactly what a self-granted badge would
remove.**

*Reconciliation note:* the "8,191 A/R in 2026" figure in older records counted only the two dedicated
sub-categories (`Other Age-Restricted` 7,675 + `Alcohol` 529 = 8,204). The 11,153 used here adds
orders in other categories where the requester ticked the slider — mostly Convenience Store (2,455).
**11,153 is the correct denominator for this question**, because `trust_shield_required()` reads the
flag and does not branch on category. Both figures are right; they measure different things.

✅ *The two figures flagged earlier are RESOLVED, not averaged* (TrustShield session, 2026-08-23). **105 vs 120 approved** was a **3-day time gap**, not a definition conflict — same metric measured Aug 20 and Aug 23 (+15 ≈ 5/day). **6.6 vs 5.2/day** was two different windows, one **contaminated by the Aug 7–9 outage**. Flagging rather than averaging is what surfaced both; averaging would have produced a plausible wrong number and a wrong cliff date.

**So the scope question is not launch-vs-live, it is: does the token supply outlast the launch
build?** *(Answered 2026-08-23: **no** — ~18 days.)*

| If | Then |
|---|---|
| Tokens outlast launch | Launch-only is correct. This spec is the whole answer. |
| Tokens run out first | An interim answer is needed for **live**, and it is **not** this spec — a barcode read requires a store release too. |

**The cheap interim, if it is needed:** bar under-21 users from TrustShield entirely (owner's
proposal, 2026-08-23). That is a **server-side** change requiring no store release, and it closes
the badge short-circuit in `trust_shield_required()` for exactly the population the age floor exists
to protect. It does not restore verification for everyone else — nothing without a vendor does, on
a client that cannot be updated — but it keeps the *age* guarantee intact while the launch build
lands. **⚠️ Open: how many tokens remain, and what the launch date is. Nobody has put those two
numbers side by side.**

---

## 1. Why this exists

iDenfy is being retired and TrustShield verification is being brought in-house. One thing iDenfy
contributes cannot be replaced by re-creating the *flow*: **`data.docDob` — the date of birth read
off the government document.**

That matters because `users.date_of_birth` is **self-reported and typeable**. The source comment in
`helpers/trustshield_policy.js` names this as exactly how 18-, 19- and 20-year-olds came to be
approved: any DOB can be entered at signup, and until `document_shows_under_age()` was added nothing
in between checked.

So the question this spec answers is narrow and concrete: **can we obtain an authoritative DOB from
the document itself, without a vendor?** Yes — for US driver's licences and state IDs, by decoding
the PDF417 barcode on the **back** of the card.

> **The new capture flow already collects what this needs.** Today's flow takes *front + selfie*.
> The three-step flow (front, **back**, selfie) adds the back — which is the barcode side. This
> capability is a by-product of a decision already made for other reasons.

---

## 2. Threat model — read this before designing anything

**This is a fraud control, not a compliance control.** Getting that backwards leads to
over-engineering (liveness, face match, document authentication) for a risk that is already covered
elsewhere.

**The compliance control is the human at the door.** Canon, unchanged: *"age-restricted deliveries
always require ID"*, checked **in person, at the exchange**. The Gopher is mandated to inspect the
physical ID, judge whether it is real, and whether the person in front of them is over 21. A
submitted ID is **pre-clearance only** and never replaces that check.

**So the single realistic loss from a defeated barcode read is a discount given to someone who
lied** — the TrustShield $1 perk (`tsEligible = hasTS && ((delivery && ageRestricted) || ride)`).
Everything downstream fails safe:

| Attacker does | Outcome |
|---|---|
| Encodes a fake PDF417, or photographs someone else's card | Gets the badge and the $1 perk |
| Places an age-restricted order | Worker shops, travels, presents at the door |
| Cannot produce a valid matching ID in person | **Refused. No items.** |
| Tries to recover the money | **No refund** for items or the Gopher offer (existing policy) |

The liar is out the cost of the order and the worker is still paid. **Platform exposure is ≈ $1 per
successful lie**, and the attack is expensive and self-defeating.

**Design consequence, and it is the whole point:** we do **not** need liveness, face matching, or
document authentication. We need an **age floor that cannot be defeated by typing a false birthday
into a signup form**. A barcode read delivers exactly that and nothing more — which is the correct
amount.

---

## 3. What the barcode actually contains

US driver's licences and state ID cards carry a **PDF417** symbol on the back, encoding a data set
defined by the **AAMVA DL/ID Card Design Standard**. Relevant elements:

| Element | Meaning |
|---|---|
| `DBB` | **Date of birth** — the field this spec is about |
| `DBA` | Document expiry |
| `DBD` | Issue date |
| `DCS` / `DAC` | Family name / first name |
| `DAQ` | Licence number |

**This is decoding, not OCR.** There is no text recognition, no ML model, no training data and no
per-scan cost — the data is a structured payload printed on the card.

> ⚠️ **The one real parsing trap: the DOB date format changed between AAMVA versions.** Newer
> versions use `CCYYMMDD`; some older cards use `MMDDCCYY`. The header carries the AAMVA version
> number, so the parser **must branch on it rather than guess** — and a naive parse silently yields
> a wrong year for a subset of real cards, which is the worst kind of failure here because it
> produces a confident wrong age. **This must be validated against real cards from several states
> before it is trusted (§9.1).** Everything in this section is stated from the standard, not from
> observed cards, and is marked inherited until that trial happens.

---

## 4. Decoding, per platform

Capture is already solved — `@capacitor/camera` v8 is in the app today. Only decoding is new.

### 4.1 Mobile (Capacitor 8, React 18)

**On-device barcode decoding via ML Kit** (`@capacitor-mlkit/barcode-scanning` or equivalent).
PDF417 is a supported symbology. Runs **entirely on the device**: no account, no API key, no
per-scan fee, and **the image never leaves the phone for decoding**.

> ✅ **DECIDED — owner, 2026-08-23: ML Kit on both platforms.** The bar is *on-device with no vendor
> relationship*, and ML Kit meets it: a Google **library bundled into the app**, not a service — no
> contract, no usage billing, no per-scan fee. Apple's Vision framework
> (`VNDetectBarcodesRequest`) is genuinely first-party and equally capable on iOS, but a hybrid buys
> nothing functional and costs two code paths and two sets of edge cases.
>
> ⚠️ **Two specifics decide whether that guarantee is real rather than nominal — see §9.1:** use the
> **bundled** Android model (the Play-Services thin client re-adds a network fetch and a Play
> Services dependency), and confirm **no telemetry egress** with one build-time network trace.

### 4.2 Web (Request web / Connect web)

A **WASM PDF417 decoder** (the zxing-cpp family has WASM bindings). Runs in the browser, same
privacy property — the image is decoded locally. Slower and more sensitive to image quality than the
native path, which is an argument for capture-time feedback (§6).

---

## 5. Where it runs, and what we keep

**Decode on the client; RE-DERIVE on the server. Do not let the app send a bare DOB.**

1. Client decodes the barcode and captures the **raw AAMVA payload**.
2. Client sends **the payload** (not just the parsed date) with the verification submission — never a
   client-computed age, and never a client-computed "is over 21" boolean.
3. **The server parses `DBB` itself and makes the decision.**

⚠️ **This is a weaker trust boundary than iDenfy was, and the spec must not pretend otherwise**
(raised by the TrustShield session, 2026-08-23). With a vendor, the DOB was asserted by a third party
the client could not influence. Here **the client computes the value it is then trusted on** — so a
tampered or directly-called client can claim anything.

Re-deriving server-side does not make that impossible; a determined attacker can craft a valid-looking
AAMVA payload, or photograph a barcode they generated. **What it does is raise the bar from "edit one
JSON field" to "forge a structurally valid document payload"**, and it removes the case where the app
is simply wrong rather than malicious. Stronger still — and worth doing if cost allows — is sending
the **captured image** and decoding server-side, so the app never handles the value at all.

**None of this reaches vendor-grade assurance, and per §2 it does not need to:** the compliance
control is the Gopher checking physical ID at the door. But the difference between *"the gate works"*
and *"the gate looks like it works"* is exactly this, and the doc should say which one is being
bought.

⛔ **The under-21 refusal must live SERVER-side on the re-derived value.** Client-side it is
bypassable, and it is the single protection currently producing **zero** under-21 badge holders (§0.2)
— see `LEGAL_MIN_AGE` / `meets_legal_min_age` at token time and `document_shows_under_age` at webhook
in `helpers/trustshield_policy.js` for how the live gate enforces the floor today. **Whatever
replaces iDenfy inherits that refusal as a hard requirement, granted from the BARCODE-read DOB and
never from a self-typed one.**

**Stored:** the extracted DOB, the AAMVA version, and a decode-outcome marker (`decoded` /
`unreadable` / `absent`). Enough to audit a decision and to re-run analysis later.

**Not stored beyond what the ID-image retention rule already covers:** nothing new. This spec adds a
*field*, not a new class of data. ⚠️ **The retention and access policy for the ID images themselves
is a separate open owner decision** and is a precondition for the in-house flow generally — not
introduced by this spec, but not answered by it either.

---

## 6. Failure paths — the part that decides whether users hate this

A decode failure must never read as "user is lying", and must never silently pass.

| Case | Behaviour |
|---|---|
| Decoded, `DBB` present, age ≥ 21 | Proceed |
| Decoded, `DBB` present, age < 21 | **Refuse** — same floor as `document_shows_under_age()` today |
| Decoded, `DBB` absent or unparseable | Treat as **not proven** — do not refuse on this alone (§9.2) |
| Barcode unreadable (blur, glare, crop) | **Retry with specific guidance**, not a generic failure |
| Card has no PDF417 (passport, foreign ID, some older cards) | Fall through to the §9.2 route |

**Capture-time feedback is not polish, it is the feature.** *"We couldn't read the barcode — move
into better light and keep the card flat"* is the difference between a 30-second task and an
abandoned signup. The web path especially needs this because WASM decoding is more
quality-sensitive.

**Mirror the existing refuse-on-proof-only rule.** `document_shows_under_age()` returns true **only
on positive proof** of under-21 and treats a missing document DOB as "not proven" — deliberately, so
it is not a second no-DOB gate. Keep that property exactly; it is why the current implementation
does not lock out users whose documents scan badly.

---

## 7. What this does NOT do

State this plainly wherever the feature is described, because the gap between "we read your ID" and
"we verified your identity" is exactly where a false sense of security lives:

- **It does not prove the document is real.** A PDF417 can be generated with arbitrary contents.
- **It does not prove the document belongs to the presenter.** A photo of someone else's card
  decodes perfectly.
- **There is no liveness and no face match.** The selfie is captured but nothing compares it to the
  ID (§9.3).
- **It does not make the badge an identity assurance.** See §8.

Per §2, none of these matter much *for this risk* — the door check covers them. They matter for
**what we claim**.

---

## 8. Copy consequence — this is a shipping blocker, not a nicety

`Final/gopher-trustshield.html` currently tells users, twice, that TrustShield is *"our free
identity verification, **powered by IDenfy**"*. **Both statements become false on the day the vendor
is dropped** — the named vendor and, more importantly, the claim of *identity verification* for a
process that reads a barcode and stores photos.

Same honesty rule that removed *"Your information is saved automatically"* from Request in June and
from Connect on 2026-08-22: **the UI describes what the product does, not what it will do.** Land
the copy change with the flow, not after it.

---

## 9. Open owner decisions — do not build past these

1. ~~**Which decoder, and does ML Kit count as "third party"?**~~ ✅ **DECIDED — owner, 2026-08-23:
   ML Kit is acceptable; it is on-device with no vendor relationship.** Use ML Kit on **both**
   platforms via the Capacitor plugin — one implementation. Apple Vision on iOS is genuinely
   first-party and equally capable, but a hybrid buys nothing functional and costs two code paths
   and two sets of edge cases.

   ⚠️ **Two implementation specifics decide whether "on-device, no vendor" actually holds:**
   **(a) On Android, use the BUNDLED model, not the Play-Services thin client.** ML Kit ships both:
   the thin variant fetches the model from Google Play Services on first use, which reintroduces a
   **network fetch and a Play Services dependency** — the exact properties this decision was made to
   avoid — and fails outright on devices without Play Services. Bundled costs a few MB of APK and
   keeps the guarantee.
   **(b) Confirm there is no telemetry egress, at build time, once.** ML Kit has historically had
   optional Firebase/analytics coupling. *This is stated from knowledge, not from inspecting this
   build* — take one network trace during a decode and the question is closed permanently.

   **Still required before writing the parser: the real-card decode trial** — cards from several
   states plus at least one older-format card, to settle the `CCYYMMDD` / `MMDDCCYY` trap in §3 with
   evidence rather than with the standard's text. **That is a separate gate from the decoder choice
   and is NOT closed by this ruling.**
2. **What happens to non-US IDs and passports?** Passports carry an MRZ (also standard, also
   decodable, different parser). Options: support MRZ too, accept a manual-review path, or accept
   that those users cannot hold TrustShield. Today iDenfy absorbed this and nobody had to decide.
3. **Is the selfie doing any work, or is it theatre?** Nothing compares it to the ID under this
   spec. Either state internally that it is a deterrent and a manual-review artefact, or plan a
   comparison step. **Do not let it imply a match that is not happening.**
4. **Retention, encryption and access for the stored ID images** — precondition for the in-house
   flow generally. Not created by this spec, not solved by it.
5. **Does the under-21 floor move to the server's order path?** Today `can_request_restricted_items`
   (`+user_age >= 21`) hides the tiles client-side and appears **nowhere in
   `controllers/order/*.js`**. Related: if under-21 users are barred from TrustShield entirely
   (owner's simpler proposal, 2026-08-23), the badge short-circuit in `trust_shield_required()`
   stops being reachable for them and this becomes far less urgent.

---

## 10. Acceptance criteria

1. A real US licence decodes and yields a DOB matching the printed date — **verified on cards from
   ≥ 3 states, including one older-format card**.
2. Age is computed **server-side**; a forged client payload claiming "over 21" changes nothing.
3. An under-21 document is refused, and refusal is on **positive proof only** — a missing or
   unparseable `DBB` does not refuse.
4. An unreadable barcode produces **specific retry guidance**, never a silent pass and never a
   generic failure.
5. The decision, the parsed DOB and the AAMVA version are recorded well enough to audit one case
   after the fact.
6. Nothing in the UI claims identity verification, a face match, or a named vendor that is no longer
   involved (§8).
7. The whole path works **offline for decoding** — no network round trip to read the card.
