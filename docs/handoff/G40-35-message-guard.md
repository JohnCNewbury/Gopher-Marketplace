# G40-35 — In-app message guard

> **STATUS 2026-08-12 — PHASE 1 LIVE ON PRODUCTION.** Detection and flagging only; no
> user-visible change. Phase 2 (the warning the user can act on) needs a mobile release.
> **Not Done** — the ticket stays open until phase 2 ships.

**Jira:** G40-35 (Bug, Highest) · **Sprint** John "Low Risk"
**Merged:** MR !278 → `production` `41070d39` · **Deployed:** EB `Gopher-Production`,
version `code-pipeline-…-41070d390bcebad4…`

---

## What is live

Every user-authored in-app message is scored against the moderation corpus. Crossing the
threshold writes a row to `orders_faqs_flags`. Nothing blocks, alters, delays, or tells the
user anything.

**Verified on the running instance** (SSM, `i-040fbf8f2cb3d00be`, not from the pipeline):

```
GUARD=present   CORPUS=present   CORPUS_BYTES=57852
LIVE_SCORE=60  FLAGGED=true  CATS=payment
WIRED=3
```

That last check matters more than it looks. The guard **fails open by design**, so an
unreadable corpus in the EB environment would make it go *quiet*, not error — and a quiet
guard is indistinguishable from a clean week of traffic. Scoring was therefore exercised on
the instance itself.

## Why phase 1 is silent, deliberately

The threshold's 82% precision is measured against the owner's *labels*, not live traffic.
Running silent banks a real-world false-positive rate before any customer is told their
message looks like misconduct. It also happens to be forced — see "no way to tell the user"
below — but the sequencing is right on its own merits.

## Threshold 60 — the evidence

Owner-approved 2026-08-12, against **1,112 labelled pre-acceptance messages**:

| bucket | needs action | leave alone | % needing action |
|---|---|---|---|
| **scores >= 60** | 293 | 63 | **82%** |
| contact ONLY (50) | 201 | 360 | 36% |
| social_contact ONLY (45) | 10 | 19 | 34% |
| other, < 60 | 36 | 130 | 22% |

**The owner's two worked examples do not flag, and should not.** His stated rule was
*"submitted would flag $40 … and 'call me' would flag"*. But:

- `contact` scores **50** — below the bar. Dropping to 50 to catch bare "call me" adds 561
  messages of which **he himself marked 64% "leave alone"**. Precision falls to ~55%.
- `money_amounts` is **combo-only** by corpus design and never scores alone at any threshold.
  `"venmo me $40"` scores 100 and blocks; a bare `$40` does not.

The reason is visible in the messages themselves — same content, opposite intent:

> **needs action:** *"Not sure if exchanging phone numbers is allowed? Nine one nine two five five four…"*
> **leave alone:** *"No that's my number so I can text you the picture since I can't access the camera"*

No keyword can separate those. **The labels are better evidence than the rule, and they
disagree with it.** Changing the money behaviour is a *corpus* decision, not a threshold one.

## Parity with HQ is proven, and is the load-bearing property

Scoring is a **port** of the HQ Dashboard's `regen_reports.py` (`do_inapp`/`scan`) — the
scorer behind the owner's review queue. If the two disagreed, the guard would flag messages
the queue never shows.

**Verified identical on all 1,166 labelled messages** — same score, same category set, zero
mismatches — and **re-verified after the `no-continue` refactor**, which is exactly the kind
of change that silently alters loop semantics.

⚠️ **Change them in lockstep or not at all.**

## ⚠️ HQ does NOT show these flags

Checked, not assumed: **the Dashboard never references `orders_faqs_flags`.** Its in-app view
is built by `do_inapp()` from `In-app messages.csv` — a manual export — which it scores itself
at regen time.

| surface | shows backend flags? | why |
|---|---|---|
| **Legacy admin panel** | **yes** | `controllers/admin/orders.js:350` reads the table, attaches each flag to the matching gopher, returns it as `inapp_gophers` |
| **HQ Dashboard** | **no** | scores its own CSV snapshot; never reads the table |

So the flags land in the surface being *retired*, not the one in use. They cannot contradict
each other — parity guarantees identical verdicts — but they are independent pipelines with
different freshness: backend is live, HQ is a snapshot gated on someone exporting a CSV.

