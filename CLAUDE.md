# CLAUDE.md — Gopher Marketplace

> ## ⛔ READ FIRST — this file can be out of date. The live rules are elsewhere.
>
> **The authoritative, current owner directives live in
> `Dev/gopher-dev-handoff/src/content/docs/start-here/standing-rules.md`.** Read that file before
> acting on anything below, and re-read it after any context carryover.
>
> ⚠️ **Path corrected 2026-09-01.** This pointer read `Dev/gopher-dev-handoff/STANDING-RULES.md`
> until today. That file **does not exist** — the handoff repo was restructured onto Astro/Starlight
> (`01b47c4`) and the rules moved into `src/content/docs/`. So every session that followed this
> banner to "the authoritative rules" found nothing, and proceeded on `CLAUDE.md` alone — which is
> the exact failure the banner exists to prevent. Fixing the pointer is the whole fix; the rules
> themselves were never lost.
>
> **Why this warning exists.** `CLAUDE.md` is *inside* this repo, so **every git worktree freezes
> its own copy at the moment the worktree was created.** Rules the owner set afterwards are
> invisible to any session working there — silently, with nothing to signal the gap. On
> 2026-08-10 three worktree copies were found still enforcing a scope rule the owner had
> **retired on 2026-08-09**, and two live sessions had been blocking themselves on it for days.
>
> `standing-rules.md` lives in a **different repository**, so a worktree cannot freeze it. It is
> always live for every session, whenever that session's tree was made. **Where the two disagree,
> `standing-rules.md` wins.**

## What this is

This repository began as an **AI-generated static HTML prototype** for "Gopher Marketplace" — a
visual blueprint for a production rebuild. Most of it still is: self-contained static HTML, no build
step, no framework.

> ⚠️ **But it is no longer entirely a blueprint, and the difference is where the real harm lives
> (corrected 2026-08-09).** The old wording — *"not production code… do not treat it as a real,
> working platform… no backend"* — is stale in the dangerous direction: it invites treating live
> surfaces as a sandbox. In fact:
>
> - **`gopher-deals.html`'s merchant registration POSTs to a live Google Apps Script** that writes a
>   real Sheet and emails the owner. That is a backend, and it is the **real merchant-intake path**.
> - The site is **live on three hosts** — GitHub Pages, TigerTech, and the Netlify mirror — indexed,
>   with a sitemap.
> - The **101 guides are public** and read by real merchants and workers.
>
> Two of the worst defects found on 2026-08-06 — a logo **required and then discarded**, and one
> click producing **four registration leads** — mattered precisely *because* a real merchant can hit
> them. Treat anything reachable from those three hosts as live.

## Repository layout

The prototype lives in the **`Final/`** folder — that folder is the **site root**
(the page served at the GitHub Pages URL is `Final/index.html`, and pages reference
each other and their assets relative to `Final/`). It contains ~132 HTML pages plus
`.css` files, `.mp4` scene videos, and image assets.

`Final.zip` is the original archive `Final/` was extracted from; it is kept only as a
backup and is not part of the served site.

## Scope of AI work — REWRITTEN 2026-08-09 (owner)

> ⚠️ **The old rule is retired. It read:** *"Limit all AI work to cleanup, documentation and
> front-end reference fixes. Do NOT implement or modify … **they are reserved for a human
> developer**: Payments/billing · Authentication/accounts · Database/persistence · Matching logic ·
> Security logic."*
>
> **Why it went:** its load-bearing clause was *"reserved for a human developer"* — and there is no
> dev partner. Work reserved for someone who does not exist is work that never happens. It had also
> stopped describing reality: on **2026-08-08/09 alone**, sessions merged **authorization**
> (`851fb717` — require the caller to be the requester before declining a cost adjustment),
> **authentication/session** (`18bbda6d` — repeat sign-ins; `1d133fe3` — email-OTP loop),
> **authorization** (`d265bf69`), and **database config** (`373a887d`) straight to
> `gopher-backend-api` **`production`**. The rule wasn't gating that work; it was only tripping
> whichever session happened to read it literally — as it tripped this one on the Deals intake
> endpoint, which was then simply reassigned to another Claude session. That is routing by accident,
> not a safety boundary. Same failure shape as the stale "no `node` on this box" note below: a
> point-in-time observation left standing until it started steering people wrong.

