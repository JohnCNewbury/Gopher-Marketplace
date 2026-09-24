# Client ↔ server contract drift — four cases in one week

**Written 2026-09-05 by the Sentry session.** Owner asked for these to be consolidated rather than
diagnosed one alert at a time.

## Why this is one note and not four tickets

Between 2026-08-28 and 2026-09-05, four separate production Sentry issues turned out to have the
same underlying shape: **the app sends something the server no longer accepts, and the server has no
guard for it.** Individually each looks like a small bug. Together they say the client and server
contracts have drifted apart and nothing is checking.

Three are genuinely client-side. One is a server guard that only misbehaves when an old client hits
it. They are listed together because whoever fixes the client should see all of them at once.

⚠️ **Two of the four were first observed during an Xcode test session, not from the field.** That is
called out per case. It changes urgency, not correctness — a build under test that sends the wrong
thing will send the wrong thing when it ships.

---

## 1 · Date of birth is sent as ARITHMETIC

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/users/onboarding` |
| **Server error** | `SequelizeDatabaseError: invalid input syntax for type date: "1934"` |
| **Seen** | 2026-08-30 (user 97424, 7 failures in 16 min) · 2026-08-22 (value `"1963"`) |
| **Source** | Real users. Not test traffic. |
| **Server status** | **FIXED** — MR !448, merged + deployed |
| **Client status** | **NOT FIXED** |

The app evaluates a stored `YYYY-MM-DD` as a maths expression before sending it:

```
1962-06-22  ->  1934        <- user 97424's actual stored date of birth
1990-05-22  ->  1963
```

Verified, not inferred: `eval('1962-06-22') === 1934`, and 1962-06-22 is what
`users.date_of_birth` holds for that user.

**Both apps already carry guards for this** — `src/actions/action.js`, `stringFields` and
`isDateString`, comments in Spanish, so it was found and fixed once before. Those guards are on
`production` since `c10078700` (2026-03-19). **They are evidently not in the builds users run.**

There is also an **unguarded** evaluator on the same data: `evaluateExpression()` calls
`safeEvaluate(replacedExpression)` with neither guard (gopher app ~L116, requester ~L128). No
current JSON schema wires it to `date_of_birth`, so it is **not** claimed as the path — but it is
worth closing regardless.

**Server behaviour now:** write-once parity (an account that already has a good date of birth keeps
it, so affected users can save again) plus a format check that returns 422 instead of 500. A NEW
user whose app mangles the value still cannot finish onboarding. **Only the client fixes that.**

---

## 2 · Order list sends `aasm_state[]`, server reads `statuses[]`

| | |
|---|---|
| **Endpoint** | `GET /api/v1/orders/v2` (and latent on `/v3`) |
| **Server error** | `TypeError: Cannot read properties of undefined (reading 'map')` |
| **Seen** | 2026-09-02, 6 events in 2m23s, iOS 18.7 |
| **Source** | **Almost certainly the Xcode test session** — tight burst, single device |
| **Server status** | Not changed, deliberately |
| **Client status** | Open |

Client sent `?aasm_state[]=pending`. Server reads a different parameter and never guards it:

```js
controllers/order/retrieve.js
   :67   const param_statuses = req.query.statuses;   // v2 — undefined
   :72   const statuses = param_statuses.map(...)     // throws
```

`aasm_state` is **never read** anywhere in that controller. The *values* are fine —
`ORDER_STATUS.PENDING === 'pending'` — it is purely the parameter **name** that is stale.

⚠️ **`/orders/v3` has the identical unguarded assumption**, in four places:

```
:847  const param_statuses = req.query.statuses;
:852  param_statuses.map(...)
:870  param_statuses.includes(ORDER_STATUS.SCHEDULED)
:881  param_statuses.includes(ORDER_STATUS.SCHEDULED)
```

Any client omitting `statuses[]` crashes v3 the same way.

**Why the server was not patched:** the build under test is being actively rewritten. Teaching the
server to accept `aasm_state` would bless a legacy parameter name that then has to be supported
forever. If the client keeps sending it, say so and the server can alias it — but that should be a
decision, not a reflex.

---

## 3 · `a=Requestor` — wrong case AND wrong spelling

| | |
|---|---|
| **Endpoint** | `GET /api/v1/mobile-config` |
| **Server error** | `Error: appType provided is not valid` |
| **Seen** | 2026-09-05, 5 events in 5 min, iOS 18.7 |
| **Source** | **Xcode test session** (`v=13.1.1`, a local-build version) |
| **Server status** | No change — the server is right |
| **Client status** | One-line fix |

Client sent `?p=ios&a=Requestor&v=13.1.1`. Server accepts exactly:

```js
controllers/common/mobileconfig.js:37
   if (!['gopher', 'requester'].includes(appType))
