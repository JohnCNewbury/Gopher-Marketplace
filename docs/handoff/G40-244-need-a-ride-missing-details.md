# G40-244 — "Need a Ride" details on the Gopher's view — BUILT, awaiting UI ruling + device test

**Type:** Bug (`worker`) · **Priority:** Medium · Sprint "Payment Options" (2026-09-07 → 09-16)
**Branch:** `G40-244-need-a-ride-details` in `gopher-mobile-gopher`, off `origin/production`
**Commits:** `ac77eb10f`, `1235747bb` · **Side-by-side:** [`G40-244-side-by-side.html`](G40-244-side-by-side.html)

> **Status, honestly stated.** The code is written, builds, lints, passes all eleven contract
> guards and is measured at 375px. **Two things are outstanding and neither is mine to close:**
> the owner's ruling on the visible UI change (standing rule: side-by-side first), and a device
> test against a real ride order. Nothing here has run on a phone.

---

## What was actually wrong — the ticket overstated it, and that matters

The ticket says three fields are missing. **One was.**

| Field | Ticket says | Verified state on `origin/production` | Action taken |
|---|---|---|---|
| **Rider count** | missing | ❌ **genuinely absent** — no `noof_rider` anywhere in either Gopher-facing view | **Added** |
| **Trip Distance** | missing | ✅ coded, `RequestDetailPullOver.js:3045`, `${tripDistance} mi` | none needed |
| **Special Instructions** | missing | ✅ coded, but captioned **"Details:"** | **Renamed + relaid out** |

**Why two working fields read as missing.** Both render inside
`display: <value> ? "flex" : "none"`. When the value is empty they do not error, do not warn and
do not log — they vanish, and the screen looks deliberately designed without them. That is the
whole explanation for a one-row bug being filed as three, and for it standing from 2025-12-30 to
2026-09-08.

---

## The data path — verified first-hand, not inherited

The 2026-07-07 and 2026-07-19 comments both ended at "verify the payload." It was verified, and
**the payload was never the problem.**

| Link | Evidence |
|---|---|
| Ride form collects all three | `gopher-mobile-request` `src/json/requester/needaride.json` — `noof_rider` (counter, default 1) mapped to `order_info`; `special_instructions` (textarea) mapped top-level; pickup + dropoff address fields |
| Riders persisted | `controllers/order/order_info.js:58` — `set_order_info` writes `noof_rider` |
| Instructions persisted | `special_instructions` is a column on `models/orders.model.js:17` |
| **Which endpoint feeds the pullover** | every open path in `getOrders.js` calls `getOrderById()` → `API.get("orders/" + id)` → **`order_view`** (`controllers/order/retrieve.js:2479`) |
| `order_view` returns what's needed | `order_info` via `get_order_info(id)`, plus `response.pickup_address` / `response.dropoff_address` with lat/lng |
| Miles, not a locale guess | `helpers/functions.js:672` calls Google Distance Matrix with **`units=imperial`** and parses only the `mi` form |

⚠️ **A trap worth recording:** the **available-orders feed**
(`get_gopher_active_and_available_orders`, `:1741`) does **not** carry these — `get_order_details`
in `services/orders.services.js` returns `orders` rows + attachments + ratings only, **no
`order_info`**, and the feed sets `address`/`addresses`, never `pickup_address`/`dropoff_address`.
So a future change that renders this pullover straight from the list payload instead of
re-fetching by id would silently blank all three rows again. **The `orders/:id` re-fetch is
load-bearing.**

---

## What changed

**1. Riders row** — `RequestDetailPullOver.js` (pre-accept) **and** `ordercard.js` (accepted
order). Gated to `category_type === "Need a Ride"` and the presence of `order_info`; always shown
for rides.

*Why both screens:* the ticket scopes to pre-accept, but adding it only there leaves the Gopher
who is **driving to collect the riders** unable to see how many are coming — the same defect on
the screen where the number is finally acted on.

*Why `String(x ?? 0)`:* `DetailBlock` gates its value as `{props.valueText && <p style=…>}`.
**Rendered** (not read) through `react-dom/server`, that gate fails two different ways:

```
valueText={undefined|null|""}  ->  <p>Riders:</p>                    (no value at all)
valueText={0}                  ->  <p>Riders:</p>  0                 (RAW unstyled text node)
valueText={String(0)}          ->  <p>Riders:</p> <p style=…> 0</p>  (correct)
```

A first draft of this work asserted "a 0 vanishes" for both cases. **That was wrong** — a 0
renders, just outside the styled `<p>`, in the wrong font with no leading space. Corrected against
actual render output.

