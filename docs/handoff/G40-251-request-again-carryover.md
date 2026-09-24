# G40-251 — Request Again must carry over the original order's address + photos

> **STATUS 2026-08-12 — ALREADY FIXED ON PRODUCTION. No code change made or needed.**
> Both remaining acceptance criteria pass on the live app today. The ticket has been stale since
> late January 2026; the defects it describes were resolved days after QA filed them, as a side
> effect of other work, and nobody re-tested. **Recommend closing as already-fixed.**

**Jira:** G40-251 (Bug, Highest) · **Sprint** John "Low Risk"

---

## The evidence — production data, requestor 1

| Order | Created | Pickup | Drop-off | Images |
|---|---|---|---|---|
| **63847** | 07-31 11:38 | Sheetz, Avent Ferry Road | 405 Shorehouse Way | **1** |
| **63853** | 07-31 14:10 | Sheetz, Avent Ferry Road | 405 Shorehouse Way | **1** |
| **64276** | 08-11 14:52 | Sheetz, Avent Ferry Road | 405 Shorehouse Way | **1** |
| 64302 | 08-12 10:40 | Starbucks in Harris Teeter | 405 Shorehouse Way | 0 |
| 64325 | 08-12 18:40 | Walmart Supercenter | 405 Shorehouse Way | 0 |

A Request Again chain carrying **both addresses and the photo** across three orders and eleven days.
Owner ran 64276 himself and reported it worked; the database confirms it.

**Order 64276 in detail** — `category_type = Delivery`, `purchase_anywhere = **false**`, with an
`Order_PickUp` row (Sheetz) **and** an `Order_DropOff` row (405 Shorehouse Way), plus one
`attachments` row. That is exactly the shape QA's order #496 failed on.

**AC1 — address carry-over:** ✅ both stops present on the cloned order.
**AC2 — media carry-over:** ✅ attachment row created on the new order.
**AC3 — copies, never linked:** ✅ by construction — `create.js` writes new `attachments` rows against
the new order id and S3-copies to `uploads/attachment/file/<new id>/`, holding no reference to the
source order.
**AC4 — graceful when absent:** ✅ 64302 and 64325 are the same flow with no media; they submitted
cleanly with zero images and no error.

## Why it was stale — the timeline

| Date | Event |
|---|---|
| 2026-01-23 | QA files both defects (#493/#494 media, #496 drop-off address) |
| **2026-01-26** | Backend gains URL-copy support — `POST /orders` accepts `attachments` as an array of S3 URLs and copies each object onto the new order (`create.js`, commit `7f7a5b38`, **G40-133** "able to remove images before added"). Built for the *edit* flow; Request Again is the same shape. |
| **2026-01-28** | Client release `1d1e4d8e6` adds `attachment: data.attachments` to `formInitValue` **and** makes `imageuploadfororder` read existing URLs from plural `attachments` |
| 2026-07-02 → 07-19 | Ticket re-scoped and flow-scrubbed **from the prototype's `DASH_DATA`**, which has no address or media fields — concluding backend persistence was missing. The live schema was never checked. |

So the fix landed three and five days after the report, incidentally, and the ticket kept describing
the January reality for seven months.

## ⚠️ A misdiagnosis this session, recorded because the shape repeats

I read `addresspicker.js` and concluded the drop-off picker prefilled from the wrong field — the
branching does send `dropoff_` to `pickup_address` only when `purchase_anywhere` is set, otherwise
falling through to `address`. I wrote and committed a fix for it.

**That was wrong.** The value that branching computes is `historyAddress`, which feeds
**`fetchGopherCount()`** — the nearby-Gopher lookup. The address the user sees comes from
`formik.values[name]` (line ~345), populated directly from the spread order data. The branching has
nothing to do with the prefill.

Shipping it would have silently changed which coordinates the Gopher-count uses, on a working
feature, dressed as a bug fix. **The owner's live test is what caught it** — 64276 exercises exactly
the branch I claimed was broken, and it worked. Commit `0c2b6f302` was deleted and never pushed.

**The lesson is the one this ticket already taught once:** the flow-scrub reasoned from the
prototype instead of the live system, and I reasoned from a code path's shape instead of its
consumer. Both produce confident, specific, wrong answers.

## What the full working chain actually is

1. `GET orders/:id` returns `address`, `pickup_address`, `dropoff_address` and `attachments`
   (S3 URLs) — `retrieve.js` ~L2945
2. Request Again spreads the whole response into `location.state.data`
   (`requestorhistory.js` ~L185)
3. `renderForm` builds initial values as `{...formInitValue(statevalue), ...statevalue}`
4. `formInitValue` maps `attachments` → both `attachment` and `attachments`
5. `imageuploadfororder` renders existing URLs from plural `attachments`, so they show and are
   removable
6. `orderObject.js:52` submits `attachments: values.attachment`
7. `create.js` copies each URL's S3 object onto the new order

**Nothing in that chain is ours to build.** It is all live.
