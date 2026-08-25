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
