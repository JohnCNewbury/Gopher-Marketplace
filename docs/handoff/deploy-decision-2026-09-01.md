# Deploy decision — what would go live, and what it costs if it is wrong

**Prepared 2026-09-01 for the owner.** Standing rule: *"Nothing is ever to be pushed to production
without verification that I fully understand the risk/rewards and what the work is solving for."*
This is that verification. **Nothing has been deployed.**

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

## What I need from you

1. **Deploy these three files — yes or no?**
2. **Include or exclude `gopher-deals-feed.js`?**
3. If yes, I will re-verify by **content** on **both hosts** afterwards — GitHub Pages and
   TigerTech, since a push to `main` publishes to both.

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
