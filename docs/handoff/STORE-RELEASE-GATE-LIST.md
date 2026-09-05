# ⛔ STORE RELEASE GATE LIST — do these when the apps are LIVE in the stores

> **Written 2026-09-05.** This is the checklist for the moment a store release actually reaches
> users. Everything below is **built, tested and deliberately not activated**, each waiting on the
> same event.
>
> **Nothing here is a rule.** It is a countdown list, and it should shrink to nothing and then be
> deleted. If an item is still here after the release has been live a week, that is the bug.

## The distinction that governs this whole file

**Merged ≠ submitted ≠ live.** Three different states, and only the third unblocks anything here.

| state | what it means | unblocks this list? |
|---|---|---|
| merged to `production` | the code is in the branch | ❌ **no** |
| in a build submitted to the stores | Appflow ran, the stores have it | ❌ **no** |
| **release LIVE, users updating** | the binary is downloadable and installs are moving | ✅ **yes** |

**Why the distinction is load-bearing rather than pedantic:** there is **no OTA on these apps**.
The stores ship binaries. A client merge changes what a *future* build contains and changes
**nothing** for anyone holding today's app. Every item below is a server-side change that would
misbehave against the currently-installed client.

**Current position, 2026-09-05: an Appflow build was cut and submitted.** That is row 2. Nothing
on this list is unblocked yet.

---

## 1. `gopher-backend-api!436` — the $0 offer floor, server half

**Ticket:** G40-415 (priority **Highest**, Code Review) · **Doc:**
`docs/handoff/offer-floor-2026-08-26.md` (the authority) · **Branch:**
`fix/offer-must-be-nonzero` · **Memory:** `worker-offer-nonzero-rule`

**The rule (owner, 2026-07-17, restated 2026-08-26 on order 64826):** *"We can't allow users to
set an offer to $0 ever."* — `offer > 0` **unless** `offer_by_gopher` is true.

**Client half already shipped** — `!252` (`21f14644ba9e`), merged 2026-08-31, browser-verified by
the owner against production: `$0.00` blocked with the reason shown, `$0.01` submits, and **`$0`
with the bid toggle on still submits** (the row that matters — a naive implementation silently
kills the bids product).

### ⚠️ Why it must not merge before the release is live

`src/component/requestOrder.js:312` in the **shipped** client is an empty `else` block. A live
requester submitting `$0` against a guarded server gets a **403 and sees nothing at all** — no
message, no error, no retry.

**That is worse than the bug it fixes.** A `$0` order today is *recoverable*: a worker can
counter-offer, and the `max($20, 1.5 × offer)` cap means the **$20 floor binds**, so the job still
gets done at a real price. A swallowed 403 is recoverable by nobody. This is exactly the owner's
2026-08-26 ruling — *"leaving it is better than killing the broadcast."*

**Scale, so the urgency is weighed honestly:** 282 zero-offer non-bid orders all-time, **71
delivered** — but **since 2026-01-01 it is 2 of 104**. Largely historical, not a current bleed.

### When the release is live, in this order

1. **Rebase** `fix/offer-must-be-nonzero` onto `production`. It was **150 commits behind and
   conflicted** as of 2026-09-05.
2. ⚠️ **Re-verify placement — a clean rebase proves nothing about it.** `create.js` must fire
   **before** `payment_actions.charge.create` (no Stripe token yet); `update.js` must fire
   **after** the order lookup and both state checks, so a dead or claimed order still reports as
   dead or claimed rather than as a bad offer.
3. Run `test/offer-floor.test.js` and the full suite.
4. Merge — **target `production` · squash NO · delete source NO**.
5. Close **G40-415 AC 6**.

✅ **AC 5 is NOT open — corrected 2026-09-05.** It was already satisfied on 2026-08-29 by
`c67c482aa` (an ancestor of `production`): `src/helpers/validation.js` no longer exists in the
requester app and `validateRequire` has **zero occurrences** anywhere in the repo. The ticket's
2026-09-01 comment said otherwise and was stale; that stale line is what made this look open, and
it was repeated here before being checked. **G40-415 is down to AC 6 alone.**

⚠️ The identical dead file **does** still exist one repo over, in `gopher-mobile-gopher`
(`src/helpers/validation.js`, 0 importers). Out of scope, flagged not fixed, and deliberately
left until the current release is out of the way.

---

## 2. G40-350 / G40-410 — the TrustShield gate removal and the iDenfy exit

**Doc:** `docs/handoff/trustshield-gate-removal-interim.md` · **Memories:**
`trustshield-cliff-and-gate-removal`, `idenfy-exit-decided`

