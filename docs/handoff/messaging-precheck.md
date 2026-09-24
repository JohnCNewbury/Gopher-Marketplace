# In-App Messaging Guard — Spec & Handoff

_Dated 2026-06-26; product decisions locked 2026-07-02 (G40-35). Lives in
`docs/handoff/` alongside the other handoff docs. This file is the durable
source of truth for the messaging guard; it replaces scattered chat threads.
Any session can pick the work up by reading this. Ticket-specific red-carpet
handoff: `docs/handoff/G40-35-messaging-violations.md`._

> **2026-07-02 update (G40-35):** scope expanded to **all in-app communication
> violations** — the off-platform families **plus a `conduct` family** for
> foul/abusive language. A bare **`$`/dollar amount now flags** (CashApp
> precursor); **physical addresses do not** (the ticket's "Address" meant
> **email**). Escalation is **per user**; admin email + account flag fire at
> **level ≥ 2**. All previously-open developer questions are answered below.

> **2026-08-18 update (owner) — the mobile flag pop-up was SCRAPPED, not shipped.**
> The correct implementation lands **at the launch of Connect, Request web, and the reskins**.
> Until then the native apps have **no in-app moderation UI at all**, deliberately.
>
> **What was removed** (merged to `production` on both mobile repos that morning, **never in a
> store build**): a modal titled *"Keep it in the app"* with a single *"Got it"* button, fired
> by a `messageFlagged` socket event that the backend emits to **both parties**, **after** the
> message row is written and delivered. Reverted by
> `gopher-mobile-gopher-capacitorjs!237` and `gopher-mobile-requester-capacitorjs!226`.
>
> **The owner first ruled "leave it", then reconsidered — and the second call was right.**
> The asymmetry that decided it: while it has never reached a user, removing it costs nothing;
> once a build ships it, removal becomes a user-visible regression needing its own release.
> Scrapping was also cheaper than either alternative — the whole feature was 1 file per app,
> 1 listener, 2 cleanups, 2 state refs, and nothing else in either codebase read it.
>
> **Why it is wrong, recorded so nobody re-derives it:** this doc's approved copy says
> *"You can edit your message to avoid it being sent as-is, which is currently flagged."*
> On that surface there is no edit, the message is already sent, and "currently flagged" is
> already final — and because the backend notifies both parties, the RECIPIENT would read
> "you can edit your message" about a message they did not write. **The approved copy cannot
> be pasted into that modal.** Two MRs that tried to polish the superseded wording
> (`gopher-mobile-gopher-capacitorjs!235`, `gopher-mobile-requester-capacitorjs!225`) were
> **closed** for this reason, not merged and not retargeted.
>
> **Root cause:** the two halves were built to different models — web/prototypes run the
> client guard **pre-send** (decision point: Edit / Send as-is, recipient gets a bubble note),
> while the mobile client was built against the backend's **post-write** scoring (notice after
> delivery, modal to both parties). Same feature, two products.
>
> **What is correct and stays:** the backend flag row and the `admin@` email match this spec.
> Only the notification UX diverges.
>
> **What the correct implementation needs when it is built:** the pre-send guard in both apps,
> the Edit / Send-as-is pair, and the recipient note rendered from a **persisted `flagged`
> field on the message row** — which this doc already specifies ("the send endpoint persists
> `flagged` on the message row") and which has never been built. `orders_faqs_flags` keys a
> flag to an ORDER (`order_id`/`from_user_id`/`to_user_id`/`description`), not to a message,
> so a per-message stamp needs that schema change first.
>
> **Also parked (owner, same day):** storing the attempted message TEXT in the flag log.
> Today's row records the verdict only — score, threshold, categories, combination, action,
> order state — and **no content**, which is a deliberate privacy position. The owner asked
> to hold it and will revisit. Logging abandoned attempts (the "sneaky editor" case) requires
> both that decision and a pre-send report from the client.

> **2026-07-19 update (owner):** the **conduct** family's warn levels 1–2 now
> use the **same Edit message / Send as-is pair** as the off-platform alert —
> the old single-button acknowledge ("Got It" → send unflagged) is retired.
> A conduct **Send as-is delivers FLAGGED**, and the recipient sees the same
> terms-violation note under the bubble as an off-platform flag (no new
> format). Level 3 remains a hard block.

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

## Alert model — REVISED (John, 2026-07-16)

> Supersedes the original 3-level escalate-to-block ladder for the
> off-platform/transaction family. The CONDUCT family (below) keeps the ladder.

**Off-platform / transaction hits show ONE alert — "Keep Your Transaction
Protected" — in TWO variants keyed by CONNECTION STATE** (is this thread
attached to a request the two parties are already matched on?):

