# Production feature flags — what is switched on, what it gates, how to flip it

> **Written 2026-09-06, because the information existed and still could not be found.**
>
> `GOPHER_RELEASE_ENABLED` was mentioned in **six** places — three session-handoff docs, the
> session log, and two memories — and none of them answered the question actually being asked:
> *"how do I turn the repost flow on so I can test it?"* Every mention was buried in a handoff
> dated to a specific day, findable only by someone who already knew the flag's name.
>
> **Discoverable by name, undiscoverable by question.** That is the gap this file closes.
>
> ⚠️ **Values below were read off `Gopher-Production` on 2026-09-06 and will drift.** Re-read
> before trusting any of them — the command is at the bottom. The *descriptions* are durable; the
> *values* are a snapshot.

## How a flip works

These are **Elastic Beanstalk environment variables** on the `Gopher-Production` environment. Set
one in the EB console (Configuration → Software → Environment properties) and the environment
restarts with the new value. **No deploy, no code change, no store release.**

⚠️ **A change here restarts the environment.** In-flight requests are dropped and the instance is
replaced. It is fast, but it is not free — do not flip during a demo or a live incident.

⚠️ **`aws sts get-caller-identity` first, always.** An expired session makes
`describe-configuration-settings` return **empty rather than an error**, which reads as "the
variable is unset." That has already produced one wrong answer on this project
(`aws-cli-session-expiry-reads-as-zero-results`).

---

## The flags

### `GOPHER_RELEASE_ENABLED` — currently **`true`** (LIVE since 2026-09-07)

> **Superseded 2026-09-08 (G40-304).** Everything below this box described the flag while it was
> held `false`; it is kept as the record of *why* it was held. **Current state, read off
> `Gopher-Production` on 2026-09-08:** `true`. The owner flipped it on 2026-09-07 once every
> recovery-sheet commit was verified present in the 3.9.2 store builds (`release/android-854`,
> `release/ios-853`) — the precondition the code comment in `controllers/order/cancel.js` names.
> The "payments seam" the paragraph below sends you to fix under G40-304 was fixed on 2026-09-02
> (`43eee125`, `charge.confirm()` skips an intent already in `requires_capture`) and proven on real
> Stripe on 2026-09-06 (order 65229: same PaymentIntent across release and re-accept, zero
> card-flag events). **G40-304 is the admin-repost endpoint and the doc sweep, not a payments
> fix.** Rollback is still one variable, but orders released in the meantime are not un-released.
> ⚠️ Only the exact lowercase string `true` enables it.

**Gates:** the **G40-9 auto-repost / release flow**. With it `true`, a Gopher cancelling an active
request offers the requester a recovery-and-repost path. With it `false`, the requester is offered
**nothing** — the order simply cancels.

**This is the flag behind "flipping AWS" during testing.** Flip it `true` and the repost feature
appears; flip it back and you get today's behaviour. Confirmed live on order **65228**, 2026-09-06:
the gopher cancelled, the order went `cancelled` / `refunded` cleanly, and no repost option was
ever presented — because the flag is off.

⛔ **DO NOT turn this on casually.** Owner decision, 2026-09-02. A released order sits in `pending`
while its Stripe intent is still `requires_capture`. Every downstream path assumes `pending` means
*no authorisation yet*, so `charge.confirm()` on accept fails, the catch treats it as a declined
card, sets `REQUIRE_PAYMENT_METHOD` and a hard-coded *"User's bank denied transaction"*, deletes
counter offers and bids, and **flags the requester's card bad**. Observed on order 65073.

**To test the repost flow** *(historical — see the box above; the seam is fixed and the flag is on)* you
must either fix the payments seam first (**G40-304**) or flip it on **under supervision**, run the
test, and flip it straight back. It is an owner decision every time.
Call sites: `controllers/order/cancel.js:127` and three others.

### `TRUSTSHIELD_MIN_AGE` — currently **`21`**

Gates the TrustShield identity requirement. The rule fires when the request is age-restricted, the
requester is not `trust_shield_verified`, **and** their age is below this threshold. Setting it to
**21** makes the gate unreachable, which is the intended post-cliff state (**G40-350 / G40-410**).

⛔ **`21`, never `0`** — `min_age()` treats ≤ 0 as invalid and falls back to **30**, silently
re-imposing the gate.

