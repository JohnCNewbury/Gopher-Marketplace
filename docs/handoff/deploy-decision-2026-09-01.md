# Deploy decision — SHIPPED 2026-09-01

> ## ✅ DEPLOYED. Owner: *"ship all six."* Commit `b63f744` -> `main`.
>
> Verified by **content on both hosts**, never by a 200 — and the production gate proved in a
> browser rather than asserted.
>
> | Check | GitHub Pages | TigerTech |
> |---|---|---|
> | Report on Request | ✅ | ✅ |
> | Report on Connect | ✅ | ✅ |
> | `reviewSnapshot` at capture | ✅ | — |
> | PT bridge `adopt()` | ✅ | ✅ |
> | Deals `SERVICE_LABEL` (the rider) | ✅ | ✅ |
> | Prototype money fix (`parseMoney`) | ✅ | — |
> | Prototype report port | ✅ | — |
>
> **⛔ The safety claim, proved on the live host.** Loaded
> `johncnewbury.github.io/Gopher-Marketplace/gopher-request.html?pt=1` and read the page:
> `GopherWebPT` is present (the file shipped), `GopherWebPT.on()` is **false**, and `window.GWeb`
> is **undefined**. The bridge is on production and the gate refused it. That was the one thing
> worth checking in a browser rather than trusting, because it is the claim the whole
> ship-the-bridge decision rested on.
>
> ⚠️ **HQ never answered on the rider.** The owner authorised it directly instead — it implements
> his own Ruling 9. Not a substitute for the lane's sign-off, and recorded here so nobody later
> reads the ping as having been answered.
>
> The pre-deploy analysis is kept below unchanged, including the parts I got wrong.

---

# Deploy decision — what would go live, and what it costs if it is wrong

**Prepared 2026-09-01 for the owner.** Standing rule: *"Nothing is ever to be pushed to production
without verification that I fully understand the risk/rewards and what the work is solving for."*
This is that verification. **Nothing has been deployed.**

---

## ⛔ CORRECTION, same day — it is SIX files, not four, and the rider cannot be cleanly excluded

**Read this before the section below; it was written from an incomplete measurement.**

I sized the payload by comparing `Final/` against live. That missed the deploy script's **prototype
allowlist**, which publishes eleven `_prototypes/` files to the public site as well. Two of them
changed:

| Extra file | Whose | What it carries |
|---|---|---|
| `_prototypes/Go/gopher-go-prototype.html` | this session | **the money fix** — a typed `$61.40` no longer reads as `$6,140` |
| `_prototypes/Request/gopher-request-home.html` | this session | the report port |

So the real payload is **five files of mine plus the one rider**, and the authoritative scope check
is `scripts/deploy.sh` (dry run), not my hand comparison. I had also told the owner the app
prototypes have no public host. **That is wrong for the eleven allowlisted files** — they ship.

**And the rider cannot be excluded cleanly.** The deploy is `rsync -a --delete`, so adding
`assets/js/gopher-deals-feed.js` to `EXCLUDE` would **delete the live file**, which is far worse
than shipping a newer version of it. Excluding it properly means hand-building the deploy tree and
`git rm`-ing that one path — bypassing the tested script, which is its own risk.

**No live Deals session exists to ask.** Both are retired — *"HQ Dashboard / Deals (retired 8/24)"*
and *"Gopher Deals + Go (retired 8/27 3:06pm)"* — and the two commits are dated **2026-08-28**, so
they post-date both. The commits touch that one file only, so there are no sibling paths to
identify a lane from, and guessing has already caused a misattribution here before. Of the sessions
running now, none is Deals.

So the deploy is held on one question, in the section at the end.

---

## The whole payload is FOUR files

Established by comparing content against `origin/main` file by file — **not** by
`git log origin/main..`, which on this repo lists every commit ever made and told me at first that
702 files and 132,289 lines were pending. `main` is the flattened rsync lineage and shares no
history with the feature branches, so it has no `Final/` directory at all and every path reads as
new. Then confirmed against the live host by fetching each URL and grepping for the changed string.

**698 of the 702 tracked files under `Final/` are already identical to live.**

| File | Whose | Live today? |
|---|---|---|
| `gopher-request.html` | this session | ❌ none of it |
| `gopher-connect.html` | this session | ❌ none of it |
| `assets/js/gopher-web-pt-bridge.js` *(new file)* | this session | ❌ 404 |
| `assets/js/gopher-deals-feed.js` | **another lane — the Deals workstream** | ❌ not live |

