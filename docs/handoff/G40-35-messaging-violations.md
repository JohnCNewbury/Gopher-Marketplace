# G40-35 — In-app messaging guard: flag ALL communication violations

**Jira:** G40-35 (Task, Lowest) · Epic **G40-3 AI Inclusion** · Label `spine`
**Assignee:** John Newbury
**Surfaces:** Request web `Final/gopher-request.html` · Connect `Final/gopher-connect.html`
(Gopher Go worker app `Final/gopher-go.html` has **no messaging UI yet** — see Dependency.)
**Module:** `Final/assets/js/gopher-message-guard.js` (one shared file, tuned in one place)
**Full spec / production contract:** `docs/handoff/messaging-precheck.md`
**Live demo of the escalation:** `docs/handoff/messaging-guard-demo.html`
**Scope of this branch:** FRONT-END, prototype-grade. The client-side pattern check + escalating
modal are built and wired. Server verdict, block enforcement, admin email, account flag, ActiveAdmin
logging, and the recipient-side pop-up are dev/backend (in the same category as the age-restricted flag).

---

## What the ticket asks

Detect when an in-app message tries to move money or communication **off Gopher** (Cash App / Venmo /
Zelle / cash, phone numbers, emails, "cancel and pay outside") **or** uses foul/abusive language, and
intervene. On a trigger: pop-up to the user, **both parties see it**, account is flagged, an email goes
to **admin@gophergo.io**, and it's logged in ActiveAdmin.

> **Note — this ticket was much further along than its text implied.** A prior session (commit
> `cbbea62`) already built the shared guard module, wired it into Request + Connect, and wrote the
> production spec (`messaging-precheck.md`). This session locked the open product decisions and
> extended the prototype to match them.

## Product decisions — LOCKED (John, 2026-07-02). No open questions remain.

1. **Scope = ALL in-app communication violations** (ticket renamed accordingly). Two policy families:
   **off-platform circumvention** (payment/contact/off-platform) and **conduct** (foul/abusive/
   threatening language). Each gets its own modal wording; escalation model is shared.
2. **"$" / dollar amounts DO flag** — a bare amount is the precursor to CashApp circumvention, the big
   current abuse. Price is shown **transparently in-app**, so there is no legitimate reason to type a
   dollar figure in chat.
3. **Physical/job-site addresses do NOT flag** — they're required to do the job. The ticket's
   "Address" meant **email address**, which is already covered under `contact`.
4. **Admin email + account flag fire at level ≥ 2** (`CONFIG.adminAlertAtLevel = 2`). Level 1 is a
   silent educational nudge so admin@ isn't flooded by first-time offenders.
5. **Escalation is per USER across all threads** — a repeat offender can't reset by opening a new
   conversation.
6. **Both parties receive the pop-up** (from the ticket). The sender sees it client-side today; pushing
   it to the recipient is backend.

---

## ✅ DONE (front-end reference) — `Final/assets/js/gopher-message-guard.js`

- **New `payment` pattern for bare money:** `/\$\s?\d/` and `/\b\d{1,6}(?:[.,]\d{2})?\s?(?:dollars|bucks)\b/i`.
- **New `conduct` family** with a **conservative starter foul-language list** (repeated-letter tolerant,
  e.g. `fuuuck`) and its own respectful-tone modal copy (Keep It Respectful → Conduct Warning → blocked).
  ⚠️ **John to review/grow the word list** — it's deliberately small to avoid false positives.
- **Family-aware modal copy** (`COPY.offplatform` / `COPY.conduct`, `familyOf()`): a foul-language hit no
  longer shows "stay in the app" text. `showModal` stays backward-compatible (defaults to off-platform).
- **Per-user escalation** — the counter keys on a single `USER_KEY`, so it accumulates across threads.
- **Admin-alert seam** — `CONFIG.adminAlertAtLevel = 2` + `maybeAdminAlert()`; the prototype logs a
  `[message-guard] PROD would email admin@ + flag account` breadcrumb at level ≥ 2 (no email in the demo).
