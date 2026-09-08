# G40-10 — Gopher Go: Best Practices Confirmation (final signup step)

**Type:** Task · **Priority:** High · **Label:** worker · **Status:** To Do → dev-ready
**Figma:** node `16-5405` ("Best Practices Confirmation") · file `aRFH8dqUfSHLJTb89VZYNh` (Jira-Tickets)

Add a best-practices acknowledgment checklist as the **final step of Gopher Go (worker) sign-up**.
The worker must tap each item to confirm; the **"Understood & Ready To Go!"** CTA stays disabled
until **all** items are acknowledged. On confirm, record a **versioned acknowledgment** against the
Gopher account, then complete sign-up.

## Deliverables in this repo

⚠️ **Corrected 2026-09-07 — the two paths this section used to cite were both wrong.**

- **The design source of truth is the interactive prototype**, not a Figma transcription:
  the `best-practices` screen inside `_prototypes/Go/gopher-go-prototype.html`, wired as the
  last entry of `SIGNUP_IDS` and reached via `GO('best-practices')` after payout. It is
  published to the screen spec as
  `Dev/gopher-dev-handoff/public/screen-spec/best-practices.{png,json}` + `notes/best-practices.md`.
- **The day-1 Figma transcription still exists**, quarantined by owner directive 2026-08-02 at
  `_prototypes/Go/_day1-figma-archive/gopher-go-best-practices-figma.html`. That folder's README
  names this exact file as one that **still says "Requestor"** after the 2026-07-23 spelling canon
  change. **Do not implement from it.** (`git log` finds nothing for either path because
  `.gitignore:27` excludes `_prototypes/Go/*` — these files have never been tracked. A git-history
  probe cannot answer whether they exist.)
- **Component scaffold:** `Documentation/Jira Tickets/SignupChecklist.jsx` (also copied to
  `Dev/gopher-dev-handoff/product-docs/Jira Tickets/`). Present on disk.

## The 9 items — APPROVED COPY (owner, 2026-09-08)