**The gate is not the topic. The gate is the owner's informed consent before anything reaches
production.** Owner, 2026-08-09:

> *"Nothing is ever to be pushed to production without verification that I fully understand the
> risk/rewards and what the work is solving for."*

**So, in practice:**

- **Build what the work requires** — including payments, auth, persistence, matching and security —
  in whatever repo the task lives in. Being AI-authored is not itself a reason to stop.
- **Before anything reaches production, put three things in front of the owner in plain words:**
  **what it solves**, **the risk**, and **the reward** — including what happens if it is wrong and
  how quickly it can be undone. Then wait for a decision. *He is the one clicking the button; an
  unstated risk becomes a guess.*
- **Verification is the price of a bigger scope, not an optional extra.** Read the live code, drive
  the real path, and say plainly which claims are **verified** versus **inherited**. The more
  consequential the surface, the more of the diagnosis has to be first-hand.
- **Prototype ≠ production, and the difference is how much proof is owed** — not whether the work is
  allowed. A copy fix in `Final/` and an authz change on `production` are both in scope; only one of
  them can quietly cost real money or lock real users out.
- **Still stop and ask when access is the blocker** — the pause-and-wait directive is unchanged and
  is the one rule that has *not* relaxed.
- **Still flag rather than assume** when a task looks like it belongs to another session's surface,
  or when the scope of a request is genuinely ambiguous.

## Deployment constraints (these cause real bugs)

The prototype is deployed via **GitHub Pages at a subdirectory URL:**

> https://johncnewbury.github.io/Gopher-Marketplace/

Two consequences follow directly from this, and both are easy to get wrong:

1. **All paths must be relative — never root-absolute.**
   Because the site lives under the `/Gopher-Marketplace/` subdirectory, a leading
   slash resolves to the domain root, not the project root.
   - ❌ `/scenes/delivery.mp4` → 404
   - ❌ `<a href="/index.html">` → 404
   - ✅ `scenes/delivery.mp4`, `./delivery.mp4`, `index.html`
   This applies to **every** href, src, link, and asset reference (pages, videos,
   images, CSS, JS).

2. **File references are case-sensitive.**
   GitHub Pages serves on **Linux**, which is case-sensitive, even though macOS
   (where these files were authored) is not. A reference must match the actual
   filename casing **exactly**, character for character.
   - If the file is `Junk-Removal.mp4`, then `junk-removal.mp4` will 404 on the
     live site even though it "works" locally on macOS.
   - When fixing references, verify against the real filename, not from memory.

## Known issues

These are known and expected in the prototype. Document/clean them as appropriate;
do not assume they indicate deeper problems.

- **Very large, base64-bloated pages.** Several HTML files embed large base64 assets
  inline, making them multi-megabyte. (e.g. `gopher-connect.html`,
  `gopher-request.html`, and `index.html` are each in the megabytes.) These should
  eventually be replaced with external asset references in the production rebuild.
- **Duplicate element IDs.** The same `id` value appears on multiple elements within
  a page. This is invalid HTML and breaks `getElementById`-style lookups.
- **Demo-only JavaScript.** Some functions are placeholders/stubs that only simulate
  behavior for the prototype. Known demo-only functions include:
  - `bookService`
  - `analyzeUpload`
  - `contactSupport`
  These do not perform real work and must not be relied on as functional logic.

## How to work in this repo

- Treat every page as **reference/blueprint output**, not as a system to extend.
- When fixing front-end references, prefer relative paths and exact-case filenames.
- Keep changes scoped to cleanup, documentation, and reference correctness.
- Do not introduce backend behavior, real data flows, or security/auth/payment code.

### Tooling — verify before you route around it

**`node` IS installed: v24.18.0 at `~/bin/node`, on PATH** (since the 2026-07-28 toolchain
setup). Older notes in this file and in memory said "no `node` on this box" — **true when
written in July, false since.** Anything in the session log dated before 2026-07-28 that
reasons from node's absence was correct at the time; don't inherit the premise.

