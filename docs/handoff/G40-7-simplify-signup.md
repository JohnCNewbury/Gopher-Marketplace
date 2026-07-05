# G40-7 — (FE) Both Apps: Simplify Sign-Up Process

**Type:** Bug (umbrella; absorbs BE ticket **G40-242**) · **Priority:** Highest · **Bucket A**
**Assignee:** John Newbury · **Status:** groomed to dev-ready — 2026-07-02.
Front end **not** modified (owner chose groom-only; the signup is a delicate multi-step state
machine and the logic is already scaffolded — see below). No open questions remain.

## ⚠️ Read first — two things that reframe this ticket
1. **The core logic is already scaffolded + tested (owner).** `G40-Build-Recap.md` documents
   `wave-bugs/g40-7/signupFlow.js` (+ `.test.js`), **shared with G40-271**, implementing:
   - `routeUserOnLogin` — existing **unverified** users → **Email Verification** (never
     new-account creation; history preserved).
   - `otpBackTarget` — Back from the email-OTP screen returns the **Confirmation / Profile-Info**
     screen (so the user can **fix their email + resend**) — **not** a refresh, **not** SMS sign-in.
     *(This is the exact bug in the ticket's UPDATE line.)*
   - `canEnterHome` — gates Home on a **verified email**.
   - `shouldCreateNewAccount` — **false** for existing accounts.
   Wire the front end to these; don't re-derive the logic.
2. **The old Figma is superseded.** The ticket's Figma `6158-28302` is **stale** — per the
   owner's rev-13 standing note the entire UI/UX was redesigned. **Bind to the new prototype /
   canonical flow, not the old Figma.** New UX target: `Final/gopher-request.html` (customer)
   and the Gopher Go signup (`_prototypes/Go/gopher-go-prototype.html` / `SignUp.js`).

## The intended signup flow (from `signupValidation.js` G40-157 + Diana's 2026-02-17 note)
State machine: **demo → phone + phone-OTP → details (name/email/phone/DOB) → email-OTP (resend)
→ activation → welcome/tutorial.** Field validation lives in `signupValidation.js`
(`validateSignupFields`: name required, valid email, valid phone, valid DOB). Activation rules:
- New **"Incomplete"** status tracks users who start but don't finish (replaces the binary
  Active/Inactive). Incomplete data is **saved** to enable re-engagement.
- **"Active"** requires: **email verified** **and**, for **Gopher Go workers**, **payout info
  added**.

## Front-end work remaining (bind to the new prototype)
The Request prototype already has the signup pieces — here are the exact hooks:
- **Remove Sourcing Info** ("How did you hear…"): elements `rqSuSource`, `rqSuSourceOther`,
  `rqSuSourceOtherRow` in `Final/gopher-request.html` (markup ~L16468; referenced by ~5 JS
  handlers ~L16741/16907/17018/17251 and the `STEPS` config ~L11826/12294). Remove the step +
  its field references; leave an internal note *"Sourcing will move to Gopher Rewards in a
  future release."* Do the same in the Gopher Go signup. **Do not show sourcing fields anywhere.**
- **Email OTP is the final verification step:** `rqSuEmailOtpBtn` / `rqSuEmailOtpInline` /
  `rqSuEmailVerifiedBadge` (phone-OTP counterparts: `rqSuPhoneOtpBtn` / `rqSuPhoneVerifiedBadge`).
  Ensure email-OTP is ordered **last** and **blocks Home** until verified (`canEnterHome`).
- **OTP back-nav fix:** wire Back on the email-OTP screen to `otpBackTarget` → Profile-Info (edit
  email + resend), not SMS sign-in. Handle OTP errors, **Resend**, and **"Did not receive?"**.
- **Returning unverified users:** on login, `routeUserOnLogin` → Email Verification; block Home
  and main UI until verified.
- **Step continuity / progress UI:** show clear step progress; reorder steps to the new UX.
- **Auto-save & resume:** on every *Continue →*, persist step data; restore progress after
  app close/background/return (needs the persistence layer — BE, below).
- **Fix the email-field cutoff** UI bug John reported (2026-02-28 screenshot — the email input is
  visually clipped during sign-up).

## Backend work (was G40-242, merged here; + G40-271 regression items)
- Persist incomplete signups + the new **"Incomplete"** status; save on each step (powers
  auto-save/resume + re-engagement).
- Activation gate: email-verified (+ payout for Go workers) → "Active".
- **G40-271 (shares `signupFlow.js`):** wire the admin email write to the recognized **AWS
  attribute** + link the new AWS category; **repair "Send Confirmation Email."**
- Email OTP send/verify (ties to G40-272 admin Email-OTP report).

## Acceptance criteria (unchanged intent)
1. Flow matches the **new** UX (not old Figma); email verification is the final step; user can't
   skip it. 2. New users must verify email; existing unverified users are routed to Email
   Verification and blocked from Home. 3. OTP errors + resend + back-nav (to Profile-Info) handled
   gracefully. 4. Progress saved each step; signup resumes after restart. 5. Sourcing Info not
   visible anywhere; no dead ends.

## Related / dependencies
- **G40-242** (BE) — merged into this ticket (was a FE/BE split; now one).
- **G40-271** — the March-2026 regressions; shares `signupFlow.js`; do together.
- **G40-157** (`signupValidation.js`) — field validation module to reuse.
- **G40-170** — incomplete-signup capture (the "Incomplete" status).
- **G40-10** (`SignupChecklist.jsx`) — Gopher Go best-practices checklist as the **final** signup
  step; persist the acknowledgment.
- **G40-172** (`connectSignup.js`) — Connect requires **both** phone + email verified.
- **G40-272** — admin Email-OTP report.
- Owner reference build: `Documentation/Jira Tickets/` (+ `G40-Build-Recap.md`,
  `Gopher-Build-Console.html`).