This is copy **set A** (the interactive prototype's wording) with the owner's tutorial
amendment. It is what ships in `!247` as of `b05391cf9`. The **day-1 Figma wording this
section used to carry is superseded** — it said "Requestor" and "Cancelations", and is
preserved only in the quarantined archive.

**Title:** Best practices
**Intro:** Confirm you've read and understood all of the below before taking your first request.
**CTA:** Understood & Ready To Go!   ·   **Version:** `2026-09-gg-bp-v2`

1. Review your **[How To Use Gopher Go](https://gophergo.io/become-a-gopher/gopher-go-support/)** tutorial before taking your 1st request.
2. Set your **[Work Settings & Radius](https://youtu.be/tQiBo8NCNUs?si=VCe4pikwoFCfiEp0)** responsibly to avoid delayed orders due to travel.
3. If you're not clear on a request's details, message the Requester **before** accepting.
4. **Need ASAP** requests should always be completed within an hour unless agreed otherwise — food deliveries closer to 30 min.
5. When you accept a request, send a quick **intro message** to your customer.
6. Always **update your task progress** accurately and in the correct location(s).
7. Be courteous when communicating.
8. **Age-Restricted** deliveries are always in-person — no contactless deliveries are ever permitted.
9. When you accept a request, **you must complete it**. Cancellations hurt the customer and the platform.

⚠️ **Item 1 is the one place the prototype is NOT the reference.** The prototype says
"Gopher Go 101" — the New Gopher Marketplace name, which lands at launch. The shipped copy
uses the **current** tutorial, "How To Use Gopher Go". Everywhere else on this screen the
prototype's wording is canon (item 3's "Requester", for instance). Revisit item 1 when
Marketplace ships.

⚠️ **"Need ASAP", never the legacy "Need It Now".** Two items link out; a link must open
externally **without** toggling its checkbox.

## Backend — persist the acknowledgment
There is no best-practices field today. Add:
- **DB:** on `users_roles` (gopher role) add `best_practices_ack_version VARCHAR` + `best_practices_ack_at TIMESTAMP`.
- **Endpoint:** `POST /api/v1/gopher/ack-best-practices { version }` (behind `user_auth`) → set the two
  columns for the authenticated gopher; return success. Idempotent (re-confirm overwrites version/time).
- **Signup wiring:** mount as the **last** sign-up step; a gopher can't reach the Available tab / take a
  first request until an ack row exists for the **current** `CHECKLIST.version`. Bumping the version
  (copy change) can re-prompt existing gophers on next launch if desired.

## Acceptance criteria
- Checklist is the final sign-up screen; CTA disabled until all 9 items are acknowledged.
- Tapping a linked term opens the URL without toggling that item.
- Confirming calls the ack endpoint with the current version and advances to the app.
- Ack (version + timestamp) is stored on the gopher account and survives re-launch.
- Copy matches the 9 items above verbatim ("Need ASAP", not "Need It Now").

_Note (Shaun, 2024): flagged as Stripe-adjacent — but this checklist is acknowledgment-only and does
not depend on Stripe; payout-method setup is a separate signup step._

---

## Reopen audit — 2026-09-07 (design sign-off pending)

Reopened into the "Payment Options" sprint. Side-by-side sign-off page:
<https://claude.ai/code/artifact/1f65f762-0a85-4366-bfc6-84db24449d7f>

### ⛔ Do not merge `!247` as it stands

`gophergo/gopher-mobile-gopher-capacitorjs!247` (branch
`origin/feat/g40-10-best-practices-checklist`, single commit `8569b17e`, 22 Aug) adds
`src/component/bestPracticesChecklist.js` + a route + the `completeOnboardingAndNavigate`
hand-off. Its copy is **byte-identical to the quarantined day-1 Figma transcription**,
"Requestor" and "Cancelations" included — i.e. it was built from the artifact the
2026-08-02 directive says not to implement from. 64 commits behind `production`.

### Three claims in the reopen that do not hold

| Claimed | Verified |
|---|---|
| `gopher-go-best-practices-figma.html` never existed | **It exists**, in `_day1-figma-archive/`. `git log --all` returns nothing for *any* `_prototypes/Go/*` path — `.gitignore:27` excludes them, so they have never been tracked. The probe could not have returned a positive result. |
| `SignupChecklist.jsx` is not on disk | **It is**, at `Documentation/Jira Tickets/SignupChecklist.jsx`. |
| There is no approved UX | An approved design **does** exist — the prototype screen, published to the screen spec. What is true is that `!247` itself has never been reviewed. |

Corollary: **"put it side by side with Figma" is against the standing directive.** Figma node
`16-5405` is the day-1 import. The prototype is the reference.

### Measured differences (both at a 390 pt frame)

- **Item 3 spelling** — prototype "Reques**ter**" vs `!247` "Reques**tor**". Owner canon
  (2026-07-23) is *-er always*. Prototype wins; **the 9-item list above is also stale on this**.
- **Height** — prototype fits 786 pt with the CTA in view; `!247` runs **862 pt**, so the CTA
  is 76 pt below the fold and must be scrolled to.
- **A tenth gate exists only in the prototype** — the *Gopher Go 101* button must be opened
  before the CTA can enable. The AC says only "all 9 acknowledged". **RESOLVED 2026-09-08 —
  gate dropped;** see "Owner decisions" at the foot of this file.
- Ground (paper vs unset/white) and enabled-CTA colour (green vs navy) both favour the prototype.
- **Not a defect:** `!247` uses Urbanist; the prototype uses Nunito/DM Sans. Urbanist is the
  shipped app's face (140 files on `production`); the prototype's pair is a web stand-in.

### Two code findings in `!247`

1. **Inline `min-height: 100dvh`.** G40-371 merged to `production` on 20 Aug and routed every
   full-height element through `var(--app-vh)` *specifically because* a JS style object cannot
   carry the `100vh`/`100dvh` fallback pair. `!247` (22 Aug) is now the only file under `src/`
   outside `App.css` and vendor CSS writing `100dvh` raw. Build targets **iOS 15.0**; `dvh`
   needs 15.4 → on 15.0–15.3 the declaration is dropped and height falls back to `auto`.
   (Narrower than G40-371's own write-up, which cited a 14.0 target.)
2. **Nothing gates on the ack.** The spec wants the worker held out of the Available tab until
   an ack row exists for the current version. No route enforces it — not backend, not `!247`.
   Kill the app on this screen and relaunch: worker is in, no ack stored, no re-prompt.

**Sound in `!247` and worth keeping:** it calls the real route, sends the version, and on a
failed write holds the worker on the screen with a retry rather than letting them past an
unrecorded gate.

### Backend — verified live on `production`

`controllers/user/gopher.js` + `controllers/user/index.js:518`, behind `user_auth` +
`require_email_verified({allowUnverified:true})`; columns in `models/users_roles.model.js:79-82`
and `config/db.config.js:1114`; `test/g40-10-best-practices-ack.test.js`. Validates the version
as a non-empty string ≤ 40 chars (no allowlist); idempotent **per version** — re-acking a stored
version returns the original timestamp.

### Order of remaining work

1. **Owner answers the two decisions** (101 gate in/out; which copy set is canon).
2. Reconcile `!247` onto the approved design — copy, ground, CTA colour, the gate if in, and
   `var(--app-vh)` for height. Keep its error path and version constant.
3. Bump `CHECKLIST.version` **with** the copy, or no existing worker is re-prompted.
4. Correct the Jira description (stale copy + the dead `/api/v1/gopher/ack-best-practices` path).
5. Review `gopher-go-101.html` — read it, don't string-match it (owner rule, 2026-08-05).
6. Rebase and merge.
7. **Ship in a store release.** No OTA. 3.9.2 hit 100% on both stores 2026-09-07 without this.

### ⛔ Closing condition

Not Done at the merge. The AC is a screen at the end of sign-up — met only when a build
carrying it is **live in both stores**. This ticket previously went green on a sprint close
(2026-09-07 00:07), not on the work.

---

## Owner decisions — 2026-09-08

**Copy: set A** (the prototype's wording), **with one amendment**, and **no 101 gate**.

### The amendment — the tutorial is the CURRENT one

Owner ruling: the checklist points at **"How To Use Gopher Go"**,
`https://gophergo.io/become-a-gopher/gopher-go-support/`. **Not** "Gopher Go 101" — that name
and guide are **New Gopher Marketplace, for launch**, and get revised when Marketplace ships.

⚠️ This cuts *against* the prototype, whose item 1 reads "Review your **Gopher Go 101**
tutorial". **The prototype is ahead of the app here and the app must not follow it.** Five of
the prototype's seven "Gopher Go 101" strings are on this screen; the other two are on the
Help Center screen and are out of G40-10's scope.

### The gate is dropped

The prototype disables the CTA until the worker opens the guide — it can do that because the
guide is **embedded** in the prototype as base64. Pointed at a live gophergo.io URL, the app
can observe a **tap** and nothing more, so the gate would assert something it cannot see.
Nine ticks enable the CTA, per the AC as written. **Revisit at Marketplace launch**, when the
guide is in-app again and opening it is observable.

### ✅ Done — `!247` reconciled (`b05391cf9`)

Copy set A + the amendment; version bumped **`2026-07-gg-bp-v1` → `2026-09-gg-bp-v2`** (the
backend is idempotent per version — copy and version move together or nobody is re-prompted);
`min-height: 100dvh` → `var(--app-vh)` per G40-371.

Verified by compiling the file with the repo's own babel and driving the **real component** in
a browser at 390pt: 9 rows, item 3 reads "Requester", tapping the tutorial link opens the
gophergo.io URL and leaves that row unticked, 8/9 leaves the CTA disabled and the 9th enables
it, confirm emits `POST /users/ack_best_practices {"version":"2026-09-gg-bp-v2"}` → `/`, and a
simulated 500 shows the error, does not navigate, and stays retryable.

### ⛔ Two verdicts from the 2026-09-07 audit are RETRACTED

That audit's diff table said the prototype should win on **ground colour** and **CTA colour**.
Both are wrong — they were recorded before checking the app:

- Cream `#FBF7EF` appears **nowhere** in the Go app; its sign-up screens are white.
- `.act` — green background, navy text — is the prototype's **shared button class across every
  screen**, so green is its whole design language, not a decision about this screen. Every
  sign-up CTA in the shipped app is navy.

Adopting either would make this the only cream, green-buttoned screen in the funnel. **Chrome
follows the surrounding screens; only the words follow the prototype.** That distinction is
the rule for the rest of the reskin too.

### The prototype is NOT edited — the divergence is pinned instead (`83e07f2`)

⛔ **Two earlier conclusions here were wrong. Both are corrected below.**

**There is no branch fork.** `main` in this repo is the **GitHub Pages deploy branch** —
`scripts/deploy.sh` flattens `Final/` to its root, which is why `origin/main`'s tree is a site
root (`.nojekyll`, `Beer-Delivery.mp4`, `1-engine-css-block.html` at top level) and why
`_prototypes/` appears there only as the published twin via deploy.sh's `PROTO[]` allowlist.
Local `main` was simply a **stale 19 July ref of that deploy branch**. Source lives on the
working branch (`feature/deals-google-maps-audience`). The "297 behind / ~200 ahead fork" read
was a deploy branch being compared to a source branch. **Nothing was blocked and there was
nothing for the owner to decide.**

**The prototype should not adopt the app's wording either.** The prototype *is* the New Gopher
Marketplace app. In that era the guide is in-app, so "Gopher Go 101" is right there, and the
gate genuinely works — `open101()` renders `DOC101`, embedded in the file, so opening it is
observable. Neither is a defect. Editing them would drag the future design back to today's
naming and delete the launch-state design.

So the screen carries a **pinned comment** instead, stating that both divergences are
deliberate and why. This follows the standing rule: *an intentional divergence must be pinned
by an assertion saying so, or the next person closes it.* It was not hypothetical — this audit
read both as defects and was part-way to "fixing" them.

| point | prototype (Marketplace era) | shipped app today |
|---|---|---|
| tutorial | "Gopher Go 101", embedded guide | "How To Use Gopher Go" → gophergo.io support page |
| 101 gate | present, and honest — opening is observable | dropped — a live URL yields a tap, nothing more |
| everything else | **the reference** | follows the prototype |

### ⚠️ `!247` targets the wrong branch

The MR was raised against **`next`**, citing a "2026-08-21 branching change" — it was written
2026-08-22, a day later, and never retargeted. That convention is gone: the last 15 merges all
went to **`production`**, and `next` is **0 ahead of production and 12 behind** — drained into
production by `chore/carry-next-clean-commits` on 2026-09-04 and abandoned. Merging to `next`
today would land the screen nowhere.

Correct target is **`production`**. Rebased onto it and verified: clean, no conflicts, true
delta **3 files / +337 / −1**. Before the rebase the branch's tree differed from production by
~3,900 deletions (`AppErrorBoundary`, `CancelReasonSheet`, `mobileConfigCache`,
`activeRequestPin`, six `assert-*` CI guards) — a normal merge would not have dropped those,
but rebasing first removes the question. Same hazard shape as branching off `next`.

### Remaining

1. Review `gopher-go-101.html` (owner rule 2026-08-05). Now more pointed: that guide is the
   *Marketplace* tutorial, and the shipped checklist deliberately points somewhere else.
2. Regenerate the screen spec once the pin is merged, so the published `best-practices.html`
   stops contradicting its own note. Owned by the screen-spec session.
3. **Ship in a store release.** Still the only thing that closes this.
