# INTERIM — remove the TrustShield gate before the iDenfy credit cliff

> # ⛔ STOP — THIS DOCUMENT'S PREMISE WAS REVERSED. READ §8 AND §8.1 BEFORE §3.
>
> **The owner reversed the removal on 2026-08-24/25** and ruled the removed flow *not approved and
> not correct*. The identity gate is **back on all three surfaces** and applies **at every age**
> (canon v3.13). **§2 and §3 below are the ORIGINAL removal plan and must not be implemented as
> written.** They are kept because §3.2's under-21 warning and §3.4's spinner fix are still correct
> and still needed.
>
> **What the live-app work actually is (G40-410):** identity required for an age-restricted order at
> every age, **satisfiable two ways** — TrustShield, **or** a one-off "Submit identification" (ID
> front, ID back, live selfie; this order only; never touches iDenfy). The one-off is the
> load-bearing half: it is what keeps "required for everyone" satisfiable after the credits die.
>
> ## ⛔ AND THE TWO HALVES SHIP IN ONE RELEASE. NEITHER GOES ALONE.
>
> | ship alone | result |
> |---|---|
> | **Client only** | the app accepts an ID, then `trust_shield_required()` still 403s under-30 at order creation — the dead end moves one screen later, *after* the user handed over their ID |
> | **Backend only** | server stops requiring the badge, app still demands it — **the 2026-08-06 outage in reverse** |
>
> The client is the binding layer. Together, or backend after client — never before.
>
> ## ⚠️ "TrustShield now runs internally" is TRUE OF WEB ONLY
>
> That sentence in `gopher-step-gates.js` is the stated reason the gate came back. It is correct for
> web, which never called iDenfy. **It is false for the live apps** — verified on `origin/production`
> 2026-08-28: `controllers/user/trustshield.js:162` still calls `idenfy.generate_token`, its own
> comment calls that *"the call that spends an iDenfy credit"*, `lib/idenfy_trustshield.js` posts to
> `ivs.idenfy.com`, and **zero** barcode/PDF417/AAMVA files exist. **The credit cliff is unchanged.**


**Status: SPEC, ready to build. Owner-approved 2026-08-23.**
**⚠️ URGENT — must ship in the first release after 2026-08-31.** The credit cliff is the **last week of September (~Sept 26–29)**
and this cannot land without a store release. See §7.

---

## 1. What is happening and why this is the answer

iDenfy is being retired. **Credits run out in the last week of September (~Sept 26–29)** — 218 remaining at a pinned
**~6.0 approvals/day** (re-dated 2026-08-23 from clean 7/14/30-day windows; the earlier "~Sept 22"
used a transient 6.6/day figure). **Plan to "late September", not to a day.** **A top-up was pursued and is not available
at an acceptable price**, so the cliff is now certain rather than avoidable.

When credits hit zero, **new TrustShield enrollment stops**. Today the badge is *required* for
age-restricted ordering by anyone under 30 — so without this change, every new under-30 requester who
wants age-restricted delivery is permanently unable to start.

**Measured exposure** (§0.2 of `id-barcode-age-read.md`, two independent sources):

- **76.7%** of new TrustShield enrollments are aged **21–29** — they must verify to participate at
  all, while 30+ place 84% of age-restricted orders and never need the badge.
- That is **~4/day, ~28/week** new requesters hitting the wall, compounding until launch.
- ⛔ **And they hit it as an INFINITE SPINNER** — `idenfy.js` sits on `<Loader/>` with no error state
  when token issuance fails. The symptom is an app that appears to hang.

**Owner decision, 2026-08-23: remove the gate entirely.** TrustShield becomes **voluntary** — a trust
badge and the $1 perk — discoverable by the user in **My Profile**. The age on file is what the
platform holds, and **the Gopher's physical ID check at the door remains the compliance control**, as
it always has been.

**Existing badge holders are unaffected either way** — `get_idenfy_files` already serves ID and
selfie from our own S3 mirror (`ed270b91`, verified live on `source:'mirror'`). Only *new* enrollment
depends on credits.

---

## 2. What changes

