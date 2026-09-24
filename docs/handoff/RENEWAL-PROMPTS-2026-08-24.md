# Successor opening prompts — 2026-08-24 rotation

Paste as the FIRST message of each new session. One per retired lane.
Only lanes whose handoff already exists are listed; add others as they report.

⚠️ Every prompt includes the **WORK-REGISTRY claim** step. Collisions in this project happen
on FILES, not tickets — `Final/gopher-connect.html`, `gopher-request.html` and `gopher-go.html`
have each already been edited by several sessions at once. Claiming is what makes parallel
renewal safe; without it, serialize instead.

---

## 1. AWS  (independent lane — safe to run alongside any other)

```
You are the successor to the AWS session, retired 2026-08-24.

FIRST, before any code: read docs/handoff/aws-handoff-2026-08-24.md. It is an index,
not a diary — state of play split into verified / NOT-verified / recommended-but-not-applied
/ applied-but-unconfirmed. Respect those divisions; do not promote anything a rung.

CARRIED FORWARD — the single open item: the Stripe double-capture confirmation.
Status: "well-supported by our own logs over 7 days, UNCONFIRMED against Stripe."
It is an ACCESS question, not a research one — John has the dashboard, you do not.
Do not let it harden into an assumption, and do not re-derive it from our logs again.

Also settled this session, do not redo: the memory file cron-double-run-on-every-deploy.md
had "11 distinct instances/24h". Correct figure is 34-35. The cause was a PAGE CAP, not an
API limitation — --no-paginate returns ONE page, and the default auto-paginates correctly.
Either API is fine; the time window and page cap must both be explicit.

Claim any files you will edit in Dev/gopher-dev-handoff/WORK-REGISTRY.md before starting.

Confirm you have read the handoff and state what you believe the next task is before working.
```

---

## 2. App / Web Sync

```
You are the successor to the App / Web Sync session, retired 2026-08-24.

FIRST, before any code: read docs/handoff/app-web-sync-handoff-2026-08-24.md (commit be4fc9e).
Seven numbered lanes, each marked DONE+LIVE or SPEC-NOT-BUILT. Believe those marks.

ITS OWN "what I'd do next", in order:
 1. G40-410 is the clock — surface 1 landed in 77b4617; it MUST be in the first store
    release after 8/31 or new under-30 enrollment hits an infinite spinner post-cliff.
    NOTE: surface 2 (the prototype gate) was completed 2026-08-24 — do not redo it.
 2. Deals merchant portal a2ec9a2 is live on preview; the owning session was never
    identified. HQ Dashboard/Deals and Go->Deal Registration have both been asked.
 3. 4.2 counsel review of the BIPA block + 4.4 AWS console check (bucket SSE,
    Block-Public-Access, access logging) — both need a person, not a session.
 4. Read-side authz audit — the check-route-authz.js gap.

⚠️ You share Final/gopher-request.html and Final/gopher-connect.html with the Website
Updates lane. CLAIM THEM in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing, and
read what is already claimed there.

Local-test gate STANDS (owner, reaffirmed 8/24): for any Final/ change, stand up a local
serve, give John the URL, wait for his go-ahead before deploy.sh --push. A per-instance
"ship it" from him overrides that one deploy only. A push publishes to BOTH hosts.

Confirm you have read the handoff and state what you believe the next task is before working.
```

---

## 3. Website Updates

```
You are the successor to the Website Updates session, retired 2026-08-24.

FIRST, before any code: read docs/handoff/website-updates-handoff-2026-08-24.md (commit c36aa21).
State of play is split into done-and-verified-live / done-but-deployed-by-another-session /
in-flight-not-mine / not-started. The distinctions are load-bearing.

ITS OWN "what I'd do next", in order:
 1. gopher-go.html and gopher-deals.html do NOT have the 3-step live ID capture that
    Request and Connect have. CHECK FIRST whether those surfaces capture ID at all —
    do not assume they do. If they do, they are the next port.
 2. Watch the two-session overlap on gopher-request.html / gopher-connect.html —
    App / Web Sync is also in them. CLAIM FILES in
    Dev/gopher-dev-handoff/WORK-REGISTRY.md before starting.
 3. Revisit docs/handoff/refer-parity/run_refer_copy_coverage_test.py if refer cards change.

ALREADY RESOLVED — do NOT re-raise with John: the local-test gate question. He ruled
2026-08-24 that the gate STANDS, and that an explicit per-instance "ship it" overrides
that deploy only, never as a standing suspension. It is in memory/local-test-before-deploy.md
and in the handoff's RESOLVED section.

Verify deploys BY CONTENT — curl the live URL and grep for a string you changed. A 200
only proves the file exists. Never verify by SHA; main shares no history with the branches.

Confirm you have read the handoff and state what you believe the next task is before working.
```

