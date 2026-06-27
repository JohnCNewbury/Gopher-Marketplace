# In-App Messaging Guard — Spec & Handoff

_Dated 2026-06-26. Lives in `docs/handoff/` alongside the other handoff docs.
This file is the durable source of truth for the messaging guard; it replaces
scattered chat threads. Any session can pick the work up by reading this._

## Purpose

Detect when an in-app message tries to push payment or communication **off
Gopher** (Cash App / Venmo / Zelle / cash, phone numbers, emails, "cancel and
pay outside"), and intervene with an escalating pop-up. Same pattern as the
existing **age-restricted keyword flag in Request** — extended to messaging and
given three escalation levels.

Applies to all four messaging surfaces, which must behave **identically**:
Connect, Request, Request App Prototype, Gopher Go Prototype.

---

## Two layers — keep the boundary explicit

| | Prototype layer (built now) | Production layer (paid dev) |
|---|---|---|
| Where the verdict comes from | Client-side keyword/pattern match in `gopher-message-guard.js` | Server: `POST /messages/precheck` |
| What enforces a block | The modal (UX only) | The **send endpoint refuses to deliver** |
| Trust | A deterrent; bypassable by design | Authoritative |
| State (escalation count) | In-memory per thread, resets on reload | Server-side, per user + thread, durable |

**The prototype is honest only as long as nothing claims the block is
enforced.** A modal-only block is one "disable JavaScript" away from going
through. The client check is a fast UX pre-filter; the server is the gate. (Same
principle as the earlier honesty-copy fix in `gopher-request.html`: the UI must
not imply a guarantee the layer underneath doesn't provide.)

> Scope note (CLAUDE.md): real messaging + server-side moderation is
> human-developer territory. The prototype module is front-end choreography with
> a local stub, in the same category as the age-restricted flag — not the
> backend itself.

---

## The production contract (target)

```
POST /messages/precheck
  → { text, app: "connect"|"request"|"go", thread_id, sender_id }
  ← { verdict: "allow"|"warn"|"block",
      policy:  "contact"|"payment"|"off_platform"|...,
      severity: 50,
      message: "<copy for the modal>",
      flag_id: "<id, when warn/block, for the alert log>" }
```

The prototype's `check()` returns the same shape (`verdict` / `policy` / `level`)
on purpose, so moving from local → server is a one-function swap: replace the
body of `check()` with a `fetch('/messages/precheck', …)` and keep the modal
and integration untouched.

---

## Escalation model

Per thread, each flagged attempt escalates:

1. **Level 1 — Educational** (first detection) → `warn`. _Keep Your Transaction
   Protected._ Buttons: **Continue in Gopher** (send) / **Learn More**.
2. **Level 2 — Policy Warning** (second) → `warn`. _Possible Policy Violation._
   Buttons: **I Understand** (send) / **View Policy**.
3. **Level 3 — Blocked** (third and beyond) → `block`. _Message Not Sent._
   Button: **Edit Message** (message held, not delivered).

Warns send the message once acknowledged; only level 3 holds it back. Tunable
via `CONFIG.blockAtLevel` in the module. Production should drive escalation off
the server's `severity`/history rather than a raw client counter.

---

## Keyword / pattern categories (prototype list)

Grouped by `policy` so the modal and the future alert log can say *why* a message
tripped. Full list is in `gopher-message-guard.js` under `PATTERNS`; it's meant
to be grown by the dev.

- **payment** — Cash App, Venmo, Zelle, PayPal, Apple/Google Pay, wire, crypto,
  "pay you cash", "pay directly", "pay outside".
- **contact** — phone-number and email patterns, "call/text me", "my number".
- **off_platform** — "outside Gopher", "off the app", "cancel and pay", "meet up
  and pay", "pay in person".

Known prototype limitations (fine for now, list for the dev): regex matching is
naive (misses obfuscation like "v3nmo" or spelled-out digits), the bare word
"cash" is intentionally **not** matched alone to avoid false positives, and
there is no language coverage beyond English.

---

## Integration (one call per surface)

Each page wraps its existing (faked) send handler in a single guard call:

```js
GopherMessageGuard.guard(text, thread_id, {
  onAllow:   function () { /* existing send */ },
  onBlocked: function () { /* leave text in the box for editing */ }
});
```

Include the shared module the same way the site includes its other shared
chrome, with a **relative, case-exact** path (GitHub Pages serves on Linux).
The path differs by where the page lives:

```html
<!-- shipped pages in Final/ (Connect, Request) -->
<script src="assets/js/gopher-message-guard.js"></script>
<!-- prototypes in repo-root _prototypes/ (OUTSIDE Final/) reach back into the
     shipped tree for the module -->
<script src="../Final/assets/js/gopher-message-guard.js"></script>
```

---

## Where it's wired (prototype rollout — 2026-06-26)

All four surfaces route their existing faked send through the guard. Single
shared module, tuned in one file; nothing is duplicated.

| Surface | Page | Send hook | `thread_id` | Include |
|---|---|---|---|---|
| Connect | `Final/gopher-connect.html` | `doSend` → `sendInboxMessage` | `t.id` (real per-thread id) | `assets/js/…` |
| Request | `Final/gopher-request.html` | `doSend` → `sendInboxMessage` | `t.id` (real per-thread id) | `assets/js/…` |
| Go prototype | `_prototypes/gopher-go-prototype.html` (repo root) | `send(t)` (in-file chat) | `'go-prototype'` (stable per-page; page has no id) | `../Final/assets/js/…` |
| Request prototype | `_prototypes/gopher-request-prototype.html` (repo root) | `sendChat(id)` (base64 srcdoc iframe) | `'request-proto:'+id` (worker id) | injected — see below |

The two prototypes live in **repo-root `_prototypes/`**, OUTSIDE the published
`Final/` tree (see "Should the prototypes ship?" below) — so they reach back
into the shipped tree for the shared module via `../Final/assets/js/…`.

Each top-level page wraps its send with `window.GopherMessageGuard` present-check
and **fails open** (sends normally) if the module didn't load — mirroring the
age-restricted backstop's fail-safe style. Clean messages send unchanged; warns
send once acknowledged; a level-3 block holds the message and leaves the text in
the box.

### The Request prototype is special (srcdoc iframe)

Its app screens render as **base64 `srcdoc` iframes**, which have **no base
URL**, so a *relative* `<script src>` inside an injected screen will not resolve.
Two consequences, both handled in the shell's existing head-injection seam (the
`.replace('<head>', …)` in `navTo`):

1. **Loading the module** — injected with an **absolute** URL resolved at runtime
   from the shell's own location (`new URL('../assets/js/…', location.href)`), so
   it works regardless of the srcdoc base-URL quirk. Verified: the module loads
   inside the iframe.
2. **Wiring the send** — the screen's `sendChat` lives inside an IIFE (not a
   global), so it can't be monkey-patched. Instead an injected **capture-phase**
   listener intercepts the send *gesture* (Send button / Enter), peeks with
   `check()` (single evaluation), lets **clean** messages run the screen's own
   send untouched, and on a hit holds the gesture and shows the modal via
   `showModal()`. An acknowledged warn **re-dispatches** the original gesture.
   Note: the re-dispatch is deferred to the post-modal click (not synchronous),
   because `HTMLElement.click()` is a no-op while a click is already in progress.