| # | Change | Where | Cost |
|---|---|---|---|
| 1 | Disable the server-side gate | `TRUSTSHIELD_MIN_AGE=1` | env var, no deploy |
| 2 | Remove the client tap-gate — **keep the under-21 hide** | `RequestCategoryBlock.js` | store release |
| 3 | Stop hiding the A/R toggle for under-30 | `togglebutton.js:139` | store release |
| 4 | Error state instead of an infinite spinner | `idenfy.js` | store release |
| 5 | TrustShield discoverable in **My Profile** | client | store release |

**2–5 are one release.** #1 alone must **not** be shipped without them — see §4.

---

## 3. The changes in detail

### 3.1 Backend — `TRUSTSHIELD_MIN_AGE=1`

`trust_shield_required()` returns `+requester_age < min_age()`. With `min_age = 1`, that is false for
every requester holding a DOB, so the badge is never required.

> ⚠️ **It must be `1`, not `0`.** `min_age()` treats `configured <= 0` as invalid and **falls back to
> the default of 30** — so setting `0` silently leaves the gate fully on while appearing to disable
> it. The same guard rejects an empty string. This is a deliberate protection in the helper, not a
> bug; work with it.

> ⚠️ **`TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` must remain `false`.** Setting it `true` alongside a low
> `MIN_AGE` produces an **empty eligible band** — exactly the configuration that caused the
> **2026-08-06 four-day outage**, where the token endpoint refused everyone while the app still
> demanded a badge. **Change one variable.** See `Documentation/TrustShield-Outage-2026-08-06.md` and
> memory `age-gate-lives-in-three-layers`.

### 3.2 Client — remove the tap-gate, **KEEP the under-21 hide**

⛔ **The single most important instruction in this document.** The tile *hiding* and the tap *gate*
live in the **same component**, and only the gate may go:

```jsx
{props?.trustShieldVerified && !user?.can_request_restricted_items ? (
  <></>                                   // ← HIDE for under-21. KEEP. DO NOT TOUCH.
) : (
  …<Button onClick={
      buttontype === "submit" ? null
        : props?.trustShieldVerified
            ? !user.trust_shield_verified
                ? calculateAge() < 30 ? …lessthan30 modal… : …TrustShield pull-over…
                : handleChange
            : handleChange                // ← collapse to THIS for all non-submit cases
  }>
)}
```

**After:** the `onClick` is `buttontype === "submit" ? null : () => handleChange(props)`.

**Why this matters more than anything else here:** the outer branch is what stops under-21 requesters
seeing Alcohol and Other Age-Restricted at all, driven by
`can_request_restricted_items: +user_age >= 21` (`controllers/user/profile.js:124`). It is
**measured as working perfectly** — zero age-restricted orders from under-21 requesters in 2025 or
2026, and zero under-21 TrustShield holders. Anyone "removing the TrustShield logic" wholesale takes
that with it and silently reopens under-21 access. **Remove the gate; keep the hide.**

### 3.3 Client — `togglebutton.js:139`

```js
if (formik.values.category_type === "Delivery" && calculateAge() < 30) {
  formik.setFieldValue("has_age_restrictionvisible", false);
  formik.setFieldValue("line9visible", false);
}
```
Remove. It hides the age-restriction toggle from under-30 users, which after this change has no
purpose — and would otherwise leave 21–29 requesters unable to mark an order age-restricted even
though the gate is gone. ⚠️ Note `calculateAge()` returns **null** with no DOB and `null < 30` is
**true**, so this currently also hides the toggle from every DOB-less user; removing it fixes that
too.

### 3.4 Client — `idenfy.js`, error state

Replace the unconditional `<Loader/>` on token-issuance failure with an honest message —
*"Verification is temporarily unavailable"* — and a way out. **This is worth shipping on its own
merits regardless of the rest**: a hang is never the correct response to a failed dependency.

### 3.5 Client — discovery in My Profile

With the gate gone, nothing surfaces TrustShield during a request. It needs an entry point in **My
Profile** so a user can add it deliberately. Copy should describe it as what it now is — a trust
badge and a perk — not a requirement.

---

## 4. Do NOT ship #1 alone

Flipping `TRUSTSHIELD_MIN_AGE` without the client changes **recreates the August 6th deadlock in
reverse**: the server stops requiring the badge, the app still demands it (both thresholds are
hardcoded and read no backend dial), and the user is stuck between them with no route forward.

**The client is the binding layer. The env var is a follow-on to the release, not a substitute for
it.**

---

## 5. Risk — what is being accepted

