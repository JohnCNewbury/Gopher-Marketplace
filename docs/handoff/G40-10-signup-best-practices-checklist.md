# G40-10 — Gopher Go: Best Practices Confirmation (final signup step)

**Type:** Task · **Priority:** High · **Label:** worker · **Status:** To Do → dev-ready
**Figma:** node `16-5405` ("Best Practices Confirmation") · file `aRFH8dqUfSHLJTb89VZYNh` (Jira-Tickets)

Add a best-practices acknowledgment checklist as the **final step of Gopher Go (worker) sign-up**.
The worker must tap each item to confirm; the **"Understood & Ready To Go!"** CTA stays disabled
until **all** items are acknowledged. On confirm, record a **versioned acknowledgment** against the
Gopher account, then complete sign-up.

## Deliverables in this repo
- **Rendered screen (verified in-browser):** `_prototypes/Go/gopher-go-best-practices-figma.html`
  — faithful to Figma, on brand (Urbanist, navy `#002461`, body `#292929`, bg `#BADBFC`),
  with the all-checked-enables-CTA interaction working.
- **Component scaffold (real copy):** `Documentation/Jira Tickets/SignupChecklist.jsx` — items now
  carry the exact Figma copy as structured segments (plain / **bold** / link), `version`,
  `title`, `intro`, `cta`; `onComplete(version)` fires on confirm.

## The 9 items (exact copy)
1. Please review your **[How To Use Gopher Go](https://gophergo.io/become-a-gopher/gopher-go-support/)** tutorial before taking your 1st request.
2. Set your **[Work Settings & Radius](https://youtu.be/tQiBo8NCNUs?si=VCe4pikwoFCfiEp0)** responsibly to avoid delayed orders due to travel.
3. If you're not clear with a request's details, please message the Requestor **before** accepting.
4. **Need ASAP** requests should ALWAYS be completed within an hour, unless agreed upon before accepting. Food Deliveries closer to 30 min.
5. When you accept a request, please send a quick **intro message** to your customer.
6. Always **update your task progress** accurately and in the correct location(s).
7. Be courteous when communicating.
8. Age-Restricted deliveries are ALWAYS in-person. No contactless deliveries are ever permitted.
9. When you accept a request, **you must complete it**. Cancelations are a major inconvenience for the customer and the platform.

⚠️ **Terminology correction:** Figma item 4 read **"Need It Now"** (legacy). Renamed to the canonical
**"Need ASAP"** here. Two items link out (How-To support page; Work Settings & Radius video) — links
must open externally without toggling the checkbox.

## Backend — persist the acknowledgment
There is no best-practices field today. Add:
- **DB:** on `users_roles` (gopher role) add `best_practices_ack_version VARCHAR` + `best_practices_ack_at TIMESTAMP`.
- **Endpoint:** `POST /api/v1/gopher/ack-best-practices { version }` (behind `user_auth`) → set the two
  columns for the authenticated gopher; return success. Idempotent (re-confirm overwrites version/time).
- **Signup wiring:** mount as the **last** sign-up step; a gopher can't reach the Available tab / take a
  first request until an ack row exists for the **current** `CHECKLIST.version`. Bumping the version
  (copy change) can re-prompt existing gophers on next launch if desired.

## Acceptance criteria
- Checklist is the final sign-up screen; CTA disabled until all 9 items are acknowledged.
- Tapping a linked term opens the URL without toggling that item.
- Confirming calls the ack endpoint with the current version and advances to the app.
- Ack (version + timestamp) is stored on the gopher account and survives re-launch.
- Copy matches the 9 items above verbatim ("Need ASAP", not "Need It Now").

_Note (Shaun, 2024): flagged as Stripe-adjacent — but this checklist is acknowledgment-only and does
not depend on Stripe; payout-method setup is a separate signup step._
