# INTERIM — remove the TrustShield gate before the iDenfy credit cliff

> # ⛔ READ THIS FIRST — THIS DOCUMENT HAS DESCRIBED THREE DESIGNS. ONLY THE THIRD IS REAL.
>
> | date | design | status |
> |---|---|---|
> | 2026-08-23 | remove the gate; TrustShield voluntary, discoverable in My Profile | superseded |
> | 2026-08-24/25 | gate restored at **every** age, satisfiable by TrustShield **or** a one-off ID submission | **abandoned — never built** |
> | **2026-08-29** | **the owner's flow below — built, raised, and green** | **⭐ CURRENT** |
>
> An earlier banner here described the middle row as current. It never shipped. **Do not build from
> it, and do not treat its absence from the code as a regression.**
>
> ## The current flow — owner, 2026-08-29, verbatim
>
> > *"ALL >21 customer who submit Delivery (Alcohol 0r Other Age-Restricted) proceed unrestricted. No
> > mention at all regarding trust shield. Same pathway whether trustshield or not. ——> Once their
> > gopher selects 'completed,' their is no change to the current experience (except a screen refresh
> > for trustshield). The new trustshield experience is exclusively in the Account section of the
> > request app. Instead of the idenfy dependency on populating the ID and Selfie, we are no
> > capturing that info and populating the pics to the workers ID and Identity confirmation screen."*
>
> In four points:
>
> 1. **The request flow never mentions TrustShield.** A requester 21+ ordering age-restricted takes
>    the identical path whether they hold the badge or not.
> 2. **Under-21 is untouched.** Separate control, legal rather than policy — see §3.2.
> 3. **TrustShield is voluntary and lives only in Account**, where **we** capture the three shots.
>    **No vendor call**, so it outlives the credit cliff.
> 4. **Those images populate the Gopher's at-door ID confirmation screen** — the screen that used to
>    read from iDenfy.
>
> ## ⛔ §2 AND §3 BELOW ARE THE 2026-08-23 PLAN — read them through the table above.
>
> **§3.1 is the exception: it is REINSTATED, and it is the one piece of G40-410 that is in no merge
> request and not yet done.** It is required at **21**, not `1`. See §3.1 and §4.

> ## ⚠️ GENERATIONS — do not compare 4.0 canon against the 3.9.1 app
>
> **Owner, 2026-08-29:** *"NEW web and app (version 4.0) are different than app (version 3.9.1).
> New web has a different flow and new app mirrors it. What we have now is not to be compared to or
> it will definitely look like a divergence… in the mean time, comparisons are only distractions."*
>
> The line *"TrustShield now runs INTERNALLY"* in `Final/assets/js/gopher-step-gates.js:221` is
> **4.0 canon and correct in its own frame.** An earlier version of this banner called it "false for
> the live apps" — that was the comparison mistake, not a finding. **Withdrawn.**
>
> **What survives, and is the thing to carry:** the 3.9.1 app's enrolment *does* still call iDenfy —
> `controllers/user/trustshield.js:162` → `idenfy.generate_token`, `lib/idenfy_trustshield.js` →
> `ivs.idenfy.com`. So **the credit cliff is real for 3.9.1**, and anyone reading the 4.0 line while
> triaging the 3.9.1 app could wrongly conclude it is handled. **Label the generation; do not
> re-litigate the sentence.**


**Status: BUILT 2026-08-29 — two MRs raised and green, one env var outstanding.**

| piece | where | state |
|---|---|---|
| Internal capture: columns, `POST /users/trustshield/enroll`, worker file resolution | `gopher-backend-api!433` · `bdbc6372` | ✅ green · awaiting merge (**merge auto-deploys**) |
| Client: TrustShield moves to Account, request flow un-gated, 3-shot capture | `gopher-mobile-requester-capacitorjs!247` · `88674b0ca` | ✅ green · awaiting merge |
| Post-cliff message — the only mitigation that needs no store release | `!433` · `e51a8ac3` | ✅ **added 2026-08-29** · §3.6 |
| `idenfy.js` honest error state (standalone) | `!246` · `8acca5583` | ✅ **MERGED** into `production` as `fa21574d9`, unsquashed |
| **`TRUSTSHIELD_MIN_AGE=21` on `Gopher-Production`** | env var — **in neither MR** | ⛔ **NOT DONE. Blocks the store release.** See §3.1. |