**Age-restricted ordering will be backed by a self-reported DOB plus the Gopher's physical ID check
at the door, for every requester rather than only those aged 30+.**

- **This is already true for 82% of age-restricted volume.** 30+ users are not gated today. The
  change extends an existing posture down nine years, to ~11% more of the volume.
- **The compliance control does not change.** Canon: *"age-restricted deliveries always require
  ID"*, in person, at the exchange. A submitted ID was always pre-clearance only.
- **Under-21 access does not change.** The tile hide (§3.2) is untouched and is independent of
  TrustShield.
- **What is given up:** the document-DOB check for the 21–29 band — the thing that catches someone
  who typed a false birthday at signup. That person now reaches the door and is refused there,
  losing their items and their money with no refund.

**This is restored, not abandoned:** the barcode read spec'd in `id-barcode-age-read.md` re-obtains
an authoritative DOB from the document (PDF417 / AAMVA `DBB`) with no vendor. ⚠️ **Note that nothing
today compares the document DOB to the signup DOB** — `docDob` is used *only* to refuse under-21
documents. That comparison is **new work** and belongs with the barcode read; without it, a
voluntarily-added badge asserts nothing about the age on file.

---

### 5.1 ⚠️ The replacement control has two known defects — inherited from G40-350

This section leans on *"the Gopher's physical ID check at the door"* as the control that survives the
gate. **That control works, but its record-keeping is broken in two places.** Both were filed as
cleanup while TrustShield backstopped the check. Once the gate is gone the at-door record **is** the
whole record, so they stop being cleanup — a null confirmation flag and a discarded photo are
exactly where a liable control fails to evidence itself.

| # | Defect | Where | Effect |
|---|---|---|---|
| 1 | `age_restricted_id_confirmed` stores **`null`** on every multipart completion | `update.js:~1990` | strict `=== true \|\| === false`; multer delivers text fields as **strings**, so `"true" === true` is false and the value falls through to `null` |
| 2 | The **no-show / ID-not-confirmed** path parses its upload and never reads it | `order_pick_up_complete` (`update.js:2305`) | photo is discarded; remedy is porting the `req.files` → S3 block that already exists in `order_pick_up_complete_v2`, **not** "add multer" |

Defect 1 hits **precisely the unverified-requester population** — the people who photograph an ID,
i.e. everyone this change creates. Verified requesters send JSON, so their boolean survives; that is
why the column looks fine today and will not after the gate is removed. Any reporting on
`age_restricted_id_confirmed` is already wrong for that population.

**Both are backend-only and need no store release**, so neither blocks the client work in §3 — but
defect 1 should land **with or before** the gate removal, because it degrades the moment the
unverified population grows.

> ⚠️ **Do not re-derive these as "the at-door photo is never stored."** That earlier claim was
> **wrong** and was corrected on 2026-08-05: multer is applied *inside* the handlers, not on the
> routes (`update.js:2` requires it, `:48` defines `uploadIdentity`, wrapped at `:1906` and `:2309`),
> so the **normal** completion path (`/complete/v2`) has stored photos since 2024-10-24 (`4180cadb`).
> Grepping `controllers/order/index.js` for `multer` returns 0 and is misleading.

### 5.2 Live configuration baseline — verified 2026-08-28

Read directly from the `Gopher-Production` Beanstalk environment, not inherited from a ticket:

    TRUSTSHIELD_MIN_AGE               = 30      ← the gate is fully ON
    TRUSTSHIELD_TOKEN_GATED_AGES_ONLY = false
    TRUSTSHIELD_GATE_MISSING_DOB      = (unset → false)

**Nothing in this spec has shipped.** This is the known-good state restored on 2026-08-10 after the
outage. ⚠️ EB config and the running process can disagree — this is the EB config; confirm against
the process when the change lands (AC 7).

---

## 6. Acceptance criteria

1. A requester aged 21–29 with no TrustShield can complete an age-restricted delivery request
   end-to-end.
2. A requester **under 21** still cannot see **Alcohol** or **Other Age-Restricted** — verified on a
   real under-21 account, not inferred.
3. No screen anywhere demands TrustShield in order to proceed.
4. Token-issuance failure shows an honest message; **no infinite spinner anywhere**.
5. TrustShield is reachable from My Profile and reads as optional.
6. Existing badge holders keep their badge and its $1 perk, and their ID/selfie still load (S3
   mirror).