⚠️ **It cannot rescue a slipped store release.** The shipped `3.9.1` client gates on its **own
hardcoded threshold**, so this only stops the *new* client's un-gated flow hitting a 403 at submit.
It is a component of the release, not a contingency.

### `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` — currently **`false`**

⛔ **Must stay `false`.** `true` combined with a low `TRUSTSHIELD_MIN_AGE` is the exact
configuration that caused the **four-day outage on 6 August**.

### `BROADCAST_CADENCE_V2` — currently **`true`**

Gates the **G40-44** broadcast-cadence rewrite — how a new request is fanned out across the MY
Gophers → Pros → rated → everyone waves.

⚠️ **This contradicts what was written down.** The project memory records it as *"behind
`BROADCAST_CADENCE_V2`, default OFF."* It is **on** in production as of 2026-09-06. Whoever reasons
about broadcast behaviour from that memory will reason about the wrong code path. Confirm which
classifier is live before debugging any audience question — and see
[`g40-44-is-not-a-safe-reference`] for why G40-44's own ticket is not a trustworthy source.

### `START_CRONS` — currently **`true`**

Master switch for the cron runner (`middleware/crons.js:1433`). Off means **no** scheduled work at
all: no inactivity nudges, no payment re-authorisation, no expiry warnings, no payout sweeps.
Healthy production logs one `CRON TICK completed in NNNms (22 tasks)` per minute — that line is the
cheapest proof the whole scheduled layer is alive.

### `NEED_ASAP_NUDGE` · `NEED_ASAP_NUDGE_MINUTES` · `NEED_ASAP_NUDGE_MAX` — all **UNSET**

The **G40-69** Need-ASAP inactivity nudge. Unset means defaults: **enabled**, every **10** minutes,
maximum **6** nudges. The kill switch defaults ON deliberately, so that replacing the old
60-minute alert could not silently leave requests with no nudge at all.

**First nudge is SMS + push; every one after is push only** — cost is the design constraint, so a
request that is never started costs exactly one SMS however long it sits.

⚠️ **A single message from the gopher suppresses it permanently** — settled behaviour, owner
confirmed 2026-09-06, **do not raise it as a bug**. See
[`gopher-message-kills-the-inactivity-nudge`]. Check that clause **last**; check the flag, the
wiring, `request_schedule_now IS TRUE`, and the `order_in_progress` log row first.

### `TRUSTSHIELD_IDENFY_ENROLMENT_DISABLED` — **UNSET** (so enrolment is still open)

The **G40-350 §5** iDenfy enrolment kill switch, read via `read_flag()` in
`helpers/trustshield_policy.js:132`. Merged and **inert until set**. Setting it stops *new*
enrolment only; existing holders keep TrustShield and their completion protocol is unchanged
(owner constraint, 2026-08-04).

### `PAYOUT_TOKEN_REQUIRED_FROM_VERSION` — **UNSET** (defaults to `46`)

The appversion floor above which a payout token is strictly required
(`controllers/user/payment.js:220`). Older or header-less callers are exempted and logged. This is
the remedy for the **2026-08-13 incident** that took payout-setup completion to 0%. Raising the
number is how the exemption is retired; deleting the block is how it ends.

---

## Read the live values

```bash
aws sts get-caller-identity            # prove the session FIRST — see the warning above
aws elasticbeanstalk describe-configuration-settings \
  --application-name Gopher-Production --environment-name Gopher-Production \
  --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:elasticbeanstalk:application:environment'].[OptionName,Value]" \
  --output text | grep -E "GOPHER_RELEASE_ENABLED|TRUSTSHIELD_|BROADCAST_|START_CRONS|NEED_ASAP"
```

⚠️ **Keep that `grep` narrow.** A broad match over this namespace also returns `IDENFY_API_KEY`,
`IDENFY_SECRET_KEY`, `STRIPE_API_KEY`, `TWILIO_AUTH_TOKEN` and other live credentials. **Never
paste unfiltered output into a doc, a ticket, or a transcript.** There are 64 variables on this
environment and most of them are secrets.

## Keeping this file honest

Add a row whenever a new `process.env.X` gate is introduced, and state what the **default** does —
half the flags above are unset, so the default *is* the production behaviour. A flag whose default
is undocumented is a flag nobody can reason about without reading the source.