---

## 4. App Prototypes  (lowest priority — nothing urgent pending)

```
You are the successor to the App Prototypes session, retired 2026-08-24.

FIRST, before any code: read docs/handoff/app-prototypes-handoff-2026-08-24.md (commit 32fba90).
Its most important section is "Disk-only files I touched" — most of _prototypes/ is gitignored,
so git status shows NONE of your predecessor's work. Read that list before assuming a clean tree.

⚠️ ALREADY DONE, do not redo: G40-410 surface 2. John authorized it 2026-08-24 and the
one-line gate removal is applied in _prototypes/Request/gopher-request-flow.html. Verified:
gate string now 0 occurrences, idVerifiedNow down to exactly 2 refs (line 1144 the function,
line 1223 the ts-verified badge — both intentionally kept; removing a third deletes the perk,
not the gate). The age-keyword compliance gate on the adjacent line is untouched and must stay.

Known-good state at retire time: _prototypes/Go/gopher-go-canonical.html is byte-identical to
Documentation/Canonical Go Flow - Master/ (both 0e79904a7035), and both connect-flows-granular.html
copies match (19f57d21f002). Re-verify before editing either.

_prototypes/Go/gopher-banner.js and _prototypes/Request/gopher-banner.js are gitignored but
ALLOWLISTED for deploy — a pinned-worktree deploy aborts until they are copied in from the
clone. Expected, not a fault.

Claim any shared files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.

Confirm you have read the handoff and state what you believe the next task is before working.
```

---
---

# Remaining eight lanes

**Settled 2026-08-24 — every prompt below carries the relevant ones so nothing is re-raised:**
Stripe double-capture **CLOSED clean** (owner checked Stripe) · GitLab auth **RESTORED** ·
MR !375 **verified merged + live** (`91231bcb`) · leader election **ticketed as G40-411**,
backlog, decided · deactivations ingest **decided (backend cron) AND BUILT** — branch
`feat/deactivations-feed-ingest`, commit `491767a6`, **unpushed/unmerged** · local-test gate
**STANDS** with per-instance override · investor site **deployed** · DL-0009 **denied, merchant
resubmitting** · L&E portal **flip 8/28, keep the existing warmer empty-state copy**.
**Still open with John: the SOW question, and G40-366 go/no-go.**

---

## 5. Research / L&E SMS

```
You are the successor to the Research (L&E SMS) session, retired 2026-08-24.

FIRST: read docs/handoff/research-le-sms-handoff-2026-08-24.md.

TIME-CRITICAL, in order:
 1. Chase Brett for the participant count. The groups are 8/27. Nothing else in
    the pilot matters until this lands.
 2. THE PORTAL. Owner decided 2026-08-24: on 8/28, take the L&E survey down.
    Source is Documentation/Research Partnership/portal/portal.src.html -- set the
    le-tobacco-2026-08 card to live:false (line ~310; that also strips its URL),
    then run build_portal.py. NEVER hand-edit index.html or dist/, both are generated.
    KEEP the existing empty-state copy -- owner chose it over new wording:
    "Nothing open right now - we'll let you know as soon as something is."
    John deploys by dragging dist/ to Netlify; no CLI or token exists for that site.
 3. Status-callback webhook. Needs NO new credential -- lib/sendSms.js already
    authenticates via TWILIO_ACCNT_SID / TWILIO_AUTH_TOKEN.

ALREADY DECIDED, do not re-raise: "where does the deactivations ingest run?" -> BACKEND
CRON (owner, 8/24). It is also already BUILT on branch feat/deactivations-feed-ingest
(commit 491767a6, unpushed). Verified there: it needs NO new Twilio key and NO production
restart -- the Deactivations resource uses the existing account credentials and Twilio
documents the requests as free. The earlier spec's read-only-key + restart premise was wrong.

⚠️ Documentation/Research Partnership/ IS NOT A GIT REPO and send-lists/ holds REAL customer
emails and phone numbers. Treat accordingly.

Claim files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.
Confirm you have read the handoff and state the next task before working.
```

---

## 6. Total SOW Priorities

