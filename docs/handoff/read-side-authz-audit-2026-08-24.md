# Read-side authorization audit — parameterised GET routes

**Traced from `gopher-backend-api` `origin/production` `1e6e5c1d`, 2026-08-24**, in an isolated
detached worktree (the shared clone was on another session's branch and was not touched).
Owner-directed follow-on to the `!367` `get_trustshield_files` IDOR.

---

## 1. Why this audit exists — the guard cannot see these routes

`scripts/check-route-authz.js:60` reads:

```js
const MUTATING = 'post|put|patch|delete';
```

**GET is outside its remit by construction.** That is not a bug in the script; it is a scope
boundary nobody had stated. It means the guard passes every read route, including the one that
turned out to be an IDOR. **A green `check-route-authz` says nothing about read-side authorization.**

⚠️ **The first probe I wrote for this audit was itself blind** — a single-line regex for
`.get('…:param')`. It found **1** route in `controllers/user/index.js` and **missed the known
`!367` route entirely**, because that route is declared multi-line:

```js
router.get(
  '/get_trustshield_files/:reqid',
  ...
```

The scanner was rewritten to brace-match across newlines and **run against a positive control** —
it must see `/get_trustshield_files/:reqid` or its output is not to be trusted. Same rule as
everywhere else in this project: prove the probe can see the thing before believing a zero.
Corrected count: **37** parameterised GET routes, not 6.

---

## 2. Surface

| Class | Count | Verdict |
|---|---|---|
| Admin router (`/api/v1/admin/…`) | 21 | **Gated.** 26 of 28 `router.use` mounts carry `verify_auth`; the 2 without are `/auth` (login) and `/endpoint` (webhook) — correct by design. Not pursued further. |
| `middleware.user_auth` present | 13 | **The real question** — auth ≠ authorization. Audited below. |
| No auth middleware, non-admin | 3 | Audited below. |

---

## 3. CONFIRMED read-side IDOR — 3

All three are reachable by **any authenticated user**, against **any id**, with ids being
sequential integers.

### 3.1 `GET /api/v1/users/profile/:id` — full PII for any user
`controllers/user/profile.js:58` (`user_profile`). Takes `req.params.id`, calls
`user_services.get_users_details([id], true)`, and **never compares the id to the caller**.
`req.body.decoded` is read, but used only to choose `role_id` (gopher vs requester) and to set two
response flags.

`required_user_fields` (`services/users.services.js:6`) returns:
**`email`, `first_name`, `last_name`, `telephone`, `date_of_birth`, `fcm_token`,
`trust_shield_verified`, `confirmed_at`, `created_at`** — plus **address**, because the second
argument is `true`.

### 3.2 `GET /api/v1/orders/:id/cog` — order money + the assigned worker's PII
`controllers/order/cost_adjustment.js:275` (`view_cog`). Takes an order id, fetches the COG and the
order, then `get_users_details([order.gopher_id], true)` — the **worker's full record including
address** — plus ratings, tier, and completed-task count. **No `decoded` reference anywhere in the
function body (lines 275-415).**

> ⛔ **The sharpest evidence in this audit is in this same file.** `reject_cog`
> (`cost_adjustment.js:418`) — the **write** on the same resource — carries a real guard:
> `if (+order.gopher_id === +decodedToken.id && decodedToken.gopher)`. That is the 2026-08-08
> authorization fix (`851fb717`). **The write was hardened; the read next to it never was** —
> because the guard script only checks mutating methods. This is the gap, demonstrated.

### 3.3 `GET /api/v1/orders/:id/counter_offer` — same shape, and it looks protected
`controllers/order/counter_offer.js:231` (`view_counter_offer`). **This one has a
`decoded.id === order.requestor_id` comparison** — at line ~342 — but it gates only
`set_counter_viewed()`. The response is assembled and returned **unconditionally** below it,
carrying `...gopher[0]` (the full user record) and `ratings`.

⚠️ **Any automated check that asks "does this handler reference `decoded`?" passes this route.**
The comparison must be shown to *gate the response*, not merely to exist.

---

## 4. Verified PROTECTED (positive controls — these prove the audit can tell the difference)

| Route | How it is protected |
|---|---|
| `GET /orders/:id` (`order_view`) | scopes the query by `decoded.id` |
| `GET /orders/:id/rescheduled` | fails closed: `!decoded \|\| (+order.gopher_id !== +decoded.id && +order.requestor_id !== +decoded.id)` |
| `GET /users/payment_methods/list/:stripe_id` | scopes by `decoded` — the route the previous session false-positived on; it **is** protected, differently |
| `GET /users/get_trustshield_files/:reqid` | `!367`, owner-or-assigned-gopher, answers 204 |

---

## 5. Separate finding — unauthenticated capability URL with a hardcoded key

`controllers/user/index.js:422` → `payment.refresh_pauout_verification`
(`controllers/user/payment.js:941`). **No auth middleware.** The Stripe account id is AES-decrypted
from the query string with the key **`'Gopher-secret'`, hardcoded in source**, then passed to
`payment_actions.charge.account_onboarding(stripe_id)` and redirected to.

So the only thing standing between an arbitrary caller and a Stripe onboarding link for an
arbitrary connected account is a constant that lives in the repository.

⚠️ **NOT verified and deliberately not asserted:** what `account_onboarding` actually permits the
holder of that link to change, and whether Stripe imposes its own verification. **Do not escalate
this as "payout hijack" without establishing that first.** Adjacent to the G40-283 secret-rotation
work.

The other two unauthenticated routes are fine: `/self-referral/:gopher_id` is a public form by
design, and `/otp/getfortelephone/:phoneno` carries `middleware.otp_auth`.

---

## 6. The architectural finding, which matters more than any single route

**All three IDORs leak through one helper: `get_users_details(ids, include_address)`.**

There is **no counterparty projection of a user**. Every handler that needs to show a worker's name
and rating pulls the entire record — email, phone, DOB, address, FCM token — and spreads it into the
response. The IDOR is what makes it reachable by strangers, but even *with* correct authorization
these endpoints hand a requester their worker's date of birth and home address.

**Recommended fix order:**
1. Add a `counterparty_user_fields` projection (name, profile image, tier, aggregate rating) and
   switch §3.2 / §3.3 to it. **This shrinks the blast radius of every route at once**, including any
   this audit missed.
2. Add the owner-or-participant guard to §3.1, §3.2, §3.3.
3. Extend `check-route-authz.js` to GET, with an explicit allowlist for genuinely public reads.
   Until then its green is scoped to writes and the file should say so.

⚠️ **`fcm_token` should not be in any user-facing response at all** — it is a push-delivery
credential, not profile data.

⚠️ **INV-RATING:** §3.2 and §3.3 both return the counterparty's ratings. The production Go-flow
doc already records the worker-side equivalent as an INV-RATING violation to fix in the rebuild.
Flagged, not ruled on — whether a requester should see a worker's rating pre-acceptance is a
product decision, not mine.

---

## 7. What this audit did NOT cover

- **Query-string-scoped reads** (`?user_id=`) — only path-parameterised routes were enumerated.
- **The 21 admin routes' handlers** — the mount is gated, so they were not read individually.
- **Any runtime proof.** Every finding here is from reading `origin/production` source. **Nothing
  was executed against a live or staging server, and no request was made with anyone's token.**
  A repro against staging is the natural next step and is owner-authorized work, not mine to assume.

---

## 8. Addendum 2026-08-27 — the projection also leaks on the HAPPY PATH, with no IDOR required

**Traced from `origin/production` on 2026-08-27**, arriving from the opposite direction: a support
email from Gopher **139722**, who asked whether her phone number and home address were protected.

§6 is correct and is the finding that matters. This addendum **raises its severity**, because §3's
three routes all require **id enumeration by a stranger**, and the ones below require **nothing at
all** — they are the ordinary, authorized, everyday paths, hit on every order.

### 8.1 Eight call sites in `controllers/order/retrieve.js`, every one passing `include_address = true`

| Line | Handler | Route | Whose record is fetched |
|---|---|---|---|
| 345 | (module helper) | — | requester + gopher |
| 1081 | (module helper) | — | requester + gopher |
| 1788 | `get_gopher_active_and_available_orders` | `GET /orders/available-active` | requester + gopher |
| 2390 | `order_view` | `GET /orders/:id` | gopher + requester |
| 2534 | `order_view` | `GET /orders/:id` | gopher |
| 2608 | `order_view` | `GET /orders/:id` | the requester's selected Gophers |
| 2678 | `order_view` | `GET /orders/:id` | **every Gopher who BID on the order** |
| 2752 | `order_view` | `GET /orders/:id` | every message sender on the order |

`retrieve.js:1204` then does `newOrder.gopher = { ...gopher_data, ... }` — the whole record, spread
into the response.

### 8.2 ⛔ The worst of these is `L2678` — bidders, BEFORE any connection exists

`order_view` hands the requester the full `get_users_details(..., true)` record for **every Gopher
who placed a bid**. A bidder is by definition *not yet* connected to that requester.

**This contradicts a live product policy.** The In-App Communication Policy (G40-35, and the
owner's 2026-07-19 ruling recorded in `connected-job-contact-rule`) blocks contact-sharing in
messages **until the job is connected**, precisely because pre-acceptance contact exchange is how
transactions leave the platform. The moderation layer masks a phone number typed into a message —
while this endpoint ships that same worker's phone, email, DOB, home address and FCM token to the
same counterparty, in JSON, for merely having bid.

The guard and the API disagree about the same rule. Whichever is right, they cannot both be.

### 8.3 `fcm_token` — confirmed still present

`required_user_fields` on `origin/production` today:

```
id, email, first_name, last_name, telephone, email (listed twice), date_of_birth,
requesting_primarly, discover_gopher, requesting_primarly_others, discover_gopher_others,
confirmed_at, fcm_token, created_at, trust_shield_verified
```

§6's closing warning stands and is **not** yet actioned. Worth restating plainly: a push token is
**actionable**, not merely disclosed — unlike a DOB, holding it is a capability.

⚠️ **Correcting my own first report of this.** I originally routed it to the Live App Bugs session
as "phone, email, DOB and address" and **omitted `fcm_token`**, having read the field list without
registering it. That session caught the omission. The token is the most severe item in the list.

### 8.4 What this changes about the fix order

§6's recommendation is unchanged and still right — **the projection first**. This addendum only
sharpens why:

- Fixing the three §3 routes and not the projection leaves **eight further call sites in one file**
  still shipping the full record to a legitimately authorized caller.
- A `counterparty_user_fields` projection closes §3 and §8 together.
- ⚠️ **`include_address` is passed `true` at all eight sites.** Whatever projection is introduced,
  the second argument has to be revisited at each call site rather than left as-is; a narrowed field
  list with `include_address` still `true` would keep shipping home addresses.

### 8.5 Not verified

- **Whether any client renders these fields.** The data reaches the device; what the UI draws was
  not traced. For a privacy answer it makes little difference, but for a UI-regression assessment
  it does — a narrowed projection may blank fields some screen is reading.
- **No runtime proof**, consistent with §7: this is source reading on `origin/production`. Nothing
  was executed and no request was made with anyone's token.

### 8.6 Independently corroborated

§8 was re-read from `origin/production` by a second session on 2026-08-27, working from the source
rather than from this write-up — each call site's second argument checked directly, not matched
against the line numbers above. Both readings agree on all eight sites and on `include_address =
true` at every one.

The bidder path was additionally traced to the response body and confirmed here first-hand
(`retrieve.js` ~2709-2719):

```js
if (find_user) {
  return { ...updatedItem, ...find_user };   // whole user object, not a subset
}
...
get_order.order_bids = updated_bids || [];
```

So `order_bids` carries the complete `get_users_details(..., true)` record per bidder — this is the
served payload, not an intermediate.

**Lead with the policy contradiction, not the severity.** "Over-projection" invites prioritisation
against other work; *"a live product policy is not enforced on the read path"* does not. G40-35 and
the owner's 2026-07-19 ruling moderate a phone number **typed into a message** pre-connection, while
this endpoint ships that same worker's phone, email, DOB, home address and FCM token as JSON for
merely having bid. One rule, two answers, and the API is the one that wins.

---

## ⛔ OWNER RULING 2026-08-27 — `!404` is the remedy. `!405` is CLOSED. Read this before §9.

**Decided:** `gopher-backend-api!404` (`fix/counterparty-user-projection`) carries the fix.
**`!405` was closed in favour of it**; its branch `fix/bidder-pii-projection` is **kept on purpose**
— do not delete it, see the follow-up below.

**Why.** Coverage, and it was not close: **11 call sites against 1.** Landing `!405` would have
closed ~9% of the known exposure and left the rest live. `!404` is also the more reviewed artifact
— it absorbed three findings from this lane and carries a mutation-proven **behavioural** test.

**What `!405` was right about, and why it still lost.** `get_bidder_public_details` is a **separate
minimal query**: it cannot leak `users_info` or `addresses` because it never joins them — nothing to
strip, nothing to keep in sync. That is the better *pattern*. It covers one site. A cleaner shape
over 9% loses to a slightly less clean shape over 100%.

⛔ **THE FOLLOW-UP, and it is the same bug class `!404` already fixed once.**
`redact_users_info_for_counterparty` handles **1 of the 16 fields** `users_info` attaches — a
**deny-list of one**. Add a sensitive column to that block and it ships to counterparties silently,
with no test failing. That is structurally the fail-open shape of the reference-equality gate
`!404` corrected earlier the same day. **It should be an allow-list**, as `counterparty_user_fields`
already is for the `users` table, and `get_bidder_public_details` on the kept branch is the shape to
generalise toward. **Not a reason to hold `!404`: the live exposure is worse than the latent one.**

**Merge order:** `!404`, then `!406` rebased onto the new `production`, then `!406`. Nobody
hand-resolves the `!404`/`!406` conflict — a resolved conflict in an authorization fix is where a
mistake hides.

---

## 9. Addendum 2026-08-27 — the bidder path is FIXED, and `attributes` is not the lever

*Added by the Live App Bugs session, owner-assigned. Does not renumber or edit §1–§8.*

**Fixed:** `retrieve.js` L2678, the bidder projection — `gopher-backend-api!405`, branch
`fix/bidder-pii-projection`, **awaiting the owner's merge** (merging auto-deploys). Ticket
**`G40-416`** (John's Tickets, sprint 677, High).

### ⛔ The correction that matters for the rest of the sweep

§6 and §8 both recommend narrowing the projection. **A narrowed `attributes` argument to
`get_users_details` does NOT do that**, and it looks like it does.

`attributes` governs **only the `users` table**. The function then attaches, from other tables and
*regardless of that argument*:

- `address`, from `addresses` (gated by `include_address`, a separate parameter); and
- from `users_info` — **`license_plate_number`, `driver_license_number`, `driver_license_state`,
  `car_insurance`, `personal_info`**.

So a "narrowed projection" fix would have left **a driver's licence number and licence plate in a
pre-acceptance payload** while passing review. ⚠️ **Those five fields are not listed anywhere in
§1–§8** — the audit's field inventory came from `required_user_fields`, which does not include
them.

**Therefore: a subtractive fix to `get_users_details` cannot be verified by reading its argument
list.** The bidder fix uses a **separate minimal query** (`get_bidder_public_details`) — it has
nothing to strip. The remaining seven sites should follow that shape, not a narrowed `attributes`.

### How to size an allow-list honestly

The bidder allow-list is `id` + `first_name` + `last_name`, derived by reading **both** consumers
rather than guessing: the requester bid card renders exactly those two user fields (no avatar, no
badge — everything else comes from the bid row or is attached at the call site), and the worker app
reads no user fields from bids at all. **Do the same per call site.** The seven remaining sites
will not share one allow-list — the assigned-worker card almost certainly needs the avatar the bid
card does not.

### Still open — ⚠️ READ THE STATE LINE BEFORE TICKETING

⛔ **Corrected 2026-08-27 by the author of this section.** It previously read *"L345, L1081, L1788,
L2390, L2534, L2608, L2752 — all still `include_address: true` … needs its own ticket."* **That was
true of `origin/production` and stale the moment `!404` was pushed**, and it is stale in the
dangerous direction: anyone ticketing from it would have raised seven tickets against work that is
reviewed and green. Flagged by the Customer Support session; **verified here** before correcting —
all eight `retrieve.js` sites on `fix/counterparty-user-projection` carry `false` plus a projection.

**Actual state, by branch — this is the thing to check, not the line above:**

| | `origin/production` | on `!404` |
|---|---|---|
| the eight `retrieve.js` sites | **open**, `include_address: true` | narrowed, `false` + projection |
| `view_cog`, counter-offer view, active-bid view | **open** | narrowed |

So **nothing here needs a ticket if `!404` lands.** If it does not, all of it does — **L1081 first**,
which hands the customer the assigned worker's phone, email, DOB, address and `fcm_token`
post-acceptance on the main order-detail path.

⚠️ **The general lesson, since this doc is canonical and read by people who are not in the thread:
a "still open" list is a claim about a MOMENT, and branches move under it.** Say which ref the
claim is about, or it becomes an instruction to duplicate somebody's finished work.

**Still genuinely open regardless of which branch lands:** `counterparty_user_fields` is **one list
across every counterparty site**. The seven remaining sites will not share one allow-list — the
assigned-worker card needs the avatar the bid card does not. Sizing a projection per call site,
against its real consumers, is unfinished work in either remedy.

> *(Cross-reference added by the Customer Support session before the correction above; retained
> because its second half is the substantive part.)*
>
> **`gopher-backend-api!404`** (`fix/counterparty-user-projection`) narrows **all eight**
> `retrieve.js` sites plus `view_cog`, the counter-offer view and the active-bid view, and sets
> **`include_address: false` at every one**. So the list above describes production, not the
> outstanding work. Raising seven tickets from it would duplicate a branch that is already
> reviewed and green.
>
> **§9's architectural point stands and is the sharper one:** a narrowed `attributes` argument does
> NOT govern `users_info`, and a fix that only narrows it cannot be verified by reading its
> argument list. !404 hit exactly that trap — its first version removed a bidder's email and DOB
> while still shipping their **driver's licence number** — and closed it with an explicit
> redaction step rather than a separate query. A dedicated minimal query
> (`get_bidder_public_details`, §9) is the cleaner shape for new code and needs no redaction step;
> the two approaches should be reconciled once the owner rules on !404 vs !405 rather than both
> landing.
>
> **What settles it either way is the test, not the shape.** !404 carries
> `test/counterparty-projection-runtime.test.js` — it calls `get_users_details` against a stubbed
> db and asserts on the returned object, and is mutation-proven: reverting the gate makes it fail
> with the full licence number present. A source-shape assertion cannot catch this class of bug,
> which is the lesson §9 is really about.

*Credit: the eight call sites, the `fcm_token` catch and the L2678 pre-acceptance case were found
and routed by the Customer Support session (§8); independently verified at source here before
acting.*

---

## 10. Addendum 2026-08-27 — a FOURTH read-side IDOR: `GET /api/v1/orders/bid/:id`

Found by the Live App Bugs session while tracing which endpoint feeds the offer
card; **verified first-hand here against `origin/production` before being
written down.** `controllers/order/order_bids.js:242` (`view_bid`), mounted at
`controllers/order/index.js:295-296` with `middleware.user_auth`.

```js
exports.view_bid = async (req, res, next) => {
  const { id } = req.params;
  const { decoded } = req.body;
  ...
        where g.id=${id}          // no requester/gopher scoping at all
```

**`decoded` appears exactly twice in the handler:** the destructure on line 244,
and `if (!decoded.gopher) this.set_viewed(id)`. That second one gates
**"mark this bid as viewed" — never the response.**

This is verbatim the failure mode §3.3 warned about: any check asking *"does
this handler reference `decoded`?"* passes it. **The comparison has to gate the
RESPONSE.** Bid ids are sequential integers, so any authenticated caller can
walk them and read every bid on the platform — bidder identity, and the order's
money detail.

### 10.1 The §8 projection is currently the only thing limiting the blast radius

Worth stating plainly because it changes how the two pieces of work relate:
before §8, this IDOR returned the bidder's full internal record. It now returns
`prospect_user_fields` plus a last-4 licence. **That is a payload-size mitigation
standing in for an authorization control, and it should not be mistaken for
one.** Narrowing what an IDOR leaks is not the same as closing it.

### 10.2 ⚠️ Possible SQL injection — NOT ESTABLISHED, and deliberately untested

`req.params.id` is interpolated raw into the query string with no validation,
cast, or bind parameter, on a `db.sequelize.query({ query: … })` call that passes
no `replacements`.

**No claim is made here that this is exploitable.** Establishing it requires
checking what the driver permits on this call path, and that check must not be
run against production. It is recorded because it is one line above the IDOR and
whoever fixes one should look at the other.

⛔ **Do not escalate this as confirmed until someone establishes it properly** —
same discipline as the `/users/reauth/:stripe` note in §5, and the same reason:
a confident wrong answer about an injection is worse than no answer.

### 10.3 Separate, and it needs a store release

The bidder's licence last-4 reaching a requester **pre-acceptance** is real
counterparty disclosure, not a self-view: `makeAnOfferData` is filled by
`GET orders/bid/:bid_id` (`CustomPullOver.js:72`) and **both apps call that same
endpoint** — diverged forks of one component, same line number.

It is left in place on purpose. Nulling the field crashes **both** apps —
requester `InAppMessage.js` ~1209 and Go `CustomPullOver.js` ~3055, both
unguarded `.slice`. Closing it means guarding the `.slice` in two store
releases, with no OTA. **That is a store-release ticket, not a backend change**,
and it is written here so it is not known-and-forgotten.

### 10.4 ⛔ Nothing in CI can catch the fifth — this outlasts any single route

Four IDORs now share **one root**: a comparison that gates a **side effect** while the response
returns below it. Reviewing for *"does this handler reference `decoded`?"* passes every one of them.

And `scripts/check-route-authz.js` is **structurally blind** to the whole class —
`MUTATING = 'post|put|patch|delete'`, so GET is outside its remit **by construction** (§3.3 says the
same of the `!367` case). A green run is not evidence.

⚠️ **This one was found by tracing an unrelated question, not by a sweep.** The audit predicted the
class on 2026-08-24 and nothing systematic went looking for more of it in the three days since.
**That gap deserves a ticket more than any individual route does** — a guard that can actually see
GET handlers, or it happens again and is found the same accidental way.

### 10.5 Fix status, and one thing noticed in passing

**Fixed in `gopher-backend-api!406`** (`fix/view-bid-authz`), **awaiting the owner's merge** —
ticket **`G40-417`**. A bid becomes readable by exactly two parties: the gopher who made it and the
requester who owns its order. The guard runs **before** the projection, so an unauthorized caller
assembles no data.

⚠️ **Do not write `order_logs` on an authz refusal for an enumerable endpoint** — a row per rejected
probe lets an attacker write unbounded noise into a **victim's** order history. Server log instead,
with the caller id. (`create_bid`'s sibling guard does write one; this deliberately does not.)

⚠️ **`set_viewed` is called without `await` and has no `.catch`**, so a rejection in it is an
unhandled rejection in production — and it escapes a caller's try/catch in tests, too. Noticed
while writing the guard; out of scope for an authz fix, unfixed.

⚠️ **`!404` and `!406` touch the same function.** Hunks are adjacent, not separate — see the
merge note on both MRs. Whoever merges second re-reads the whole function rather than trusting
git.

---

## 11. Addendum 2026-08-27 — the raw-interpolation sweep (§10.2's wider question), FINDING ONLY

**Read-only sweep. Nothing was executed and nothing was tested** — see the closing note. §10.2 asked
whether, if `view_bid` interpolates a route param into raw SQL, others do. **They do**, and one is a
stronger candidate than the case that prompted the question.

⚠️ **Probe was proven before its zeros were believed:** the pattern was first confirmed to find the
known `order_bids.js:253` case.

### 11.0 ⛔ CORRECTION — this sweep MISSED HALF OF WHAT IT WAS LOOKING FOR

**Written by its author, 2026-08-27.** §11 originally reported three interpolation sites. There are
**five**, and **two of the four `IN (…)` id-list sites were missed** — including a second real
defect. Both misses were **probe faults, not code**:

- the pathspec `controllers/**/*.js` silently matched **nothing at depth 1**, hiding
  `controllers/admin.controller.js`;
- a `grep -viE 'message'` filter, meant to drop log lines, ate
  `controllers/admin/inbox_message.js` **by its FILENAME**, because `git grep -n` output contains
  the path.

⚠️ **A sweep is only as good as its probe, and this one had passed its control.** The control proved
the pattern could find the *known* case — it did not prove the *file set* was complete. **Prove the
corpus as well as the pattern.** Correct probe: `git grep -n 'IN (\${' -- controllers services
helpers middleware`, no globs, no filename-sensitive filters.

**All four id-list sites are fixed in `gopher-backend-api!408`** (`fix/admin-id-filters-parameterised`).

### 11.0b ⛔ The second defect, and it is worse than the one that prompted the sweep

`controllers/admin/inbox_message.js:277-279`:

```js
array = custom.replace(/,\s*$/, '').split(',');
array.map((item) => +item);        // "Convert each element of the array to an integer"
…
query += `AND u.id IN (${array}) `;
```

**`.map` returns a new array and does not mutate. The result was discarded**, so `array` stayed as
the raw split strings and `req.body.custom` reached the SQL verbatim.

The comment describes a transformation that never happened. ⛔ **A no-op that READS as a control is
more dangerous than a missing one** — the missing one gets found, the no-op gets ticked off.

**The four sites did one job four ways, and only two were safe — both by accident:**

| file | "sanitisation" | |
|---|---|---|
| `admin/orders.js` | `filter((x) => x)` — truthiness only | **unsafe** |
| `admin/inbox_message.js` | `map((x) => +x)` — **result discarded** | **unsafe** |
| `admin/user.js` | `filter((x) => +x)` — coerces | safe by luck |
| `admin.controller.js` | `map(parseInt)` — coerces | safe by luck |

**That is the finding, more than any one route:** correctness depended on which variant a file
happened to copy. All four are now `IN (:list)` with the value bound — a filter must be re-derived
correctly in every file forever; a binding does not.

### 11.1 ⛔ `controllers/admin/orders.js:66-68` — request body, list, NO numeric filter

```js
const { id, … } = req.body;
const ids = id.split(',');
order_ids = ids.filter((filter_order_id) => filter_order_id).toString();
…
query += `AND ord.id IN (${order_ids}) `;      // :90, and again at :129
```

The filter tests **truthiness only**. A non-numeric element survives it intact and reaches the SQL
verbatim. This is request-body input, a list, on an admin surface.

### 11.2 The fix already exists in this repo, one file away — they differ by ONE character

`controllers/admin/user.js:38` does the identical job:

```js
const user_ids = ids.filter((filter_id) => +filter_id).toString();   // note the +
```

The `+` coerces first, so anything non-numeric becomes `NaN`, is falsy, and is dropped. **That one
is accidentally safe; its sibling is not.** Same author, same pattern, same week — which is exactly
why "we fixed the one we found" is not a strategy for this class.

⚠️ Neither is *deliberately* parameterised. `user.js` is safe by coincidence of a coercion someone
added for a different reason. Both should use bind parameters (`replacements`), not a cleverer
filter.

### 11.3 Lower concern, recorded for completeness

- `services/users.services.js:458` (`gopher_id=${gopher_id}`), `retrieve.js:2596`, `update.js:1287`
  — interpolate **DB-derived** ids, not request input. Worth parameterising on principle; not the
  same risk.
- `controllers/common/referrals.js:340/348/371` — `referrer_id=${referrer_id}` where
  **`referrer_id = decoded.id`**, i.e. from the verified JWT. **Clean negative, checked rather than
  assumed.**

### 11.4 ⛔ Severity, stated carefully — and what has NOT been done

Admin routes carry `verify_auth` (§7: 26/28 mounts), so this needs **admin credentials**. That
lowers the likelihood and not the impact: SQL injection under an admin session is full database
access, and it reaches further than any of the four IDORs above.

⛔ **NOTHING HERE WAS TESTED, and no claim of exploitability is made.** Finding a candidate is a
grep; establishing one is an attack, and the two are different work with different authorization.
**Confirming any of these must not happen against production** and is an owner decision.

**The distinction worth keeping: a sweep is cheap and safe; testing what it finds is neither.**
Only the second needs authorization — which is why this section exists and why it stops here.

