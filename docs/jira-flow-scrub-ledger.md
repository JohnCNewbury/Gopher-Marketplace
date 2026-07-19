# Jira Flow-Scrub Ledger — G40 vs Canonical Request Flow

**Started:** 2026-07-19 · **Owner decisions (John, 2026-07-19):**
- **Flow scope = full lifecycle including creation** (creation → broadcast → offers/accept → active → completion → confirmation/payout).
- **Phase II tickets skipped** (not in the RFP dev-handoff bundle; scrub later).
- **Documentation lives IN each Jira ticket** — structured dev-handoff comment ending
  with **"Flow documentation complete."**

**Per-ticket algorithm (John's spec):**
1. Related to request flow? N → mark N here, move on.
2. Legacy process identified/understood/documented (GitLab June-2026 exports)? No → do it.
3. Front-end logic/code created? No → create it (scaffolds in `Documentation/Jira Tickets/`
   and/or the Final/ prototypes + shared logic modules count).
4. Jira ticket documents 1–3 so the new dev needs ~zero discovery? No → post the
   dev-handoff comment. Ends "Flow documentation complete."

**Key references:**
- Canonical flow: `Documentation/Canonical Request Flow - Master /connect-flows-granular.html` (v3.2)
- Build scaffolds + status: `Documentation/Jira Tickets/` + `G40-Build-Recap.md` (2026-06-24, rev 13 —
  predates the July prototype work; Final/ prototypes are often further along)
- Prototypes (rebuild source of truth): `Final/gopher-request.html`, `Final/gopher-connect.html`,
  `_prototypes/Go/*-figma.html`, shared modules `gopher-request-logic*`
- Legacy code: GitLab exports cloned to session scratchpad `gitlab/{gopher-backend-api,
  gopher-mobile-gopher-,gopher-mobile-request}` (re-clone recipe: memory `old-app-repos-access`)

**Status codes:** `pending` → `mapped` (legacy map done) → `fe-ok` / `fe-gap` → **`DONE`**
(Jira comment posted). `n/a` = not flow-related. `p2` = Phase II skip.

---

## APPLICABLE — flow tickets to scrub (62)

| # | Ticket | Phase | Status | Notes |
|---|--------|-------|--------|-------|
| 1 | G40-6 | completion | **DONE** (17454) | Backend already excludes DELIVERED from claim guards; lock is client-side; 2-pending cap = net-new server-side. NB: Jira MCP mis-resolves key 'G40-6'→G40-217 — use numeric id 10983 |
| 2 | G40-9 | active/cancel | pending | Auto-repost on Gopher cancel (FE; backend = G40-304) |
| 3 | G40-18 | active/payment rail | pending | 7-day auth expiry; ties G40-297 |
| 4 | G40-35 | messaging on submitted/active | pending | Comms guard; connect-gate depends on flow state |
| 5 | G40-38 | creation/checkout | pending | Payment options at checkout; __payStore built |
| 6 | G40-39 | completion/rating | **DONE** (17455) | Legacy has no photo screen (photos ride rating POST); non-dismissible rating retired per INV-RATING; native storyboard = DO-NOT-BUILD |
| 7 | G40-40 | submitted/cancel | pending | Early-cancel modal A/B |
| 8 | G40-43 | submitted/expiry | pending | No expire with pending offers |
| 9 | G40-44 | broadcast | **DONE** (comment 17452) | Pilot. Legacy new_order_alert map + 4 do-not-port deltas (exact-5.0 vs ≥4.8, delays, no vacancy-collapse, non-durable timers) |
| 10 | G40-65 | completion | **DONE** (comment 17453) | Pilot. Legacy complete/v2→DELIVERED→confirm_payout rail + crons; prototype anchors refreshed (~20940/~16379); Go "Pending confirmation" canon |
| 11 | G40-68 | offers | pending | View-profile previous jobs |
| 12 | G40-69 | active | pending | 10-min not-started SMS |
| 13 | G40-77 | creation | pending | Duplicate-request warning |
| 14 | G40-78 | active/cancel | pending | Cancel only if no activity |
| 15 | G40-80 | active/reschedule | pending | Reschedule w/ approval + auth handling |
| 16 | G40-81 | active/cancel | pending | Two-strike Gopher cancel fee (canon in memory) |
| 17 | G40-83 | active | pending | 1-hour nudge SMS |
| 18 | G40-86 | active/scheduled | pending | Add-to-Calendar |
| 19 | G40-88 | submitted/update | pending | Update → email + admin log |
| 20 | G40-91 | broadcast/MY Gopher | pending | Unblurred name/pic for MY Gopher |
| 21 | G40-92 | submitted | pending | Activity-without-response SMS |
| 22 | G40-99 | broadcast | pending | 10-min re-broadcast |
| 23 | G40-101 | active/cost-adjust | pending | Receipt on cost increase |
| 24 | G40-108 | submitted/scheduled | pending | 48-h unaccepted check-in email |
| 25 | G40-113 | creation/pricing data | pending | "Suggested Offer Used" capture |
| 26 | G40-116 | creation/age | pending | Age-restricted ID at creation (canon in memory) |
| 27 | G40-137 | offers | pending | Counter-offer monthly credits |
| 28 | G40-139 | broadcast/worker view | pending | Available-tab instant refresh |
| 29 | G40-138 | active/location | pending | Allow-Always location during live request |
| 30 | G40-142 | active/ride | pending | Ride-sharing info enhance |
| 31 | G40-155 | — | **RECLASS?** | see N table — moved there (recommendation/inbox) |
| 32 | G40-160 | creation (Connect) | pending | B2B request submission umbrella |
| 33 | G40-164 | messaging/admin log | pending | Messaging not documented in Admin |
| 34 | G40-165 | broadcast/privacy | pending | Remove customer apt # |
| 35 | G40-186 | creation | pending | Available-Gophers count (iQ built) |
| 36 | G40-189 | submitted/admin update | pending | Admin updates a request |
| 37 | G40-192 | completion/age | **DONE** (17456) | Legacy v1 no-show pays immediately — ack/GPS/fraud/24h-hold all net-new; noShowGuard.js tests pass |
| 38 | G40-202 | completion/rating | **FE-GAP** | Confirm-gated host modal exists (Go proto) but Block-Requestor checkbox built nowhere; BlockRequestorCheckbox.jsx + relationships.js cited by recap are MISSING on disk — regenerate before posting |
| 39 | G40-204 | accept/worker | pending | 2+ workers modal |
| 40 | G40-205 | messaging | pending | Favorite/Block from messaging |
| 41 | G40-209 | submitted | pending | Info modals up to cancellation |
| 42 | G40-216 | active/messaging | pending | Worker photo attachments |
| 43 | G40-217 | active/cost-adjust | pending | .25-hr increments |
| 44 | G40-218 | completion/age | **DONE** (17457) | Delta layer only (07-07 comment already full); AC 'route to ratings' superseded by G40-331 gate |
| 45 | G40-244 | broadcast/details | pending | Ride details missing on worker view |
| 46 | G40-250 | broadcast/backup | pending | SMS/email escalation exclusions |
| 47 | G40-251 | creation | pending | Request Again carry-over |
| 48 | G40-253 | creation/QA | pending | Coverage validation, all creation flows |
| 49 | G40-266 | submitted/edit | pending | Edit category → duplicate |
| 50 | G40-270 | creation | pending | Draft order / save progress |
| 51 | G40-273 | creation/scheduled | pending | Address time zones |
| 52 | G40-274 | creation | pending | Pickup=dropoff regression |
| 53 | G40-292 | creation (Deals seed) | pending | Seed last-mile request from merchant order |
| 54 | G40-297 | submit/payment rail | pending | Escrow auth on submit |
| 55 | G40-299 | all (meta) | pending | Rebuild acceptance checklist |
| 56 | G40-300 | completion/rating | **DONE** (17458) | Star-conditional built+verified both prototypes; legacy fav checkbox unconditional; block-on-rating net-new |
| 57 | G40-304 | active/cancel (backend spec) | pending | G40-9 backend rail; FE = n/a by design |
| 58 | G40-307 | active/cancel deeplink | pending | Deep link into cancel flow |
| 59 | G40-310 | creation/age | pending | Auto-enable Purchase-needed guardrail (built) |
| 60 | G40-325 | completion/fraud | **DONE** (17460) | GPS already logged in order_logs — detection is a comparison legacy never does; null-GPS policy + threshold = owner decisions |
| 61 | G40-326 | active/authorizations | pending | Extend requester auths, kill cancel-resend |
| 62 | G40-328 | creation/fees | pending | ITF on undiscounted base (D-033) |
| 63 | G40-331 | completion/rating | **DONE** (17462) | Legacy rates at mark-complete (no state check); spec: unified finalization event + server-side enforcement |

*(G40-155 counted in the N table; table numbering retained for audit.)*

## NOT APPLICABLE — N, move on (58)

| Ticket | Why not flow |
|--------|--------------|
| G40-1/2/3/4 | Epics (containers) |
| G40-7 | Signup simplification |
| G40-10 | Go signup checklist |
| G40-11, G40-13 | Stripe account setup / payout-account confirmation |
| G40-19 | Failed instant transfer + debit entry (payout account) |
| G40-37 | Recommend-MY-Gopher inbox duplicates (referral/inbox) |
| G40-70, G40-103, G40-321 | HQ Dashboard workstream |
| G40-94 | AWS environment |
| G40-96 | Promo-code admin tool |
| G40-100 | Inbox Deleted tab |
| G40-107 | App-store review pre-prompt (engagement) |
| G40-135 | Refer-yourself SMS link |
| G40-143 | Signup dedup block |
| G40-147 | Email-change error copy |
| G40-154 | Minimum signup age |
| G40-155 | MY Gopher recommendation view in Inbox (referral/inbox surface) |
| G40-157, G40-170 | New-user signup / incomplete-signup |
| G40-159 | Deactivated Gophers off MyGopher lists (account mgmt; note: feeds broadcast tiers — cross-ref in G40-44 map) |
| G40-161 | Website redo |
| G40-199 | Elite rebranding |
| G40-200 | Platform fraud measures (note: `canBidOnRequest` seam cross-ref'd in offers map) |
| G40-203 | Phone-number change |
| G40-212 | Refer App enhancement |
| G40-225 | Auto-reject Stripe on deactivation |
| G40-250 → applicable (listed above) | — |
| G40-253 → applicable (listed above) | — |
| G40-258 | EB/VPC infra |
| G40-264 | Admin deleted/deactivated date bug |
| G40-271 | Signup regression (existing users) |
| G40-272 | Admin Email OTP |
| G40-281 | Stripe temp-email bug (signup) |
| G40-282 | Intercom → inbox |
| G40-283/284/285 | Security workstream (SEC-1/2/3) |
| G40-286, G40-287, G40-289 | Deals merchant portal/auction (Deals workstream) |
| G40-296 | SPINE-1 unified account (architecture) |
| G40-298 | Connect plan tiers |
| G40-301, G40-302 | Banner/modal reskin audits (design-system workstream) |
| G40-303 | Scale-hardening meta |
| G40-305, G40-306 | Email/banner-notification template programs |
| G40-308, G40-309 | Modal standards + tracker (design-system) |
| G40-322 | Android 15 target |
| G40-327 | Deals-for-workers deeplink |
| G40-330 | Play Data safety |

## PHASE II — skipped this pass (15)

G40-82, G40-87, G40-93, G40-104, G40-110, G40-169, G40-171, G40-191, G40-195,
G40-210, G40-280, G40-311, G40-323, G40-324, G40-329

---

## Dev-handoff comment template (posted to each applicable ticket)

```
FLOW SCRUB — Dev Handoff Notes (2026-07-19)

1. FLOW RELEVANCE: YES — <phase>: <one line>.

2. LEGACY PROCESS MAP (GitLab June-2026 exports):
   - Backend (gopher-backend-api): <controllers/..., function, endpoint — what it does today>
   - Worker app (gopher-mobile-gopher): <src/..., component/function>
   - Requester app (gopher-mobile-request): <src/..., component/function>
   - Key statuses/enums involved: <ORDER_STATUS values etc.>

3. NEW FRONT-END (already built — do not re-discover, do not re-implement):
   - Prototype: <Final/gopher-request.html §, Final/gopher-connect.html §, _prototypes/Go/...>
   - Logic modules/scaffolds: <Documentation/Jira Tickets/... + shared modules; test status>
   - Canonical flow: connect-flows-granular.html v3.2 <invariant/§>

4. REMAINING WORK FOR DEV (build + test exactly this):
   - <backend wiring / endpoints / durable timers / etc.>
   - Tests: <the specific acceptance/regression tests to run or add>
   - Reserved (payments/auth/DB/matching/security internals) per handoff scope.

Flow documentation complete.
```

## Progress log

- 2026-07-19 — Ledger created; 135 open tickets triaged: 62 applicable, 58 N, 15 Phase II.
  GitLab exports cloned to scratchpad. Scope decisions recorded (John).
- 2026-07-19 — **Canonical doc is v3.4** (Jul 12, adds INV-RATING) — v3.2 is its changelog
  lineage; scrub comments cite v3.4. Pilot pass posted G40-44 (17452) + G40-65 (17453);
  legacy-vs-new-spec "do NOT port" deltas proved valuable — propagated to all agents.
- 2026-07-19 — Remaining 59 applicable tickets fanned out to 9 themed background agents
  (broadcast / creation / creation-pay-age / offers-worker-view / active / cancel-pay-rail /
  completion / messaging-updates / umbrella-meta). Rules: comment-only, read existing comments
  first, hold fe-gap tickets for a build pass, report reclassifications.