7. `TRUSTSHIELD_MIN_AGE=1` **and** `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY=false` in the live
   environment, confirmed by reading them back after the release ships.
8. **`age_restricted_id_confirmed` is stored as a real boolean, not `null`,** for an age-restricted
   order completed by an unverified requester (§5.1 defect 1). This is the record the at-door control
   produces; without it the control evidences nothing for exactly the population this change creates.
9. *(follow-on, not release-blocking)* The **no-show / ID-not-confirmed** completion persists its
   photo (§5.1 defect 2).

---

## 7. Timing — why this is urgent

| Date | Event |
|---|---|
| 2026-08-23 | Spec approved. ~30 days of credits left. |
| **2026-08-31** | **Cutoff — this must be in the FIRST release after this date.** |
| **~2026-09-26 – 09-29** | Credits exhausted (last week of September). Without this release, new under-30 enrollment dies into a hung app. |

**There is no OTA.** Every client change needs a store release, so submission and review time sit
between the merge and the fix reaching users. **Missing the release after 8/31 means arriving after
the cliff**, at ~28 new blocked requesters per week and compounding.

**Mobile work targets `next`, not `production`** (standing rule) — this is a release promotion, so
route it accordingly and state target branch, squash, and delete-source explicitly on the MR.


---

## 8. Rollout — three surfaces, in this order (owner, 2026-08-23)

**Web → app prototypes → live apps.** Deliberate de-risking: the first two need no store release, so
the change is proven twice before it enters a build that cannot be recalled.

| # | Surface | Owner | Release mechanism |
|---|---|---|---|
| 1 | **Web** — `Final/gopher-request.html`, `gopher-connect.html` | **Website Updates** | `scripts/deploy.sh` — minutes |
| 2 | **App prototype** — `_prototypes/Request/gopher-request-flow.html` | **App Prototypes** | same deploy — minutes |
| 3 | **Live apps** — §3 above | **John** — already placed in **John's Tickets** sprint | **store release — G40-410, goes AFTER the 8/31 sprint is released** |

> ⚠️ **Ownership and timing corrected by the owner, 2026-08-25.** This row previously read
> *"Matt, via `next` → release"* and this document treated 8/31 as a **cutoff to ship before**.
> Both were wrong. **G40-410 is the owner's, it is already correctly placed in the John's Tickets
> sprint, and it goes AFTER the 8/31 sprint is released** — not before it. Do not re-raise 8/31 as
> a deadline this must beat, and do not route this to the contractor.
>
> ⛔ **AND READ §8.1 BEFORE ACTING ON ANY OF §3.** The premise of this whole document — remove the
> TrustShield gate — was **reversed on 2026-08-24/25.** The owner ruled the removed flow *not
> approved and not correct*; the step-2 identity gate is **BACK on all three surfaces** and now
> applies **at every age** (`036bc2d` web, `83b59b9` prototype), recorded as canon **v3.13** in
> `connect-flows-granular.html`. Surfaces 1 and 2 as written here are **undone**. What G40-410 now
> covers on the live apps is the owner's to define; the §3 change list below is the ORIGINAL
> removal plan and must not be implemented as-is.

### 8.1 ⚠️ On web this REVERSES work deployed 2026-08-22

**D-038 Part 1 — the step-2 identity gate — is superseded by this decision on the web surfaces.**
That gate was built, deployed (`ab091b9`, `941204a`) and is live on both hosts. It was correct under
the policy in force at the time: the backend refused these orders and Connect offered no way to
satisfy it. **The policy changed because the vendor is going away, not because the work was wrong.**

**The removal is now a one-place change, because Phase 3 centralised it.** All three surfaces
previously carried their own `stepGate()`; Request and Connect now delegate to
`Final/assets/js/gopher-step-gates.js`, so the `identity` gate is deleted or disabled **once** rather
than hunted across two 1.3 MB HTML files.

**What to change:**
1. Remove `'identity'` from `SURFACE_GATES.request` and `SURFACE_GATES.connect` in
   `gopher-step-gates.js`. The gate definition can stay in the catalogue — unreferenced — so the
   barcode work can re-enable it later without rebuilding it.
