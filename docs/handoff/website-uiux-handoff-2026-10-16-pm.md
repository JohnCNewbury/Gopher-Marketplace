# Website UI/UX seat — handoff, 2026-10-16 ~4:20 PM ET

Supersedes `website-uiux-handoff-2026-10-16.md` (this morning's; keep it for history — its tool table,
asset sources and the "Gopher that too" section notes are still correct). Written for someone who has never
seen this seat. Paste the **"Start here"** block into the new session.

---

## Start here (paste this)

You are the **Website UI/UX** seat for the Gopher Code repo. `Final/` is the public marketing site (and the
Request web dashboard inside `gopher-request.html`). You work **directly with John** (stage by stage, three
options each, he picks on a pick doc) and you **deploy through the iQ | Brain Sprint desk**.

1. ⛔ **FIRST: check in with the iQ | Brain Sprint desk** (`SendMessage` to `iQ | Brain Sprint`): you are the
   new Website UI/UX session replacing the 10/16 one, you've read
   `docs/handoff/website-uiux-handoff-2026-10-16-pm.md`; ask what is live now, what is in the web queue, and
   whether Website Code/Logic's **Pro/Pro+ stage 6** has deployed. Your check-in is also the desk's signal to
   retire the outgoing session.
2. Read this file in full, then `docs/handoff/website-uiux-tools/pickdocs/README.md`, then the TOP block only of
   memory `resume-request-dashboard-overhaul-2026-10-12`.
3. Work in worktree **`.claude/worktrees/elegant-pasteur-b04a42`**, branch **`brand-audit-corrections-2026-10-02`**
   (pushed; tip = the commit that added this file). **Live at handoff: `543b3ba8`, twin `33878acc`.** Your
   `Final/` equals live. Before touching anything: `git fetch origin main` and compare (see "Re-sync").