- **Use `node`** for anything that *executes* module code (running a shared module,
  exercising a function against real inputs, a test harness).
- **JXA is still correct** for a pure syntax parse-check — `new Function(src)` per inline
  `<script>` block. It needs no `window`/`module` shims there and node buys nothing.
- **Don't hand-roll a JXA shim harness for JS node can run.** That's a workaround with no
  blocker behind it, and the shims themselves can produce a confident wrong result.

**The general rule this is an instance of:** a documented constraint is a point-in-time
observation, not live state. Before routing around a blocker this file names, spend the one
command to check it still exists. See the owner's standing pause-and-wait directive — when
something genuinely *is* blocked, stop and ask rather than take the lesser route.

## Standing rules (owner directives — apply to every session)

- **A Jira ticket is NEVER the source of truth — a document is, and the ticket references the doc
  (owner, reaffirmed 2026-08-05).** Tickets are *meant* to die; truths have to outlive them. When a
  ticket completes, the doc is updated and the ticket dies — and a ticket **is not Done until its
  doc row is written**, or the ticket dies and the doc never learned.
  **Direction matters: doc ← ticket, never doc → ticket.** Never cite a ticket as the authority for
  behaviour; cite the doc, and if the doc is silent *that is the bug to fix*.
  **Why it keeps biting:** a truth buried in a **closed** ticket becomes a fossil — the product moves
  on, the truth evolves, and the closed ticket still reads as authoritative to whoever finds it next.
  G40-44 is the recorded case study (its Done state contradicted production, and it was re-raised
  three times in one day across sessions). It happened again on 2026-08-05: the G40-351 ground-truth
  findings were first written **into a ticket comment**, then moved into
  `deals-registration-to-publication-config.md` §9.9–9.16 / Rulings 7–8, with the comment rewritten
  as a pointer.
  **What belongs where:** the *doc* carries the canonical rule, the deployment reality (flags off,
  branches unmerged), and the dated owner decision. The *ticket* carries only what should die with
  the fix — the repro, the acceptance criteria, the assignee. See memory
  `docs-are-truth-not-tickets`.

- **⛔ PAUSE AND WAIT when access is the blocker — never take the less optimal route (owner,
  2026-08-06).** Verbatim: *"NO SESSION is to take the less optimal route, EVER. It is a pause and
  wait for my attention to log in to whatever platform is the block, to create a token, or share my
  credentials… With no dev support on my end, this cannot ever happen again."*
  **What triggered it:** a session without **Sentry** access proceeded on a workaround; **MR !222 was
  merged prematurely and incorrectly into production.** Once asked, a token existed **in five
  minutes**. The danger isn't that a workaround fails — it's that it yields a **confident wrong
  answer**, which is worse than none because it gets acted on.
  **The rule:** stop, state what's blocked / what unlocks it / what it enables, then wait. Do
  genuinely independent work meanwhile, but **never let a workaround feed a merge, a deploy, a ticket
  closure, a doc row, or a recommendation.** Covers Sentry · AWS · GitLab/GitHub tokens · Play & App
  Store · Appflow · Stripe · Netlify · Twilio · SendGrid · Firebase · iDenfy · the production DB.
  **Second-hand facts count as workarounds** — a behaviour another session described, written into a
  doc row without inspecting it yourself, is the same failure wearing a friendlier face. Mark
  inherited claims as inherited. See memory `pause-and-wait-never-work-around-access`.

- **Every merge hand-off states three things, in plain words (owner, 2026-08-06):** **target
  branch** · **squash yes/no** · **delete source branch yes/no**. Never leave them to the MR
  defaults — the owner is the one clicking Merge, so an unstated option becomes a guess.
  **Two reasons this is more than tidiness here:** *squashing rewrites the SHA*, and this project
  verifies deployment **by SHA** in several places (G40-334's commit pins, the canonical and
  as-built flow docs, and `gopher-dev-handoff/FIELD-NOTES.md`, which tells the incoming dev to
  verify that way) — a squash silently invalidates all of them; and *deleting the source branch
  removes the only copy of an unmerged fix* if the merge has to be reverted.
  ⚠️ **Does not apply to THIS repo's deploy:** `scripts/deploy.sh` flattens `Final/` onto `main`
  via rsync in a throwaway worktree and `main` shares no history with the feature branches — there
  is no MR and nothing to squash. It applies to the **Dashboard**, **gopher-dev-handoff**, and the
  **backend/app repos**, where an MR merge is the real mechanism.