---

## Dependencies / sequencing for the real build

The precheck doesn't stand alone — `thread_id` and `sender_id` imply two things
that are themselves still unbuilt:

1. **Messaging persistence** (threads, message store) — must exist first.
2. **Identity / auth** (who `sender_id` is) — must exist first.
3. **Precheck** then sits as the gate over the **send** path, and writes
   `flag_id` rows to an **alert log** on warn/block.

Suggested order: messaging store + identity → precheck endpoint → alert log /
review surface.

---

## Open questions for the paid developer

- **Authority on disagreement.** When the client pre-filter and the server
  precheck disagree, the assumed rule is **server wins; the client check is only
  a latency optimization and may warn but should never be the thing that
  enforces a block.** Confirm this is the intended model.
- **Escalation scope & decay.** Per thread, or per user across threads? Does the
  counter ever reset (e.g. after good behavior, or a time window)?
- **Severity → level mapping.** The contract returns a numeric `severity`; define
  the thresholds that map it to warn vs. block.
- **Alert log consumption.** Who reads `flag_id` events, and does a block notify
  the recipient, the sender, both, or neither?
- **Appeals / false positives.** Is there a path for a wrongly-blocked message?

---

## Files

- `Final/assets/js/gopher-message-guard.js` — the shared module (prototype
  layer). Ships publicly (no underscore in the path).
- `docs/handoff/messaging-guard-demo.html` — standalone harness to see the
  escalation work. Lives outside `Final/` so it never ships as a page; its
  `<script src>` points at the canonical module (`../../Final/assets/js/…`).
- This doc — the contract, the boundary, and the open questions.

### Should the prototypes ship publicly? — no; here's how they're excluded

**Decision: keep the prototypes out of the published site** (treat them like the
demo harness — internal simulators, not shipped pages). Nothing on the live site
links to them, and they are interactive *simulators*, not product pages.

**Mechanism used: location, not Jekyll.** They were moved from `Final/_prototypes/`
to **repo-root `_prototypes/`** — OUTSIDE the published `Final/` tree. This repo's
real "don't ship" boundary is `Final/` (CLAUDE.md: `Final/` is the site root; the
demo stays unshipped by living in `docs/`, not `Final/`). Putting the prototypes
outside `Final/` excludes them the same way — independent of any build step.

Why not rely on the underscore rule: there is **no `.nojekyll`, no `_config.yml`,
and no deploy workflow** in the repo, so whether `_`-folders are dropped depends
entirely on whether Pages runs Jekyll — unknowable from the repo, and even with
Jekyll on, a *nested* `Final/_prototypes/` is not reliably excluded. Location is
the only mechanism that holds whether Jekyll is on or off.

Verified (local static server rooted at the repo): `Final/_prototypes/*` → **404**
(gone from the published tree), the shipped module `Final/assets/js/…` → **200**,
and the prototypes resolve only at repo-root `_prototypes/`.

Caveat: this assumes `Final/` is the published root (per CLAUDE.md). If Pages is
ever pointed at the **repo root** instead, `_prototypes/` would re-enter the
served path — in that case keep them untracked or exclude via the deploy config.