- **"Address" = email** clarified in code comments; physical addresses intentionally not matched.
- Already wired (unchanged this session): Request `doSend`→`sendInboxMessage` (`gopher-request.html`) and
  Connect `doSend`→`sendInboxMessage` (`gopher-connect.html`) both route through `GopherMessageGuard.guard`.

### Verification
- **Detection matrix validated** (regex behavior, Python-mirrored — engines agree on these constructs):
  **0 false positives** across legit messages incl. a street address, a 4-digit gate code, "3 boxes and
  2 bags", "see you at 3pm"; and correct flags for venmo/cashapp/zelle, `$50`, "50 bucks", phones,
  emails, "cancel and pay outside", and foul language (asshole, bullshit, fuuuck, "screw you",
  "im gonna beat you").
- **Not verified in-browser this session** (the local preview sandbox couldn't serve this path and no
  Node was available): the DOM modal render + family copy selection. It's a mechanical object lookup with
  a preserved fallback; exercise it via `docs/handoff/messaging-guard-demo.html` on any static server.

---

## 🔧 TO BUILD (developer / backend)

- **`POST /messages/precheck`** returning `{verdict, policy, severity, message, flag_id}` — swap the body
  of `check()` for a `fetch(...)`; the return shape already matches (see `messaging-precheck.md`).
- **Enforce the block** at the send endpoint (client modal is a deterrent only; disable-JS bypasses it).
- **Durable per-user escalation state** (server-side, keyed by real `sender_id`, not the in-memory counter).
- **Level ≥ 2 actions:** email **admin@gophergo.io**, **flag the account**, write a **flag_id row to
  ActiveAdmin**. Wire these where `maybeAdminAlert()` fires. (Sample admin email format: the
  "Fraud Alert Order 32994.pdf" attachment on the ticket.)
- **Both parties see the pop-up:** push the notification/modal to the **recipient** too — the prototype
  only shows the sender.
- **Grow the foul-language list & obfuscation handling** (`v3nmo`, `sh!t`, spelled-out digits, non-English).
- **Worker app:** wire the same one-line `GopherMessageGuard.guard(...)` into Gopher Go's composer **once
  worker↔requester messaging exists there** (see Dependency).

## Dependency — worker app has no messaging yet
`Final/gopher-go.html` has **no inbox/thread/composer** (only a passing "inbox message" mention in
referral copy). There is nothing to wire the guard into until worker-side messaging is built. When it is,
integration is the same single `guard()` wrap used in Request/Connect. This is the one part of the ticket
that is **blocked on other work**, not on a decision.

## Acceptance criteria → where it lives
| Ticket rule | Front-end (done) | Backend (to build) |
|---|---|---|
| Flag payment methods (Venmo/CashApp/Zelle/…) | `PATTERNS.payment` | server precheck |
| Flag `$`/dollar amounts (CashApp precursor) | `PATTERNS.payment` `$`/amount regex | server precheck |
| Flag phone numbers & **email** addresses | `PATTERNS.contact` | server precheck |
| Flag foul/abusive language | `PATTERNS.conduct` + conduct copy | curate list; server precheck |
| Do **not** flag physical/job-site address | (intentionally unmatched) | — |
| Pop-up on trigger; escalate | `showModal` + per-user counter | severity→level mapping |
| Both parties get the pop-up | sender side | push to recipient |
| Email admin@ + flag account + ActiveAdmin log | `maybeAdminAlert()` seam @ level ≥ 2 | email + flag + log |

## Notes
- Single shared module — one edit updates Request, Connect, the two repo-root `_prototypes/`, and the demo
  harness (all include the same file). No inline copies to keep in sync.
- Escalation tunables live in `CONFIG` (`blockAtLevel`, `adminAlertAtLevel`).
- The `_prototypes/gopher-go-prototype.html` referenced in the spec is a **separate older simulator**, not
  the go-forward `Final/gopher-go.html`; don't confuse the two.