⚠️ **Neither pipeline can catch the missing env var** — there is nothing to compile. It is the only
part of this work that no automated check protects.

*Originally: SPEC, owner-approved 2026-08-23. The spec below is kept for its detail — read it
through the banner's table, not as a plan to execute.*

**⚠️ URGENT — must ship in the first release after 2026-08-31.** The credit cliff is the **last week
**~10–12 September** (re-measured
2026-08-29 — see §1) and this cannot land without a store release. See §7.

---

## 0. ⛔ OWNER RULING 2026-08-29 — NO CREDITS WILL BE BOUGHT. THE CLIFF IS CERTAIN.

Owner, verbatim: **"I will not be buying any new credits."**

This closes the last escape hatch. Earlier wording said a top-up "is not available at an acceptable
price", which reads as a negotiation that could still turn. It cannot. **iDenfy enrolment ends when
the credits do — **now measured at ~10–12 September 2026, roughly two weeks earlier than this
document previously said** (§1) — and nothing will extend it.**

### The sprint completes 9/4 — but 9/4 is not the deadline

| | |
|---|---|
| Sprint "TrustShield" completes | **2026-09-04** — code complete and merged |
| Credits exhausted | **~2026-09-26 to 09-29** |

**Merged is not shipped.** There is no OTA, so submission and review sit between the merge and any
user benefiting. The real margin is from the **store release**, not from 9/4 — call it ~2 weeks, not
~3. Comfortable, and the expectation is that we beat it. But the thing to protect is the **build
slot**, not the sprint end date.

### ⛔ AND THERE IS NO SERVER-SIDE CONTINGENCY. Do not plan on one.

The instinct is that `TRUSTSHIELD_MIN_AGE=1` un-gates iDenfy with no deploy — the original §3 plan
held in reserve as an emergency brake. **It does not work on the app users actually have.** Verified
against the shipped build `release/android-852`:

- the `calculateAge() < 30` client gate **is** in it
- its only exit is a single **"Add Gopher TrustShield"** CTA, straight into iDenfy
- its `idenfy.js` has **zero** error handling

So post-cliff on 3.9.1 an under-30 requester gets: age-restricted tile → blocking modal → the one
CTA → token fails → **infinite spinner**. The server dial changes none of it, because the client
never asks the server whether the badge is required — both thresholds are hardcoded. **That is the
asymmetry §4 closes with: the server can be loosened without the app noticing; the app cannot be
loosened without a store release.**

**The contingency is shipping the build. There is no other one.**

> ⚠️ **This does NOT contradict §3.1, and the distinction is the whole point.**
>
> | | |
> |---|---|
> | What this section denies | the env var as a **contingency** — it cannot rescue a slipped release, because the shipped 3.9.1 client gates on its own hardcoded threshold |
> | What §3.1 requires | the env var as a **component of the release itself** — without it, the *new* client's un-gated flow reaches a 403 at submit |
>
> Same variable, opposite roles. **Set it — just never imagine it substitutes for shipping.**

### The one lever that DOES survive a slipped build

Server copy. `controllers/user/trustshield.js:169` currently returns, on every token failure:

> *"Gopher TrustShield is temporarily unavailable. Please try again later."*

Post-cliff that is false in both halves — not temporary, and there is no later. It is delivered as a
**200 soft failure**, so the app displays it verbatim and **it can be changed without a store
release**. If the build slips, correcting this string is the only thing that stops users retrying
daily against a dead vendor.

✅ **DONE 2026-08-29 — `e51a8ac3`, riding `gopher-backend-api!433`.** It rides that MR rather than a
separate one because !433 already modifies this exact file, so it costs one deploy and no extra
surface. **New copy and the reasoning: §3.6.**

⚠️ **This lever is now spent.** It was the only mitigation available without a store release, so if
the build slips past the cliff there is nothing further to pull — see §3.6's note on alerting for
the one gap that remains.

---

## 1. What is happening and why this is the answer

iDenfy is being retired. ⛔ **RE-MEASURED 2026-08-29 — the cliff is ~10–12 SEPTEMBER, about two weeks
earlier than every prior figure in this document.**

| read | remaining | source |
|---|---|---|
| 2026-08-23 | 218 | the figure this doc previously used |
| **2026-08-29** | **147** | owner's read of the iDenfy **Finance** page (`Count used 3223 / Service limit 3370`) |

**71 credits in 6 days = ~11.8/day**, against the ~6.0/day this document modelled.