- **NOT connected** — copy explains the protection and that alerts relax once a
  customer and worker are connected (exchanging personal info may be part of
  the request). Exact copy: `COPY.offplatform.notConnected` in the module.
- **Connected** — same protection copy plus the false-flag apology: a real
  human reviews and removes flags that had the best intentions. Exact copy:
  `COPY.offplatform.connected`.

Buttons on both variants, plus a link:

- **Edit message** (green) — closes the alert, the message is HELD in the
  composer.
- **Send as-is** (blue with a reddish pulsing shadow; static red ring under
  `prefers-reduced-motion`) — the message DELIVERS, carrying `flagged: true`
  for the human-review queue. There is **no hard block** for this family —
  the flag is what escalates, not the UX.
- **In-App Messaging Terms** link below the buttons →
  `gopher-terms-of-service.html` (direct).

**The flag travels with the message (John, 2026-07-17).** When the sender
chooses **Send as-is**, the delivered message carries its `flagged` state and
the RECIPIENT sees a note with the bubble — small red line: *"⚑ This message
was flagged for a possible terms violation."* Reciprocally applicable (worker →
customer and customer → worker). The sender's own bubble shows no note (they
already saw the alert). Production: the send endpoint persists `flagged` on the
message row; every thread renderer shows the note on flagged incoming messages.

