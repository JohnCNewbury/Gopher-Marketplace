# Gopher Deals — registration → publication configuration spec

**Status:** configuration / data-flow spec for the human dev team. **Written 2026-08-05.**
**Ticket:** [G40-351](https://gopherapp.atlassian.net/browse/G40-351). **Parent:** G40-286 (Deals front-end consolidated).

---

## 0. What this document is, and is not

This is a **synthesis-and-reconciliation** document. Owner framing, verbatim:

> "We're well past drafting — none of the code is written here, it just needs to be synced and tuned."

Every rule below is **already specified somewhere**. The Deals initiative has accumulated eight
authoritative sources over four months, each correct in isolation, none of which describes the whole
path from a merchant filling in a form to a customer seeing the deal on their phone. This document
does three things and nothing else:

1. **Traces the end-to-end path** — registration → persistence → review → approval → publication →
   redemption — naming the surface, the file, and the governing decision at every hop.
2. **Cites the source for every rule.** Where a rule is stated in more than one place and the
   statements agree, one citation is given. Where they disagree, the disagreement is recorded in
   **§9 Drift register** rather than silently resolved.
3. **Collects what genuinely has no answer** into **§10 Open — needs John's ruling**, each with a
   recommendation. Nothing is invented inline.

**It is not an implementation.** No production code was written. Payments, auth, persistence,
matching and security remain human-dev-only per `CLAUDE.md` → *Scope of AI work*.

### How to read the citations

| Short form | Full path |
|---|---|
| **PATHWAY** | `docs/handoff/gopher-deals-pathway.md` (+ `.html`) |
| **SP-PIPE** | `docs/handoff/sp-deal-pipeline.md` |
| **G40-286** | `docs/handoff/G40-286-deals-frontend-consolidated-handoff.md` |
| **ORIENT** | `docs/handoff/G40-deals-initiative-orientation.md` |
| **AGREE** | `docs/handoff/deals-merchant-agreement-and-tos-2026-07-11.md` |
| **BUILD-SPEC** | `Documentation/Gopher — Intended/Gopher-Deals-Build-Spec.md` |
| **CUST-UX** | `Documentation/Gopher — Intended/Gopher-Deals-Customer-UX.md` |
| **MATRIX** | `Documentation/Gopher — Intended/Gopher-Roles-Capability-Matrix.xlsx` / `.md` |
| **GO-CANON** | `Documentation/Canonical Go Flow - Master/gopher-go-canonical.html` |
| **REQ-CANON** | `Documentation/Canonical Request Flow - Master /connect-flows-granular.html` |
| **DASH** | the HQ Dashboard repo (private) |
| **LOG** | `CLAUDE.md` → *Session progress* |

Paths inside `Final/` are relative to the site root. Everything else is relative to the
`Documentation/` parent.

---

## 1. The two tracks, in one sentence each

Per **PATHWAY** (opening table) and **G40-286** §*Two tracks*:

- **DLM — merchant / last-mile.** A local business registers on the public Deals page and posts a
  promo. Customers browse it, order on the merchant's own site, and may parlay a Gopher last-mile
  request. Capability IDs **DLM-1…8** (**MATRIX** rows 40–48).
- **DLP — Deals Local Pro / service provider.** An *existing Gopher worker* who clears an eligibility
  bar posts a defined-price service deal **from inside the Gopher Go app**. Redemption spawns a
  request directed only at that provider. Capability IDs **DLP-1…4** (**MATRIX** rows 48–49).

**Service Provider is not a role.** It is an eligibility tier of Worker (**G40-286** §DLP-1;
**MATRIX** row 49 — *"Deals — Service Provider = eligible Worker"*). Nothing in the identity model
needs a fourth role; SPINE-1 (G40-296) folds merchants in as an entity type and providers as a flag
on the existing worker account.

---

# PART A — Registration → the real HQ Dashboard

## 2. The two registration paths

### 2.1 DLM — merchant registration (public form)

**Surface:** `Final/gopher-deals.html`, the "I'm a Business" card → full registration + deal modal.
**Field list is authoritative in PATHWAY** §*Stage 1 → Merchant (DLM)* (the table at
`gopher-deals.html:2679`–`2786`). Summarised, not restated:

- Business identity — `business_name`, `logo`, `tagline` (**required** since 2026-07-14), `address`,
  `address_is_mobile`, `website`, `no_online_ordering`, `category`
- The deal — `deal`, `promo`, up to **3 searchable keyword chips**
- Owner personal info at **exact standard-signup parity** — `owner_first_name`, `owner_last_name`,
  `owner_dob`, `owner_phone`, `owner_email`, `owner_address`, `discovery_source`,
  `referred_by_gopher_id`, `phone_verified` (**PATHWAY** seam #10; ruling 2026-07-12)
- Acceptance — clickwrap on the Merchant Agreement, gating "Submit My Deal" (**AGREE** §2
  *Acceptance gate — BUILT 2026-07-12*)

**Two rules that are easy to get wrong:**

- **The promo code is not a Gopher coupon.** It is display text belonging to the merchant, redeemed
  on the merchant's own site. Gopher does not issue, validate or process it (**BUILD-SPEC** §4.1,
  locked June 7). Do not build coupon infrastructure for it.
- **Owner personal info provisions a real Gopher Request account.** One human, one account, several
  roles (**BUILD-SPEC** §5.3 / **D-016**). The merchant's "Personal Info" tab *is* their Request
  profile. This is a SPINE-1 dependency, not a Deals-local table.

### 2.2 DLP — service provider (two-entry, and only one entry carries a deal)

**PATHWAY** §*Stage 1 → Service Provider (DLP)* is the governing description. The shape matters:

- **Entry A — public eligibility funnel** (`gopher-deals.html`, "I'm a Service Provider" card,
  `:2991`–`:3010`). Captures identity only: first, last, SMS, email, **Gopher ID**. **No deal, no
  price, no reach.** Its only job is to ask "am I eligible?"
- **Entry B — the in-app deal form** (`Final/gopher-go.html` `offerServiceOverlay`, `:2777`; and the
  Go app prototype's Perks tile, built 2026-07-24, **SP-PIPE** §2). Deal text, 1–3 keywords, earn
  amount, normal price, **1–50 mi reach slider**. This is the *only* place a provider deal is ever
  created.

**Entry A is pre-launch scaffolding.** **SP-PIPE** §*Public interest funnel* is explicit: it is the
**pre-registration** entry for not-yet-eligible workers, and at go-live it "either retires or
repoints to the Dashboard like everything else — the deal itself is only ever submitted in-app by
eligible workers." Do not build a production integration that depends on it.

### 2.3 The eligibility bar (settled input — do not re-open)

Per **SP-PIPE** §0, **G40-286** §DLP-1, **BUILD-SPEC** §3 header, and the **D-022** amendment of
2026-07-23 (**LOG**, commits `391822d` / `bda46ae`). All three required:

| Bar | Rule |
|---|---|
| Verified tier | Elite, Elite+, or Pro |
| Job count | **20+ completed SERVICE jobs**, all-time |
| Rating | **4.75★ over the last 20 completed SERVICE jobs** |

**Delivery / Errand, Ride Sharing and Other are excluded from BOTH the count and the rating window.**
Admin may grant eligibility case-by-case (**D-022** full override).

**Rating authority is the ratings table (`rated_id` = gopher), not the Orders `GOPHER RATING`
column** — they disagree on ~25% of rows and `0` means unrated, not zero-star (**SP-PIPE** §0).

**Reference implementation exists and is validated:** `DASH/regen_sp_eligibility.py` +
`DASH/sp-eligibility.js`, rendered into the Deals view by `app_part4.js:264`. Real-data check
2026-07-23: **13** workers auto-qualify under the amended bar vs **88** under the tier-only reading
(**BUILD-SPEC** §3 header; **LOG**). Production computes this **server-side** and feeds a boolean to
both Go surfaces; the web prototype's `ELIGIBLE` flag (`gopher-go.html:3705`) is presentation only.

---

## 3. Transport: how a submission physically travels today, and what replaces it

### 3.1 Today (pre-registration era)

`submitForm(type)` at `gopher-deals.html:4147` (endpoint constant at `:4138`) does three things, in
this order (**PATHWAY** §*Where the information goes (today)*):

1. Serialises every named field in the modal to a `data` object.
2. **Writes a localStorage backup** (`gopherLeads`) so nothing is lost if the network call fails.
   Recoverable as CSV via `downloadGopherLeads()`.
3. **POSTs to `GOPHER_FORM_ENDPOINT`** — a Google Apps Script Web App — as
   `text/plain;charset=utf-8`, deliberately, so it is a CORS-simple request and needs no preflight
   from any origin. The script appends a row to the backing Sheet.

The same plumbing now also carries the **merchant Inbox composer** as
`submission_type:'inbox_message'` (`gopher-deals.html:5565`–`5571`, built 2026-08-05, **LOG**).

Today, **the Sheet is the deals database**, and it is manually uploaded into the Dashboard to refresh
the coverage map (**PATHWAY** §Stage 4, owner note 2026-07-12).

### 3.2 At go-live — the Apps Script is deleted, not migrated

**This is the single most important instruction in Part A.** **SP-PIPE** §6, owner decision
2026-07-24, verbatim:

> The Google Apps Script is a temporary pre-registration play only. Once the platform is live there
> is **NO Apps Script anywhere in this pipeline** — registration and deal submissions go **straight
> to the HQ Dashboard** for review/approval, and all emails … are sent by the **platform's own email
> dispatcher** (`sendEmail.js` / G40-305), not by a script. **Do not build production integrations
> against `GOPHER_FORM_ENDPOINT`.**

So the production transport is: **form → `POST /api/v1/deals` (authenticated) → `deals` table →
Dashboard review queue.** `submitForm` is the seam to repoint; its serialisation and its localStorage
fallback are worth keeping as an offline-resilience pattern, its endpoint is not.

**Consequence for the tabled deals@ wiring:** the Apps Script snippets in
`docs/handoff/deals-email-wiring.md` are the **interim** way to send from `deals@gophergo.io`
pre-launch. They are correct for now and dead at go-live. `deals@gophergo.io` remains the
sender/receiver identity in both eras (**SP-PIPE** §6).

---

## 4. The canonical deal record

**There is no agreed deal schema today.** Three incompatible shapes exist, none of which can carry
both a DLM and a DLP deal. This section proposes the union; §9.1 records the conflict.

**Shape 1 — `Documentation/Jira Tickets/advertiserDeals.js`** (G40-180 build console):
`advertiserId, category, name, logo, description, url, instructions, dealText, gopherRequestLink,
startAt, endAt, status ∈ {active, paused}, dealClicks, requestClicks`.

**Shape 2 — `DASH/deals-merchants.js`** (`MERCHANTS[]`, the module actually wired into the Dashboard
at `app_part4.js:257/267/270`): `id, name, cat, deal, tagline, city, web, promo, start, end,
status ∈ {live, pending, considered, expired, rejected}, age, dealImg, idImg`.

**Shape 3 — `DEALS_DATA`** in `Final/gopher-request.html:23886` and
`Final/gopher-connect.html:14211` (the consumer browse): `id, name, sub, offer, distance, kind,
category, address, mobile, promo, pay, portalUrl, portalTag` for merchants; plus `pro, tier, price,
normalRate, reqCategory, reviews, rating, verified, testimonial, dealSpecifics, photo` for providers.
**No status. No date window. No owner. No reach.** It is a hand-authored array.

### 4.1 Proposed union — the fields the path actually requires

Nothing here is new invention; each field is traced to the rule that needs it.

| Field | Source of the requirement |
|---|---|
| `id` | **DASH** `deals-merchants.js` Deal ID (`DL-nnnn`); admin actions key on it |
| `track` — `dlm` \| `dlp` | **PATHWAY** opening table; drives redemption behaviour end to end |
| `ownerUserId` | **BUILD-SPEC** §5.3 / **D-016** — one Gopher account underlies every role |
| `businessId`, `locationId` | **PATHWAY** §Stage 2 — *deals are location-bound*, owner-confirmed |
| `category` | §7.1 below — **currently unresolvable, see §9.1** |
| `title` / `dealText` | **PATHWAY** §Stage 1 (`deal`) |
| `promoCode` | **BUILD-SPEC** §4.1 — display text only, never validated by Gopher |
| `keywords[]` (≤3) | **PATHWAY** §Stage 1 + §Stage 5 — *these become the customer search index* |
| `orderUrl`, `noOnlineOrdering` | **PATHWAY** §Stage 1 (`website`, `no_online_ordering`) |
| `mobileAddress` | **PATHWAY** §Stage 2 + seam #3 (`TODO(backend)`, `gopher-deals.html:5042`) |
| `earnAmount`, `customerPrice`, `normalPrice` | **BUILD-SPEC** §6.1 — DLP only; `customerPrice = earn × 1.10` |
| `reachMiles` | DLP 1–50 (**PATHWAY** §Stage 1 Entry B); DLM 25 (**§7.2** below) |
| `status` | §5 below — **one vocabulary, currently three, see §9.2** |
| `startAt`, `endAt` | `advertiserDeals.js` `isDealLive`; **DASH** `start`/`end` |
| `reviewedBy`, `reviewedAt`, `rejectionReason` | **DASH** `deals-merchants.js` `rejectDeal()` |
| `dealClicks`, `requestClicks` | `advertiserDeals.js` `trackClick` — the only redemption telemetry specified anywhere |
| `featuredMonth`, `placementBidId` | §8 below — bid board |
| `assets{ dealImg, idImg }` | **DASH** `deals-merchants.js` image slots + *Request better image* action |

**`age` is not a field — it is derived from `category`.** An Age-Restricted deal inherits the spine's
21+ compliance (in-person ID at hand-off) automatically; it must not be an independently-settable
flag on a deal (**BUILD-SPEC** §3 note; §8 *Age-Restricted deals still route through the spine's
age-restriction compliance*). **DASH** `deals-merchants.js` carries `age:true` alongside
`cat:'Age-Restricted'` on `DL-2044`, which is redundant, and redundancy here is a compliance
hazard — two sources of truth for whether a deal needs an ID check.

---

## 5. Status model

### 5.1 The vocabulary to standardise on

The Dashboard's `deals-merchants.js` vocabulary is the one the review UI is already built against
(`renderDealsMerchants('active'|'considered'|'closed')`), so it is the one to keep:

| Status | Meaning | Set by |
|---|---|---|
| `pending` | Submitted, not yet looked at | Registration / in-app submission |
| `considered` | In the reviewer's active queue | Admin opening the queue |
| `live` | Approved and published | Admin **Approve** |
| `rejected` | Reviewed and declined, with a reason | Admin **Reject** (`rejectDeal()`) |
| `expired` | Passed `endAt` | Time, not a human |
| `paused` | Temporarily withdrawn by the merchant | Merchant (**not built** — see §9.3) |

`advertiserDeals.js`'s `{active, paused}` maps onto this as `active → live`; its `paused` is the only
state the Dashboard module lacks, and it is exactly the state the merchant portal's unbuilt
edit/pause/delete actions need (**G40-286** §DLM-3 backend seams).

### 5.2 Transitions

```
                 ┌── reject ──→ rejected ──(merchant edits + resubmits)──┐
                 │                                                       ↓
submitted → pending → considered → live → expired                     pending
                                     ↑ ↓
                                   pause/resume
                                     ↓
                                   paused
```

**Approval is a human act with a stated meaning.** **SP-PIPE** §5: *"Approved = an admin has viewed
the deal and it meets the criteria."* There is no automatic approval anywhere in this pipeline, for
either track (**G40-286** §DLP-1 gate 2: *"Each posted deal is reviewed MANUALLY"*).

**One queue, not two.** **SP-PIPE** §4 is explicit: *"The merchant deal-review logic already exists in
the HQ Dashboard — use the same process for Service Providers. Do not build a separate SP queue."*
The SP-eligibility section (`sp-eligibility.js`) supports the reviewer by letting them verify the
submitter against the bar; it is **not** a second queue.

### 5.3 Activation SLA

**≤5 business days** from submission to activation date, confirmed (**BUILD-SPEC** §12
*Activation window*), and stated to the merchant in the portal at `gopher-deals.html:3159` —
*"We'll provide you with your activation date within 5 business days."* This is the promise the
review queue must be staffed against.

---

## 6. What the Dashboard must render from real data

`VIEWS['p-deal']` in `DASH/app_part4.js:245` assembles the Deals view from five parts. **Four of
them are sample data**, behind a banner at `app_part4.js:256` that says so:

> *"Sample data below — not operating data.* The merchant deals, coverage counts, map pins, and
> recruiting worklist are **demonstration data** until the live Deals registration feed is wired
> (G40-286). Do not use these figures for merchant or market decisions. **The fee schedules and page
> structure are real.**"

| # | Section | Module | Wired to real data? |
|---|---|---|---|
| 1 | Deal economics | inline placeholder | ❌ awaiting first redemptions |
| 2 | Live + Pending deals | `deals-merchants.js` `('active')` | ❌ `MERCHANTS[]` placeholder |
| 3 | Raleigh DMA coverage | `deals-coverage.js` | ❌ sample + manual upload |
| 3b | SP auto-eligibility | `sp-eligibility.js` ← `regen_sp_eligibility.py` | ✅ **real** (Orders + Users + Ratings) |
| 4 | Considered (review queue) | `deals-merchants.js` `('considered')` | ❌ placeholder |
| 5 | Expired & Rejected | `deals-merchants.js` `('closed')` | ❌ placeholder |

**Section 3b is the proof the pattern works.** It is the only part of this view already computing
from the master store, via the standard `regen_*.py` → `window.SP_*` → renderer pipeline. **The
registration feed should land the same way**: a regen script writes the deals dataset, the existing
renderers consume it, and the banner comes down. That is a smaller change than it looks — the
renderers already resolve per-deal admin overrides from `localStorage['gopher_deals_admin']`
(`deals-merchants.js` `gdLoad`/`gdSet`/`resolve`), which is precisely the write-path that becomes an
API call.

**Coverage tracker target (goal KPI, `deals-coverage.js` header):** **≥20 merchants per category
within any 15-mile radius across the Raleigh DMA**, keyed by ZIP, over 156 DMA ZIP centroids. Its
"current signed" number must come from the same feed — that is the whole point of wiring it
(**PATHWAY** §*Next: #2 — merchant-coverage tracking*).

⚠️ **Dashboard-repo commit policy applies** (memory `dashboard-commit-policy`): always commit
Dashboard edits, and never build after a single `regen_*` script — run the full pipeline
(`dashboard-build-full-pipeline-only`).

---

# PART B — Approved deal → publication on every surface

## 7. The publication contract

### 7.1 The predicate

Exactly one function decides whether a deal is visible, and it already exists in prose:

```
isDealLive(deal, now) :=
      deal.status === 'live'
  &&  (!deal.startAt || now >= deal.startAt)
  &&  (!deal.endAt   || now <= deal.endAt)
```

— `advertiserDeals.js` `isDealLive`, *"A deal shows on the home screen only when active AND inside
its date window."* Every surface must call this and none may re-implement it. This is the same
discipline the bid board already enforces (`assets/js/gopher-bid-brain.js` header: *"Both pages must
render from THIS module so the standings, badge rules and category lock never drift apart"*), and it
is the rule the Go worker bid board was built to in 2026-08-05 (**LOG**).

### 7.2 The feed

One authenticated read endpoint serves every surface:

```
GET /api/v1/deals?lat=&lng=&radius=&category=&q=
    → [ { …the §4.1 record, minus reviewer/telemetry/owner-PII fields… } ]
```

**What the feed must never carry:** `earnAmount`. The 10% Deal Boost is shown to the provider **once,
at registration, and nowhere else**; the customer sees only the final price, un-itemised; the
worker's redemption alert shows only their earnings (**BUILD-SPEC** §6.1, confirmed, and §7b
*Money visibility*). A feed that ships `earnAmount` to a customer client leaks Gopher's margin
regardless of what the UI renders. Compute `customerPrice` server-side and send that alone.

Also excluded: owner personal info, `reviewedBy`, `rejectionReason`.

### 7.3 Reach and ordering

| Track | Reach | Source |
|---|---|---|
| **DLM** | **25 mi** from the merchant's fixed location | **PATHWAY** opening table, canonical 2026-07-12; portal copy `gopher-deals.html:2584`/`:2623` |
| **DLP** | **1–50 mi**, set per deal on the in-app slider | **PATHWAY** §Stage 1 Entry B; **BUILD-SPEC** §4.2 (50-mi radius from the Gopher Go profile address) |

**Ordering is proximity, closest-first**, customer location vs the merchant's **fixed** address; a
mobile merchant falls back to the owner's registered business address; a provider uses their profile
address (**G40-286** §DLM-6 *Confirmed rules (owner)*).

**Ranking is not for sale.** Organic listings and search are ranked by relevance and rating and are
**not** pay-to-play; the auction buys a *featured slot*, nothing else (**BUILD-SPEC** §6.2).

**Keyword search matches the ≤3 registration keyword chips** — not free-text over the deal body
(**PATHWAY** §Stage 5 *Browse & find*; **G40-286** §DLM-6).

### 7.4 Caching and refresh cadence

No cadence is specified in any existing document. This is **Open ruling 3** (§10). What *is* fixed:

- **Approval must be observable quickly on web**, because approval is what triggers the promised
  "it's live" inbox message (**SP-PIPE** §5) and the merchant has been told ≤5 business days to
  activation (§5.3). A long cache defeats a promise already made in writing.
- **The bid board settles monthly**, closing on the **20th** (`gopher-bid-brain.js` `closeLabel()`),
  so featured placement changes on a known monthly boundary and can be cached far more aggressively
  than the deal list itself.

### 7.5 Web goes live immediately; apps wait for the store

**SP-PIPE** §5, owner decision:

- **Web surfaces (Request web, Connect) — live on approval.** The owner's working assumption is that
  no app-store-style regulation applies to the web platforms; proceed on that basis unless the dev
  finds otherwise.
- **iOS / Android — the deal queues for the next store release** and catches up when it ships.

**The dev note attached to that decision is the important part**, and it is a note, not a decision:
this reflects the *current bundled-content architecture*. **If the rebuild serves deals as API data,
store releases stop being the bottleneck and the apps go live with web.** Flag it to the owner if the
rebuild makes that choice — which, given §7.2 describes exactly such an API, it almost certainly
will. See **Open ruling 4**.

---

## 8. Featured placement — the bid board

Fully specified in `Final/assets/js/gopher-bid-brain.js` (owner spec 2026-07-22), which is the
**single shared brain** and must not be re-implemented per surface. Rules encoded there:

- **"Projected Featured Deal"** badges the single highest bid **across all categories**.
- **"You're leading!"** applies only to the viewer's **own** category, only when they hold that
  category's top bid, and **never on the featured card** — featured already implies it.
- **A business may only bid in its own category.** `canBid()` / `placeBid()` enforce this; a UI must
  not render a bid control where `canBid()` is false.
- The category holding the top overall bid **also appears as its own card showing its second-highest
  bid**, so that one category appears twice on the board.
- Bidding closes **the 20th of each month** (`closeLabel()`).

Consumers today: `gopher-deals.html:5208` (merchant portal) and `gopher-go.html:4533` (worker
dashboard, built 2026-08-05). Both load the module; neither carries auction logic.

### 8.1 The auction model — SETTLED (owner, 2026-08-05, Ruling 7)

**Who wins.** One winner per category, plus one exception: **the top overall bid across all
categories is its own category** ("Featured Deal"). Exactly one category therefore appears **twice** —
once as the overall Featured Deal, once as its own card held by that category's **next-highest**
bidder. Winners own that placement on **app and web for the entire following month**.

**Money.**

| Stage | Rule |
|---|---|
| Placing a bid | **No charge.** The bid is recorded and confirmed as a **commitment**. |
| Winning | The merchant is **obligated to pay**. |
| Capture | **On the cutoff day**, from winners only. |
| Failed capture | Winner has **24 hours** to fix it; then the **runner-up is promoted**. |

**Do not authorize at bid time.** Card authorizations expire in ~7 days while bidding runs across a
month — an early bid cannot hold an authorization to capture. Use a stored payment method plus terms
accepted at bid time.

**⛔ There is no "every bid wins" guarantee.** Copy currently claiming one is **false and must be
removed** (four surfaces — see Ruling 7), and `placeBid()` must stop returning success for a losing
bid.

### 8.2 The featured-merchant delivery perk — SETTLED (Ruling 8)

A **featured merchant's** customers get **50% off the last-mile delivery**, **auto-applied**, for the
month they hold the placement. **Merchants only — not Service Providers.** Gopher absorbs it on the
same footing as a 50%-off promo code, reusing the existing discount machinery and the canonical
Discount Sheet ordering (**D-033**). **No code is issued** — binding the discount to the order makes
it structurally uncopyable, which is what the "unique per transaction" requirement was asking for.

**Publication interaction:** a deal already holding a won featured spot **activates that placement on
approval** (**SP-PIPE** §5). So the bid and the deal have independent lifecycles — a merchant can win
a slot for a deal still in review, and the slot lights up when the deal does.

**Two production notes carried in the module's own header, both load-bearing:**

1. *"Production swaps these tables for live queries behind the same `window.GopherBidBrain` seam **and
   settles auctions server-side — never trust client math for money**."*
2. *"`mine` is a single-viewer demo flag; production keys placements by `merchantId` and compares
   against the signed-in account."* The Go build already had to work around this — it gates you-ness
   on `mine && own` and strips the seed's `"You · "` holder prefix on non-own cards (**LOG**,
   2026-08-05). That workaround disappears the moment placements carry a real `merchantId`.

**Billing runs on the business side** — Payment Info → payouts and billing for promoted placements —
and is a **separate money flow from the customer-side spine payments**. Keep them distinct
(**BUILD-SPEC** §11 *Auction billing*).

---

## 9. Drift register

Every item below is a **real disagreement between existing artefacts**, found by reading the code and
the docs against each other. None is resolved here unless the resolution is already on the record.

### 9.1 Category taxonomy — five vocabularies, no two identical ✅ **RESOLVED (owner, 2026-08-05)**

> **Ruling applied.** Merchant registration stays at the **four** locked June 7 (Restaurant, Food Trucks
> & Grocery · Local Favorites · Age-Restricted Shops · **Retail Merchants**) — reconfirmed by the owner
> from the live form. The consumer **"Convenience Stores" rail was the same bucket under a second name**
> and is **renamed to Retail Merchants** (key `retail`). Publication carries a fifth category,
> **Service Providers**, which is never registerable here because DLP submits in-app — so the
> *registration list and the publication list are deliberately different lists.*
>
> Applied to: both consumer editions (key + label + the `data-cat` CSS hooks), the shared bid brain
> (which also had `Restaurants **and** Food Trucks` — now `&`, matching every other surface), the Deals
> 101 guide, and the Dashboard coverage tracker (`local` → `favorites`, label `Retail` → `Retail
> Merchants`, and convenience-store words now resolve into the `retail` bucket). The iQ FAQ corpus,
> which had served the superseded six for fourteen months, was corrected in all 7 inlined copies —
> `verify-faqs-integrity.py` green, 184 entries, common hash `2c16c52bd4`.
>
> ⚠️ **One piece deliberately not applied:** both category `<select>`s still submit **display text**
> rather than a key, because that same string is rendered back to the merchant *and* used as the
> bid-board join key — adding `value=` keys without a label↔key map would break the portal. The
> key/label separation is a production-schema requirement (§4.1), not a prototype patch.
>
> The original finding is preserved below as the rationale.



This is the most consequential finding in the document. A merchant's category is set at
registration, and it is the key that the browse rails, the bid board, and the coverage tracker all
join on. Today they cannot join.

| Surface | File | Categories |
|---|---|---|
| **Registration form** | `gopher-deals.html` `name="category"` | Restaurant, Food Trucks & Grocery · Local Favorites · Age-Restricted Shops · **Retail Merchants** |
| **Consumer browse** | `gopher-request.html:23886` / `gopher-connect.html:14211` `DEALS_DATA` | Local Service Provider Deals · Restaurants & Food Trucks · Local Favorites · **Convenience Stores** · Age-Restricted Merchants |
| **Bid board** | `assets/js/gopher-bid-brain.js` `CATS` | Service Providers · Restaurants **and** Food Trucks · Local Favorites · **Convenience Stores** · Age-Restricted |
| **Coverage tracker** | `DASH/deals-coverage.js` `CATS` | Restaurants & Food Trucks · Local Favorites · Age-Restricted · **Retail** · **Service Providers** |
| **Merchant-logo asset folders** | repo root | Age-Restricted · **Convenience Store** · Restaurants & Food Trucks · Local Favorites · **Service Providers** · Home Screen |
| **BUILD-SPEC §3** | locked June 7 | Restaurant, Food Trucks & Grocery · Local Favorites · Age-Restricted Shops · Retail Merchants — **"locked at four"** |

Three concrete failures follow, today:

1. **A merchant cannot register as "Convenience Stores"** — the browse rail and the bid board both
   have that category; the registration form does not offer it.
2. **A merchant who registers as "Retail Merchants" has nowhere to appear** — no consumer rail, no
   bid category.
3. **Service Providers is a bid category and a coverage category but not a registration category** —
   correct, as it happens, since DLP registers in-app; but it means the bid board's category list and
   the registration category list are *structurally* different lists, and code that treats them as
   one will be wrong.

The string forms differ too (`&` vs `and`, `Age-Restricted` vs `Age-Restricted Merchants` vs
`Age-Restricted Shops`), so even the overlapping categories will not match on equality.
**Recommendation and required ruling: Open ruling 1.**

### 9.2 Deal status vocabulary — two incompatible sets, and the docs cite the wrong one

**ORIENT** §*What already exists* and **G40-286** §*Cross-cutting dependencies* both name
`advertiserDeals.js` as the seam to extend — *"extend it rather than build parallel logic"* — and
describe it as *"In Progress in the HQ Dashboard."*

**It is not in the HQ Dashboard.** It lives at `Documentation/Jira Tickets/advertiserDeals.js` (44
lines, the owner build-console scaffold). The module actually wired into the Dashboard's Deals view
is `deals-merchants.js`, which is larger, later, has its own `localStorage` action store, its own
review/reject/contact modals, and a **different status vocabulary** (`live/pending/considered/
expired/rejected` vs `active/paused`).

The parallel logic the orientation doc warned against **already exists**. Neither module carries
`reachMiles`, `keywords`, `earnAmount`/`customerPrice`, or a provider reference — so **neither can
represent a DLP deal at all**. Resolved by §4.1 + §5.1 (union record, Dashboard vocabulary, plus
`paused` from `advertiserDeals.js`); recorded here because the two handoff docs point the dev at the
wrong file, and should be corrected when this spec is accepted.

### 9.3 Merchant deal actions are display-only

**PATHWAY** §Stage 4 and **G40-286** §DLM-3 both flag it: My Deals lists deals with status badges and
view counts, but **edit / pause / delete are not wired**. `paused` therefore has no producer today.
Not a conflict — a known gap, restated because §5.1 depends on it.

### 9.4 `gopher-customer-deals.html` is not a publication surface

**ORIENT** §*What already exists* describes it as *"customer-facing deals browse"* and lists it as a
front-end starting point for DLM-6 / DLP-3. **BUILD-SPEC** §0 calls it *"the customer side, a
marketing/value-prop page."*

**BUILD-SPEC is right.** The file contains **zero** deal-browse machinery — no `DEALS_DATA`, no deal
cards, no `data-deal` hooks — and its CTAs link to `gopher-deals.html#merchant` and
`gopher-deals.html#service-provider`. It is a **merchant-acquisition landing page**, top-of-funnel.

The scheduled task that commissioned this spec lists it as a consumer publication surface. On the
evidence it is not one, and wiring the feed into it would be building a new page, not syncing an
existing one. **Open ruling 2.**

### 9.5 The two consumer editions have drifted in their deal data

`DEALS_DATA` is duplicated inline in `gopher-request.html` and `gopher-connect.html` — same 5
categories, same 27 entries, but not the same content:

- **`r-buoy` (Buoy Bowls) has a different address and tagline in each edition** — Request says
  `441 Village Walk Dr, Holly Springs` / *"Bowls, smoothies & good vibes"*; Connect says
  `920 Cass Holt Rd, Holly Springs` / *"It's ah-sigh-ee, y'all!"*. **The address is load-bearing**:
  for a fixed-location merchant it auto-fills the last-mile parlay pickup (**PATHWAY** §Stage 5). The
  same deal currently sends a Gopher to two different addresses depending on which app the customer
  used.
- Connect's provider entries carry a `logo:` asset path; Request's do not (they use `photo:` + a
  `DEAL_LOGOS` map). Request's `r-myway` carries an inline `logoSvg:`; Connect's does not.

Standing rule (memory `deals-flow-changes-both-connect-request`): mirror every Deals or flow change
across both editions. **A shared feed removes this failure mode permanently**, which is an argument
for §7.2 beyond mere tidiness. Until then the Buoy Bowls address should be reconciled — but *which*
address is correct is a merchant-data question, not a code question. **Open ruling 5.**

### 9.6 Customer-side Deals gate is open to everyone

`isDealsEligible()` returns `true` unconditionally in both editions — `gopher-request.html:23454` and
`gopher-connect.html:20528` — each carrying a `TEMP` comment. Production restores
`return !!_sessionUserProfile;` once accounts exist (**PATHWAY** §Stage 5 *The customer-side
eligibility gate*, seam #5). Intentional and documented; listed so it is not mistaken for the
publication gate. It controls **access to the Deals surface**, not whether a deal is live.

### 9.7 Minor: SP-PIPE mis-cites the activation promise

**SP-PIPE** §5 says the merchant inbox copy *"promises 'usually within 1 business day'"*. That string
(`gopher-deals.html:5450`) is the **support-reply SLA** on the Gopher contact card, not the activation
window. The activation promise is **≤5 business days** (`:3159`, matching **BUILD-SPEC** §12). No
behaviour depends on it; correct the sentence when SP-PIPE is next touched.

### 9.8 Minor: Gopher ID format was never settled

**PATHWAY** seam #9 leaves it open: the figma shows a name-based code (`MARCUS-4F9`), the built app
shows numeric (`820083`). The DLP eligibility funnel keys on this value, so the lookup cannot be
built until the format is fixed. Note that per-portal demo IDs already differ (Connect `738105`,
Request `614072`, Go `820083`) — those are demo seeds, but they confirm the field is numeric in every
built surface. **Recommendation: numeric, and it is the Gopher ID assigned at personal-info creation**
(owner, 2026-07-23, **LOG** item 4) — which arguably closes this already. Flagged as **Open ruling 6**
only to get it explicitly retired.

---

### 9.9 BUILD-SPEC §6 is materially thinner than the auction that exists

**BUILD-SPEC** §6 specifies the placement auction as: opt-in, monthly, transparent standings,
merchant picks the deal, billed via Payment Info, organic listings not pay-to-play. All correct.

It does **not** contain: the **20th close / 1st go-live** dates, the **own-category lock**, the
**two-tier prize** (top-in-category wins that card; top-overall additionally headlines), the
**every-bid-wins guarantee**, or the **50%-off-delivery perk**. All five are implemented and/or
promised in shipped copy. A developer pricing and building from §6 alone produces a plain
highest-bidder auction and silently drops half the rules. **Fix: fold the five into §6.**

### 9.10 "Every bid wins a featured month" — promised in the UI, unrepresentable in the model ⛔

Stated in `gopher-deals-101.html`, three places in `gopher-go.html`, and the merchant portal's bid
hint. `placeBid()` honours it — it returns `ok:true` for a bid that does **not** beat the category
top — and its own comment concedes the limitation: *"the demo board only tracks category tops, so
nothing to move."*

**Nothing records who is owed a featured month, how many such slots exist per category per month,
or in what order they run.** This is a commercial promise with no data structure behind it and no
mention in either build doc. It cannot be implemented as written. → **Ruling 7.**

### 9.11 The 50%-off-delivery perk exists only as copy ⛔

*"When you're featured, your customers get 50% off delivery if they need last-mile help"* —
`gopher-deals-101.html` and `gopher-deals.html`. Implemented by **zero** code; absent from
**BUILD-SPEC** entirely, including §6, which otherwise enumerates exactly how Deals monetizes and
states the customer pays only standard request fees. It is a customer-facing discount that lands in
the fee engine. → **Ruling 8.**

### 9.12 The Go app transmits nothing — "submitted for review" is a UI state change ⛔

`Final/gopher-go.html` contains **zero `fetch` calls of any kind.** The SP deal submit handler
validates (deal text, ≥1 keyword, earn, normal price), then sets `formWrap.hidden=true;
success.hidden=false;` and renders *"Deal submitted for review — we'll give it a quick review and
message your Gopher Go inbox the moment it's live."*

Nothing leaves the browser. The worker is told their deal is in review when no submission occurred.
Same honesty class as the merchant logo being required and then discarded (**BUILD-SPEC** §4.1a) and
the June 2026 `gopher-request.html` "saved automatically" copy. The success copy must not claim a
submission until one exists.

### 9.13 The two Service-Provider surfaces produce no linked record

The public funnel (`gopher-deals.html`, `submitForm('worker')`) writes a `worker` row to the Apps
Script lead sheet carrying **`gopher_id`**. The in-app submission (`gopher-go.html`) writes nowhere
(§9.12). So a provider who completes both leaves two unconnected traces, and **`gopher_id` — the
obvious join key, collected precisely so the backend can verify tier/jobs/rating — is consumed by
nothing.** The union record in §4.1 is where these must converge.

### 9.14 SP eligibility is promised publicly and enforced nowhere

The public funnel promises *"we'll email you with eligibility terms and next steps"*, implying a
tier/jobs/rating lookup. No lookup exists. The in-app gate that would enforce it is a hardcoded
`var ELIGIBLE = true;` with a demo toggle (`gopher-go.html:4397`).

The **only** real implementation of the amended bar is `regen_sp_eligibility.py` in the HQ Dashboard
— correct, and validated on live data (13 auto-eligible), but it lives in the analytics tool, not in
the path a worker walks. Production computes this server-side and both surfaces read it.

### 9.15 The featured-placement bid board is not gated on eligibility ⛔ → **G40-355**

`ELIGIBLE` gates only the "+ Service Provider Deal" button. The `bidboard` nav item
(`gopher-go.html:2674`) and section (`:2972`) carry **no eligibility condition**, so a worker who
cannot submit an SP deal can still reach the bidding surface and win a featured slot — verified live
by placing a $999 winning bid with eligibility toggled off.

**Requirement:** eligibility gates the bid board as well as the offer button, is computed
server-side, and is re-checked **at settlement**, not only at render — a worker can qualify at page
load and lapse before the 20th. Placements key on a stable account id, never a display name. Repro,
root cause and acceptance criteria: **G40-355**.

### 9.16 Minor: the shared brain's header is stale

`gopher-bid-brain.js` still describes the Go dashboard as *"planned; not wired yet."* It was wired
2026-08-05 and renders. Stale in the one file both this spec and **G40-286** point at as the
authority for auction rules.

---

## 10. Rulings — ALL SETTLED (owner, 2026-08-05)

**All eight decided.** Rulings 1–6 and 8 are applied or applicable as written; **Ruling 7 changes
behaviour that is currently shipped** and carries a follow-up ticket. Each heading below records the
decision; the original problem statement and recommendation are kept beneath it for the reasoning
trail.

---

### ~~Ruling 1 — What is the canonical category list?~~ ✅ **DECIDED 2026-08-05 — applied, see §9.1**

**Owner ruling:** merchant registration stays at the four locked June 7 — **Retail Merchants is kept**,
Grocery stays folded into the Restaurant bucket, and Convenience is not a registration category. The
consumer *Convenience Stores* rail was the same bucket under a second name and **has been renamed to
Retail Merchants**. Publication additionally carries **Service Providers** (DLP, in-app only), so the
registration list and the publication list are different lists by design.

*The recommendation below was NOT taken — it proposed adopting the customer-facing five and retiring
Retail Merchants. Kept for the record.*

<details><summary>Original recommendation (superseded)</summary>

**The problem:** five surfaces use five different category vocabularies (§9.1). Registration cannot
produce a value that the browse rails, the bid board and the coverage tracker can all key on. Two
categories are un-registerable and one is un-publishable.

**Recommendation — adopt the five the customer actually sees**, since that list is the one baked into
both consumer editions, the bid board and the merchant-logo asset folders:

```
service_providers   "Service Providers"           (DLP only — not offered at merchant registration)
restaurants         "Restaurants & Food Trucks"
local_favorites     "Local Favorites"
convenience         "Convenience Stores"
age_restricted      "Age-Restricted"
```

Store the **key**, never the label (same rule as the Connect `?need=<slug>` deep links, **LOG**
2026-07-22), so a copy rename can never break a join. Then: add **Convenience Stores** to the
registration form; decide **Retail Merchants** (recommendation: **retire it** — it appears in no
consumer surface and has no logo folder, and "Local Favorites" absorbs it); and drop `Retail` from
`deals-coverage.js` so the coverage KPI counts categories that can actually be registered.

**This supersedes BUILD-SPEC §3's "locked at four" (June 7).** That lock predates Convenience Stores
and the Service Providers rail, both of which now exist in shipped code. Needs your explicit
sign-off because it overrides a locked decision.

</details>

**Why the ruling went the other way:** the lock did not need overriding. "Retail Merchants" and
"Convenience Stores" were never two categories competing for one slot — they were one bucket that had
acquired two names, one on each side of the funnel. Renaming the rail reconciles every surface without
touching the merchant's four choices, and BUILD-SPEC §3 stands as written (now carrying a dated
reconfirmation rather than a supersede).

---

### ~~Ruling 2 — customer-deals browse surface?~~ ✅ **DECIDED — no, it stays marketing**

**Owner:** *"gopher-customer-deals.html is a marketing site, intended to CTA to the request app to
take advantage of a deal."* Confirms the recommendation. It is **not** a publication surface; the feed
does not wire into it. **ORIENT**'s "customer-facing deals browse" description is wrong and
**BUILD-SPEC** §0 is right. No change to the page.

**The problem:** it is a marketing page with no deal machinery (§9.4), but the docs and the task brief
both list it as a consumer publication surface.

**Recommendation: leave it as marketing.** The consumer deal browse lives inside the Request and
Connect apps by design — Deals is *an entry point onto the spine, not a fourth edition*
(**BUILD-SPEC** §2 / **D-006**). A public web page listing live deals would be a genuinely new
surface with its own SEO, caching and un-authenticated-access questions. If you want one, it should
be its own ticket, not a line item in the feed wiring.

---

### ~~Ruling 3 — publication refresh cadence~~ ✅ **DECIDED — as recommended, with the two-clock split**

**Owner: "ok"** — with the Ruling 4 clarification folded in. There are **two different clocks**, and
conflating them is a spec bug:

| | Cadence |
|---|---|
| **Regular deals** | publish **as fast as approval allows**; 60-second client cache on web and apps |
| **Featured placement** | a **calendar** — cached to the next monthly cutoff, since it only changes on the 1st |
| Coverage tracker (Dashboard) | daily, on the existing `regen_*` pipeline |

**The problem:** no document specifies how quickly an approved deal must appear, or how long a client
may cache the feed (§7.4).

**Recommendation:**

| Surface | Cadence |
|---|---|
| Web (Request, Connect) | Fetch on Deals-surface open; **60-second client cache**; approval visible within ~1 min |
| Apps | Fetch on app foreground + on Deals-tab open; same 60 s cache |
| Featured placement | Cache until the **next 20th** — it only changes at the monthly close |
| Coverage tracker (Dashboard) | Daily, with the existing `regen_*` pipeline |

Rationale: the merchant has been promised an activation *date* (≤5 business days), not an activation
*minute*, so nothing needs to be real-time — but a stale cache measured in hours would make the
"your deal is live" inbox message arrive before the deal does, which reads as a bug.

---

### ~~Ruling 4 — do apps wait for a store release?~~ ✅ **DECIDED — no. Apps publish as fast as web**

**Owner: "ok"**, on the finding that **app-store review is not a gate for deal data.** Review gates
the **binary**, not the content the binary fetches — deals delivered as API data appear the moment
they are approved, exactly like web. Review applies only when *code* ships.

*Caveat to build against:* a new deal **type** or a new field may need a release; a new deal
**instance** never does. The stack is Capacitor/Appflow, which also supports Live Updates for
OTA web-layer changes if the display layer ever needs to move without a store cycle.

**The "web immediately, apps next release" rule in SP-PIPE §5 is retired.** Its own conditional
said as much — it was scoped to the bundled-content architecture, which this spec replaces.

**The problem:** the "web immediately, apps next release" rule (**SP-PIPE** §5) is explicitly
conditioned on the *current bundled-content architecture*, and the note attached to it says that if
the rebuild serves deals as API data, the constraint disappears. §7.2 of this spec describes exactly
such an API.

**Recommendation: apps go live with web.** Once deals are a feed, holding them for a store release is
a self-imposed delay with no compensating benefit, and it makes the featured-placement auction unfair
— a merchant pays for a monthly slot that a large share of the audience cannot see until the next
release ships.

**Your call because it changes a promise already made to merchants and providers** in the portal copy
and in the eligibility email. If you keep the queue-for-release rule, the "your deal is live" message
must say *live on web now, in the apps with the next update* — otherwise it is inaccurate for app
users.

---

### ~~Ruling 5 — which Buoy Bowls address is correct?~~ ✅ **MOOT — demo data**

**Owner:** *"all of these merchants are demos for now, added is irrelevant until live."* No action.
The structural point stands and is what §4.1 fixes: the same deal resolving to two addresses across
editions is the class of bug the **shared feed** eliminates. Real merchant data enters via
registration, not via an inline array.

**The problem:** Request and Connect carry different addresses and taglines for the same demo
merchant (§9.5), and for a fixed-location merchant the address auto-fills the last-mile pickup.

**Recommendation:** take **Connect's** — `920 Cass Holt Rd, Holly Springs, NC 27540` /
*"It's ah-sigh-ee, y'all!"* — on the grounds that it is the later edit and the tagline is written in
the merchant's own voice rather than generic copy. But this is **merchant data, not a code
preference**, so please confirm against what Buoy Bowls actually is before it is mirrored.

*(Demo data, so nothing is live-wrong today — but it is exactly the class of divergence the shared
feed exists to eliminate, and it should be corrected before either array is used as a seed.)*

---

### ~~Ruling 6 — Gopher ID format~~ ✅ **DECIDED — opaque, variable-length. NOT fixed at 6 digits**

**Owner pushed back on the 6-digit recommendation — correctly, and the live data proves it.**
Measured against the production `Users.csv` (139,272 users):

| | |
|---|---|
| ID range | **1 → 141,303** |
| 6-digit IDs | 41,295 (**30%**) |
| **1–5 digit IDs** | **97,977 (70%)** |

A fixed-6-digit format is **already wrong for 70% of existing accounts**, and the range is
approaching 7 digits on the current trajectory.

**Canonical: the Gopher ID is an opaque numeric identifier — variable length, never validated on
length, never zero-padded in storage, displayed as-is. The only rule is uniqueness.** Any
length-based validation is a defect that would reject the majority of real accounts. Closes
**PATHWAY** seam #9. *(The earlier "numeric, 6 digits" recommendation in this document was wrong.)*

**The problem:** **PATHWAY** seam #9 still records the Gopher ID format as an open design question
(figma `MARCUS-4F9` vs built `820083`), and the DLP eligibility funnel keys on it.

**Recommendation: numeric, 6 digits — the Gopher ID assigned at personal-info creation.** You already
ruled this on 2026-07-23 when the referral ID and the Gopher ID were unified platform-wide, and every
built surface is numeric. Confirming it here lets seam #9 be marked closed rather than carried into
dev handoff as an open item — which the standing rule against leaving open questions for the dev
requires (memory `handoff-no-open-questions`).

---

### ~~Ruling 7 — what does a "guaranteed featured win" buy?~~ ✅ **DECIDED — nothing. Only winners are featured**

**Owner ruling — the auction is winner-take-the-slot:**

- **One winner per category.** Highest bid in a category at cutoff owns that category card for the
  **entire following month**, on **app and web**.
- **One exception — the top overall bid across all categories is its own category** ("Featured
  Deal"). So exactly one category shows **twice**: once as the overall Featured Deal, and once as its
  own card held by that category's **next-highest** bidder.
- **Bids are a commitment, not a charge.** Nobody is charged for bidding. A bid is recorded and
  confirmed; if it wins, the merchant is **obligated to pay**.
- **Payment is captured on the final day** (the cutoff), from winners only.
- **Failed capture → the winner gets 24 hours to fix it, then the runner-up is promoted.**

**⛔ This retires the "every bid wins a featured month" promise, which is currently LIVE on four
surfaces and must be removed:** `gopher-deals-101.html`, three places in `gopher-go.html`, and the
merchant-portal bid hint in `gopher-deals.html`. `placeBid()` must also stop returning success for a
losing bid. **Follow-up ticket raised** — this is a live false promise to merchants and providers,
not a documentation gap.

**Rejected on the owner's behalf: authorize-at-bid-time with release-on-outbid.** It cannot work on
this calendar — card authorizations expire in roughly **7 days** (less on some networks) while
bidding runs across a month to a cutoff on the 20th. A bid placed early could not hold an
authorization to capture, which would break it for exactly the merchants you most want bidding.
Protection against a reneging winner comes from a **payment method on file plus terms accepted at bid
time**, not a live hold.

**The problem (§9.10):** four surfaces promise that **any** bid, at any amount, earns a featured
month. `placeBid()` honours it by returning success for a losing bid. But nothing in the model
records who is owed a slot, how many slots exist per category per month, or in what order they run —
so the promise **cannot be implemented as written**, and a developer will either drop it silently or
invent the rules.

**Recommendation — make it a defined, bounded inventory rather than an open promise:** the
**category-top bid wins the card for the whole month**; every other bidder in that category is
queued by amount and each receives a **featured day** (or a defined block) during the month, capped
at the number of days available. If bidders exceed capacity, the lowest bids are refunded rather
than under-served, and the copy changes from "any bid earns a featured month" to "every bid earns
featured time."

This keeps the promise honest, makes it schedulable, and preserves the incentive to bid high.
**Needs your ruling because it defines what a merchant is actually buying**, and the current copy —
already live on four surfaces — over-promises against any bounded implementation.

---

### ~~Ruling 8 — is the 50%-off-delivery perk real?~~ ✅ **DECIDED — yes. Build it**

**Owner ruling:**

- **Real, and if it isn't documented and built, it needs to be.**
- **Merchants only — not Service Providers.** (Coherent: an SP deal spawns a request directed at that
  provider, not a merchant last-mile delivery, so there is no delivery leg to discount.)
- **Auto-redeemed** for customers who request delivery from those merchants — the customer does
  nothing.
- **Gopher absorbs it, exactly as a 50%-off promo code does today.** So it is **not** new fee-engine
  logic: it reuses the existing discount machinery and follows the canonical Discount Sheet ordering
  (**D-033**, as corrected 2026-06-21 — discounts come off the **total**, a % promo includes the ITF,
  TrustShield's flat $1 applies last). The dev should confirm the exact stacking position against
  that sheet rather than re-deriving it.

**Simplification carried from the review, and it removes a requirement:** the owner asked for a code
*"unique to that transaction so it cannot be copied by another user and used again."* If the discount
is **auto-applied and bound to the order**, there is **no code to issue and therefore none to copy** —
uniqueness is satisfied structurally. Build it as an automatic order-level discount; issue a code only
if a customer ever has to carry it somewhere else, which this flow does not require.

**Scope: WINNERS ONLY — confirmed by the owner 2026-08-05.** *"Winners only, that's correct (it was
meant to mean the highest bid, no matter what the amount)."* So the perk attaches to the merchant
holding a category card for that month, not to everyone who bid. The phrase "bidding merchants" in
the original ruling meant *the merchant whose bid won* — the amount is irrelevant, the rank is what
matters.

**Exposure characteristic, recorded not re-litigated:** unlike an issued promo code, this auto-applies
to *every* delivery from a featured merchant for a whole month, so the cost scales with that
merchant's delivery volume, which Gopher does not control. The owner has ruled it is absorbed on the
same footing as any promo. Finance should see the monthly figure once live.

**The problem (§9.11):** *"When you're featured, your customers get 50% off delivery"* is live copy
on two surfaces, implemented nowhere, and absent from **BUILD-SPEC** — including §6, which states
the customer pays only standard request fees.

**Recommendation: decide, then make the docs and the copy agree — either way.** If it's real, it
belongs in **BUILD-SPEC** §6 as a third line item in how Deals affects money (alongside the Deal
Boost and the auction), with the discount's payer identified: Gopher absorbing it is a marketing
cost per featured merchant per month, which needs a cap. If it isn't real, the copy comes off both
surfaces. **The one unacceptable outcome is the current one** — a live discount promise to customers
that no system can honour and no spec acknowledges.

---

## 11. Build order

Derived from the dependency chain above, not newly proposed:

1. **Category taxonomy (Ruling 1)** — everything joins on it.
2. **The `deals` table + the §4.1 record** — gated on **SPINE-1 (G40-296)** for `ownerUserId`.
3. **Registration transport** — repoint `submitForm` at the real endpoint; delete the Apps Script
   path (**SP-PIPE** §6). Keep the localStorage fallback.
4. **Dashboard feed** — swap `MERCHANTS[]` for the live query; drop the sample banner
   (`app_part4.js:256`); point `deals-coverage.js` "current signed" at the same source.
5. **Review queue actions** — Approve / Reject / Request-better-image write to the API instead of
   `localStorage['gopher_deals_admin']`.
6. **Publication feed (§7.2)** + `isDealLive` as the single predicate.
7. **Consumer surfaces** — replace both inline `DEALS_DATA` arrays with the feed; §9.5 drift dies
   with them.
8. **Bid board** — server-side settlement, `merchantId`-keyed placements (§8).
9. **Emails** — the deals@ sends move to the G40-305 dispatcher (**SP-PIPE** §6).
10. **Merchant deal actions** — edit / pause / delete (§9.3).

---

## 12. Related tickets

| Key | Relationship |
|---|---|
| **G40-286** | Parent — Deals front-end consolidated; the live registration feed is deferred *to* it |
| G40-287 | DLM-2 merchant portal + inbox — consumes the same feed |
| G40-289 | DLM-4 Bid-for-Placement — §8 |
| G40-292 | DLM-8 seed last-mile delivery — the redemption bridge into `controllers/order/create.js` |
| G40-296 | SPINE-1 — gates `ownerUserId` and portal login |
| G40-305 | Email dispatcher — the deals@ sends in §3.2 |
| G40-327 | Go→Deals deeplink — a consumer of the published feed |
| G40-180 | Admin advertising-partner entry — origin of `isDealLive` / `trackClick` (§9.2) |
