# Gopher Deals — state at end of 2026-08-23

Written for a morning pickup. Everything below was verified against live systems on the
day, not inferred. Where something is unverified it says so.

---

## ⛔ ONE THING IS WAITING ON A DECISION

**A deploy of `Final/gopher-deals.html` is built, verified and NOT pushed.** It needs a
yes/no on a rider.

The commit is `a2ec9a2` (pushed to `origin/feature/deals-google-maps-audience`). Running
`scripts/deploy.sh` from a worktree pinned there ships **two** files:

| file | whose | direction |
|---|---|---|
| `gopher-deals.html` | this lane — the merchant portal dashboard | new |
| `gopher-request.html` | **another session's** ID-capture work | **rider, verified NOT a revert** |

The direction was checked by content against the live page — the pinned copy is *ahead*
(165 new lines; the 32 "removed" are rewritten ones). A diffstat shows a rider and a revert
identically, so this check is not optional. The rider's own comment reads
`Capture alignment guide (owner, 2026-08-23)`, so it is probably wanted — but it is not
this lane's work and was not tested here.

⚠️ **The tree moved again after that check.** `54a357a` — *"ID front and back are live-capture
only — uploads removed entirely"* — landed locally (unpushed) while this was being written,
touching the same file. **Re-run the dry run and re-check direction before pushing;
do not act on the table above as current.**

**To rebuild the deploy:**

```
git worktree add --detach <scratch>/deploytree <sha>
cp _prototypes/Go/gopher-banner.js _prototypes/Request/gopher-banner.js <scratch>/deploytree/_prototypes/...
cd <scratch>/deploytree && bash scripts/deploy.sh          # dry run
```

Those two banner files are **gitignored and disk-only**, so a pinned worktree lacks them and
the preflight aborts until they are copied in. Pin at **HEAD or later, never earlier** — a pin
behind live silently reverts everything shipped since.

---

## What shipped today and is live

| | |
|---|---|
| Backend `production` | `db038f0b` |
| HQ Dashboard | `d0a6f79` (remote + host) |
| Public feed | 1 live deal — **DL-0011** |

- **DL-0011 approved and published** — the first real merchant deal to complete
  registration → review → approve → feed. Verified on the public feed with its logo, and
  `earn_amount` correctly absent.
- **SP deals carry the provider's logo** (`!364`). `deal_img` was only ever set from the
  *merchant* upload flow, so **every** provider deal had published with no mark.
- **Rejection reasons are readable** (`!366`). `reject_deal` always required a reason and
  always wrote it; nothing ever selected it back.
- **HQ queue: Email button + contact links**, subject pre-filled with the deal code.
- Completion photos and picture messages now render in HQ (separate lane, same day).

---

## Open, with the next action

**1. Merchant portal — built, not deployed.** See the decision above. The scope was larger
than expected: the portal's sign-in was fake (`// Demo accepts any 6 digits`, no token), and
`GET /users/deals/mine` scopes off the token's own id, so real data was impossible without
real auth. Phone sign-in is now real; **email sign-in stays demo because no email sign-in
endpoint exists** — the email OTP verifies an account you already hold a token for.

⚠️ **The real phone sign-in has never been exercised end to end.** `/otp/get` sends a genuine
SMS, so it needs a real code. Every render branch and the whole demo path are verified.
Failure mode is safe: no token, failed fetch or error all leave the showroom content standing.

**2. DL-0012 has no logo — resubmit it.** The fix is live but does not backfill.
**Verified the fix will find something:** user 1 has two objects under
`uploads/image/business_profile/1/` (`businesslogo.jpg` 2024, `image.jpeg` 2026-08-13), both
HTTP 200. `providerLogoUrl` picks by `images.id DESC` — newest row, not newest S3 mtime.

**3. Brittany / DL-0009 — rejected, email not sent.** Her rejection reason reads
*"Incomplete owner profile."* which is accurate but thin: the real story is that **our form
failed her**. Her keywords came through as `burgers, shakes, fries` — the placeholder chips,
never her choice — and her logo, tagline and business address were collected but not stored.
A draft email is in the session transcript; the **Email** button on her row opens it
pre-addressed. Worth sending before she finds the rejection on her own.

**4. Native apps have NO deals code.** Verified across all six branches of both mobile repos
(`production`, `next`, `main`) with a control grep — the only "deal" match is `"Ideal Sans"`
in a font stack. Web publishes fine; iOS/Android receive nothing. Needs a build **and** a
store release (no OTA; Appflow sunsets 12/2027), and mobile `main` is frozen so it lands via
`next`.

**5. Deal ID reformat — SP1/SP2, MD1/MD2.** Owner: after testing completes; the three pending
deals get cancelled first. Generator is one post-insert UPDATE
(`'DL-' || lpad(id::text, greatest(length(id::text),4),'0')`). Prefix-by-track is trivial.
**The open question is the number:** "SP1, SP2" reads as per-track sequential from 1, but today
it is the global row id. Per-track needs its own counter, and a `COUNT(*) WHERE track=…`
races two simultaneous submissions into one code — so two Postgres sequences. If the row id
is acceptable (SP12, MD11 — unique but gappy) it is a one-line change. Also to decide:
backfill existing `DL-` codes or leave as history. Blast radius is small: 5 files read
`deal_code`, all reads.

**6. Smaller, unowned.** The consumer pages call `GopherDealsFeed.merge(DEALS_DATA)` with **no
`done` callback** although the module accepts one — a user who opens Deals before the fetch
lands sees demo content until they reopen. And deal rows carry no coordinates, so the feed's
proximity ordering (§7.3) is unimplemented and the coverage map has no pins; `google_maps_geocoder`
in `helpers/functions.js` was fixed earlier today and would be the input.

---

## Three traps worth not re-learning

**The deals queue returns rows under `deals`** — not `data`, not `rows` — and `?status=` is
pending-only by default. A probe keyed on `data` returns 0 for every status and reads as "the
table is empty". That produced a false conclusion today.

**Deal codes are not the primary key.** `PATCH /admin/deals/:id/*` takes the numeric `id`.
DL-0011 being id 11 is coincidence.

**A negative grep for a URL is worthless when the URL lives in a module the page loads.**
The consumer rails were called "not wired" today on exactly that mistake; they were wired,
and a memory already said so.
