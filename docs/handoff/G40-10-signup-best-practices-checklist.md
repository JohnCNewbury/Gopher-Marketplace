# G40-10 — Gopher Go: Best Practices Confirmation (final signup step)

**Type:** Task · **Priority:** High · **Label:** worker · **Status:** To Do → dev-ready
**Figma:** node `16-5405` ("Best Practices Confirmation") · file `aRFH8dqUfSHLJTb89VZYNh` (Jira-Tickets)

Add a best-practices acknowledgment checklist as the **final step of Gopher Go (worker) sign-up**.
The worker must tap each item to confirm; the **"Understood & Ready To Go!"** CTA stays disabled
until **all** items are acknowledged. On confirm, record a **versioned acknowledgment** against the
Gopher account, then complete sign-up.

## Deliverables in this repo

⚠️ **Corrected 2026-09-07 — the two paths this section used to cite were both wrong.**

- **The design source of truth is the interactive prototype**, not a Figma transcription:
  the `best-practices` screen inside `_prototypes/Go/gopher-go-prototype.html`, wired as the
  last entry of `SIGNUP_IDS` and reached via `GO('best-practices')` after payout. It is
  published to the screen spec as
  `Dev/gopher-dev-handoff/public/screen-spec/best-practices.{png,json}` + `notes/best-practices.md`.
- **The day-1 Figma transcription still exists**, quarantined by owner directive 2026-08-02 at
  `_prototypes/Go/_day1-figma-archive/gopher-go-best-practices-figma.html`. That folder's README
  names this exact file as one that **still says "Requestor"** after the 2026-07-23 spelling canon
  change. **Do not implement from it.** (`git log` finds nothing for either path because
  `.gitignore:27` excludes `_prototypes/Go/*` — these files have never been tracked. A git-history
  probe cannot answer whether they exist.)
- **Component scaffold:** `Documentation/Jira Tickets/SignupChecklist.jsx` (also copied to
  `Dev/gopher-dev-handoff/product-docs/Jira Tickets/`). Present on disk.

## The 9 items (exact copy)

⚠️ **This list is the day-1 Figma wording and is stale — item 3 says "Requestor", against the 2026-07-23 canon. Which copy set is canon is an open owner decision; see the reopen audit at the foot of this file.**

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

---

## Reopen audit — 2026-09-07 (design sign-off pending)

Reopened into the "Payment Options" sprint. Side-by-side sign-off page:
<https://claude.ai/code/artifact/1f65f762-0a85-4366-bfc6-84db24449d7f>

### ⛔ Do not merge `!247` as it stands

`gophergo/gopher-mobile-gopher-capacitorjs!247` (branch
`origin/feat/g40-10-best-practices-checklist`, single commit `8569b17e`, 22 Aug) adds
`src/component/bestPracticesChecklist.js` + a route + the `completeOnboardingAndNavigate`
hand-off. Its copy is **byte-identical to the quarantined day-1 Figma transcription**,
"Requestor" and "Cancelations" included — i.e. it was built from the artifact the
2026-08-02 directive says not to implement from. 64 commits behind `production`.

### Three claims in the reopen that do not hold

| Claimed | Verified |
|---|---|
| `gopher-go-best-practices-figma.html` never existed | **It exists**, in `_day1-figma-archive/`. `git log --all` returns nothing for *any* `_prototypes/Go/*` path — `.gitignore:27` excludes them, so they have never been tracked. The probe could not have returned a positive result. |
| `SignupChecklist.jsx` is not on disk | **It is**, at `Documentation/Jira Tickets/SignupChecklist.jsx`. |
| There is no approved UX | An approved design **does** exist — the prototype screen, published to the screen spec. What is true is that `!247` itself has never been reviewed. |

Corollary: **"put it side by side with Figma" is against the standing directive.** Figma node
`16-5405` is the day-1 import. The prototype is the reference.

### Measured differences (both at a 390 pt frame)

- **Item 3 spelling** — prototype "Reques**ter**" vs `!247` "Reques**tor**". Owner canon
  (2026-07-23) is *-er always*. Prototype wins; **the 9-item list above is also stale on this**.
- **Height** — prototype fits 786 pt with the CTA in view; `!247` runs **862 pt**, so the CTA
  is 76 pt below the fold and must be scrolled to.
- **A tenth gate exists only in the prototype** — the *Gopher Go 101* button must be opened
  before the CTA can enable. The AC says only "all 9 acknowledged". **Owner decision required.**
- Ground (paper vs unset/white) and enabled-CTA colour (green vs navy) both favour the prototype.
- **Not a defect:** `!247` uses Urbanist; the prototype uses Nunito/DM Sans. Urbanist is the
  shipped app's face (140 files on `production`); the prototype's pair is a web stand-in.

### Two code findings in `!247`

1. **Inline `min-height: 100dvh`.** G40-371 merged to `production` on 20 Aug and routed every
   full-height element through `var(--app-vh)` *specifically because* a JS style object cannot
   carry the `100vh`/`100dvh` fallback pair. `!247` (22 Aug) is now the only file under `src/`
   outside `App.css` and vendor CSS writing `100dvh` raw. Build targets **iOS 15.0**; `dvh`
   needs 15.4 → on 15.0–15.3 the declaration is dropped and height falls back to `auto`.
   (Narrower than G40-371's own write-up, which cited a 14.0 target.)
2. **Nothing gates on the ack.** The spec wants the worker held out of the Available tab until
   an ack row exists for the current version. No route enforces it — not backend, not `!247`.
   Kill the app on this screen and relaunch: worker is in, no ack stored, no re-prompt.

**Sound in `!247` and worth keeping:** it calls the real route, sends the version, and on a
failed write holds the worker on the screen with a retry rather than letting them past an
unrecorded gate.

### Backend — verified live on `production`

`controllers/user/gopher.js` + `controllers/user/index.js:518`, behind `user_auth` +
`require_email_verified({allowUnverified:true})`; columns in `models/users_roles.model.js:79-82`
and `config/db.config.js:1114`; `test/g40-10-best-practices-ack.test.js`. Validates the version
as a non-empty string ≤ 40 chars (no allowlist); idempotent **per version** — re-acking a stored
version returns the original timestamp.

### Order of remaining work

1. **Owner answers the two decisions** (101 gate in/out; which copy set is canon).
2. Reconcile `!247` onto the approved design — copy, ground, CTA colour, the gate if in, and
   `var(--app-vh)` for height. Keep its error path and version constant.
3. Bump `CHECKLIST.version` **with** the copy, or no existing worker is re-prompted.
4. Correct the Jira description (stale copy + the dead `/api/v1/gopher/ack-best-practices` path).
5. Review `gopher-go-101.html` — read it, don't string-match it (owner rule, 2026-08-05).
6. Rebase and merge.
7. **Ship in a store release.** No OTA. 3.9.2 hit 100% on both stores 2026-09-07 without this.

### ⛔ Closing condition

Not Done at the merge. The AC is a screen at the end of sign-up — met only when a build
carrying it is **live in both stores**. This ticket previously went green on a sprint close
(2026-09-07 00:07), not on the work.