⛔ **WITHDRAWN 2026-08-29 — my per-session explanation was wrong.** I inferred that iDenfy bills
per SESSION, because `6.0 approvals/day x (330 sessions / 191 approvals = 1.728) = 10.4`, which sits
beside the observed 11.8. **The owner settled it the other way: credits burn on APPROVALS ONLY.
Denied and expired sessions are free.** *(Relayed via another session — inherited, not heard
first-hand; see the flag at the end of this section.)*

**The agreement was a coincidence, and that is the lesson worth keeping: two numbers landing close
together is not a mechanism.** It was persuasive precisely because it explained a 2x gap with a
ratio drawn from the same dashboard, which is exactly the shape a spurious fit takes.

**What does NOT change: the date.** 71 credits in 6 days is a direct reading of the authoritative
counter. It is 11.8/day whatever the billing unit is.

**What DOES change: whether the rate holds.** Under the withdrawn theory the burn was structural and
could not revert. Under approvals-only, **11.8/day is a genuine doubling of approvals over a
6.30/day trailing-30-day rate** — which may be a busy week rather than a new normal. So the rate
could fall back toward 6/day, or stay. **That makes the third reading more important, not less.**
⚠️ Approvals-only is also the floor: the date **cannot worsen** from this source.

    147 / 11.8 = 12.4 days  ->  ~2026-09-10
    147 / 10.4 = 14.2 days  ->  ~2026-09-12

**Plan to a band, not a day.** ⚠️ **Provenance: the readings AND the approvals-only ruling are the owner's, relayed via another
session — INHERITED, not verified first-hand here.** Confirm the approvals-only ruling with the
owner directly before relying on it for planning; it is the premise the whole "will the rate hold"
question rests on.

⚠️ **VERSION NAMES — the Request app is 3.8.1, NOT 3.9.1.** Store APIs, 2026-08-28 release:
**Gopher Go iOS 3.9.1 / build 863** and **Gopher Request iOS 3.8.1 / build 851** (Play 864 / 852).
G40-410's client half is the **Request** app, so "the shipped 3.9.1 client" elsewhere in this
document means Go's version number applied to the wrong app — read it as **3.8.1**. The owner's
GENERATIONS ruling says "version 3.9.1" as a label for the current shipped generation, and that
usage stands; this note is about which binary you go and look at.
⚠️ **Do not check the version in the repo.** `android/app/build.gradle` reads `versionName "3.0.3"`,
`versionCode 63` on `production` in **both** apps — stale and unused, because Appflow injects the
real version at build time. The store is the only instrument. (Appflow build number + 600 = store
build number.) ⚠️ **It is a TWO-POINT rate**, and it rests on both readings coming from the
same Finance page; a third read around 1 Sept would settle it.

⚠️ **The "Expiration date 2026-12-30" on the Finance page is the partner CONTRACT date, not the
cliff.** Exhaustion arrives first and is what stops new enrolment. ⛔ **Superseded by §0 — the owner ruled
2026-08-29 "I will not be buying any new credits."** Earlier wording here said a top-up was "not
available at an acceptable price", which reads as a negotiation that could still turn. It cannot.

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
badge and the $1 perk — discoverable by the user in **Account** (§3.5 — and now captured by us, not iDenfy). The age on file is what the
platform holds, and **the Gopher's physical ID check at the door remains the compliance control**, as
it always has been.

**Existing badge holders are unaffected either way** — `get_idenfy_files` already serves ID and
selfie from our own S3 mirror (`ed270b91`, verified live on `source:'mirror'`). Only *new* enrollment
depends on credits.

---

## 2. What changes

| # | Change | Where | Cost |
|---|---|---|---|
| 1 | Disable the server-side gate | `TRUSTSHIELD_MIN_AGE=`**`21`** — ⛔ **REINSTATED, still unset** | env var, no deploy |
| 2 | Remove the client tap-gate — **keep the under-21 hide** | `RequestCategoryBlock.js` | store release |
| 3 | Stop hiding the A/R toggle for under-30 | `togglebutton.js:139` | store release |
| 4 | Error state instead of an infinite spinner | `idenfy.js` | store release |
| 5 | TrustShield in **Account** — and **captured by us**, not iDenfy | client | store release |
| 6 | Post-cliff message that does not send users into a retry loop | `trustshield.js` | ✅ done — backend deploy, **no store release** |

