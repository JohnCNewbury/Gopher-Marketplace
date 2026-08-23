# INTERIM — remove the TrustShield gate before the iDenfy credit cliff

**Status: SPEC, ready to build. Owner-approved 2026-08-23.**
**⚠️ URGENT — must ship in the first release after 2026-08-31.** The credit cliff is **~Sept 22–25**
and this cannot land without a store release. See §7.

---

## 1. What is happening and why this is the answer

iDenfy is being retired. **Credits run out ~2026-09-22 to 09-25** — 218 remaining at ~6.6
approvals/day (read off iDenfy's dashboard, 2026-08-23). **A top-up was pursued and is not available
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

---

## 7. Timing — why this is urgent

| Date | Event |
|---|---|
| 2026-08-23 | Spec approved. ~30 days of credits left. |
| **2026-08-31** | **Cutoff — this must be in the FIRST release after this date.** |
| ~2026-09-22 – 09-25 | Credits exhausted. Without this release, new under-30 enrollment dies into a hung app. |

**There is no OTA.** Every client change needs a store release, so submission and review time sit
between the merge and the fix reaching users. **Missing the release after 8/31 means arriving after
the cliff**, at ~28 new blocked requesters per week and compounding.

**Mobile work targets `next`, not `production`** (standing rule) — this is a release promotion, so
route it accordingly and state target branch, squash, and delete-source explicitly on the MR.
