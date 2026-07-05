# G40-263 → merged into G40-35 — In-App Communication Policy (phone + $ masking)

**Status:** G40-263 canceled as a duplicate; work tracked on **G40-35** ("Both Apps — In-App Messaging Guard: flag all communication violations"). This doc is the developer red-carpet for the **phone-number + dollar-amount** slice of that policy, rooted in the June-2026 GitLab exports.

**Why merged:** G40-263 (mask phone numbers + `$` amounts, flag the message) is a strict **subset** of G40-35's communication policy, which already enumerates the full rule set (foul language, phone numbers, emails, `$`/money, addresses, payment apps). The detection lexicon is already built in Gopher iQ. Keeping them separate would fork the moderation logic into two places — exactly what G40-70 warns against ("one moderation source of truth, not two").

---

## 1. What's already built (don't rebuild it)

**Detection lexicon** — `Documentation/Dashboard/moderation_rules.json` (Gopher iQ "Brain", 11 policies / ~3,613 phrases). The G40-263 concerns map to four existing rules:

| Rule name | Category | Action | Sev | Pattern |
|---|---|---|---|---|
| `PHONE_US_STANDARD` | contact | `block_or_review` | 50 | `(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}` |
| `PHONE_WORD_SEQUENCE` | contact | `review` | 50 | `\b(?:zero|oh|one|…|nine)(?:[\s-]+(?:…)){6,}\b` |
| `DOLLAR_AMOUNT_SYMBOL` | money_amounts | `review` | 35 | `\$[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?` |
| `DOLLAR_AMOUNT_TEXT` | money_amounts | `review` | 35 | `\b(?:[0-9]+|one|…|hundred)\s*(?:dollars?|bucks|usd)\b` |

This resolves the "how wide is $ detection" question: the ruleset already covers **both** `$50` (symbol) and "50 bucks/dollars" (text). Use these patterns — do not hand-roll new regex.

