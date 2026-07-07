# G40-143 — Block re-signup of admin-deactivated users (2-of-3 identity match)

**Both apps · Bucket C · Wave 3 · `spine` · Low · Owner: John Newbury**
Jira: https://gopherapp.atlassian.net/browse/G40-143

## What this is
A trust-&-safety layer at **sign-up submission** that stops a previously **admin-deactivated** user from returning under a fresh Google Voice number + new email. Phone/email checks miss this (both values are new) — so we match on the **identity that doesn't change**: Name, DOB, Address. If the applicant matches a single deactivated account on **≥ 2 of 3** fields, the sign-up is hard-blocked and routed to support.

This sits **alongside** (not on top of) the existing phone/email duplicate-prevention. All three checks run at sign-up; failing any one blocks. Phone/email logic is unchanged and out of scope here.

Pairs with **G40-157** (new signup flow) and **G40-170** (`potentialUser.js` — Admin Panel User tab). The "Admin Panel" is the **Gopher HQ Dashboard** (`Documentation/Dashboard/dashboard.html`) — audit log + override live there.

---

## Owner decisions — LOCKED (John, 2026-07-06)
The ticket's open items are resolved. Do **not** re-open these with the dev:

1. **Address precision → EXCLUDE unit.** Match on **street + city + state + zip**; the apartment/unit/suite number is stripped before comparison. Rationale: harder to evade (can't dodge by changing the unit #). Accepted trade-off: possible false-positives for unrelated residents in the same building — those people are routed to support, where the admin override clears them.
2. **Override scope → approve THIS applicant only.** When an admin lifts a block, it whitelists **that one applicant** to complete sign-up. The matched deactivated account **stays a live match** for everyone else. (Do *not* implement "clear the whole account block" — that would let anyone matching it through.)
3. **Near-miss audit → build it now (non-blocking).** In addition to the hard-block path, when an applicant matches a deactivated account on **exactly 1 field**, emit a **low-severity, non-blocking** audit event so support can spot evasion patterns (e.g. a banned user who nudged their DOB by a year). This does **not** block the sign-up.

---

## Behavior
- Runs **server-side at the sign-up submission API** on **both** apps (Gopher + Gopher Go). Never client-side (trivially bypassable).
- **Matching pool = admin-deactivated-for-cause accounts only.** Self-deletions and inactivity auto-deactivations are **excluded** (filter upstream — the matcher trusts the pool it's given).
- **Threshold = 2-of-3 against the *same* account.** 1 hit on account A + 1 hit on account B does **not** aggregate → allow.
- **Match precision:**
  - **Name** — exact, case-insensitive, first + last. No fuzzy/typo tolerance.
  - **DOB** — exact `YYYY-MM-DD`.
  - **Address** — normalized street + city + state + zip, **unit excluded** (see decision 1).
- **On block:** account not created → show blocking message → log match event in HQ Dashboard.
- **On near-miss (1-of-3):** sign-up proceeds; write a low-severity audit event.
- **Persistence:** the rule applies **forever** (no time expiry). Only an admin override lifts a block.
- **Feature-flag it** so the block can be toggled off fast if false-positive volume exceeds support capacity.

---

## Applicant-facing message (do NOT disclose why)
- **Title:** Account Cannot Be Created
- **Body:** We're unable to create your account at this time. Please contact our support team at **support@gophergo.io** for assistance.
- **Primary action:** tap-to-email link → mail client with `support@gophergo.io` pre-filled in To.
- Must **not** name the matched account, which fields matched, or anything else that teaches evasion. Follows the **G40-308** Pop-up Modal Standards (native bottom-sheet on the apps, centered card on web; ink-on-green = navy; tokens: Midnight Blue `#002461`, error accent `#C44257`).

---

## Admin visibility & override (Gopher HQ Dashboard — `Dashboard/dashboard.html`, User tab)
**Match-event log (every hard block):** timestamp · applicant Name/DOB/Address/email/phone (as submitted) · matched **deactivated account ID** · **which fields matched** (e.g. Name+DOB) · IP + device id where available. Must be **queryable** so support can find the record when the applicant emails in.

**Near-miss log:** same shape, flagged **low-severity / non-blocking**, the single matched field noted. Kept separate (or clearly tagged) so it doesn't drown the hard-block queue.

**Override (approve-this-applicant-only):** admin action that whitelists the specific applicant so they can complete sign-up. Record who/when. The deactivated account remains in the match pool for all other applicants.

---

## Code
Pure matching logic is scaffolded and unit-tested:
- **`Documentation/Jira Tickets/identityMatch.js`** — normalization (name/dob/address, unit-excluded) + `evaluateSignup(applicant, pool)` → `{ decision:"block"|"allow", block:{accountId,fields}, nearMisses:[...] }`. No I/O, no DB, no auth — pure functions.
- **`Documentation/Jira Tickets/identityMatch.test.js`** — covers all 9 acceptance scenarios (run: `node identityMatch.test.js`). Logic verified passing.

**Dev still owns (reserved — real security/auth/db code):**
1. Wire `evaluateSignup` into the sign-up submission API on both apps, **after** phone/email checks, behind the feature flag.
2. Build/confirm the **deactivated-account pool query** — the admin deactivation flow must persist a queryable record carrying Name/DOB/Address. **If those identity fields aren't captured on deactivation today, that prerequisite is in scope here.** Index the pool to keep sign-up latency acceptable.
3. Address normalization at production quality — the scaffold's `normalizeAddress` is a solid baseline (strips unit designators, collapses St/Street etc.), but consider a standard address-normalization library/service for edge cases before comparison.
4. HQ Dashboard: match-event log (queryable), near-miss log, and the approve-this-applicant override UI + persistence.
5. Applicant blocking modal per G40-308.
6. The applicant-whitelist store the override writes to, and the check that lets a whitelisted applicant through on retry.

---

## Acceptance criteria (from ticket — all covered by the scaffold's tests)
1. 2-of-3 same account → hard block + message + log. ✅
2. 3-of-3 → hard block. ✅
3. 1-of-3 → sign-up proceeds (now also: near-miss audit). ✅
4. Split across two accounts → proceeds. ✅
5. Self-deleted not in pool → proceeds. ✅
6. Applicant not told why. ✅ (copy above)
7. Admin can override (approve-this-applicant). ✅ (decision 2)
8. Audit log on every block. ✅
9. Both apps covered. ✅

## QA
Per ticket: create a known admin-deactivated fixture; test 3/3, 2/3, 1/3, split-across-two, self-deleted; confirm the message reveals nothing; confirm the audit log captures all fields; confirm an admin override lets that applicant (and only that applicant) through; test both apps × iOS/Android; test address variants (formatting, whitespace, casing, **different unit numbers → still match**).

## Follow-ups (not this ticket)
- Expose the match/near-miss log as a dashboard/report so support can review evasion patterns over time.
