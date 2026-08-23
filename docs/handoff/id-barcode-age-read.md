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

**So the scope question is not launch-vs-live, it is: does the token supply outlast the launch
build?**

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

**Decode on the client; verify the decision on the server.**

1. Client decodes the barcode and extracts `DBB`.
2. Client sends the **parsed DOB** (and the AAMVA version it parsed under) with the verification
   submission — *not* a client-computed age, and never a client-computed "is over 21" boolean.
3. **The server computes the age and makes the decision.** A client-supplied verdict is trivially
   forged and would recreate the exact hole this closes.

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