```

`Requestor` is wrong twice — capital `R`, and **"requestor"** with an `o` where the server wants
**"requester"** with an `e`. That spelling split is a long-standing trap in this codebase.

**Fix:** send `a=requester`.

⚠️ **This endpoint is how the app learns whether it needs a forced update.** An app that cannot read
it does not know what version it should be on. Harmless under test; not harmless shipped.

**Also check the version string.** `13.1.1` is force-updated out. A shipped build sending it would
be told to update on every launch.

---

## 4 · A token with no `id` is accepted as valid (SERVER-side)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/orders/v3` |
| **Server error** | `Error: WHERE parameter "user_id" has invalid "undefined" value` |
| **Seen** | 5 events, 2026-08-28 → 2026-09-02. iOS **and** Android WebView 127, 05:09 UTC |
| **Source** | **NOT the test session** — two platforms, five days apart, 1am Eastern |
| **Status** | Open. Not yet fixed anywhere. |

This one is **not** a client contract mismatch — it is a server auth guard that only misbehaves when
something presents an unusual token. `middleware/auth_token.js:252`:

```js
if (
  !decoded_token ||
  (!decoded_token.id &&
    !decoded_token.email &&
    decoded_token.gopher === undefined) ||
  decoded_token.gopher === null
) return false;
```

Those are joined with `&&`. A token is rejected only when it has **no id AND no email AND no gopher
flag**. So **a token carrying an email and a gopher flag but no `id` passes validation.** It then
reaches `retrieve.js:1027`:

```js
const { id, gopher } = req.body.decoded;   // id === undefined
where: { user_id: id, role_id: 2 }         // Sequelize throws
```

✅ **It fails safe.** Sequelize refuses `undefined` rather than treating it as "match anything", so
this errors instead of returning another user's orders. Worth stating plainly, since this is the
auth path.

❌ **But the user gets a 500** and their order history never loads — and a credential with no
identity is being accepted, then handed to identity-scoped queries that assume otherwise.

**Not fixed because** tightening the guard could log out anyone holding a token of that shape, and
nobody has yet established how many exist or where they are minted. That needs a deliberate slot,
not an end-of-session change to the auth guard.

---

## The pattern, and what would actually stop it

Four cases, three distinct failure modes, one cause: **nothing verifies that what the app sends is
what the server accepts.** Each was found only because it reached production and threw.

Common shape in all three client cases:

1. The server reads a parameter by exact name and exact case
2. The client sends something else — old name, wrong case, wrong spelling, or a mangled value
3. The server has **no guard**, so a mismatch is a 500 rather than a 4xx the app could handle

**Cheapest durable improvement, in order of value:**

- **Guard the query-parameter reads.** `param_statuses` is dereferenced unguarded in six places
  across v2 and v3. A missing parameter should be a clean empty result or a 422 — never a
  TypeError. This is server-side and small.
- **Pin the version the client sends** and stop local build versions (`13.1.1`) reaching production
  endpoints.
- **Write down the contract** for the handful of endpoints the apps call on every launch —
  `/mobile-config`, `/orders/v2`, `/orders/v3`, `/users/onboarding`. Exact parameter names, exact
  casing, exact value formats. Three of these four cases would have been caught by reading such a
  list.

---

## Verified vs inferred

**Verified first-hand:**

- Every server-side line number, parameter name and validation list above, read from
  `origin/production`
- `eval('1962-06-22') === 1934`, and that 1962-06-22 is user 97424's stored date of birth
- Event counts, timing and platform tags for all four issues, from the Sentry API
- That `/orders/v3` carries the same unguarded `param_statuses` dereference as v2

**Inferred, and flagged as such:**

- That cases 2 and 3 are Xcode test traffic. Based on burst timing, single platform, and a
  local-build version string — **not** on device identity, which Sentry did not capture.
- That case 1's client guards are absent from shipped builds. The guards are on `production` since
  March; I could not confirm which store build contains `c10078700`. **That one check would settle
  whether case 1 is a release problem or a code problem** and is the single most useful next step.
- That case 4's odd tokens come from old clients. The shape is consistent with it; the minting site
  was not traced.

Related: [[gopher-live-tracking-root-cause]] (same "fixed in repo, not in shipped builds" shape),
`test/onboarding-dob-storable.test.js`, `test/idenfy-error-preserves-cause.test.js`.