**Also HQ-side, and not wired:** the escalation ladder (#1 gentle → #4 auto-deactivate) and
the 1,187 decisions in `alert_learnings.json`. A backend flag means *"detected"* — not
*"warned"*, and not *"second strike"*.

**Recommended fix (owner deferred 2026-08-12, "handle dashboard later"):** point HQ at
`orders_faqs_flags` instead of re-scoring a CSV. Removes the manual export, makes the view
live, and makes one flag one row — so calibration decisions attach to the object the backend
created. The scorers already agree; this is plumbing.

## Where it is wired — and the premise correction

The original premise check named `faq.js:41`, `:112` and `location_update.js:35`. **Those are
the REST fallbacks.** The app sends over **websocket**; a controller-only guard would have
missed nearly every real message.

| path | moderated | why |
|---|---|---|
| `create_faq_socket` (`controllers/order/faq.js:87`) | yes | **primary** — both socket callers (`socket_config.js:260`, `shared/Socket.js:120`) funnel through it |
| `create_faq` (REST) | yes | fallback when the socket is down |
| `location_update.js` `create_faq_socket1` | **no** | system-generated location messages, not user text |

Both sites pass the order they already hold, so the guard adds **no extra query**.

## Connected-order rule (owner, 2026-07-19)

Recorded in the corpus under `context_rules`, and independently re-derived this session from
the 54 post-acceptance labels before the ruling was found:

- **Contact-sharing is ALLOWED once a worker has accepted** — post-acceptance coordination is
  legitimate. Same content on an unaccepted order is circumvention.
- **Conduct and payment circumvention are UNCONDITIONAL** — never connection-gated.

### ⚠️ OPEN CONFLICT — money amounts post-acceptance

| source | says |
|---|---|
| corpus `context_rules`, owner **2026-07-19** | bare dollar asks are **unconditional** — flag even after acceptance |
| owner, **2026-08-12** | *"IF accepted, call me and $40 totally fine"* |

**Moot for phase 1** — pre-acceptance both readings behave identically. **Must be settled
before phase 2** turns on post-acceptance handling.

## Configuration — no store release required

| knob | default | effect |
|---|---|---|
| `MESSAGE_GUARD` | `on` | `off` disables the feature entirely, no deploy |
| `MESSAGE_GUARD_THRESHOLD` | `60` | moves the bar |
| `helpers/moderation_rules.json` | — | the corpus itself; generated data |

This is the point of the design: retuning 3,077 keywords never waits on Apple or Google.
The corpus is in `.prettierignore` because it is generated by `json.dump` (minified) —
formatting it would fail CI again on the next regeneration.

## Fail-open

A DB error, an unreadable corpus, or a bad argument logs and returns `null`; the send path is
untouched. Moderation is never allowed to cost a user their message.

## Verification

- **21 assertions**, proven to fail against **three deliberate breaks** (gating removed, flag
  write removed, error swallowed as success). A green test that cannot fail proves nothing.
- Full suite: 66 files / 569 assertions.
- `eslint . --max-warnings=0` + `prettier . --check` — run **verbatim as CI runs them**, after
  an earlier pass checked four files by name and missed the corpus. CI caught that; the fix is
  commit `73c1a65c`.

## Phase 2 — what is left

**There is currently no way for the server to tell the user anything about a message they
just sent.** Confirmed in the app: the send is optimistic (`InAppMessage.js:390-403` appends
locally, then emits), the socket relays *before* persisting, and the only REST error handler
is `console.error`.

Phase 2 therefore needs an app release:

1. On send, the app asks the server to check the text.
2. If flagged: warn, offering **Edit** and **Send anyway** — **never a hard block.** At 84%
   precision roughly 1 in 6 flags is wrong; refusing those messages is a worse product than
   the leak it prevents.
3. Confirmed sends carry an acknowledgement flag, so *"user reconsidered"* is distinguishable
   from *"user proceeded"* — which is free calibration data for the post-acceptance question
   the 54-label sample could not answer.

## Follow-ups raised, not done

1. **The camera finding — worth its own ticket.** The top "leave alone" contact examples say
   the same thing: *"I don't see camera here on app even updating it"*, *"I can't access the
   camera"*, *"Text me I can send pictures of receipt"*. **People are trading phone numbers
   because in-app photo sending is failing them.** A chunk of contact-sharing is a workaround
   for a broken feature, not circumvention — and no moderation will ever fix it.
2. **Admin wording.** `controllers/admin/orders.js:350` aliases `from_user_id` as **`flag_by`**,
   written for a manual report feature. For an auto-flag that is the message's *author*. The
   flag description says so explicitly rather than changing admin behaviour.
3. **Rule 12 front-end sync** belongs with phase 2 — phase 1 changes no user-visible contract.
