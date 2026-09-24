# A worker's offer may never be $0 — the canonical rule and how it is enforced

**Owner rule.** First stated **2026-07-17**, restated **2026-08-26** on order 64826:
*"We can't allow users to set an offer to $0 ever."*

**This document is the authority, not the tickets.** `G40-415` carries the repro and the
acceptance criteria and is meant to die when the release ships; this text is not. Companion
memory: `worker-offer-nonzero-rule`.

---

## The rule, in one line

**`offer > 0` — UNLESS `offer_by_gopher` is true.**

⚠️ **The exemption is load-bearing. Do not remove it.** When a requester chooses *let the Gopher
name the price*, `helpers/orderObject.js` sends `gopher_offering: 0` **together with**
`offer_by_gopher: true`, and the worker's pay arrives later as an accepted bid. A zero-check
without that carve-out deletes the entire bids product.

⚠️ **`String(false)` is `'false'`, which is truthy.** A naive `if (body.offer_by_gopher)` exempts
*every* order. Compare the string.

---

## Why this was open for so long — the July fix never reached the live code

The 2026-07-17 rule **was** implemented, in commits `2bc35d5` and `4a2039f` — but only in the
**`Final/` prototypes** (`gopher-request.html`, `gopher-connect.html`, the Request flow). The
live requester app and `gopher-backend-api` never received it. The owner's read on 2026-08-26 —
"a bug left by Dualboot" — is correct, and our own fix landing next door is why it looked
handled.

**Lesson worth keeping: a rule implemented in the prototype is not a rule implemented.** The
prototypes and the live apps are separate codebases, and canon that lands only in `Final/`
protects nobody using the product.

---

## The repro: order 64826

2026-08-26, Hope Mills NC, *"Delivery - Other Age-Restricted"*. Created **13:49:51** with
**Gopher Offering $0.00** against **$30.00** of goods. The platform accepted it.

⚠️ **The DB no longer shows $0** — it reads offer $10.00 / goods $20.00, because `order_logs`
records *Order Updated* at **13:55:27**, six minutes after creation. The owner's email captured
creation. Anyone re-checking this order will see the edited state and may conclude the report was
wrong; it was not. **Read the order_logs timeline, not the current row.**

## Scale — measured, not estimated

Read-only SQL against production Aurora, 2026-08-26:

| | |
|---|---|
| zero-offer, non-bid orders, all time | **282** |
| of those, **delivered** | **71** — a worker did the job and was paid nothing for their labour |
| since 2026-01-01 | **104** (2 delivered) |
| current rate | **7–28 per month** through 2026 |

The non-delivered majority is not harmless: 34 of the 2025+ cohort **expired**. That is a
broadcast spent and a requester waiting on a job no worker will take.

---

## Why nothing caught it — five layers, none of them holding

| # | Where | What is wrong |
|---|---|---|
| 1 | `src/json/requester/*.json` | `gopher_offering` is `required: true` **with `defaultValue: 0`** — in **31 of 33** category schemas. A mandatory field pre-filled with the one illegal value. (`grocery.json`, `lawnmowing.json` have no defaultValue.) |
| 2 | `currencyinputfield.js:230` | `required` reaches only the DOM attribute; the value renders as `"0.00"`. **The attribute rejects EMPTY, not ZERO** — so it is always satisfied. |
| 3 | `src/helpers/validation.js:11` | `validateRequire` uses `!value`, so `!0` is true — it **would** have caught every one. It has **zero callers**. |
| 4 | `controllers/order/create.js` | wrote `offer` straight through, no check. |
| 5 | `controllers/order/update.js` | same, on the edit path. |

⛔ **`MIN_ORDER_AMMOUNT` is not this guard and never was.** It is a per-subtype minimum on the
**cost of goods**, it covers Delivery only, and its single use in the whole repo is an endpoint
that **hands it to the client**. There was no server-side enforcement of anything in this area.

> **Layer 3 is the one to remember.** The bug was never a missing rule. The rule existed, was
> correct, and was connected to nothing. That is why `test/offer-floor.test.js` asserts the
> controllers *call* the guard — a unit test of the helper alone would have reproduced this
> failure exactly: green forever while $0 orders sail past.

---

## What is built, and what is not