**2. `Details:` → `Special Instructions:`** on both screens. Every requester form that collects
this field asks for it under **"SPECIAL REQUESTS / Any special instructions?"**
(`needaride.json`, `grocery.json`, `restaurant.json`, `generalerrand.json`, `courier.json` …), so
`Details:` named it as nothing the requester was ever asked — and collided with the separate
`Description:` row directly above it.

**3. The instructions row moved to the `Description:` row's two-inline-spans shape.** This is not
cosmetic and it is the non-obvious part:

> `DetailBlock`'s `title`/`valueText` props render caption and value as **separate flex items**, so
> the caption's width is subtracted from the value's. Measured in a browser at 375px, the longer
> `Special Instructions:` caption left the text a **227px** column — **narrower than the 302px the
> old `Details:` caption allowed.** The rename on its own would have made long instructions *harder*
> to read while appearing to satisfy AC #5. As inline spans the value flows beneath the caption
> across the full **337px** row.

---

## Deliberate deviations — flagged, not silent

1. **The rename is global, not ride-only.** AC Scenario 6 says Delivery/Service behaviour is
   "unchanged — no regression." A caption correction *is* visible on those types. It was applied
   globally because the label was wrong for **every** category, not just rides. **If the owner
   wants it ride-only, say so — it is a one-line gate.**
2. **`ordercard.js` (accepted-order screen) is outside the ticket's stated surface.** Both changes
   were applied there because a Gopher would otherwise see the same field under two different names
   before and after accepting. Per the owner's 2026-08-27 rule this is fixed here rather than filed
   as a new ticket.

---

## Verification — what is proven and what is not

**Scenario 6 — Delivery / Service unaffected — PROVEN (no device needed):**

- **What those types actually see:** every hunk this branch adds to `src/` was enumerated — three
  per file, six in total (the Riders row; the instructions block). Nothing else is touched. So a
  Delivery or Service request has **exactly one** visible difference: the instructions caption and
  its wrapping. That is the only open question for the owner, and §2 of the side-by-side now shows
  a Delivery request before and after.
- **The gate is evaluated, not restated.** The guard pulls the Riders row's `display:` expression
  **out of the shipped source** and runs it against fixtures. Restating the rule inside the test
  would only test the test's copy of it.

  | Fixture | Riders row | Both screens |
  |---|---|---|
  | `Need a Ride` + `order_info` | shown | ✅ |
  | `Delivery` · `Home Services` · `Junk Removal` · `Hourly / Day Labor` | hidden | ✅ |
  | `Need a Ride`, `order_info` absent **or** `null` | hidden — no bare caption | ✅ |

- Measured at 375px: Riders row **height 0** in the Delivery pane, **height 15** in the ride pane.
- Five further mutations, five failures (ungate the row; widen it to Delivery on each screen; drop
  the `order_info` check; invert the category test).

⚠️ **On `new Function` in that guard** — deliberate, and *not* what `assert-safe-eval.mjs` forbids.
That guard protects the **app runtime on a user's phone** evaluating expressions carrying
**server-supplied** values (G40-284). This runs at build time on a string read from a file in this
repo at the commit CI is testing, and never reaches the bundle.

**Also checked — no defect found.** The available-list card (`GopherOrderCardView.js`) gates trip
distance on `bodyProps.pickupAddress.latitude` while the component holds `pickupAddress` as an
**array** — which looked like a permanently dead row, given the available feed carries no
`pickup_address`/`dropoff_address` either. **It is not a bug:** `:262` unwraps the array to element
`[0]` before passing it down, and the card sources addresses from the feed's `addresses` list.
Recorded so nobody re-investigates the shape mismatch.

**Proven:**
- Production build compiles. `Riders:` and `Special Instructions:` present in the emitted bundle;
  `"Details:"` absent (0 occurrences).
- `eslint ./src/ --max-warnings=0` and `prettier . --check` clean (repo-pinned eslint 8.57.1 /
  prettier 3.6.2 — **not** a stray npx download; that mistake was made once here and caught).