- **A user-facing change is not done until its 101 guide is updated (owner, 2026-08-05).** Every
  surface has a tutorial that real users read — `gopher-deals-101.html`, `gopher-go-101.html`,
  `gopher-request-101.html`, `gopher-connect-101.html`. When you change behaviour or copy on a
  surface, **review its guide, don't just string-match it.** A minimal find-and-replace is what
  *created* the problem this rule came from: the Deals taxonomy rename swapped one word in the
  Deals 101 and left the guide claiming the portal Inbox was "the fastest path to the Deals team"
  (it transmits nothing) and describing the service-provider path as "the same as a merchant's,
  just two differences" (it is neither — different entry point, different app, and a hard
  eligibility bar the guide never mentioned). Both were caught only because the owner pushed back.
  Same honesty standard as the June `gopher-request.html` copy fixes: **the guide describes what
  the product does, not what it will do.**
- **Deals activation SLA is ≤5 business days — never 1 (owner ruling, 2026-08-05).** "Within 1
  business day" had propagated into the Deals 101 hero, its what-happens-next note, and the Deals
  portal inbox copy, **contradicting the Merchant Agreement and the Terms of Service, which both
  say "five (5) business days."** Corrected site-wide. ⚠️ **Do not blanket-replace "1 business
  day"** — that string is also the legitimate **support-reply** SLA on Connect, Request and the
  deals@ line, which stays. Activation ≠ support reply; classify before editing. The iQ FAQ
  corpus already said 5 days and was correct.

## Deploy & verification rules (hoisted 2026-08-26 — these are RULES, not history)

These governed every deploy but were buried inside the old session log. They are load-bearing on a
repo that publishes to **two live hosts** (GitHub Pages + TigerTech) from the **working tree**.
Fuller narrative for each — the incident that produced it — is in
[`docs/handoff/session-log.md`](docs/handoff/session-log.md).

- ⚠️ **`git merge-base --is-ancestor <sha> origin/main` is valid ONLY for a DEPLOY sha** (a commit
  that lives on `main`). It is **INVALID — always false — for a source/feature commit.** `main` is a
  flattened rsync lineage sharing no history with the dev branches, so a feature commit is *never*
  its ancestor **no matter how completely its content is live**; asked that way it reports NOT
  DEPLOYED for every change ever shipped. It has already produced a false "deploy gap" and then a
  false *retraction* of a finding that was correct.
- ⚠️ **Verify deployment by CONTENT, never by SHA.** Compare `git show origin/main:<file>` against
  the working / `HEAD:Final/` file, then curl the live URL and **grep for the changed string** — a
  200 only proves the file exists, not that it updated. **Never suppress the fetch**
  (`git fetch origin main -q 2>/dev/null` hides failures and leaves you reading a stale
  `origin/main` as current) — re-fetch, unsuppressed, immediately before any "is it live?" claim.
- ⚠️ **A PINNED DEPLOY CAN BE A REVERT. Pinning is safe ONLY when the pin point is at or ahead of
  what is currently live.** Pinning excludes *uncommitted* work only — it does nothing about other
  sessions' commits, and if the pin point sits BEHIND live it silently rolls back everything shipped
  since. Pinning at your own last-**deployed** commit is the dangerous case; pinning at your own
  **latest** commit is safe, because it carries everyone's ancestors. The safe shape is **build the
  deploy tree from HEAD and `git rm` the specific file you don't own.**
- ⚠️ **The dry-run diffstat shows riders and reverts IDENTICALLY.** An unfamiliar file is either
  someone else's new work or something you are about to roll back, and the only way to tell is to
  check whether it is currently live — **one `curl`. Do not skip it.** The dry-run file list is a
  **scope check, not just a diffstat**: get an owner OK on anything outside your own change before
  `--push`. The deploy script's own diffstat display **elides** — don't read it as the full list.
