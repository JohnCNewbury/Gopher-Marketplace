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

**Current position, 2026-09-05 (evening): iOS is LIVE, Play is awaiting approval.**

| surface | state |
|---|---|
| App Store GO **3.9.2** | `READY_FOR_SALE`, phased release **day 1** |
| App Store Request **3.8.2** | `READY_FOR_SALE`, phased release **day 1** |
| Play GO **866** | staged **20%**, in review |
| Play Request **854** | staged **20%**, in review |

⛔ **OWNER DECISION 2026-09-05 — nothing on this list moves until 100% rollout on BOTH stores.**
Verbatim: *"we'll leave both until we're 100% launched on both stores."*

**That is a stricter bar than this document's own "release LIVE" row, and deliberately so.** At
phased day 1 with Play unpublished, effectively every user is still on **3.9.1** — so "iOS is live"
unblocks nothing here. It applies to **both** items below: the `!436` offer floor and the
TrustShield / iDenfy work.

⚠️ **On `!436` specifically, one thing verified today that sharpens why waiting is right.** The
shipped 3.9.1 client's offer submit ends in `catch (error) { Sentry.captureException(error); }` and
clears `onSubmitLoading` **only** in the success branch. So a guarded server does not merely fail
silently — it leaves the **button stuck in its loading state**. The user cannot tell an invalid
offer from a broken app, which is why "they can contact support" does not hold: nothing tells them
there is anything to contact anyone about. *(Verified on the `makeAnOffer` path; the exact
order-create call was not isolated, and this file's earlier citation of `requestOrder.js:312` is in
fact the polling function, not a submit.)* `!436` also still needs its rebase — 150 commits behind
and conflicted — so the waiting period is not idle time.

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

### ✅ CORRECTED 2026-09-05 — the "irreversible" iDenfy item is largely DONE

This section previously said the worker's ID-confirmation screen hotlinks the requester's selfie
and licence live from iDenfy, and that mirroring them was the one thing that becomes impossible.
**That was written from the ticket, not the code, and it is out of date.** Verified today:

| | |
|---|---|
| `scripts/trustshield-export-images.js` | ran **2026-08-07/08** |
| objects under `uploads/trustshield/` | **20,391** |
| serve path | **mirror FIRST, iDenfy as fallback** — `helpers/trustshield_files.js`, live on `production` |
| self-repair | a mirror miss iDenfy *can* still answer is copied into the mirror in the background |
| internal capture | takes precedence over both |

So existing holders are **not** waiting on anything here, and the completion flow does not go blank
the day iDenfy stops answering.

### ⚠️ What IS still open — small, real, and time-bounded

**122 of 7,004 active scan refs have no mirror.** Measured 2026-09-05 by set-differencing the
distinct active `idenfy_scan_ref` values against the S3 prefixes: 6,882 covered, **0 orphans**.

About 98 of those were already unrecoverable when the export ran (that run found roughly that many
scan refs iDenfy would no longer answer — see the header of `helpers/trustshield_files.js`). The
remainder — roughly two dozen — **enrolled after the snapshot** and are covered only by the
self-repair path, which works **only while iDenfy still answers**.

**Fix: re-run the same script before the account lapses.**

```bash
node scripts/trustshield-export-images.js --dry-run   # count first
node scripts/trustshield-export-images.js             # full run
```

**Idempotent and resumable** — it skips every scan ref already recorded OK, so a re-run costs only
the stragglers. SELECT-only on our DB, file reads on iDenfy (billed on approved verifications, not
file reads — confirmed in writing by the vendor 2026-08-03), writes only to our own private S3.

⚠️ **It does `require('../models')`, so it runs the production boot DDL** — the same trap as
`lib/sendPushNotif.js`. Read `api_version` back with raw `pg` afterwards.

⚠️ **The credit balance is the clock, and the last reading is stale.** 147 credits on 2026-08-29 at
~11.8/day projects to exhaustion around **10 September**. Re-read from **Finance → Identification**,
never the Overview — the Overview renders `used / limit` and has already been misread once as
`remaining / total`, wrong by a factor of twenty.

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