- All **eleven** contract guards pass, including the new one.
- `DetailBlock` runtime behaviour rendered via `react-dom/server` against the real component:
  unwrapped `0` escapes the styled `<p>`; unwrapped `undefined` renders nothing; `String(0)` renders
  correctly; empty instructions produce a zero-height row (AC #2); a 175-character value renders
  verbatim with no truncation and no see-more (AC #5).
- Measured in a browser at **375px**: no horizontal overflow, instructions value **337px across 4
  lines**, empty row zero-height.

**NOT proven — do not record as verified:**
- **Nothing has run on a real device against a real ride order.** AC Scenarios 1, 3 and 4 and the
  ticket's own QA note ("test on both iOS and Android", "validate Trip Distance against a known
  route") need a live ride.
**Scenario 6 is now CLOSED** — see below. Only Scenarios 1, 3 and 4 need a device.

---

## New CI guard

`scripts/assert-ride-details-visible.js`, wired into `.gitlab-ci.yml` with `needs: []`. Asserts
both screens against a **comment-free** copy of the source, because the blocks carry prose naming
the very captions being asserted.

**Every check was mutation-tested — seventeen deliberate regressions, seventeen failures.** One early
"pass" was a mutation that never applied (prettier had wrapped the target across lines); the test
was vacuous, not the guard. A guard that has never failed proves nothing.

⚠️ The first draft of the guard's comment-stripper tried to match `{/* … */}` as one unit and
**silently ate 2,800 lines** — a plain block comment after an unrelated `{` starts the match, and
the non-greedy tail runs to the next `*/` followed by `}`. Every assertion still "passed", against
a file the stripper had deleted the subject from. It now strips block comments, then line comments,
then leftover `{}` — the same two-step the sibling guards use.

---

## Known edge case — left alone deliberately

`get_distance_origin_to_destination` parses only the `mi` form of Google's imperial response. Under
~0.1 mile Google returns feet (`"400 ft"`), the parse misses, and the distance falls through as `0`
→ the view shows **"0 mi"**. Not reachable for a real ride, and the helper is shared by every
distance caller, so changing it would decide for all of them. Recorded, not touched.

---

## The Go prototype — item 4 of the ticket's own remaining-work list

The 2026-07-19 flow scrub listed four remaining items. Items 1–3 are the app work above; **item 4
was "add the three structured rows to the Go job detail"**, and it is done in the same pass — the
owner's 2026-09-01 rule is that the prototype moves *with* the change, never as a follow-up ticket,
because the relay is what loses work.

**What it was:** rider count existed only as prose inside the job's `scope` string — literally
`"1 passenger + 2 bags"` — the single `pin` stat was labelled just `distance`, and there was no trip
distance and no instructions section anywhere on the job detail.

**What it is now** (`_prototypes/Go/gopher-go-prototype.html`):

- `riders`, `tripMi` and `special` are **structured fields** on the ride jobs, not prose.
- The job-detail quick-facts block shows **five** facts for a ride: `to pickup` · `trip distance` ·
  `riders` · `est. time` · `posted`.
- ⚠️ **The `pin` stat was relabelled `distance` → `to pickup` for rides only.** A ride carries *two*
  distances — how far away the pick-up is, and pick-up → drop-off — and leaving both called
  "distance" would be worse than showing one. Every other category still reads `distance`.
- **Special instructions get their own section**, in full, omitted entirely when absent.
- `String(j.riders)` for the same reason as the app: a `0` must print rather than vanish.
- CSS is scoped to a `.rf-ride` modifier so **no other category's grid moves**.

**Verified in the running prototype, not asserted** (served at `localhost:8517`, launch config
`g40244proto`):

| Case | Result |
|---|---|
| Ride **with** instructions | grid `rq-facts rf-ride`, 5 facts, instructions section present |
| Ride **without** instructions (2nd ride job, deliberately) | 5 facts, instructions section **absent** — Scenario 2, live |
| Delivery / Errand | grid `rq-facts`, **3** facts, label `distance`, no instructions section — unchanged |
| Junk Removal · Hourly / Day Labor | unchanged |

Fact-card widths measured 114/114/114 then 175/175 — both rows full width, no ragged trailing row.

⚠️ **This change is on disk only and git cannot see it** — `_prototypes/` is gitignored, so there is
no commit carrying it and no diff to review. Backup of the pre-change file was taken before editing
and the edit was applied under an mtime guard, because another session had written to this file
**during** this one (17:32) and gitignored files have no stash or diff to fall back on.

## Files

- `src/component/layoutComponent/RequestDetailPullOver.js` — Riders row; instructions caption + layout
- `src/component/ordercard.js` — same two changes on the accepted-order screen
- `scripts/assert-ride-details-visible.js` — new contract guard
- `.gitlab-ci.yml` — guard wired in with `needs: []`
- `_prototypes/Go/gopher-go-prototype.html` — **gitignored, disk only** — structured ride fields,
  five-fact grid, `to pickup` relabel, special-instructions section

## Merge hand-off

- **Target branch:** `production` — `next` is dead (0 ahead / 12 behind, drained 2026-09-04)
- **Squash:** *owner's call.* No SHA pins reference this branch, so squashing is safe here
- **Delete source branch:** *owner's call.* Suggest **no** until the device test passes
