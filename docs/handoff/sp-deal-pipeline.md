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

## 6. The deals@ mailbox + the Apps Script's TEMPORARY role (owner, 2026-07-24)

**The Google Apps Script is a temporary pre-registration play only. Once the platform
is live there is NO Apps Script anywhere in this pipeline** — registration and deal
submissions go **straight to the HQ Dashboard** for review/approval, and all emails
(the deals@ eligibility congratulations, the deals@ form notifications, the
inbox-on-live messages) are sent by the **platform's own email dispatcher**
(`sendEmail.js` / G40-305 program), not by a script. Do not build production
integrations against `GOPHER_FORM_ENDPOINT`.

`deals@gophergo.io` is the sender/receiver identity for steps 2, 3, and 5 regardless
of era. Pre-launch, the tabled 7/22 Apps Script wiring (deals@ send-as alias + script
snippets) is the interim way to send from it; at go-live that entire mechanism is
retired in favor of the dispatcher.

**The email itself is drafted:** `Documentation/SMS:Emails/gopher-email-sp-deals-eligible.html`
(built 2026-07-24 from the tier-grant template family; tokens `{{firstName}}`,
`{{OFFER_DEAL_URL}}`, `{{DEALS_101_URL}}`, `{{currentYear}}`; registered in the
Recap + Tracker docs as a **NEW** dispatcher type, sender deals@).

## Public interest funnel (pre-registration era only)

The Deals site's "I'm a service provider" form (name/mobile/email/Gopher ID →
`GOPHER_FORM_ENDPOINT` Apps Script → owner's Sheet, localStorage backup) is the
**pre-registration** entry for not-yet-eligible workers: backend verifies the Gopher
ID against the bar, then replies with eligibility terms by email + Go inbox message.
At go-live this funnel either retires or repoints to the Dashboard like everything
else — the deal itself is only ever submitted in-app by eligible workers.
