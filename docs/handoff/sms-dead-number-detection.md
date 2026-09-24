# Dead-number detection — design record

**Status 2026-08-24: BOTH HALVES BUILT, NEITHER MERGED, NEITHER PUSHED.**
Branch `gopher-backend-api:feat/sms-status-callback`, stacked on
`feat/deactivations-feed-ingest`. Commits `491767a6` (feed) and `a04299fb` (callbacks).

This is the doc, not the ticket. The rules below outlive both branches.

---

## The problem

US carriers deactivate and **recycle** phone numbers. We had no way to know which of ours
were dead, so every campaign went to the full list. **The wasted SMS spend is the lesser
half** — a recycled number belongs to a stranger, and we were still sending them account
notifications and OTP codes.

## Two halves, one column

| | Proactive | Retrospective |
|---|---|---|
| File | `lib/deactivations_ingest.js` | `lib/sms_status.js` |
| Source | Twilio's per-day carrier deactivations feed | status callbacks on messages we sent |
| Evidence | carrier-published fact | our own send failed, with a reason code |
| `sms_state_sender` | `twilio_deactivations` | `twilio_status_cb` |
| Trigger | daily cron | Twilio POSTs `/api/v1/sms_status` |

Both write `users_roles.sms_state`. **They must stay tellable apart** — carrier-published
fact and one failed send are very different grades of evidence, and a future suppression
rule will need to weigh them differently. `test/sms-state-columns.test.js` case 9 fails the
build if two writers ever share a sender.

## ⛔ RECORD, DON'T ACT — the owner's standing ruling

Mark `sms_state`. **Never** suppress, reroute or filter a send on the strength of it.
Suppression is a **separate decision that has not been made.**

Enforced in code, not just in prose. `test/sms-state-columns.test.js` case 6:

- a **writer** SETS `sms_state` → allowed, and must be named in `SMS_STATE_WRITERS`
- a **consumer** FILTERS on it (it appears inside a `where`) → **build fails**

Adding a file to `SMS_STATE_WRITERS` is the deliberate, visible-in-review decision the
case exists to force. **Do not add a file to make a build go green.**

> **The check reads CODE, not comments** (amended 2026-08-24). It had fired on
> `lib/sendSms.js` and `lib/phone_forms.js`, which only *explain* the feature in prose.
> Allowlisting them was the tempting fix and the wrong one: they are not writers, and
> listing them would have blunted the guard permanently. Documenting a ruling must never
> be what trips it.

## ⛔ Not every failure is a dead number

This workstream already made this mistake once (`21610` read as a new opt-out when it is a
*pre-existing* one). Only codes that speak to **the handset** mark the number:

| Code | Meaning | Verdict |
|---|---|---|
| `30005` | unknown destination handset | `undeliverable` — **strong** |
| `30006` | landline / unreachable carrier | `undeliverable` — **strong** |
| `30003` | unreachable destination handset | `undeliverable` — **WEAK** |
| `21610` | Twilio refused: prior opt-out | `blocked` — *not* a dead number |
| `30007` | carrier violation / filtered | **nothing** — content problem, live handset |
| `30008` | unknown error | **nothing** — by definition not evidence |

**`30003` is weak on purpose and the reason string says so.** A powered-off or
out-of-coverage phone returns it too, so one `30003` proves nothing permanent.

**`21610` never touches `sub_ooa`.** An opt-out is a person's choice, not a disconnected
handset. It gets its own state so the signal stays visible; the existing flag is left alone
(guard case 5 pins that).

## ⚠️ A mark is evidence at a point in time, never a standing verdict

**Nothing writes on success and nothing clears a mark.** `delivered` is ~97% of traffic and
a row per delivery would add thousands of pointless UPDATEs a day to a database also serving
live orders.

**So a phone that was off on Tuesday keeps its `30003` mark after it comes back on.**
Whoever makes the suppression decision **must treat `sms_state_at` as part of the
condition** — "marked, *and recently*" — rather than reading the presence of a mark as
current truth.