- ⚠️ **The deploy reads the WORKING TREE** (owner decision 2026-07-20, settled). So an
  `--allow-dirty` run publishes whatever other sessions have left uncommitted. Scope-check
  accordingly.
- ⚠️ **A pinned worktree lacks the gitignored disk-only allowlisted prototype files**
  (`_prototypes/Go/gopher-banner.js`, `_prototypes/Request/gopher-banner.js`) — the preflight aborts
  until you copy them in from the clone.
- ⚠️ **A push to `main` publishes to BOTH hosts** (Pages + the TigerTech FTPS workflow) — scope-check
  for two destinations, and content-verify on both.
- ⚠️ **THERE ARE NOW TWO SITES, and `deploy.sh` defaults to the LIVE one.** `--site prototype`
  publishes the **prototype twin** — `johncnewbury.github.io/Gopher-Marketplace-Prototype/`, repo
  `Gopher-Marketplace-Prototype`, git remote **`proto`** — which serves the same pages plus the
  web↔Go harness, with PT mode ON and every page `noindex`ed. Created 2026-09-02 so Matt has a URL.
  **The twin does not track the live site automatically:** it is a separate `--site prototype` run,
  so it can sit behind, and that is expected rather than drift to fix.
  ⚠️ **The twin shares production's HOSTNAME**, so the PT allowlist entry for it is host **+ path
  prefix** (`gopher-web-pt-bridge.js`). The slash after `Marketplace` is the only thing keeping
  `?pt=1` off the live site — `/Gopher-Marketplace/` must never match. 23-case guard:
  `scripts/web-checks/pt-production-gate.js`, and **every case there must carry a `pathname`** or
  the production assertions pass for the wrong reason.
- ⚠️ **`git` author does NOT identify a session** — every commit here is "John Newbury". To find
  which workstream owns a file, read the **sibling paths** in the same commit (a
  `docs/handoff/<x>/` directory usually names the lane), or search session transcripts. Guessing
  has already caused a misattribution another session had to correct.
- ⚠️ **A cross-host content mismatch on a file your deploy did not touch is a CACHE artifact until
  proven otherwise** — cache-bust the curl before concluding anything.

## Session progress — moved out of this file (2026-08-26)

**The completed-work log now lives in [`docs/handoff/session-log.md`](docs/handoff/session-log.md).**
Read it when you need the history of a particular surface; grep it for the page or feature name.

*Why it moved:* it had grown to ~40,700 tokens — **91% of this file** — and `CLAUDE.md` is loaded
into every request of every session. It was costing roughly 6% of the weekly usage allowance to
re-read finished history on every single API call. The rules above are what every session actually
needs; the log is reference material, so it is now fetched on demand.

**Genuinely open items** (everything else in the log is closed or superseded):

- **Produced hero clips for `gopher-connect.html`** — optional. Owner-approved stock stand-ins are
  live at `assets/video/connect-hero-1..4.mp4`; produced clips drop in at the **same filenames**
  with zero code change. Brief: `docs/handoff/connect-hero-video-brief.md`.
- **deals@ email wiring** — **not started, and must NOT be built against Apps Script.** The Apps
  Script is severed (owner, 2026-08-21); the work belongs to the G40-305 dispatcher
  (`sendEmail.js`). ⚠️ `docs/handoff/deals-email-wiring.md` is a **decision record, not a work
  item** — its paste-ready snippet must never be pasted.
- **Merchant-portal sign-in, end to end** — still unverified; `/otp/get` sends a live SMS, so it
  needs a real code on a real handset. Failure is silent by design. Do not record it as verified
  until someone actually signs in.
- **`#modal-logo` second entry point** — owner ruled 2026-08-24: **leave both doors open for now**,
  precisely because the sign-in above is unverified.

**Standing non-item:** the **Netlify mirror** (`gopher-deals.netlify.app`). Owner ruling
2026-07-28 — keeping it current is **low priority; do not flag its drift.** Only changes touching
the merchant registration flow itself (the form, its validation, `_redirects`, or its Maps key)
warrant raising a redeploy, and it is owner-action only. Sessions have re-raised this repeatedly;
it is not a defect.