```
You are the successor to the Total SOW Priorities session, retired 2026-08-24.

FIRST: read docs/handoff/total-sow-priorities-handoff-2026-08-24.md.

ITS OWN next-tasks, in order:
 1. Get the SOW answer from John -- is RFP/Gopher-Scope-of-Work.md still a live
    bidding instrument, or now Matt's contract definition? STILL OPEN as of 8/24.
    Everything in §L of LAUNCH-SOW.md is downstream of it. Ask before building.
 2. Chase the Gopher GO build -- highest-leverage item on the board: one build
    removes ~93% of error volume and unblocks 9 merged-but-invisible client MRs.
 3. Merge production -> next in BOTH mobile repos (drifted 4 and 2 commits on 8/23).
    Anyone branching off next in the requester repo gets a tree where npm ci fails.
 4. Triage the 137 open non-Phase-II tickets into launch / post-launch. Until then
    there is no launch scope number, only a Jira count.
 5. Decide where the HTML artifacts live (Matt proposed GitLab Pages; private Pages
    confirmed). Open sub-question: the handoff repo is on GitHub and there is no
    handoff project in the gophergo GitLab group.

Read the "Matt -- what he has been told" section before contacting him, so you neither
repeat nor contradict it. Matt sees ONLY the gopher-dev-handoff repo.

Claim files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.
Confirm you have read the handoff and state the next task before working.
```

---

## 7. Live App Bugs

```
You are the successor to the Live App Bugs session, retired 2026-08-24.

FIRST: read docs/handoff/live-app-bugs-handoff-2026-08-24.md.

⚠️ TWO THINGS IN THAT DOC ARE NOW STALE -- it was written before they resolved:
 - The Stripe ledger-side check is CLOSED. The owner checked Stripe itself on 8/24:
   "clean and closed." Do NOT re-raise it and do NOT re-derive it from our logs.
 - Leader election is DECIDED: ticketed as G40-411 (backlog, no sprint). It is not an
   open owner decision any more. Do not build it unasked; do not re-raise it.
   The idempotency half it references shipped as MR !375 (merge 91231bcb, live).

That leaves the doc's own remaining next-tasks. Work them in its stated order.

Standing rule this lane keeps proving: mark every INHERITED claim as inherited. The
"2 in 7 days" figure in that doc was corrected to ">=3, structurally undercounted" --
a metric count is a FLOOR, never a measurement.

Claim files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.
Confirm you have read the handoff and state the next task before working.
```

---

## 8. Jira

```
You are the successor to the Jira session, retired 2026-08-24.

FIRST: read docs/handoff/JIRA-SESSION-HANDOFF-2026-08-24.md.

ITS OWN next-tasks, in order:
 1. G40-366 production window -- STILL AWAITING JOHN'S GO as of 8/24. Stage rehearsed
    clean on Node 24; production is held at the checkpoint and is SAFE to leave held.
    When he gives the go: low-traffic window, watch settle, smoke sign-in / order /
    Stripe charge / account.updated / payouts, then the CI pin MR.
 2. Review + merge peer !240 / !229 -- they explicitly asked for John's eyes after a
    near-miss.
 3. Matt's first build -- ships ~5 months of fixes and is the ONLY way to validate
    G40-58 / 373 / 376 / 377, none of which has ever run on a device.
 4. t3.xlarge swap (~10% cheaper, two generations newer). Deliberately NOT bundled
    with the platform change; its own five-minute decision.

NEW since the handoff: G40-411 was filed 8/24 (money crons double-run / leader election,
backlog, no sprint, needs no store release -> sprint 677 when picked up).

Standing rule for this lane above all: a ticket is NEVER the source of truth -- the doc is,
and a ticket is not Done until its doc row is written.

Confirm you have read the handoff and state the next task before working.
```

---

## 9. HQ Dashboard / Deals

```
You are the successor to the HQ Dashboard / Deals session, retired 2026-08-24.

FIRST: read docs/handoff/DEALS-SESSION-HANDOFF-2026-08-24.md.

That session closed with ZERO open questions -- every decision was put to John and
answered in-session. Read the "Open questions" section to see what was settled so you
do not reopen any of it.

ITS OWN next-tasks, in order:
 1. The Business logo tile upload path. Front-end only -> ends at a commit for John's
    push, NOT an auto-deploy.
 2. Deal ID reformat to SP1/MD1 -- owner wants it AFTER testing, and the three pending
    deals get cancelled first. The open design question is the NUMBER: per-track
    sequential needs its own counter (COUNT(*) WHERE track races two simultaneous
    submissions into one code -> two Postgres sequences). If the global row id is
    acceptable (SP12, MD11 -- unique but gappy) it is one line. Also decide whether to
    backfill existing DL- codes. Blast radius is small: 5 files read deal_code, all reads.
 3. Native apps have NO deals code -- verified across all six branches of both mobile repos.

Ownership note: you were asked on 8/24 whether you authored a2ec9a2 ("Merchant portal:
sign in for real"). If that is still unanswered in your transcript, it stays open --
App / Web Sync shipped it to preview on John's "ship all of it" and could not identify
the owner.

Claim files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.
Confirm you have read the handoff and state the next task before working.
```

---

## 10. Go → Deal Registration

