# Open decisions for John — collected from all 12 retire handoffs, 2026-08-24

Every retiring lane put its questions to the owner rather than leaving them for a successor.
This is the pooled result. **HQ Dashboard / Deals is the only lane with none** — all five of its
decisions were asked and answered during the session.

---

## A. Someone is waiting on these

**1. The live investor site is STALE.** *(2026 Investor Update)*
`gopher-investor-update.netlify.app` carries none of the 8/23–24 status-language changes; only
the board draft was deployed. Corrected build is ready at
`~/Desktop/gopher-update-netlify/index.html`.
→ **One drag onto that site's Deploys tab.** ⚠️ NOT the Drop page — Drop mints a new URL and the
sent link would keep serving the old build. Nothing has gone to investors yet, so no wrong
version is in anyone's inbox. Fix before sending.

**2. DL-0009 (Brittany Brewer) is a real merchant sitting `pending`** in the HQ queue awaiting
your approval. *(Go → Deal Registration)*

---

## B. Blocking a session outright

**3. GitLab auth on this box is gone. — ✅ RESOLVED 2026-08-24, John re-stored the token in the
macOS keychain.** *(John's Tickets)*
Verified first-hand rather than inherited: `git ls-remote`, `git fetch`, and the REST API all
succeed, and MR **!376** was created, its pipeline read, and the merge performed through it.
**!375's merge IS now verified** — `91231bcb` is on `origin/production`. The struck-through
description below is kept for the record.

~~
`git fetch` → *"could not read Username for gitlab.com"*; the credential helper returns a
zero-length token, so every API call 404s as unauthenticated. It worked earlier in the session
(MR !375 was created with it) and stopped partway through.
→ **Consequence: MR !375's merge/deploy could not be verified.** You said you merged it; that is
recorded as *inherited, not verified*. Needs a token. Pause-and-wait item.~~

**4. Stripe read access. — ✅ CLOSED 2026-08-24, owner checked Stripe: "clean and closed".**
*(AWS — struck through below, kept for the record)*
"No double capture" rests on our own logs over 7 days. Stripe is the authority and no session has
ever had access. ~~Status: well-supported, unconfirmed.~~ **Now confirmed at the source.** Checks left for you: two PaymentIntent
ids, and Payments → Transfers for a repeated order number (`transfer_group: order_<id>`).

---

## C. Decisions with no deadline, but they are blocking work

**✅ SUPERSEDED 2026-08-24, LATER THE SAME DAY — OWNER DIRECTED IT BUILT. SHIPPED AND LIVE.**

Sequence matters here, so it is recorded plainly rather than by quietly editing the old ruling
away. The "ticket it as `G40-411`, backlog, do not build unasked" ruling below was made earlier
on 2026-08-24 and was correct on what was known then. Later that day the owner asked what the
duplicate-message risk actually was, and on being told it was customer-facing duplicate SMS,
directed the work: *"Well i definitely dont want my customers getting duplicates"* → *"Lets go
with your rec"* → *"Proceed, you merge if clear."*

**Built, reviewed, merged and verified in production the same day.**
- MR **!376**, merge commit **`1e6e5c1d`** on `origin/production`, no squash, source branch kept.
- One transaction-scoped advisory lock at the dispatch point in `middleware/crons.js`; `getTasks()`
  is byte-identical, so no task body changed.
- CI: 130/130 suites, 1174→1178 assertions. A real `postgres:15` service was added to the
  `unit-tests` job so the lock is exercised rather than mocked, and the test **hard-fails in CI**
  if that service disappears.
- **Verified in production from logs, not inferred:** during the rollout two instances ticked, one
  led and one logged `CRON TICK SKIPPED: another instance holds the cron leader lock`. Zero
  `CRON FAILED` / `CRON TICK OVERRAN` / `CRON TICK FAILED`. EB health `Ok`.

**Two things the old ruling got wrong, both worth carrying forward:**
1. *"Every cron double-runs during every rolling deploy"* understated it. `DesiredCapacity` was
   **2** after the deploy and ASG history shows the environment churning between 1 and 2 instances
   independently of deploys (e.g. 21:02→21:09 UTC, no deploy involved). The duplicate window was
   **every scale-out**, not just deploys.
2. *"A stuck lock would stop the money crons silently, which is worse than double-running"* was the
   right worry and is what the design answers: the lock is **transaction-scoped**
   (`pg_try_advisory_xact_lock`), so Postgres releases it at commit, at rollback, and on
   disconnect — it cannot be leaked. `TICK_BUDGET_MS` (55s) bounds the hold so a task that never
   settles cannot wedge it, and on timeout the behaviour degrades to exactly the pre-fix
   fire-and-forget, never to "no crons".

**New, measured, and previously unknown:** a full tick takes **~33.5s** for 19 tasks. Nothing had
ever measured this. It holds one pooled connection (pool `max: 5`, shared with API traffic) for
roughly 56% of every minute. Not acting on it: `CRON TICK OVERRAN` now exists and is registered in
`docs/alert-markers.json`, so the system will raise this itself if it ever matters.

Baseline and full evidence: `Documentation/AWS/cron-leader-election-baseline-2026-08-24.md`.

`G40-411` should be closed as delivered, citing `1e6e5c1d`.

<details><summary>Original ruling, kept for the record</summary>

**⛔ OWNER RULING 2026-08-24 — TICKET IT → filed as `G40-411` (backlog, no sprint).** Recorded as known work, not built now. Do not
build it unasked, and do not re-raise it as an open decision — it is decided.

Grounds (established before the ruling — this is a scheduling decision, not a dismissal):
- The money-duplication check came back clean, and John then confirmed it **at Stripe itself** —
  "clean and closed." The harm was looked for at the authority and is not there.
- The one error the race actually produced is **fixed and live**: MR !375 treats Stripe's
  already-cancelled response as success (merge `91231bcb`, verified on `origin/production`).
- What remains is a *window*, not an observed defect.
- A stuck lock would stop the money crons **silently**, which is worse than double-running —
  a duplicate is visible, a job that quietly never runs is not.

**Why ticket rather than leave:** the urgency is gone but the window is real, and an unticketed
known-risk quietly disappears from the record. **Per `docs-are-truth-not-tickets`: this memory /
doc carries the canonical rule; the ticket carries only the repro, the acceptance criteria and
the assignee, and references the doc. The ticket is meant to die; this text is not.**

**Priority signals:** an actual duplicate capture or payout appearing, or a change to the deploy
policy / instance count. Either one promotes this from backlog to active.

**5. Leader election on the money crons — architecture decision.** *(Live App Bugs)*
Every cron double-runs during every rolling deploy (~34 instance streams/day). Today's symptom
was benign, but the same shape runs on `confirm_auto_payout`, `re_authorize_token`,
`process_scheduled_orders`. `confirm_order_payout` guards on `payment_status === PAID` but it is
a read-then-write with no lock — same window. **Stated as a risk to evaluate, NOT a proven
defect**; the money-duplication check came back negative.
→ Spans four crons, so it is an owner call, not a ticket. Nobody should build it unasked.

</details>

**⛔ OWNER RULING 2026-08-24 — BACKEND CRON. Decided; do not re-raise.**

The deactivations-feed ingest runs as a **backend cron in `gopher-backend-api`**, not as an
HQ-side job. Grounds: the write path and credential handling already exist there, and one
scheduled restart is cheaper than provisioning and guarding a second DB credential against a
login that is currently read-only.

**What this unblocks, and what it still needs:**
1. A **read-only Twilio API key** must be created and added to the Beanstalk environment —
   that is an OWNER action (credential), not a session one.
2. Adding it is a **planned production restart**. Brief, but it must be scheduled by John, not
   taken opportunistically.

**⚠️ This does NOT change the "record, don't act yet" ruling.** The ingest only *marks*
`sms_state`; it must not suppress or reroute any send. That ruling is enforced in code —
`test/sms-state-columns.test.js` case 6 fails the moment any file outside
`config/|models/|test/` references `sms_state`. Do not delete that case to make the ingest
pass; make the channel-split decision explicit there instead.

**Suppressing sends based on the mark is a SEPARATE decision that has not been made.**

**6. Where does the deactivations-feed ingest run?** *(Research — open since 8/17, a week)*
Backend cron = read-only Twilio key into Beanstalk = a **planned production restart**.
HQ-side job = ⚠️ the HQ DB credential is **read-only**, so it cannot write `sms_state` without a
new credential. Session recommendation: **backend cron** — the write path and credential handling
already exist there.

**7. Is `RFP/Gopher-Scope-of-Work.md` still a live bidding instrument, or has it become Matt's
contract definition?** *(Total SOW Priorities — 4 days old)*
At v1.6 (2026-08-05). Since then: two strikes (G40-18 closed; notification-sound scope priced
against a false premise), one large add (Refer Gopher — lifetime attribution, kind-aware rail),
one uncosted gap (notification tap-through, ~35 call sites).

**8. G40-366 — production go/no-go.** *(Jira)*
Node 18 platform is retired; Stage rehearsed clean on Node 24 (8/20). Production is held
indefinitely at this checkpoint and is **safe to leave** there.