### ⛔ SHIP ORDER — owner ruling 2026-08-26. It REVERSED my recommendation, and it was right.

**Do NOT ship the server guard on its own.** Owner, 2026-08-26:

> *"Don't ship the backend change here and leave it in John's Ticket as a todo with notes.
> Because a Gopher can counter this, leaving it is better than killing the broadcast."*

**The mechanism.** A worker can **counter-offer** a $0 job. The live cap is
`max($20, 1.5 × offer)` — at an offer of $0 the `1.5 ×` term is zero, so **the $20 floor is what
binds**, and the job is still rescuable at a real price. A server rejection would replace a
*recoverable* order with a **silent dead end**, because the shipped app shows the requester
nothing on a create error. **Killing the broadcast is worse than letting a counterable order
through.**

**The data agrees with the ruling, and it corrects the emphasis I gave it.** The 71 delivered
$0 jobs are almost entirely **historical**: since 2026-01-01 there are 104 zero-offer orders and
only **2** were delivered. I led with the all-time figure, which made a low-current-rate harm
read as an active one. The acute case for shipping immediately was weaker than I presented.

**So: client gate first, or both in the same release.** The server guard merges only once the app
can stop the user in the form — or at minimum can display a create error.

---

**Server half — BUILT, PUSHED, NOT MERGED.** Branch `fix/offer-must-be-nonzero` (kept, not
deleted). **`gopher-backend-api!393` was raised and then CLOSED unmerged** under the ruling above;
re-raise it when the client half is ready.


One definition in `helpers/offer_floor.js`, imported by both `create` and `update` (two copies of
a money rule drift). Floor is `MIN_GOPHER_OFFER_CENTS = 1` — strictly greater than zero, the
owner's rule exactly and nothing more.

- **In create:** before any Stripe token exists, so a rejection costs nothing at the vendor.
- **In update:** deliberately **after** the order lookup and state checks, so a dead or claimed
  order still reports as dead or claimed — the ordering those blocks were rewritten to get right
  (see `order-update-is-a-full-replace`).
- **Merge hand-off:** target `production` · squash **no** · delete source **no**. Merging
  **auto-deploys**.

**Client half — NOT BUILT.** Both halves now live on **`G40-415`**, John's Tickets (sprint 677), as one todo — the client gate is the part that unblocks the server guard.

### Why the silent dead end decided it

`requestOrder.js:314` captures create errors to Sentry and shows the user **nothing**. That single
fact is what makes a server-only guard net-negative here: the requester cannot post, cannot see
why, and cannot self-correct — whereas today's $0 order at least reaches workers who can counter
it up to $20.

⚠️ **Do not read this as "the guard is wrong."** The guard is built, tested and correct. Only its
*sequencing* was wrong. Anyone tempted to merge `fix/offer-must-be-nonzero` on its own should
read the ruling above first.

**This is NOT the `PAYOUT_TOKEN_REQUIRED_FROM_VERSION` shape** (see
`server-guard-must-be-appversion-gated`), and no appversion gate is needed: there, the shipped
app *structurally could not* comply. Here it can — the user types a number — and bids are exempt
by construction. Every consumer was checked: the endpoints have exactly two, `create.create` and
`update.update_v2`, both behind `user_auth`; admin order routes are read-only for offers.

---

## If you are asked to raise the floor

`MIN_GOPHER_OFFER_CENTS` is named so that raising it is a one-line change. **Raising it is a
pricing decision, not a bug fix, and needs the owner.** A $0.01 offer is legal under today's rule
and still absurd; that was raised on 2026-08-26 and the owner chose strict `> $0` for now.

## Two traps found on the way

- ⚠️ **`js_order` is not a web-vs-native discriminator.** `src/axios/axios.js:12` hardcodes
  `isWebPlateform = true`, so **every** order from the requester app carries it. Sizing "how many
  orders came from web" off that column returns all of them.
- ⚠️ **`RUNBOOK-production-db-readonly.md` names a dead jump host.** EB replaces its instances on
  every deploy — the id in the runbook, and the one you find, both go stale within the hour. Use
  `aws ssm describe-instance-information`, then **check the environment tag**: one of the two
  Online instances is `Gopher-Stage` and will answer happily.
