# G40-159 — Deactivated Gophers NOT allowed to be MY Gophers

**Status:** Built + verified (read-time safety net) · backend purge = seam
**Jira:** G40-159 · Story · Medium · `spine` · component "Gopher App (Requestor)" · KEEP · Bucket A (⇐ G40-89)
**Scaffold:** `wave2/_shared/relationships.js` (`visibleMyGophers`, `removeDeactivatedGopher`) — tested; shared with G40-202/205.

## Goal
When a Gopher is deactivated ("barred"), remove them from **every** Requestor's **MY Gopher** lists,
**Favorites**, and **previous in-app messaging conversations** — they must no longer be selectable or
visible anywhere.

## What was built — `Final/gopher-request.html`
The requestor app already funnels all saved-Gopher reads through one API and all message threads through
one builder, so a single read-time filter covers every surface:

- **Filter helpers** (next to `getThreads`): `isDeactivatedGopher(g)` (true if the name is in the
  backend-provided deactivated set **or** the record carries `deactivated / active:false / status:'deactivated'`)
  and `visibleMyGophers(list)`. Mirrors the scaffold's `visibleMyGophers`.
- **MY Gophers + Favorites** — `MyGophers.all() / count() / names() / has()` now return the **visible**
  set only. Because the Step-3 "Prioritize MY Gophers" picker (`window.__getMyGophers`), the MY Gophers
  dashboard grid (`renderGophers`), and "Hire again" all read through that one API, they're all covered
  by this single change. Writes (`add/remove/seedFromHistory`) still use the raw array.
- **Messaging** — `getThreads()` now drops any thread whose `worker.name` is deactivated, so prior
  conversations with a barred Gopher disappear from the Inbox (and the unread badge count).
- **Record flag** — `add()` preserves a `deactivated` boolean through upserts.
- **Demo** — seeds one deactivated MY Gopher (`Marcus Lane`) into the store; held in the underlying data
  (as the backend would, pre-purge) but hidden everywhere by the filter.

`DEACTIVATED_GOPHERS` is the demo stand-in for the backend account-status signal.

## Verification
- **Real file:** loads with **no console errors**; the MY Gophers dashboard grid renders the 3 real
  gophers (Devon M., Rosa P., Marcus T.) with `Marcus Lane` absent; `__myGopherNames()` / `__getMyGophers()`
  exclude him (so the Step-3 picker, which reads the same hook, is covered). Screenshot shared.
- **Isolated harness** (exact filter + `MyGophers` read methods + `getThreads` + seeds): **13/13 pass** —
  raw store holds the deactivated Gopher while `all/count/names/has` exclude him, the flag survives `add()`,
  the deactivated conversation is hidden while the active one remains, and **reactivation re-includes** him
  everywhere (proving it's the filter, not a missing record).

## Backend seam (authoritative)
- Provide the account **status** on the Gopher/user record; the client filter keys off `deactivated`.
- On the **deactivation event**, run the scaffold's `removeDeactivatedGopher` to purge the Gopher from
  every Requestor's favorites/MY Gophers server-side (the client filter is a read-time safety net, not the
  source of truth). Apply the same exclusion to any server-driven MY Gopher / messaging list.
- Re-add prevention: a deactivated Gopher should not be re-addable as a MY Gopher.

## Files touched
- `Final/gopher-request.html` — filter helpers, `MyGophers` read methods, `getThreads` filter, `add()`
  flag, one demo seed.
