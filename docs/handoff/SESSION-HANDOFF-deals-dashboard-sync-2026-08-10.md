# Handoff — Gopher Deals → Dashboard Sync (written 2026-08-10)

**Your job:** wire `Final/gopher-deals.html`'s merchant registration to the real backend —
four calls replacing one Apps Script POST — so a **real merchant** can register in production.

## 0. ⛔ BEFORE YOU WRITE ANY CODE — confirm with the owner first

**Owner directive, 2026-08-10: do not start work until you have stated your understanding
back to him and he has confirmed it.** This is not a formality and it is not satisfied by
summarising this document.

Put these in front of him **in plain words**, and wait:

1. **What you are about to change**, and which of the four calls you are wiring first.
2. **The risk** — this is the **live merchant-intake path** on a site published to three
   hosts. Name what happens if it is wrong and how fast it can be undone.
3. **The reward** — what it unblocks.
4. **Anything in this file you think is wrong.** It was written by a session that ran out of
   context; treat it as informed, not infallible.

Standing rule it comes from: *"Nothing is ever to be pushed to production without verification
that I fully understand the risk/rewards and what the work is solving for."* A real merchant
is expected on this path, so the bar is higher than usual, not lower because it is urgent.

**Also standing: if access is the blocker, STOP AND ASK.** Never take the lesser route — no
workaround may feed a merge, a deploy, a ticket closure, a doc row, or a recommendation.

---

**Read this file, then §3.2c–§3.2d of
`docs/handoff/deals-registration-to-publication-config.md`. Do not re-derive the contract:
it was driven end-to-end against production on 2026-08-10** (user `141557`, deal row `id 1`).
If the form sees something different from §3.2d, that is a real difference — report it, don't
work around it.

---

## 1. Already built, browser-verified, committed — do NOT redo

Commit **`f4a0d33`**. Nothing in it calls the API, so the deployed page is unchanged.

| Piece | Where | Why it's shaped that way |
|---|---|---|
| `_acctInFlight` / `_acctCreated` | `openPreview()` ~L3749 | **This is the account-creation boundary.** In-flight guard **clears on settle**; `_acctCreated` stops a second account when the user legitimately returns via "← Edit my info" (`dpEdit`). A permanent lock breaks editing; no lock mints duplicate **accounts** (telephone has no UNIQUE constraint — 775 duplicates live). |
| `gopherDealDraft` localStorage | `openPreview()`, before any network | A refresh mid-verification used to lose the entire deal — it was written at the *end* of `submitForm`. With a merchant on the phone that is the failure that ends the test. |
| `_phoneVerified` module var | replaces a hidden input | ⚠️ **Not dead code** — `eguToggle()` reads it to auto-fill when "I'm already a Gopher user" is ticked. It left the DOM so it can never serialize into the payload (intake rejects unknown fields). |
| `CATEGORY_KEY` map | applied **at payload build only** | ⛔ Do **not** move these onto `<option value=>`. The display string is rendered back to the merchant **and is the bid-board join key** (`canBid()` is string equality against `gopher-bid-brain.js`). Settled 2026-08-05, Ruling 1. |

---

## 2. ⛔ The mistake that would hurt a real merchant

**`GOPHER_FORM_ENDPOINT` (~L4141) still fires inside `submitForm()`. Replace it — do not add
the API calls alongside it.**

If both run, every genuine registration **double-writes to the live Leads sheet**. That is the
same endpoint whose header a stray caller permanently widened by five columns, and the same
class of error as the inbox relay backed out on 2026-08-05 (`40fc4eb`). **Remove the Apps
Script call in the same commit that adds the deal POST.**

---

## 3. Wiring map

| Step | Hook |
|---|---|
| 1 phone OTP + 2 create user | `openPreview('merchant')`, after `dcValidateAll` passes and after the draft is stored |
| 3 email OTP send + verify | immediately after, still in `openPreview`, before the preview carousel renders |
| 4 deal POST | `dpSubmit()` ~L3816 → currently `submitForm('merchant')` |

**Keep the Merchant Agreement clickwrap gate at the top of `dpSubmit`** — it is the acceptance
record, versioned by `MERCHANT_AGREEMENT_VERSION`.