**Moderation triage UI** — the HQ Dashboard **Message Alerts** view already lets an admin act on a flagged message (Safe / Ignore / Warning / Deactivate), persisting `messageId → {action, timestamp}` in `alert_learnings.json` (keyed by the message's DB id). Backend seam documented at `app_part4.js action(id, act)` (`BACKEND SEAM` marker). See `Documentation/Dashboard/GOPHER_HQ_STATE_addendum_moderation.md`.

**So the missing work is purely backend enforcement + the `flagged` field + surfacing it — not detection or admin UI.**

---

## 2. Root cause (verified in the June-2026 export)

The regression reproduces: **neither the backend nor the mobile apps mask message content, and there is no `precheck` call on the send path.** Git pickaxe across all 3,250 backend commits found no `content.replace` / `#` masking / dollar detection ever server-side — the "previous enhancement" that regressed was the messaging migration to the socket/API path (`8c1c27ce faq messaging via API`), which carries `content` verbatim.

**User-to-user chat = `orders_faqs`** (`from`, `to`, `content`, `order_id`, `content_type`). Three near-duplicate insert paths, none of which filter:

| Entry point | Function | File |
|---|---|---|
| Socket `newMessage` | `create_faq_socket` | `controllers/order/faq.js:87` |
| `POST /faq/message_send` | `create_faq_socket1` | `controllers/order/location_update.js:10` |
| `PUT /faq` (web, gopher→requester) | `create_faq` | `controllers/order/faq.js:13` |

**Landmine:** both socket paths **emit the raw content to the recipient *before* persisting** — `socket/socket_config.js:117` and `controllers/order/location_update.js:163`. Masking must therefore run **before the emit**, not just before the DB write, or the recipient still receives the raw string.

**No `flagged` column** on `orders_faqs` (`models/orders_faqs.model.js`). Note: the existing `orders_faqs_flags` table (`report_faq.js`, `26d35b72`) is a **manual "report this message"** feature (from/to/description + admin email) — **not** the auto-mask flag; do not conflate.

**Admin report** (`controllers/admin/messages.js` → `get_messages`, `getCSV`, `get_messages_by_id`) selects from `orders_faqs` with no `flagged` awareness.

---

## 3. The fix

### 3a. One server-side moderation seam — `POST /messages/precheck`
Per G40-70, stand up `POST /messages/precheck` fed by `moderation_rules.json`, returning `{ maskedContent, flagged, matches:[{rule, category, action, severity}] }`. Call it from a single shared helper so all three insert paths + both emit sites go through it. Server-side is mandatory (ticket: "not just client-side, to prevent bypass").

**Two-phase use of the same seam (supports the 3c warn-and-correct flow):**
1. **Pre-send (client interrupt):** on the send tap, the client calls `precheck`; if `matches` is non-empty it renders the correction pop-up (the `category` per match drives the copy — "looks like a phone number / dollar amount / …"). Edit re-calls `precheck`; a clean result clears the block.
2. **On Ignore/Send-anyway (server enforce):** the actual insert paths call the same helper and **trust the server result**, not the client — so a bypassed client still gets masked + flagged. This is why detection can't live only in the pop-up.

### 3b. Masking (per G40-263 examples, 1:1)
For each match, replace the matched characters with `#`, preserving surrounding text and visual separators shown in the spec examples:
- `Call me at 555-867-5309` → `Call me at ###-###-####` (digits→`#`, dashes kept)
- `I'll do it for $50` → `I'll do it for ###` (`$` + digits→`#`)

Apply the masked string to **both** the persisted `orders_faqs.content` **and** the socket `recieveMessage` payload.

### 3c. Enforcement = **warn-and-correct** (John's ruling, 2026-07-05 — supersedes both tickets' partial wording)
One unified behavior across **every** rule (foul language, phone, `$`, email, address, payment apps). On a send attempt, the sender's client calls `precheck`; **if any rule matches, the send is interrupted** with a correction pop-up (build per **G40-308 Pop-up Modal Standards**) offering three paths:

| User choice | Outcome |
|---|---|
| **Edit** → fix the message → re-check passes | **Violation avoided.** Message sends clean. Nothing flagged, nothing logged. |
| **Abort / Cancel** | **Violation avoided.** Nothing sent, nothing flagged. |
| **Ignore / Send anyway** | **Violation applies.** Content is masked (`#`, per 3b), `flagged=true` persisted, and severity-based enforcement fires (below). Masked message is delivered. |

So G40-263's "still sent, masked" is preserved **only on the Ignore path** — the user first gets a chance to self-correct. Detection stays server-side (anti-bypass); the client turns a `precheck` violation response into the pop-up.

**Severity governs the Ignore-path consequences only** (via the rule's `action`/`severity`):
- `review` (e.g. `$` amounts, sev 35): mask + `flagged` + surface in HQ Message Alerts.
- `block_or_review` (e.g. phone, sev 50): all of the above **plus** flag the **account**, email `admin@gophergo.io`, log in HQ.

**UX to build (if not already present):** the correction pop-up with Edit / Abort / Send-anyway states, wired to a pre-send `precheck` round-trip. Treat as a new modal under G40-308; needs a design pass before dev. This is the piece most likely missing from the current messaging UX.

### 3d. `flagged` field (permanent)
Add `flagged BOOLEAN NOT NULL DEFAULT false` to `orders_faqs` (model + migration); set `true` whenever precheck matches. Chat is **append-only** — an "edit/resend" is a new row — so "permanent across edits/resends" (Scenario 5) is satisfied inherently; the original flagged row is never mutated.

### 3e. Surface Flagged in the admin report → **HQ Dashboard** (John's call)
- Backend: add `f.flagged` to the three `admin/messages.js` selects + a `flagged` filter param + the CSV column.
- Primary surface = **Gopher HQ Dashboard** Message Alerts / Messages report (the go-forward Admin-Panel replacement), filterable by Flagged = Yes to catch serial violators (G40-35 Scenario 6). This rides on the G40-70 live-DB wiring.

---

## 4. QA
**Warn-and-correct flow (3c):** violation → pop-up appears before send; **Edit** to a clean message → sends clean, nothing flagged; **Edit** still-violating → pop-up re-appears; **Abort** → nothing sent, nothing flagged; **Send-anyway** → masked + flagged, delivered. Bypass the client (hit the socket/API directly with a raw violating string) → server still masks + flags (proves server-side enforcement).
**Masking (from G40-263):** phone in multiple formats (dashes/spaces/parens) → masked 1:1; `$50` / `$1,000` / `$9.99` and "50 bucks" → masked; both in one message → both masked independently; clean message → untouched, not flagged. Verify masking happens **before** delivery (check the socket `recieveMessage` payload, not just the DB row).
**Enforcement escalation:** phone (block_or_review) on Send-anyway → account flagged + `admin@` email + HQ log; `$` (review) on Send-anyway → flag + HQ surface only, no account flag.
**Persistence:** edit/resend of a previously-sent flagged message → original flagged row unchanged (append-only). HQ report shows + filters Flagged = Yes. iOS + Android, both apps.

---

## 5. Files touched (backend)
- `helpers/` — new `maskMessageContent` helper + `moderation_rules.json` loader
- new `POST /messages/precheck` (route + controller)
- `controllers/order/faq.js` (`create_faq`, `create_faq_socket`)
- `controllers/order/location_update.js` (`create_faq_socket1`, `send_message` emit)
- `socket/socket_config.js` (`newMessage` emit)
- `models/orders_faqs.model.js` + migration (`flagged`)
- `controllers/admin/messages.js` (report column + filter + CSV)
- HQ Dashboard: Message Alerts/report already built — surface `flagged` when wired to live DB (G40-70)

**Files touched (mobile, both apps — the warn-and-correct UX):**
- New correction pop-up modal (Edit / Abort / Send-anyway) per **G40-308** — needs a design pass before dev
- Message-send handler: intercept the send tap → call `precheck` → render pop-up on matches → only proceed to the existing send on Edit-clean or Send-anyway
