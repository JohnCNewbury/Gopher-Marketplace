# G40-68 — Gopher profile: All vs category-filtered previous jobs

**Jira:** G40-68 (Task, High) · Epic **G40-1 Bug Fixes & Polish** · Label `worker`
**Assignee:** John Newbury
**Surfaces:** Request web `Final/gopher-request.html` · Connect `Final/gopher-connect.html` · Request app `_prototypes/Request/gopher-request-home.html`
**Scope of this branch:** FRONT-END, demo-grade. Filtering + labels + empty state are real; the
per-job top-level category tags are seeded demo data (real tags come from the backend).

---

## Why this wasn't already solved

The new flow had a **cosmetic stub only**: two dead `<span>`s reading `View All Previous Jobs` /
`View All Previous ${firstWord} Jobs Only`, where `firstWord` was just the first word of the request
title (e.g. "Junk Removal" → "Junk"), over a **static 2-item** history. No click behavior, no real
filter, no empty state, wrong wording, and the category wasn't one of the four required buckets. So
the ticket was **not** solved — this session built the real feature.

## ✅ Built (front-end)

Both Request web and Connect now render, in the Gopher profile opened from Interested / Bids /
Counter Offers (shared `.profile-detail` component):
- **Two real toggle options** — **View All Previous Jobs** (default, `.on`) and **View Previous
  [Category] Jobs Only**, as buttons wired via a delegated `[data-jobfilter]` handler.
- **Dynamic top-level category** mapped to exactly one of **Delivery / Need A Ride / Service /
  Other**, from the active request:
  - Request web: `__topCategoryOf(r)` (from `r.category`/`r.topCategory`, else a title heuristic).
  - Connect: `window.__ecTopCat(state.category)` (the flow's category key).
  - Mapping: `delivery→Delivery`, `ride→Need A Ride`, `other→Other`, and
    `moving/home/labor/junk/yard→Service`.
- **Client-side filtering** — each job row carries `data-cat`; the category button shows only rows
  whose `data-cat` matches the active bucket, All shows everything.
- **Empty state** — `No Previous [Category] Jobs` shows when the category filter matches nothing.
- **Wording fixed** to the ticket's ("View Previous [Category] Jobs Only", not "View All Previous …").

### Demo data makes every AC visible
The seeded per-Gopher history spans categories (Service ×2, Delivery ×1, Need A Ride ×1). So a
Service request shows 2 filtered jobs, Delivery shows 1, Need A Ride shows 1, and an **Other**
request shows the **empty state** — all four label cases + the empty state are demonstrable by
opening a profile from requests of different categories.

### Preview
Open a request → its **Interested/Bids** list → **Review Profile** → toggle the two options. The
category label reflects that request's top-level category.

## 🔧 TO BUILD (developer / backend)
- **Tag previous jobs by top-level category** on the backend and return them queryable by category
  (the prototype uses a seeded demo list). Everything else (labels, toggle, filter, empty state) is
  done and maps onto real data with no UI change.
- **Pass the active request's top-level category into the profile view** at open time (Request web
  uses a heuristic fallback today; Connect reads the flow's `state.category`). Confirm the four-bucket
  mapping matches the production category taxonomy.

## Acceptance criteria → status
| Scenario | Status |
|---|---|
| 1 — All shown by default; category option visible below | ✅ done |
| 2 — label reflects active request's top-level category | ✅ done (4-bucket map) |
| 3 — category filter shows only matching jobs | ✅ done (client-side; real tags = backend) |
| 4 — empty state "No Previous [Category] Jobs" | ✅ done |
| 5 — correct across all four top-level categories | ✅ done |
| Applies from Interested / Bids / Counter Offers | ✅ shared profile component |

## Request app (mobile) — now built too
`_prototypes/Request/gopher-request-home.html`: the Request Details panel's **Review profile**
action was a toast stub. Added a real **`profile` view** to that panel's render state machine —
worker hero + the same two options (**View All Previous Jobs** / **View Previous [Category] Jobs
Only**) + category-tagged demo history + **No Previous [Category] Jobs** empty state. Top-level
category derived from the active request (`REQ.title`). Reached from any **Review profile** button
(Interested / Considered / hired crew); header/Back returns to the prior list.

## Notes
- Only one profile-render path exists per surface, so there's no second stub left behind.
- The mobile phone-frame **simulator** (`gopher-request-prototype.html`) embeds screens as base64;
  it reflects the new profile view once re-embedded (same re-embed step noted for G40-40).
- Figma ref (design): https://www.figma.com/design/aRFH8dqUfSHLJTb89VZYNh/Jira-Tickets?node-id=83-7733