**`422 "Phone number already registered"` at step 2 is the resume hook, not an error.** Surface
*"you already have an account — verify your phone to finish your deal"* (Path A). Without that
affordance a returning merchant re-registers into the collision branch. **Design note:** the
account is created at "Review my deal", i.e. **before** the Merchant Agreement is accepted at
the final step — so abandonment between those points is a real, reachable state.

---

## 4. Standing rules that apply to your commit

1. **A user-facing change isn't done until its 101 guide is reviewed** (owner, 2026-08-05).
   This changes merchant registration, which **`gopher-deals-101.html`** walks through with
   screenshots of the register modal. **Review it, don't string-replace it** — a minimal
   find-and-replace is what created that rule.
2. **Deploy = `scripts/deploy.sh`** (dry run by default; `--push` ships). **Read the file list
   as a scope check** — another session's committed work rides along otherwise. A push to
   `main` now publishes to **both** GitHub Pages and TigerTech.
3. **Netlify carries the same form and is owner-action-only.** Its drift is normally *not*
   worth flagging — **this is the documented exception**, because its whole job is fielding
   merchant registration and this is that path. **Raise it with the owner.**
4. **Merged ≠ live.** Production silently swallowed **four merges** from 2026-08-08 (Elastic
   Beanstalk at 1000/1000 versions, CodePipeline failing while CI showed green). Confirm any
   deploy **by content**, never by branch state or a 200 on the host.

---

## 5. Test state

- **Use:** `805-555-0173` — the proven account (`141557`, `deals.test.0173@gophergo.io`).
  ~~Spares, verified clean (no account, no OTP history): `805-555-0198`, `919-555-0142`.~~
  ⚠️ **STALE as of 2026-08-11 — neither spare is clean.** Both were consumed on 2026-08-10
  after this file was written, then driven again by the Go sign-in live run:
  `805-555-0198` → user **141561** (established, real-style email, enters a dashboard);
  `919-555-0142` → user **141564** (**INCOMPLETE mint**, `onboarding-…@placeholder.gophergo.io`
  — the live specimen of the mint shape). Both need **G40-359** tagging. Full dlp contract
  facts from that run: config spec **§3.2d-DLP addendum** (field is `deal` not `deal_text`;
  eligibility keys snake_case; `otp/get` invalidates prior codes, caps at 3 consecutive,
  and the admin `/otp/csv` export lists **newest first** — don't tail it).
- **Avoid:** `805-555-0142` — no account but *has* OTP history.
- **Burned, need tagging for G40-359 cleanup:** `141548` (8055557547), `141554` (8055551234).
- ⚠️ **Signing in on an unknown number CREATES an account** (OTP login: lookup miss → create).
  Every casual "does this number work?" consumes it. This cost three numbers in one hour.
- **OTP codes:** the HQ Dashboard session reads `otps` / `email_otps` off the prod reader — ask
  per step and take the newest unexpired row **with its timestamp**. `used=true` does *not*
  mean "this code signed them in": one success flips every live code for that number.

---

## 6. Open, unowned

- **deals@ Apps Script freeze** — owner ruling outstanding; blocks the deals@ email work.
  Recommendation on file: freeze it (mailing a body-supplied address turns a public URL into
  an open relay).
- **G40-355** — bid board ungated. Verified live by placing a winning $999 bid with eligibility
  off.
- **G40-357** — code half: `placeBid()` returns `ok:true` for losing bids.
- **`regen_ou.py`** — still holds the pre-2026-08-09 `cat_of`. Deliberately unsynced; fixing it
  needs a **watched full pipeline run**, because the hourly refresh would otherwise apply it
  across every bake unattended.

---

## 7. Two lessons from 2026-08-10 worth carrying

**A unit test of a controller cannot see what its middleware does to the request.** The first
live call failed `422 Unrecognised field(s): app_type, fetched_user` — `middleware.user_auth`
injects three fields into `req.body` and only one was stripped, so **every authenticated
request failed while the suite stayed green.** Driving the live path is what found it.

**A correction has to land in the section people read, not only the section that found it.**
This document set logged that failure against itself three times in one day — a diagnosis in
§3.2a that never reached §2.1's table, a "13 auto-eligible" figure published in two specs after
it was known to be a floor, and a §3.2b line that held Deals intake *after* the owner had
released it. **When a finding contradicts something stated elsewhere, grep for the stale claim
rather than trusting you'll remember where it lives.**