```
You are the successor to the Go -> Deal Registration session, retired 2026-08-24.

FIRST: read docs/handoff/go-deal-registration-handoff-2026-08-24.md (commit 57106f5).

⛔ ITS ONE BLOCKING ITEM, and it is the next task:
 The whole SP spine is LIVE (eligibility -> server-gated submit -> HQ queue -> public
 feed), but Final/gopher-request.html and Final/gopher-connect.html render deals from
 ~19 HARDCODED arrays each and never call GET /api/v1/deals. An approved SP deal
 publishes into a feed that almost nothing renders.
 Owner agreed the sequence: he submits + approves one deal FIRST, then you wire it.

 Fold in: the feed payload carries no rating, tier or job count (verified in the live
 response), yet launch marketing promises "we promote your performance history."

DO NOT "CLEAN UP" THE APPS SCRIPT TOMBSTONES. Severance is COMPLETE. gopher-deals.html
matches GOPHER_FORM_ENDPOINT 4 times on both hosts and ALL FOUR ARE COMMENTS -- including
the REMOVED 2026-08-21 marker recording the owner's reason. The live-code probe
  grep -cE 'var GOPHER_FORM_ENDPOINT *= *"https|fetch\(GOPHER_FORM_ENDPOINT'
returns 0. The raw count reads like debt and is not. Verified 2026-08-24.

With John and not blocking you: DL-0009 was DENIED for lack of info and the merchant is
resubmitting; the ~2,460 placeholder accounts (POST /users/sign_in mints on an unrecognised
number, none has ever ordered or worked) still inflate every roster metric.

Claim files in Dev/gopher-dev-handoff/WORK-REGISTRY.md before editing.
Confirm you have read the handoff and state the next task before working.
```

---

## 11. John's Tickets

```
You are the successor to the John's Tickets session, retired 2026-08-24.

FIRST: read docs/handoff/johns-tickets-handoff-2026-08-24.md
(NOTE the path -- it is in Documentation/Claude Code Review:Cleanup/docs/handoff/,
one level ABOVE the Code repo, not inside it.)

⚠️ ITS "ONE UNRESOLVED BLOCKER" IS RESOLVED -- the doc is updated but read it anyway:
GitLab auth is RESTORED (token re-stored in the macOS keychain; all five repos reachable),
and MR !375 is VERIFIED merged and live -- state merged, merged_at 2026-08-24T18:41:38Z,
merge commit 91231bcb, confirmed an ancestor of origin/production, 4 files including a
228-line cancel-idempotent-on-race.test.js. John was right; it is now first-hand, not inherited.

⚠️ The stale-ref trap in that doc was REAL. Its "0 hits" content check found nothing because
its local origin/production was three commits behind. Always re-fetch, unsuppressed, before
any "is it live?" claim. A negative from a stale ref is evidence of nothing.

REMAINING next-tasks from its list (1 and part of 2 are done):
 - The cancel-idempotency work now has a ticket lineage: G40-411 covers the broader
   leader-election item (backlog, decided). Check whether the specific idempotency ticket
   it wanted still needs raising, or whether !375 closed it.
 - Manifest-note MR: one line saying the alarm intentionally has no action.
 - Re-check G40-373 and move it if its session is finished -- that empties
   "Store Release - Needs QA" and the column can be retired.
 - Write the "Done means waiting on nothing" rule into STANDING-RULES.md. It has two
   recorded conflicts that must be SETTLED in the text, not left implicit.

Confirm you have read the handoff and state the next task before working.
```

---

## 12. 2026 Investor Update

```
You are the successor to the 2026 Investor Update session, retired 2026-08-24.

FIRST: read the handoff at
Documentation/Board:Investor Updates/Gopher Investors/Investor Info/Investor Updates/HANDOFF-2026-08-24.md
(it is filed with the investor docs, NOT in the Code repo -- investor deliverables are
local-disk-only by standing rule.)

⚠️ ITS "ONE THING THAT NEEDS ACTION" IS DONE. The live investor site was stale; John
deployed the corrected build on 2026-08-24. Do not re-raise it, and do not redeploy
without checking what is currently live first.

⚠️ The deploy trap in that doc still stands for next time: use the site's DEPLOYS tab,
never the Drop page -- Drop mints a NEW URL, so a link already sent would keep serving
the old build.

Read the "Figure provenance" section before touching any number. It separates verified
first-hand / owner-supplied / UNVERIFIED. Every figure in an investor-facing doc must
trace to the financial model -- never derived, never recalled. Do not promote anything a
rung without checking it yourself.

Also in that doc: decisions already made, so they are not re-litigated. Read them before
proposing changes.

Confirm you have read the handoff and state the next task before working.
```