**2–5 are one release.** #1 is safe to set at any time and **must** be set before that release
 reaches a handset — see §4, whose original reasoning was wrong and is corrected there.

---

## 3. The changes in detail

### 3.1 Backend — `TRUSTSHIELD_MIN_AGE=21` ⛔ REINSTATED 2026-08-29, AND STILL NOT SET

⛔ **This is the only part of the 2026-08-23 plan that came back, and the only part of G40-410 that
lives in no merge request.** Verified 2026-08-29 by `git diff origin/production...HEAD` on `!433`:
it touches `config/db.config.js`, `controllers/user/{index,trustshield}.js`,
`docs/alert-markers.json`, `helpers/trustshield_files.js`, `models/trust_shield_users.model.js` and
three test files — and **none** of `helpers/trustshield_policy.js`,
`controllers/order/create.js`, `controllers/order/update.js`. The gate is untouched.

**Live values on `Gopher-Production`, read first-hand 2026-08-29 via
`aws elasticbeanstalk describe-configuration-settings`:**

| variable | live | required | note |
|---|---|---|---|
| `TRUSTSHIELD_MIN_AGE` | **`30`** | **`21`** | the change |
| `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` | `false` | `false` | **do not touch** — see the warning below |
| `TRUSTSHIELD_GATE_MISSING_DOB` | *unset* (→ `false`) | leave unset | no-DOB users are already refused by the legal block |

```bash
aws elasticbeanstalk update-environment --application-name Gopher-Production --environment-name Gopher-Production --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=TRUSTSHIELD_MIN_AGE,Value=21
```

#### Why `21` and not the `1` this section used to specify

`trust_shield_required()` returns `+requester_age < min_age()`. Both values make the gate
unreachable, because **nobody under 21 ever reaches it** — `controllers/order/create.js:330` refuses
age-restricted for `!Number.isFinite(age) || age < 21` first, and its character-identical twin does
the same on the edit path.

`21` is chosen because it states the truth — *this gate applies below the legal floor* — and stays
correct if that floor ever moves. `1` is a magic off-switch that means nothing to the next reader.

> ⚠️ **Never `0` or empty.** `min_age()` treats `configured <= 0` and unparseable values as invalid
> and **falls back to the default of 30** — so `0` silently leaves the gate fully on while looking
> disabled. Deliberate protection in the helper; work with it.

> ⚠️ **`TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` must remain `false`.** Setting it `true` alongside a low
> `MIN_AGE` produces an **empty eligible band** — exactly the configuration behind the
> **2026-08-06 four-day outage**, where the token endpoint refused everyone while the app still
> demanded a badge. **Change one variable.** See `Documentation/TrustShield-Outage-2026-08-06.md`
> and memory `age-gate-lives-in-three-layers`.

#### ⛔ What happens if this is forgotten

The client MR removes three things at once — the under-30 toggle hide (`togglebutton.js`), the
`calculateAge() < 30` pull-over, and **both** `navigate(… next: "idenfy")` entry points. So once a
build carrying `!247` reaches handsets, a requester aged **21–29 without a badge**:

1. sees the age-restriction toggle (previously hidden from them),
2. completes the entire age-restricted delivery request with no mention of TrustShield,
3. taps Submit, and gets **403** from `create.js:351`.

`index.js:204` populates both `error` and `errors: [message]`, so the client's catch in
`src/pages/summary.js:376` fires its first branch: a native `alert()` carrying the server's real
sentence — *"In order to place an Age-Restricted Request, you must verify your identity with Gopher
TrustShield."* — and the user stays on the summary screen. **Visible and honest, not a crash or a
hang.** The defect is that there is no longer any remedy in reach: the badge now lives in Account,
three screens away, and getting it means abandoning a completed form.

**This band is not marginal — §1 measures 76.7% of new enrolments as 21–29.**

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
`can_request_restricted_items: +user_age >= 21` (`controllers/user/profile.js:238` — re-verified 2026-08-29; it was `:124` when this
was written). It is
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

### 3.5 Client — TrustShield in Account, captured by US

⚠️ **Built well beyond what this section originally asked for.** It said only "give it an entry point
in My Profile". The owner's 2026-08-29 ruling replaced the vendor dependency outright.