There is **no uncommitted work** under `Final/`, so nothing else rides along. (The deploy reads the
WORKING TREE, so that mattered enough to check rather than assume.)

---

## 1–3. This session's three files

### What they solve

- **Report a request** — Request and Connect gain the reporting surface the live requester app has
  had all along: six reasons ported verbatim, flagging the ORDER via the same endpoint the worker
  app uses. Today a customer on the web has no way to report a listing at all.
- **`reviewSnapshot` at capture (`57f8d0b`)** — Request never froze a snapshot for a
  user-created request, so a real customer's in-progress request rendered the **minimal fallback
  card** instead of the canonical recap. Connect always did this; Request did not.
- **No-show state, navigation state, relay repaint** — requester-side surfaces held to the live
  rule by an 84-case parity test.
- **`gopher-web-pt-bridge.js`** — the playground bridge.

### Risk

**Low, and the largest single item is the new file, which is inert.** The bridge publishes nothing
unless `?pt=1` is present **and** the host is localhost / `*.local` / a dev tunnel — an allowlist
that fails closed. On `johncnewbury.github.io` it returns immediately, and a production-host gate
test covering 13 hostnames runs as step 2 of the guard on every change.

What could still be wrong, honestly:

- The report modal and the recap card are **new UI on two live pages**. They have been driven, not
  just inspected — but they have not been seen by you, and I could not screenshot them (your
  browser pane was closed, so the page would not composite frames).
- `reviewSnapshot` changes what an in-progress request renders. It was verified as arithmetic
  (`$33.47` foots to the same numbers Step 7 shows) but a rendering regression would show on a
  customer's live request.
- **375px has not been re-checked** since the report modal was added.

### Reward

Two real customer-facing gaps close: no way to report a listing, and a fallback card where the
canonical recap belongs.

### Undo

**Minutes, and total.** The deploy is an rsync of `Final/` onto `main`; reverting is the same
operation from the previous commit. Nothing here writes data, takes payment, or changes an account.
There is no migration and no state to unwind.

---

## 4. ⚠️ The rider — `gopher-deals-feed.js` is NOT this session's work

It belongs to the **Deals** lane (`691e1af`, `4f230fe`) and implements **Ruling 9, owner
2026-08-27**: a deal card is headed by the `service_category` the provider *chose*, not by their
first keyword — so a provider can no longer rename their own deal by reordering search terms.

**It is ahead of live, not behind it**, so shipping it is a rider and not a revert. I checked,
because the dry-run shows those two cases identically and only a live fetch tells them apart.

**I am not deploying someone else's change on their behalf.** Two clean options:

1. **Include it** — it is a real fix, already committed, and it goes live with the rest.
2. **Exclude it** — build the deploy tree from HEAD and `git rm` that one file before pushing. That
   is the safe shape; pinning to an older commit is what silently reverts other people's work.

**Recommendation: include it**, but only once the Deals lane confirms it is finished. It is their
ruling and their verification, not mine.

---

## What I need from you — ONE question

You said proceed, and ping Deals. **Deals is retired, so there is nobody to ping**, and the rider
cannot be cleanly excluded from the same push. That leaves one choice:

- **A — ship all six**, rider included. It implements *your own* Ruling 9 (2026-08-27): a deal card
  is headed by the `service_category` the provider chose, not their first keyword. It is committed,
  ahead of live, and its lane is gone, so waiting waits for nobody. **This is what I would do.**
- **B — hold the whole deploy** until you have looked at the deals-feed change yourself.
- **C — hand-build the tree** and `git rm` that one path, bypassing the tested script. Possible,
  and the least attractive: it trades a reviewed change for an unreviewed deploy mechanism.

Either way I re-verify by **content** on **both hosts** afterwards — GitHub Pages and TigerTech,
since a push to `main` publishes to both.

---

## Risk / reward, in one line each

- **Reward** — closes two customer-facing gaps on live pages: no report path anywhere on the web,
  and a fallback card where the canonical recap belongs.
- **Risk** — new UI on two live pages that you have not seen; a rendering regression would be
  visible to a real customer on a real request.
- **Bounded** — the new file is inert off a dev host, gated by an allowlist that fails closed and
  by a 13-hostname test that runs on every change.
- **Reversible** — an rsync, undone by an rsync. No data written, no money moved, no account
  touched. Minutes, not a rollback plan.
- **Not mine to decide** — the fourth file belongs to the Deals lane, and shipping another lane's
  work without their word is how a rider becomes a surprise.