**The state as recorded 2026-09-04:** all backend and client work merged and deployed, **11 of 12
acceptance criteria device-verified**. Only the store release remains.

### ⚠️ The env var is NOT a contingency — it is a component of the release

The tempting reading is that `TRUSTSHIELD_MIN_AGE=21` un-gates iDenfy on its own, with no deploy.
**It does not, and cannot.** The shipped `3.9.1` client gates on its **own hardcoded threshold**,
so the server setting cannot loosen anything for an installed app. The env var's real job is to
stop the **new** client's un-gated flow hitting a 403 at submit — so it must be correct **at the
moment the release goes live**, neither before as a rescue nor after as a fix-up.

### ✅ Contradiction SETTLED 2026-09-05 — the env var IS live

The interim doc disagreed with itself: line ~64 said `TRUSTSHIELD_MIN_AGE=21` was confirmed live,
its §3 table said *"REINSTATED, still unset"*. **Line 64 was right.** Read directly off
`Gopher-Production`:

| variable | value |
|---|---|
| `TRUSTSHIELD_MIN_AGE` | **21** |
| `TRUSTSHIELD_TOKEN_GATED_AGES_ONLY` | **false** |

Control: 64 environment variables visible, so this is a real reading rather than an empty result.
An earlier attempt the same day returned nothing and **that was an expired AWS session, not the
configuration** — the trap in `aws-cli-session-expiry-reads-as-zero-results`. `aws sts
get-caller-identity` first, every time.

The stale table row in `trustshield-gate-removal-interim.md` has been corrected.

⚠️ **Filter the query to those two names.** A broad `grep -iE "TRUSTSHIELD|IDENFY"` over the EB
configuration also returns `IDENFY_API_KEY`, `IDENFY_SECRET_KEY` and
`IDENFY_CALLBACK_SIGNING_KEY`. Never paste that output into a doc, a ticket or a transcript.

**So item 1 below is done. What remains on G40-350 is the store release itself.**

### Also on this ticket, from the interim doc's own table

| # | item | where | needs |
|---|---|---|---|
| 1 | disable the server-side gate | `TRUSTSHIELD_MIN_AGE=21` | ✅ **done — verified live 2026-09-05** |
| 2 | remove the client tap-gate, **keep the under-21 hide** | `RequestCategoryBlock.js` | store release |
| 3 | stop hiding the A/R toggle for under-30 | `togglebutton.js:139` | store release |
| 4 | error state instead of an infinite spinner | `idenfy.js` | store release |
| 5 | TrustShield in **Account**, captured by us not iDenfy | client | store release |
| 6 | post-cliff message that does not send users into a retry loop | `trustshield.js` | ✅ done, backend only |

### ⚠️ The one genuinely irreversible deadline on this ticket

The worker's ID-confirmation screen **hotlinks the requester's selfie and licence from iDenfy,
live, at completion time.** When the iDenfy account lapses those images are gone and **the
completion flow breaks for every existing holder.** Mirroring them is only possible *while the
account is alive*. See `trustshield-gate-removal-interim.md` §5 item 4. This is not gated on the
store release — it is gated on the vendor account, and it is the item with a hard stop.

**Owner constraint (2026-08-04):** everyone who already holds TrustShield **keeps it**, and their
completion protocol behaves identically end to end. Only *new* enrolment is shut off. The
enrolment kill switch is merged (`c86875bb` → `b75b4ac3`) and **inert until its env var is set**.

---

## 3. Carried device gates from the 2026-09-05 sprint

These are already closed on their tickets, listed only so nobody re-opens them looking for a
store-release dependency that does not exist.

| ticket | state |
|---|---|
| G40-424 | ✅ closed — device-verified iOS + Android 2026-09-05 |
| G40-426 | ✅ closed — AC4 tap routing verified on the A50, build 905 |
| G40-420 | ✅ closed — device-verified both platforms |

⭐ **A web-layer fix may already be on the handset.** G40-424 waited on "the Appflow build" it did
not need — the fix had shipped in build 902 on 9/4, proven by pulling the installed APK and
grepping its bundle. **Before assuming an item here needs the release, check what is installed:**
`adb shell pm path <pkg>` → `adb pull` → `unzip 'assets/public/*'` → grep `main.*.js` for a string
unique to the fix. For a **native** fix, grep `classes*.dex` instead.

---

## How this file ends

Delete it. When items 1 and 2 are done, this file has no reason to exist, and leaving it behind is
how a countdown list turns into a fossil that reads as current.