**Connected relaxation (evaluation change, not just copy — precise scope
re-confirmed by John 2026-07-19):** once a worker has **accepted** the
thread's job (assigned gopher, accepted offer, **accepted counter-offer**, in
progress, or delivered), the **`contact` category is skipped entirely** —
numbers, emails, contact ASKS, and **social handles** (added to the contact
family 2026-07-19) may be legitimate post-acceptance coordination ("text
760-905-xxxx when you arrive"). Payment and off-platform are ALWAYS checked
("still fee circumvention even on an accepted job"), and conduct is
UNCONDITIONAL ("bad language isn't allowed, period" — John). The server
precheck must take a `connected` input (client passes it today as
`guard(text, threadId, {connected})`) and mirror this. The Dashboard's
Message Review queue already implements the identical rule
(`context_rules.contact_on_connected_order` in `moderation_rules.json`,
`iaContactOnConnected` in `app_part4.js`) — note its acceptance evidence
includes accepted `Gopher_Offers` and `Counter_Offer` rows even when the
order row still reads pending; production must match that nuance.

**Requests for contact info count too (John, 2026-07-16: TOP red flag).**
"What is your number?" pre-connection is exactly the circumvention signal the
guard exists for — there is zero reason for a worker to ask for a customer's
number before being connected. The lexicon must catch ASKING ("your
number/cell/phone/email/digits", "give/send/drop your number", "can I
text/call you", "number to call/text/reach") with the same weight as SHARING
(an actual number/email, "call me", "my number"). Both lexicons carry this
now — `gopher-message-guard.js` PATTERNS.contact and the Dashboard's
`moderation_rules.json` contact category (plain-form seeds; obfuscation
expansions come from the ML xlsx regen). **Keep the two in parity** — this gap
existed because they drifted.

**Escalation & admin alerts (unchanged):** per user across all threads;
admin@ email + account flag fire at level ≥ 2 (`CONFIG.adminAlertAtLevel`);
level 1 stays a silent nudge. The level no longer changes the off-platform
UX — it drives the admin/flag pipeline.

**Conduct family (revised 2026-07-19):** foul/abusive/threatening language
keeps the 3-level ladder of copy — warn → warn → block at level 3
(`CONFIG.blockAtLevel`), respectful tone, **never relaxed by connection
state** — but warn levels 1–2 now present the same **Edit message** (green,
holds) / **Send as-is** (blue pulsing, delivers `flagged: true`) pair as the
off-platform alert, with the guidelines link underneath. A flagged conduct
message shows the recipient the standard terms-violation note. Only level 3
still refuses to deliver.

---

## Keyword / pattern categories (prototype list)

Grouped by `policy` so the modal and the future alert log can say *why* a message
tripped. Full list is in `gopher-message-guard.js` under `PATTERNS`; it's meant
to be grown by the dev.

- **payment** — Cash App, Venmo, Zelle, PayPal, Apple/Google Pay, wire, crypto,
  "pay you cash", "pay directly", "pay outside", **and a bare `$`/dollar amount**
  (`$50`, "50 bucks") — the CashApp precursor.
- **contact** — phone-number and **email**-address patterns, "call/text
  me/you", "my number", **and requests for contact info** — "your
  number/cell/phone/email/digits", "number to call/text/reach" (owner
  2026-07-16: asking pre-connection is a TOP red flag). (A physical/job-site
  address is **not** flagged.) **Skipped entirely once the parties are
  connected on a request.**
- **off_platform** — "outside Gopher", "off the app", "cancel and pay", "meet up
  and pay", "pay in person".
- **conduct** — foul / abusive / threatening language (own copy family). Starter
  list in the module; John curates.

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
age-restricted backstop's fail-safe style. Clean messages send unchanged; on
any warn the user chooses **Edit message** (held; text stays in the box) or
**Send as-is** (delivers flagged — `onAllow(res)` receives the verdict, and
the surface stores the flag so the recipient renderer shows the
terms-violation note); a conduct level-3 block holds the message outright.

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

## Product decisions — LOCKED (John, 2026-07-02; revised 2026-07-16)

These were the open developer questions; they are now answered. No product
decisions remain for the dev — only engineering implementation.

> **2026-07-16 revisions** (see "Alert model — REVISED" above for full detail):
> the off-platform family no longer hard-blocks — one two-variant alert
> (connected / not-connected) with **Edit message** / **Send as-is** (delivers
> flagged for human review) + an **In-App Messaging Terms** link; the `contact`
> category is **skipped once the parties are connected** on a request; and
> **requests** for contact info are flagged the same as sharing it. The
> "Severity → level mapping" bullet below still applies to the CONDUCT family
> and to the admin/flag pipeline, not to the off-platform pop-up UX.

- **Authority on disagreement.** **Server wins.** The client check is a latency
  optimization; it may warn but must never be the sole thing enforcing a block.
- **Escalation scope & decay.** **Per user, across all threads** (not per thread).
  A repeat offender cannot reset by opening a new conversation. No automatic
  time-decay at launch; admin can clear a flag manually (see appeals).
- **Foul/abusive language.** In scope — its own **`conduct`** policy family with
  respectful-tone copy, same escalation model. Starter word list is in the
  module; John curates/grows it.
- **`$` / dollar amounts.** **Flagged** (payment family) — the precursor to
  CashApp circumvention. Price is shown transparently in-app, so no legitimate
  need to type an amount in chat. **Physical/job-site addresses are NOT flagged.**
- **Admin alert timing.** Email **admin@gophergo.io** + **flag account** +
  **ActiveAdmin log** at **level ≥ 2** (`CONFIG.adminAlertAtLevel`). Level 1 is a
  silent educational nudge.
- **Both parties notified.** A trigger shows the pop-up to **both** the sender and
  the recipient (backend pushes it to the recipient; the prototype shows only the
  sender).
- **Severity → level mapping.** Engineering detail. Default: level 1/2 = `warn`,
  level 3+ = `block`; map the server's numeric `severity` onto that (a simple
  cumulative-per-user count reproduces the prototype).
- **Appeals / false positives.** No user-facing appeal at launch. Admin can clear
  an account flag / reverse a block from the ActiveAdmin review surface.

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