**As built** (`src/component/trustShieldEnroll.js`, Figma `g7DWLbI86O6SqiwITY7jeL` node
`9268:6198`): intro → ID front → ID back → selfie → verified. Three live shots taken in-app via
`IdCaptureBox.js`, posted as multipart to `POST /users/trustshield/enroll`, stored **private** in S3,
badge set. **No iDenfy call anywhere in the path**, which is the entire point — it keeps working
after the credits die.

- `account.json` now routes `"path": "trustshield"` (was `"idenfy"`).
- The worker's at-door screen resolves internal rows through `internal_keys_from_row()`, which
  **never falls through to the vendor** — pinned by `test/trustshield-internal-capture.test.js` §4,
  where even a *failed* signing must not produce a null-ref vendor lookup.
- Enrolment refuses `meets_legal_min_age(...) !== true` — **stricter** than the iDenfy path, which
  refused only on `=== false`. There is no `docDob` backstop when we capture the document ourselves.

> ⚠️ **Manual capture is a ruling, not a shortfall (owner, 2026-08-29).** The Figma frames say *"It
> will scan automatically"*; the owner chose manual and rewrote the instruction to *"Hold front of ID
> here. Snap the pic."* If auto-capture is added later, **the copy must change with it** — "snap the
> pic" over a camera that fires by itself is worse than either alone.

⚠️ **Not device-verified.** `CameraPreview` is a native plugin; it does not run in a browser. Green
CI proves this compiles and lints, not that a camera appears.

### 3.6 Backend — the post-cliff message ✅ DONE (`e51a8ac3`, in !433)

`controllers/user/trustshield.js` returned, on **every** `generate_token` failure:

> *"Gopher TrustShield is temporarily unavailable. Please try again later."*

**Both halves become false at the cliff**, and `cannot_verify()` is a **200 soft failure** — the app
prints it verbatim. This is the sentence that makes a requester retry daily against a dead vendor.

**Now:**

> *"Gopher TrustShield verification isn't available right now. We're working on it — there's no need
> to keep retrying."*

#### ⛔ Why ONE string and not two precise ones

`lib/idenfy_trustshield.js:84` logs iDenfy's HTTP status and body, then throws a **generic**
`Error('Somthing went Wrong')` — the status never reaches the caller. So this handler **cannot**
distinguish credit exhaustion from a network blip.

Branching on a **guessed** status code would emit a confidently wrong message, and exhaustion cannot
be tested without exhausting credits. **A single honest string beats two precise-looking ones built
on a guess.** If the vendor's exhaustion response is ever established first-hand, the branch becomes
worth adding — not before.

The copy is tuned for the expensive case: during a brief blip *"no need to keep retrying"* costs a
user almost nothing; post-cliff *"try again later"* costs them weeks. A comment in the source says
so, because the old wording reads like better service and invites restoration.

#### ⛔ NO ALARM — DECIDED 2026-08-29. Do not re-raise.

`lib/idenfy_trustshield.js:91`'s `logger.error` is the first and only place that reports credit
exhaustion, and it is **not registered in `docs/alert-markers.json`**, so nothing alarms when the
cliff arrives. I proposed registering it.

**Owner ruled no, 2026-08-29:** *"no need for the alarm. we're going to hit our 9/4 deadline and beat
the expiry."*

**That is a decision, not an oversight — and it is sound arithmetic:** code complete **9/4**, cliff
**~9/10–12** (§1), so the build has roughly **6–8 days** of runway. Recent store turnaround was ~1 day
on Apple and hours on Play. An alarm that fires after the release has shipped detects nothing worth
knowing.

⚠️ **What makes it sound is the schedule holding.** The dependency is worth naming, not re-arguing:
if the build slips past ~9/10, exhaustion becomes invisible — and §0's copy lever is already spent,
so there is nothing left to pull. **If the release slips, revisit this line; until then it is
closed.**

---

## 4. Ordering — corrected 2026-08-29

> ⚠️ **This section used to read "Do NOT ship #1 alone" and claimed that flipping
> `TRUSTSHIELD_MIN_AGE` without the client changes "recreates the August 6th deadlock in reverse."
> That reasoning was wrong, and it matters, because it argues against the one action still
> outstanding.**
>
> The 2026-08-06 outage was **server demands a badge / app cannot obtain one**. The reverse —
> **server permits / app still asks** — is not a deadlock at all. It is the status quo: today's
> shipped 3.9.1 client blocks under-30 requesters on its own side and they never reach the server
> gate, so lowering `MIN_AGE` alone changes nothing anyone can observe. It is **inert, not
> dangerous.**
>
> The practical advice underneath was sound and survives: **the env var is not a substitute for the
> release.** What was wrong was calling it harmful.

