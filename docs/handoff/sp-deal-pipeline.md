# Service-Provider Deal pipeline — production spec (owner decisions 2026-07-24)

Owner-confirmed end-to-end process for how a Gopher worker offers a Service Provider
Deal. This resolves the gap list from the 2026-07-24 code deep-dive. The front-end
surfaces exist at prototype grade; **every step below names what the production build
must implement.** Related: `docs/handoff/final-cleanup/` chrome docs, the SP-eligibility
amendment (CLAUDE.md 2026-07-23, commits `391822d`/`bda46ae`), and the HQ Dashboard
repo's `regen_sp_eligibility.py` + `sp-eligibility.js`.

## 0. The eligibility rule (canon, amended 2026-07-23)

Automatic — no application. All three required:

| Bar | Meaning |
|---|---|
| Verified tier | Elite, Elite+, or Pro |
| 20+ completed **service** jobs | All-time; **Delivery / Ride Sharing / Other excluded** |
| 4.75★ over last 20 **service** jobs | Same category exclusions as the 20-count |

Admin may also grant eligibility case-by-case. Rating authority = Ratings.csv-equivalent
(rated_id = gopher), **not** the Orders `GOPHER RATING` column (~25% disagreement, 0 = unrated).

## 1. Eligibility computation (backend)

Production computes `ELIGIBLE` per worker from live tier/jobs/ratings data.
**Reference implementation: HQ Dashboard repo → `regen_sp_eligibility.py`** (runs the
amended bar against Orders + Users + Ratings; validated 2026-07-23: 13 auto-eligible
vs 88 under the old all-jobs bar). The web prototype hardcodes `ELIGIBLE` with a demo
toggle (`Final/gopher-go.html`, "DLP" gate) — presentation only.

## 2. Eligibility notification (owner decision — AUTOMATIC)

The moment a worker crosses the bar:

1. **Email from `deals@gophergo.io`** congratulating them on eligibility, explaining
   how to offer a deal from the Gopher Go dashboard (web) or the Go app. **Build the
   email from the existing email-template assets** (email program G40-305: `SMS:Emails`
   assets, `sendEmail.js` dispatcher) — do not write a new template from scratch.
2. **The "+ Service Provider Deal" CTA activates** in the Go web dashboard
   (already built — the gate just needs the real `ELIGIBLE` feed), **and** the Go
   app's equivalent entry activates — owner has directed the App Prototypes session
   to add that component to the **Perks section of the app Home screen** (in flight
   2026-07-24).

## 3. Deal submission (in-app form → Dashboard + email)

The in-app "Offer your service" form (deal text, 1–3 keywords, earn amount, normal
price, reach radius; customer pays earn × 1.10 Deal Boost) currently validates and
shows success only — **no payload leaves the page.** Production:

1. Submission **lands in the HQ Dashboard → Deals section** as a pending item for
   approval (same surface admins already use).
2. **Every completed registration/deal form also emails `deals@gophergo.io`** as a
   real-time notification.

## 4. Review queue (reuse the merchant process)

**The merchant deal-review logic already exists in the HQ Dashboard — use the same
process for Service Providers.** Do not build a separate SP queue. The Dashboard's
SP-eligibility section (KPIs, eligible table, near-miss list) supports the reviewer's
verification of the submitter against the bar.

## 5. Approval → live

"Approved" = an admin has viewed the deal and it meets the criteria. Then:

- **Web surfaces (Request web, Connect): go live on approval.** Owner's working
  assumption is that no app-store-style regulation applies to the web platforms
  (there has never been a live web platform before); proceed on that basis unless
  the dev finds otherwise.
- **Apps (iOS / Android): the deal is queued for the next App Store / Play Store
  release and catches up when that ships.** (Dev note, not a decision: this reflects
  the current bundled-content architecture — if the rebuild serves deals as API data,
  store releases stop being the bottleneck and apps go live with web. Flag to owner
  if the rebuild makes that choice.)
- Going live triggers the promised notifications: message to the worker's **Gopher Go
  inbox** ("the moment it's live") and the merchant-portal inbox equivalent for
  merchants (copy promises "usually within 1 business day").
- A deal already holding a won featured-placement spot activates it on approval
  (bid-board logic in `assets/js/gopher-bid-brain.js`; the worker-side bid board in
  Go is still unbuilt and MUST render from that shared brain).

## 6. The deals@ mailbox plumbing

`deals@gophergo.io` is the sender/receiver identity for steps 2, 3, and 5. The
send-capability wiring (Gmail send-as alias on the Apps Script account + the
script-side email snippets) is the item tabled by the owner 2026-07-22 — steps 2/3
above now depend on it, so it un-tables when this pipeline is built. Script-side
edits are owner-actions (no-live-changes rule); front-end wiring + exact Apps Script
snippets are ready to build on request.

## Public interest funnel (unchanged, for completeness)

The Deals site's "I'm a service provider" form (name/mobile/email/Gopher ID →
`GOPHER_FORM_ENDPOINT` Apps Script → owner's Sheet, localStorage backup) remains the
public entry for not-yet-eligible workers: backend verifies the Gopher ID against the
bar, then replies with eligibility terms by email + Go inbox message. The deal itself
is only ever submitted in-app by eligible workers.