2. ⛔ **Update `assertInvariants()` in the same edit.** It currently *fails the build* if any surface
   is missing the `identity` gate — that assertion was added deliberately on 2026-08-22 to stop the
   gate being dropped by accident. It must now encode the new ruling, or the module reports itself
   broken.
3. Update `run_parity_harness.py` — `RULED_GATES` and the `GUARD_TOKENS` identity entry — for the
   same reason.
4. Update `test-step-gates.js` — the "all three surfaces carry the RULED identity gate" assertion.
5. TrustShield discovery moves to the profile area on web too, matching §3.5.

**⚠️ Do NOT also remove the under-21 protection on web.** It is a different mechanism from the app's
(`can_request_restricted_items`): on web the age-restricted path is reached through the category and
the `ageRestricted` slider. Removing the *identity* gate must not touch category visibility.

### 8.2 App prototype

`_prototypes/Request/gopher-request-flow.html` carries its own `stepGate()` returning
`{ok, sel, msg}` and gates on `!idVerifiedNow()`. Remove **that one condition**. The module already
models the prototype in `SURFACE_GATES.prototype`; if it adopts the shared module later, the entry
must match whatever the web surfaces do.

⚠️ **`idVerifiedNow` has exactly THREE references and only ONE is the gate** (App Prototypes,
verified here 2026-08-23):

| Line | What it is | Action |
|---|---|---|
| 1144 | the function definition | **keep** |
| 1223 | `ts-verified` — *"Identity verified — you're all set for this delivery."* | **keep** |
| 2078 | the step-2 gate | **remove** |

Removing all three would delete **the perk, not the gate** — the badge and its verified state must
stay visible, because voluntary-but-visible is the intended end state.

⛔ **THERE IS NO UNDER-21 LOGIC IN THE PROTOTYPE TO PRESERVE.** Verified by search: **zero**
occurrences of `isMinor`, `calculateAge`, `customerAge`, `getAge`, `date_of_birth` or
`can_request_restricted_items`. Every `21` in the file is **copy** — the waiver sentence, the
*"Tobacco, vape and nicotine delivery (21+ only)"* category example, and a `21` SVG mark — or
unrelated (`h<=21` building time slots).

**So §3.2's "keep the under-21 hide" is a LIVE-APP concern only.** An acceptance criterion asserting
the prototype preserves an under-21 gate would be asserting something that never existed — the
vacuous-criterion failure this project has hit three times in two days, where a check passes because
there is nothing for it to test. *(Corrected 2026-08-23 after App Prototypes flagged that §8.3 said
exactly that.)*

### 8.3 What "done" looks like on web and prototype

Same as §6 acceptance, minus the app-only items:

1. A requester with no TrustShield can complete an age-restricted request end-to-end.
2. Nothing demands the badge in order to proceed.
3. The TrustShield badge and its verified state **still render** — voluntary, not vanished.
4. 0 console errors.
5. Harness and module tests green **after** their assertions are updated to the new ruling rather
   than silenced.

**Web only, #6:** the under-21 path is unchanged. ⛔ **Do NOT apply this criterion to the prototype**
— see §8.2: it has no under-21 logic, so the check would pass vacuously and prove nothing.

### 8.4 Sequencing note

**Web and prototype are reversible in minutes; the live app is not.** Anything learned on surfaces 1
and 2 — especially anything the acceptance criteria missed — should be folded into G40-410 **before**
the store build is cut, because that is the last point at which it is cheap.


---

## 9. Sequencing ruling — 2026-08-23

**App Prototypes stands down until Website Updates has wired Connect and Request web.** Owner,
verbatim: *"You are to stand down on this until Website Updates can wire Connect and Request web."*

**The change is confirmed and coming — this is sequencing, not a reversal.** Surface 2 is *queued*,
not cancelled, and matches §8.4: web is reversible in minutes and should flush out the surprises
first.

**Harness ownership:** the Connect/Request Parity session makes **all six assertion edits in one
change**, atomically with surface 1, so the tooling never has a green-but-wrong window. The
prototype session re-runs rather than assumes when its turn comes.

⚠️ **One thing not to misread when surface 1 lands:** the assertion
`prototype enforces the RULED gate` catches **deletion** but not **disabling** — mutation-proved
2026-08-23, where `if(false && …)` shipped green. The coming change *is* a deletion, so it will fail
correctly — **but that failure is not evidence the check is sound.** It remains blind to the disabled
shape.