Self-healing was considered and rejected: the only safe way to clear is to check *who* set
the mark, and reading `sms_state_sender` in a `where` is exactly what the ruling forbids.

## What merging changes on the live path

**`statusCallback` attaches to EVERY outbound SMS, OTPs included** — roughly 3 POSTs back
per message. Twilio does not charge for them, and the handler writes nothing on success, so
added DB load is confined to genuine failures. State this at merge; it is a behaviour change
on a live path, not an internal detail.

**It degrades to today's exact behaviour when no `https` base URL is configured.** Twilio
rejects a malformed `statusCallback` at `create()` time, which would fail **the send
itself** — so the wrong failure mode here is a broken OTP, not a missing callback.

**No new credential, no restart.** The callback is *inbound*; what authenticates it is the
`X-Twilio-Signature` header, validated by `middleware/twilioWebhook.js` (already live on
production) against the same `TWILIO_AUTH_TOKEN` `lib/sendSms.js` already uses. The
deactivations feed likewise uses the existing account credentials, and Twilio documents
those requests as free. **An earlier spec claimed a read-only key plus a planned production
restart were needed — that premise was wrong and is retired.**

## Traps worth keeping

1. **The two ends of the round trip are derived in two different files.** The URL we hand
   Twilio (`lib/sendSms.js`) and the URL the signature is verified against
   (`middleware/twilioWebhook.js`) must be byte-identical. Disagree by a slash and **every
   callback 403s, with silence as the only symptom.** A test asserts they match.
2. **Always answer 204, including on our own failure.** A non-2xx makes Twilio retry with
   backoff, turning one bad callback into a repeating one — amplifying the exact load this
   design keeps small.
3. **`sms_state_sender` is `varchar(20)`.** `twilio_deactivations` is *exactly* 20, so there
   is no room for a suffix; the feed date lives in `_reason` (`varchar(255)`). Guard case 8
   length-checks every writer's literal and rejects a template-built sender, because a
   template cannot be checked.
4. **Phone shapes.** `users.telephone` is free-form and holds bare ten digits, a leading 1,
   and `+1`. `lib/phone_forms.js` expands a number into all of them and matches exactly — a
   regexp scan would ignore the unique index. **Extracted so both writers cannot drift**;
   two private copies would fail silently and asymmetrically.
5. **The new `logger.error` is registered `acknowledgedUnalarmed`, not alarmed** — nothing
   acts on `sms_state`, so a missed mark costs nothing today. ⚠️ **Promote it to a real
   CloudWatch alarm the day suppression is switched on**, when a silently-broken recorder
   stops being a lost data point and starts producing wrong suppression decisions.

## Verification

131 suites / 1163 assertions pass; ESLint and Prettier clean (the two pre-existing
exceptions — `shared/sentry.js` unresolved `@sentry/node`, and generated `logs/*.json` —
are untouched by this work and were confirmed present beforehand).

**Both suites were mutation-proven before being trusted** — a green test that cannot fail
proves nothing. 8 mutations of the policy (over-marking `30007`; conflating `21610`;
writing on `delivered`; scoping the update to one role; relabelling weak `30003` as strong;
answering non-2xx; drifting the callback path; accepting an `http` base) and 5 of the guard
(unlisted consumer; filtering in a `where`; colliding senders; dropping a column; an
over-long sender). **All 13 failed as intended, and the tree returns to green.**

## Still open

- **The branches are unpushed.** A push was attempted and declined. `git push origin
  feat/sms-status-callback` preserves both commits — it carries the ingest as an ancestor —
  and **a branch push deploys nothing**; only an MR merge to `production` auto-deploys.
- **Merge shape:** the two are stacked and both amend `test/sms-state-columns.test.js`, so
  the ingest lands first or they go as **one MR**. Separate MRs off `production` conflict.
- **Suppression itself is undecided.** Which reasons suppress which channel is the next
  decision, and it needs the owner. Everything above is deliberately inert until then.
- **Backfill** of historical `21610`/`300xx` from the Messages **REST API** — not the
  console export, which caps at ~528 rows.
