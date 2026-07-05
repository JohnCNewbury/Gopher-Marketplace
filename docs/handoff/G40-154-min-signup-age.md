# G40-154 — Both Accounts: Minimum Age To Sign Up Is 16

**Type:** Bug · **Priority:** Medium · **Backlog map:** KEEP · Bucket A · "Enforce minimum sign-up age 16."
**Status set this session:** In Progress

## Summary
Enforce a **minimum sign-up age of 16** on both apps. When a user's date of birth
makes them under 16, account creation is blocked with a clear, friendly message.
Someone whose **16th birthday is today is eligible** (age ≥ 16).

## What was built (front-end, Request app)
`Final/gopher-request.html` — the requestor signup already collects DOB via a custom
calendar (`#rqSuDob`, canonical `YYYY-MM-DD`) and gates the "Create my account"
button through `validateSignup()`. Added a surgical age-16 gate there:

1. **Helper** `signupAgeFromDob(v)` + `const MIN_SIGNUP_AGE = 16` (alongside the
   existing `isEmailValid` / `phoneIs10` validators). Parses the canonical
   `YYYY-MM-DD` and returns whole years with correct birthday-boundary math
   (mirrors the existing `customerAgeYears()` used by the age-restricted flow).
2. **Gate inside `validateSignup()`** — derives age from `#rqSuDob`; when a DOB is
   present and `< 16`, shows the inline message and keeps the submit button
   disabled. Empty DOB is still handled by the existing presence check (no age
   error shown for an empty field).
3. **Inline message element** `<small class="signup-err" id="rqSuDobErr">You must be
   at least 16 years old to create an account.</small>` under the DOB field
   (reuses the existing `.signup-err` style, same pattern as `#rqSuEmailErr`).

The gate re-runs automatically on every DOB selection: the calendar's `commit()`
dispatches `input` on `#rqSuDob`, and `#rqSuDob` is already wired to
`validateSignup` (`[suFirst, suLast, suDob, suAddr].forEach(... 'input', validateSignup)`).

### Verified (browser harness)
Boundary cases against today's date — all reachable cases pass:

| DOB | Age | Result |
|---|---|---|
| 15 y/o | 15 | **blocked** + message (Scenario 1 ✓) |
| 16th birthday **today** | 16 | eligible (Scenario 2 ✓) |
| turns 16 **tomorrow** | 15 | blocked + message (boundary ✓) |
| 1 day past 16th birthday | 16 | eligible ✓ |
| 17 y/o | 17 | eligible (Scenario 3 ✓) |
| empty | — | presence-gated, no age error ✓ |

Note: the calendar only ever writes a valid `YYYY-MM-DD` (the field is
readonly/hidden, not free-typed), so a malformed DOB cannot occur via the UI.

## Go app — nothing to gate in the prototype (groomed)
`Final/gopher-go.html` does **not** have an interactive signup DOB step. DOB appears
only as a **locked, read-only profile field** (`#piDob`, "Locked after sign-up").
So there is no client DOB entry to gate on the Go side in the prototype — the Go
enforcement is a backend/real-app concern (see seam below). When the Go signup is
built for production, apply the same age-16 gate on its DOB step.

## Backend seam (required — do NOT ship front-end-only)
Per the ticket's business rules, age validation **must also be enforced server-side**
at profile submit — a client gate is bypassable via the API. On the profile-create
endpoint (both apps):
- Reject any submit whose DOB derives to age < 16 with the same friendly message.
- Age math: age ≥ 16 relative to **today** (16th birthday today = eligible).
- **Existing under-16 accounts:** flag for admin review (confirm with team whether
  remediation of any already-created under-age accounts is required — open item in
  the ticket's Dependencies/Notes).

## Files touched
- `Final/gopher-request.html` — helper + `validateSignup()` gate + `#rqSuDobErr` element.

## Not in scope here
Real auth/accounts/persistence (reserved for the production rebuild per repo CLAUDE.md).
This change is a front-end reference gate + the documented backend seam.