**The corrected ordering:**

| step | when | why |
|---|---|---|
| `!247` client merge | any time | merging ships nothing — no OTA; the store ships binaries |
| `!433` backend merge | client first, or the same window | **merging auto-deploys** via CodePipeline |
| **`TRUSTSHIELD_MIN_AGE=21`** | **any time — but before any store build carrying `!247`** | safe early (inert); catastrophic if forgotten (§3.1) |

**The env var is the one that gets lost.** It is in no diff, no pipeline, and no ticket's definition
of done. The two MRs can both merge green and the release can still refuse 76.7% of new enrolments.

⚠️ **The client is still the binding layer.** Both client thresholds were hardcoded and read no
backend dial — which is *why* there was no server-side contingency during the outage (§0). That
asymmetry is unchanged: the server can be loosened without the app noticing, but the app cannot be
loosened without a store release.

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

### 5.2 Live configuration baseline — verified 2026-08-28, **re-verified 2026-08-29 (unchanged)**

Read directly from the `Gopher-Production` Beanstalk environment, not inherited from a ticket:

    TRUSTSHIELD_MIN_AGE               = 30      ← the gate is fully ON
    TRUSTSHIELD_TOKEN_GATED_AGES_ONLY = false
    TRUSTSHIELD_GATE_MISSING_DOB      = (unset → false)

⛔ **Re-read first-hand on 2026-08-29 and IDENTICAL — `TRUSTSHIELD_MIN_AGE` is still `30`.** The
gate is fully on, and neither `!433` nor `!247` changes it. See §3.1.

**Nothing in this spec has shipped** beyond `!246` (the `idenfy.js` error state, merged as
`fa21574d9`). This is the known-good state restored on 2026-08-10 after the outage. ⚠️ EB config and the running process can disagree — this is the EB config; confirm against
the process when the change lands (AC 7).

---

## 6. Acceptance criteria

1. A requester aged 21–29 with no TrustShield can complete an age-restricted delivery request
   end-to-end.
2. A requester **under 21** still cannot see **Alcohol** or **Other Age-Restricted** — verified on a
   real under-21 account, not inferred.
3. No screen anywhere demands TrustShield in order to proceed.
4. Token-issuance failure shows an honest message; **no infinite spinner anywhere**.
5. TrustShield is reachable from **Account**, reads as optional, and is **never mentioned anywhere
   in the request flow** (owner, 2026-08-29).
6. Existing badge holders keep their badge and its $1 perk, and their ID/selfie still load (S3
   mirror).
7. ⛔ **`TRUSTSHIELD_MIN_AGE=21`** *(not `1` — see §3.1)* **and**
   `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY=false` in the live environment, confirmed by reading them back.
   **This must be true BEFORE the store build reaches anyone, not after** — AC 1 is unachievable
   without it, and no pipeline can catch it.
8. **`age_restricted_id_confirmed` is stored as a real boolean, not `null`,** for an age-restricted
   order completed by an unverified requester (§5.1 defect 1). This is the record the at-door control
   produces; without it the control evidences nothing for exactly the population this change creates.
9. *(follow-on, not release-blocking)* The **no-show / ID-not-confirmed** completion persists its
   photo (§5.1 defect 2).
10. ⛔ **On a real handset, both platforms:** the three-shot capture opens a camera, submits, and sets
    the badge. `CameraPreview` is a native plugin — **CI cannot prove any part of this.**
11. **A newly enrolled (internal) holder's ID and selfie render on the Gopher's at-door confirmation
    screen**, served from our S3 — and **no iDenfy call is made** while doing so.
12. **An existing iDenfy-era holder is completely undisturbed** — badge, perk, and images all still
    resolve by the legacy path. This is the population that cannot be re-verified once credits die.

---

## 7. Timing — why this is urgent

| Date | Event |
|---|---|
| 2026-08-23 | Spec approved. ~30 days of credits left. |
| **2026-08-31** | **Cutoff — this must be in the FIRST release after this date.** |
| **~2026-09-10 – 09-12** | Credits exhausted (**re-measured 2026-08-29, ~2 weeks earlier than previously recorded** — §1). Without this release, new under-30 enrolment dies. ⚠️ No longer "into a hung app" — `!246` shipped the error state — but into a message that must also be corrected; see §3.6. |

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