4. Open work: **nothing of yours is in flight.** Waiting items:
   **(a)** Website Code/Logic has BUILT **Pro/Pro+ stage 6** (Request dashboard worker badges, John's pick A) +
   its CAT-3 in `gopher-request.html` — branch `code-logic/request-tier-badges` @ `aee33bcc` (on `b66502ba`),
   1-file dry run, asking John to deploy. Visual check done 4:45 PM: PASS with one fix sent (the pro+ pill in
   the profile badge bubble crosses the ring — shrink it). Open question for John only if he raises it: the
   app's "Gopher Pro since …" profile line is not in pick A. When it reports live, MERGE its source before your
   next edit.
   **(b)** **Item C** (re-capture the site's app screenshots) waits for the store release that carries
   G40-604 — the desk will say. File table in the morning handoff.
   **Deals and Connect are PARKED by John — do not touch or raise them.**

---

## State at handoff (verified 4:14 PM ET)

| | |
|---|---|
| Live `main` (Pages + TigerTech) | **`543b3ba8`** (3:31 PM, stage 5 blogs) |
| Prototype twin (`proto/main`) | **`33878acc`** |
| Branch `brand-audit-corrections-2026-10-02` | pushed; **this is the shared web source** (desk calls it B38 + this doc). Contains Code/Logic's `17891e3e` (request-sync) and `7566ceb4` (Go dashboard tier). |
| `Final/` vs live | identical |
| Unshipped work of mine | **none** (only docs: this file, `website-uiux-tools/pickdocs/`) |
| Worktree noise not mine | `.claude/launch.json` modified + `docs/handoff/website-uiux-handoff-prompt-2026-10-14.md` untracked — both from an earlier session; leave them, never commit them |
| Every run sheet from today | **passed by John** (no open rows) |

---

## What shipped 10/16 (all verified on 3 hosts; all run sheets passed)

| Landed (ET) | Live / twin | What | Pick doc | Run sheet |
|---|---|---|---|---|
| 06:50 | `a9aa51ce` / `84400565` | "Yes, we can Gopher that too." — real clips inside the Gopher outline (previous session) | Y9Zxohy4k8zNo2kgxjYjb3 | U7xLtZ2t7KA2tpPq8HFNyu · 8/8 |
| 10:24 | `0b283c12` / `6eb59333` | BITE cards 3 + 4: John's new copy (card 3 couch/Black Friday/airport; card 4 "Everything starts with you making an offer…") | — (John's words) | 7FAEvoQ39Qp3ftTqD4gKoW · 7/7 |
| 12:43 | `1e897e4d` / `897754f9` | **Pro/Pro+ stage 1** (Go page trust section, pick C) + **stage 2** (tiers page table, pick C) + G40-365 TrustShield meta lines | LZMpbRZFRVWz6W9aLV3zCD (S1) · BvfSmTiBT1JFrnn3fSwfHn (S2) | 3cJBWuLEZPBhhvMxTUUHan · 9/9 |
| 13:44 | `415326cf` / `88c53cb9` | **Stage 3** Go worker dashboard tier — **built + deployed by Website Code/Logic** (pick A) | 9ScBKiDBCvhBSpbqmFhFNW (S3) | Code/Logic's |
| 14:10 | `8bd6dfe4` / `87bbcc5a` | **Stage 4** Marketplace page: "Select My Gopher" card + Standard/Pro/Pro+ ladder (pick B) | A35mH6xBdWZ9pAh64oziuM (S4) | CxpH7rUzQ6sNm7cYeLhAtb · 7/7 |
| 15:31 | `543b3ba8` / `33878acc` | **Stage 5** four blog posts (pick A) | PXWDVxapwYZBkrsjqAJiHo (S5) | THGUw7SkXWLKcDdzpMEN5r · 7/7 |
| — | with Code/Logic | **Stage 6** Request dashboard worker badges (pick A, John 3:45 PM) | 7KeFicHsLiGSRX64inxbdA (S6) | — |

All artifact ids are `https://claude.ai/artifact/<id>`; picks live in each doc's db `rulings`, results in `results`.
Other seats' deploys today you built on: iQ 09:24 `bcb5ddb3`, 101 Tutorials 10:00 `1979c755`, Code/Logic
request-sync 11:36 `81e88618`.

---

## The Pro / Pro+ rollout (what a new session most needs to know)

**Why:** John 10/14: *"Pro and Pro+ are current. Elite / Pro conversion later."* The apps say **Gopher Pro /
Pro+** today; Elite/Elite+ and the licensed "Pro" credential are the unlaunched (November) product. The site
now uses Pro/Pro+ everywhere this seat owns. ⛔ Do **not** reintroduce Elite on any live page.

**The facts, all read first-hand 10/16 (cite these, don't re-derive):**
- Tier = the worker's `gopher_type_id`: **0 Standard, 1 Pro, 2 Pro+** (Go app `bottomRoutes.js:82`, Request app
  `GopherProfileHeader.js:49`). Tier is set by an admin (backend `controllers/admin/user.js:1444`), after a
  Yardstik check — never earned by jobs or documents.
- **Prices + searches** (live `gophergo.io/become-a-gopher/gopher-pro/`, the page the Go app links to):
  Pro **$20** one-time = National Criminal, Sex Offender Registry, OFAC & Most Wanted, Address & SSN Trace;
  Pro+ **$30** = the same **+ MVR (Motor Vehicle Record)**. Results usually 1–3 days.
- **Perks** (backend `origin/production` 47ca79a2) — identical for Pro and Pro+:
  instant payout from the first job (`lib/payment.stripe.js` ~2946-2992; Standard = after >10 delivered+paid
  jobs and 24 h past the first) · more than one request at a time (`order_bids.js` `claim_limits.isStandardGopher`)
  · new requests before Standard (`notification.js` legacy cadence: Pros 5 s, all 60 s) · the badge.
  **NOT** today: unlimited counter offers (launch-gated, backend !465 Draft), extra Elite+ searches, priority
  Ride Sharing, Deals eligibility, any tier-based work radius (none in app or backend).
- **Badge art**: Go/Request app `public/assets_1/pro_batch@3x.png` / `pro_plus_batch@3x.png` → live as
  `Final/assets/img/badge-gopher-pro.png` / `badge-gopher-pro-plus.png` (byte-identical). Pro+ is drawn ~1.21×
  taller so the pills match (its plus rises above). Brand wordmarks: `Documentation/Brand/Gopher Logos/Gopher 2.0
  Logos/Gopher Pro Logo` (= `shared-gopher-pro.svg`) and `Gopher Pro Plus/RGB/GopherLogo-ProPlus-RGB.svg`.
- **Request app**: there is **no way for a customer to choose a tier**. What exists is **Select My Gopher**;
  each worker's profile shows the pill, "Gopher Pro since…" and **"Background checked"** (Standard: "Identity
  Verified") — `GopherProfileHeader.js:47-68`. Photo-corner badge `ImageElement.js:310-345`; inbox
  "Gopher Pro+ {name}" `InboxRow.js:29`; chat/dispute "PRO"/"PRO+".

**What changed where (live):**
- `gopher-go.html` `.trust-safety` — app pills, "Learn about Pro & Pro+" → tiers page. (Dashboard tier logic in
  the same file = Code/Logic's stage 3: real tier from the account, "Become A Gopher Pro" row only for Standard,
  no tier radius.)
- `gopher-tiers.html` — one Standard / Pro / Pro+ table; **the "Apply for Pro" form is gone** (it was a demo:
  any 6 digits passed, made-up GO-PRO ref, nothing sent); no "legacy names" note; old card/form CSS left dead.
- `gopher-marketplace.html` — "Pick your tier" (a false feature) → "Select My Gopher"; ladder Standard/Pro/Pro+
  + "What you'll see in the app".
- 4 blogs (seniors-can-trust, worker-centric, on-one-page, community-runs-on) — names + two false claims fixed;
  dateModified 2026-10-16.
- `gopher-trustshield.html` meta — "$1 on every age-restricted delivery and every ride" (G40-365 handed over; G40-365 retired).

**Not this seat's (leave them):** `gopher-faqs.html` + the inlined iQ corpus (iQ seat), the 101 guides
(101 Tutorials — they already say Pro/Pro+), the Terms of Service (John publishes), Deals/Connect pages and the
Service Provider Deal lines anywhere (parked), `blog-service-provider-deals.html` (Deals).

**Ownership split John/desk set today:** app↔web **logic** in `gopher-go.html`'s dashboard and anything in
`gopher-request.html` = **Website Code/Logic** (one writer per file). This seat does the **pick doc** (with the
app rule + citations) and Code/Logic builds logic + John's picked UI in one change. Ask the desk before
touching either file.

---

## How a change ships here (follow exactly; refined today)

1. **Announce to the desk before editing** (file + regions). Shared files have one writer at a time.
2. **Re-sync** onto the current live source (see below). Build. Commit.
3. Checks: `node docs/handoff/website-uiux-tools/parsecheck.js Final/<page>.html` → 0 fail;
   `bash scripts/web-checks/run-all.sh` (now **30** checks). Known failures only: **14** (Go parity: 2
   pre-existing — 'bullet' vocabulary, 'broadcast wave') and **18** (Deals, date-dependent).
   ⛔ **Check 14 crashes in a worktree** without the gitignored `_prototypes/Go/gopher-go-canonical.html` —
   copy it in from the main clone (`cp "<main>/_prototypes/Go/gopher-go-canonical.html" _prototypes/Go/`),
   then read its `[FAIL]` lines; never write a crash off as "the known failure" (that hid a real one today).
4. Browser: copy `Final/` (rsync, skip `*.mp4`) into the scratchpad, add a temporary entry to the **main
   checkout's** `.claude/launch.json`, `preview_start`, check 1440 / ~1000 / 900 / 375 for overflow
   (`scrollWidth`) and the actual element. Remove the entry after. Pages with `scroll-behavior:smooth` need
   `scrollTo({behavior:'instant'})` before a screenshot.
5. **Dry run** `bash scripts/deploy.sh` (both sites). The file list must be exactly your files, 0 strays.
   Send the desk the list + bytes + a **"101 UPDATE"** (or "101: no guide change" + why) — John's rule 10/16.
6. **Ask John yourself** for "deploy": what it solves, risk, reward, undo. The desk gives "slot is yours"
   (its messages can be delayed by an app cap — if John says to go on his word, tell the desk you're going).
7. Push + deploy in ONE guarded command, with a scope check:
   ```
   git push origin brand-audit-corrections-2026-10-02 && git fetch origin main && git fetch proto main && \
   L=$(git rev-parse --short=8 origin/main) && P=$(git rev-parse --short=8 proto/main) && \
   [ "$L" = "<live>" ] && [ "$P" = "<twin>" ] && \
   [ -z "$(git diff --name-only origin/main: HEAD:Final | grep -vE '^(_prototypes/|\.github/|\.nojekyll$|README\.md$|<your files regex>)')" ] && \
   bash scripts/deploy.sh --push -m "Deploy: … (John's go <date>)"
   ```
   Report the **landed** time (the main commit's time), not the start — staging took 11 min once, 13 s later.
8. Verify on 3 hosts: `docs/handoff/website-uiux-tools/verify-hosts.sh <page> "<sentinel>"… -- <files>` plus a
   negative grep for the old text and a page sha256 vs `Final/` on Pages + TigerTech (the twin differs only by
   its noindex tag). ⛔ In zsh, `for f in $LIST` does NOT split words — write the list out or use `${=LIST}`.
9. Report SHA + ET time + results to the desk; publish John's run sheet (`pickdocs/runsheet-template.html`),
   fill your C rows after the check passes.

### Re-sync to live
`main` is a flattened rsync lineage — never `git merge origin/main`. Compare trees:
`git diff --name-status origin/main: HEAD:Final` (ignore `_prototypes/`, `.github/`, `.nojekyll`, `README.md`).
If another seat deployed: find its **source commit**, check its `Final/` equals live on the changed files, and
**merge that commit** (today: `17891e3e`, `7566ceb4`; cherry-pick `34d10505` for the iQ deploy). Only fall back
to `website-uiux-tools/resync-live.sh <old-base> origin/main` when there is no source commit to merge.
⛔ Never take `_prototypes/` from `origin/main` (published form).

---

## Traps that bit this seat today (new)

- ⛔ **Check 14 (Go parity) crashed silently in the worktree** → my 12:43 tiers change broke its MVR guard and I
  didn't see it; Code/Logic did. Fixed in `24a82f76` (the guard now reads the tiers table's MVR row: Standard
  no / Pro no / Pro+ yes). See step 3.
- ⛔ **The live site carried claims the apps don't back** — a demo "Apply for Pro" form, "Pick your tier",
  "earned one solid job at a time", "Elite-or-above wider radius", every signed-in Go worker shown as
  "Gopher Elite+". Read the app/backend before keeping any rule-like sentence.
- **Desk messages arrive late** (app cap). A missing "slot is yours" is not a "no"; ask John.
- **Another seat's deploy lands under you** — always re-fetch right before a dry run and inside the push command.
- **Pick-doc preview**: no viewport meta locally; literal Unicode punctuation shows as mojibake on the local
  server; a mock container breakpoint can catch the desktop column (use the page's real breakpoint).
- The **Request web dashboard makes no API calls for requests** — every worker there is a demo seed.

(The morning handoff's traps — TigerTech only at `gophergo.io.customers.tigertech.net/preview/`, iCloud dataless
photo library, Browser can't read `~/Desktop`, IntersectionObserver in the hidden pane, `<img height>` vs
`aspect-ratio`, `.where b` styling — are all still true.)

---

## Tools

Everything in the morning handoff's tool table, plus:

| File | Use |
|---|---|
| `website-uiux-tools/pickdocs/` | **NEW.** Pick-doc builders (`page-mock/`, `text-diff/`) + run-sheet template + README with the mandatory steps |
| `website-uiux-tools/verify-hosts.sh` | 3-host sha256 + sentinels (exit 0 = all pass) |
| `docs/handoff/go-app-parity/run_go_parity_harness.py` | check 14 — needs the canonical file in the worktree |

## People / sessions

- **iQ | Brain Sprint** — the desk: sequences web deploys, keeps the ledger, decides file ownership. Check in first.
- **Website Code/Logic** — app↔web logic; owns `gopher-request.html` and the Go dashboard logic; building stage 6.
- **101 Tutorials** — the 101 guides (single writer); send a "101 UPDATE" line with every deploy.
- **Gopher iQ / FAQs (iQ seat)** — FAQ corpus; the Go dashboard's iQ starter chip is page markup (yours/the file owner's).
- **G40-604 App Fonts** — app restyle; its store release triggers item C.