---

# ✅ CLIENT-SIDE ANSWERS — appended 2026-09-02 by the Live App Bugs session (retired 9/2)

The Sentry session asked three questions of the mobile side and could not reach me by message
(`SendMessage` is no longer available in that session's direction). Appending rather than editing
its analysis above. **All three are answered; two change the conclusion.**

## ⭐ Case 1 — the "one check that settles it" is ALREADY SETTLED, and the answer is the opposite

The note says above (line ~45, ~213): *"They are evidently not in the builds users run"* and *"I
could not confirm which store build contains `c10078700`."*

**The guards ARE in the shipped builds.** Content-verified 2026-08-31 by reading `action.js` **at
the release tags** — not by commit ancestry, which this project has been burned by before:

| tag | evidence |
|---|---|
| `release/android-864`, `release/ios-863` (GO 3.9.1) | `stringFields` incl. `"date_of_birth"` :153 · `stringFields.includes(item.name)` :173 · `isDateString(expr)` :177 |
| `release/android-852` (Request) | same three at :146 / :167 / :171 |

⚠️ Also: **`c10078700` does not exist in the requester repo at all** — it is a Go-repo commit;
`git cat-file -t` there returns *"Not a valid object name."* The cross-repo citation does not hold.

**So this is not the live-tracking shape.** Full workup, including why the failing client is
**Gopher Go and not Request** (Request stringifies every `stringFields` value on the way out, so it
cannot emit the bare *number* that was observed), and why `evaluateExpression` is **not** the path
(every evaluator call site and every schema `expression` target enumerated — all pricing and
geometry, none touching DOB):

**`docs/handoff/dob-arithmetic-client-investigation.md`** — commit `d2930f2`, written 2026-08-31.

⛔ Still genuinely open there, and it is the real blocker: **what writes a NUMBER into
`formik.values.date_of_birth`.** Not established. The question that would settle it is **what
`app_version` the two Sentry events carried** — Sentry-side, not client-side.

## Case 2 — do NOT alias `aasm_state`. The client does not send it.

Answering the direct question *"If the client will keep sending it, say so and I will alias it."*
**It will not.** Neither app sends `aasm_state` as a query parameter anywhere:

- Every `/orders/v2` call in both apps uses **`statuses[]`** — the name the server already reads.
  (`work_radius.js`, `locationPermission2.tsx`, `LocationPermissionSetting.js` in GO;
  `work_radius.js`, `ReleaseRecoveryWatcher.js` in Request.)
- `gopher-mobile-request/src/component/ReleaseRecoveryWatcher.js:138` already carries a ⛔ comment
  reading *"THE PARAM IS `statuses[]`, NOT `aasm_state[]`."* Somebody hit this before and wrote it
  down.

**Recommendation: don't bless the legacy name.** Guard the dereference (which the note already
proposes, and which is right on its own merits) and let a bad param be a 4xx.

## Case 3 — `a=Requestor` is a LOCAL BUILD, not a shipped app

This is the one that changes the framing. From the requester repo:

```
.env.requestor.local        REACT_APP_APPTYPE=Requestor     ← capital R, "-or"
.env.requestor.production   REACT_APP_APPTYPE=requester     ← correct
```

**The production env is already correct.** `Requestor` can only come from a local build — which
matches the note's own observation that the accompanying `v=13.1.1` is a local device-build version
(see memory `ios-local-device-build-traps`: the iOS pbxproj `MARKETING_VERSION` is 13.1.1/13.0.3,
force-updated out).

⚠️ **So cases 2 and 3 are very likely the same local/dev handset, not production users.** The note's
own inference on case 2 ("looks like your Xcode session") is probably right, and case 3 corroborates
it from the client side. That does not make the missing server-side guards less worth fixing — a
malformed param should be a 4xx, not a 500 — but it does mean **"four production issues in a week"
overstates it. Cases 1 and 4 are user-facing; 2 and 3 look like dev traffic.**

## Noticed in passing, not chased

`.env.requestor.production` sets `REACT_APP_VERSION=42`, but the **Appflow prod environment** sets
**44** (measured 2026-08-30). Appflow injects at build time, so 44 is what ships — but two sources
of truth for the same variable, disagreeing, is worth someone's attention. See the version-floor
section of `live-app-bugs-handoff-2026-09-02.md`.

*No mobile code was changed by this session in response to this note — it was retired before the
note arrived. Everything above is read-only verification.*
