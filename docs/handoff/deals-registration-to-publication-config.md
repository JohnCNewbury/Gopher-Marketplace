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

**It is not an implementation.** No production code was written *for this document* — it is a spec.

> ⚠️ **Superseded 2026-08-09** — CLAUDE.md's *Scope of AI work* no longer reserves these for a human developer (there is no dev partner, and sessions have been shipping auth/authz/DB work to `production`). **The gate is now the owner's informed consent before production:** what it solves, the risk, the reward — then his decision. Build status below is still accurate; the *who may build it* framing is not.

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
- **⭐ Merchant registration IS user intake. It creates or links a real Gopher account — this is the
  single most misread thing in this document.** One human, one account, several roles
  (**BUILD-SPEC** §5.3 / **D-016**). The merchant's "Personal Info" tab *is* their Request profile,
  and the form says so on screen: *"This is the standard Personal Info for every Gopher account — it
  sets up your owner login."* This is a SPINE-1 dependency, not a Deals-local table.

  *(Emphasised 2026-08-06: the HQ session read this section and still described intake as "writes a
  deals record, creates no account." If a careful reader misses it, the wording was too quiet — so it
  is now stated as a heading-level rule rather than a bullet.)*

**The account is created at SUBMIT, not at approval** (owner, 2026-08-06). "Review my deal" *is* the
save. Three paths:

| Path | Trigger | Behaviour |
|---|---|---|
| **A — existing Gopher** | *"I'm already a Gopher user"* ticked | Phone only → **phone OTP** → details populate from the account. **Links; creates nothing.** No collision possible by design. |
| **B — new user** | unticked, no match | Full personal info → **phone OTP** → **creates a real Gopher user, Requester role**, ordinary signup state (email unverified) → **email OTP as that user**. ⟳ **Order corrected 2026-08-09** — see the note below the table. |
| **B-collision** | unticked, but phone and/or email already matches | *"Is this you?"* → confirm → OTP → existing details populate → **becomes Path A**. Never creates a second account. ⟳ **Unblocked 2026-08-09** — buildable now, but it must resolve by **account id / email, never a phone lookup**, and treat a phone hit as *one or more* rows. See §3.2b. |

> ⟳ **ORDER CORRECTED 2026-08-09 — owner ruling, closing the update §3.2a asked for.**
>
> Path B previously read *phone OTP → email OTP → create user*. **That ordering is not buildable**,
> and §3.2a diagnosed why on 2026-08-06 without the table ever being updated to match — so the stale
> order was inherited straight into `deals-intake-build-spec.md` §2 and would have been built.
>
> The email-OTP endpoints are behind **`middleware.user_auth`** (verified at source,
> `controllers/user/index.js`:322–339 on `origin/production`). An unregistered merchant has no token,
> so **the user must exist before email can be verified.** Owner ruled **Option 1** on 2026-08-09:
> create the account after phone OTP, unverified, then run email OTP as that user.
>
> **Build consequence:** the OTP core is extracted into a service function that both the HTTP
> controller and public intake call — reusing the mechanism, not duplicating it. **Operational
> consequence:** an abandoned intake leaves a real unverified account, which on a public endpoint is
> an account-creation vector and belongs with the §3.2b abuse controls.

**Service Providers never create a user.** They are already Gophers with a worker role, submitting
from the Go app (§2.2). Link only.

**Why the deal and the user are independent — and why this is lead intake, not a form.** A
**rejected** deal still leaves a real, marketable Requester who enters the Request pipeline. The user
outlives the deal. **Tagging happens on approval, not submit:** the account is a plain Requester
until HQ approves, and only then does it carry `Deals` (Merchant / Service Provider) and
`Deal status` (active / inactive). That is the reason intake cannot be a standalone table write.

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

> ⛔ **SUPERSEDED FOR THE MERCHANT PATH — 2026-08-10. The cutover happened; this is no longer
> "today".** `submitForm('merchant')` **no longer touches the Apps Script on any host.** It files
> the deal against the real API, and all three public hosts serve that build — verified by
> content, not by branch state. See **§3.2e** for the shipped contract and the corrected
> deployment table below.
>
> **Still accurate as written:** the **worker / service-provider** path (`submitForm('worker')`),
> which deliberately stays on `GOPHER_FORM_ENDPOINT`. SP deals are submitted in the Go app; this
> public funnel is pre-registration scaffolding (**SP-PIPE** §*Public interest funnel*), and
> repointing it would imply a capability that does not exist.

`submitForm(type)` at `gopher-deals.html:4488` (endpoint constant at `:4450`) does three things, in
this order (**PATHWAY** §*Where the information goes (today)*):

1. Serialises every named field in the modal to a `data` object.
2. **Writes a localStorage backup** (`gopherLeads`) so nothing is lost if the network call fails.
   Recoverable as CSV via `downloadGopherLeads()`.
3. **POSTs to `GOPHER_FORM_ENDPOINT`** — a Google Apps Script Web App — as
   `text/plain;charset=utf-8`, deliberately, so it is a CORS-simple request and needs no preflight
   from any origin. The script appends a row to the backing Sheet.

⟳ **CORRECTED 2026-08-10 — the Inbox-composer claim here was stale and is now removed.** *(It read:
"The same plumbing now also carries the merchant Inbox composer as `submission_type:'inbox_message'`,
built 2026-08-05.")* That relay was **backed out the same day it shipped** (`40fc4eb`, owner ruling)
because it wrote junk rows into the live Leads sheet and the script-side half was never built. **The
composer sends nothing today** — verified at source: the tombstone comment sits at
`gopher-deals.html:6011`–`6018` where the POST used to be. Rebuild belongs on the **G40-305
dispatcher (`sendEmail.js`)**, not on Apps Script and **not** against the lead-capture endpoint.

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

**⟳ CORRECTED 2026-08-06 (owner ruling, via the HQ Dashboard session).** This section previously
read *"form → `POST /api/v1/deals` (authenticated) → `deals` table → Dashboard review queue."*
**The authenticated contract covers the wrong half of the flow:** a DLM merchant filling in the
public form is *unregistered* — no account, no token — so an authenticated endpoint cannot receive
them.

**The production transport is:**

```
public form → backend API (PUBLIC, rate-limited) → deals record (pending)
                                                        ↓
                     HQ Dashboard: review queue → approve / reject → publish
```

**Why intake is not simply POSTed to the Dashboard**, which is what "HQ takes registration
ownership" might suggest: the **HQ Dashboard is entirely auth-gated** — every route behind
`requireAuth`, on a single EC2 box with a **5-connection Sequelize pool**. Making an internal
dashboard internet-facing is a security and availability decision, not an implementation detail. The
backend API already has public routes, rate limiting, and the `deals` record. The owner's
requirement is satisfied **operationally** — HQ owns review, approval and publication — without the
dashboard becoming a public endpoint.

**Abuse controls belong on the public intake route.** The platform's only rate limit today is
**30 req/s per IP**, which the HQ session observed producing a dead-end *"Failed to load
configuration"* screen on a real device — so the limit needs to be intake-appropriate and to fail
with a usable message, not a wall.

`submitForm` is the seam to repoint; its serialisation and its localStorage fallback are worth
keeping as an offline-resilience pattern, its endpoint is not.

**⚠️ Intake creates or links a real Gopher user — it does not only write a deal row.** See §2.1 for
the three paths. The endpoint therefore touches identity, not just Deals, and the `deals` record and
the `users` record have **independent lifecycles**: a rejected deal leaves a live Requester behind.

### 3.2a Email OTP — built, routed, and blocked by its own middleware (verified 2026-08-06)

The Path B gap was reported as *"email OTP is missing today."* **It is not missing — it is
unreachable from public intake**, which is a materially smaller and differently-shaped problem.

Verified at source on `gopher-backend-api` `origin/production`:

| | |
|---|---|
| `controllers/user/emails.js` | `send_email_otp` (:206), `verify_email_otp` (:309), `resend_email_otp` (:483) — complete, with `email_otps` capture, 10-min expiry, 60s resend cooldown |
| `controllers/user/index.js` | routed: `POST /email_otp/send`, `/email_otp/verify`, `/email_otp/resend` |
| ⛔ **every one** | behind **`middleware.user_auth`** |

**So the blocker is a sequencing decision, not a build.** `user_auth` requires a token, and an
unregistered merchant on a public form has none — the *same* mismatch as the authenticated
`POST /api/v1/deals` this section already corrects. Note the routes also carry
`require_email_verified({ allowUnverified: true })`, i.e. they were **designed to be called during
onboarding by an account that already exists but is not yet verified.**

**Two ways to resolve it, and the cheaper one may need no backend work at all:**

1. **Create the account after phone OTP, then verify email with the existing endpoints.** Order:
   personal info → phone OTP → **create user (unverified)** → `POST /email_otp/send` + `/verify` as
   that user. This fits what the endpoints were built for and needs **no new route**. It does mean an
   account exists before email is verified — which is already the ordinary signup state, not a new
   concession.
2. **Verify email before creating anything** — requires a **new public, unauthenticated** email-OTP
   variant, with its own abuse controls on an endpoint that sends mail to arbitrary addresses.

**Option 1 unless there is a reason to prefer 2** — it reuses shipped, exercised code and avoids
adding a second public mail-sending surface. The order stated in the Path B table (§2.1) assumes
email OTP precedes account creation; **if option 1 is taken, that ordering changes and §2.1 must be
updated to match.**

> ✅ **RULED 2026-08-09 — Option 1. §2.1 has been updated; this item is closed.**
>
> Recorded because of how it nearly went wrong: this section was correct on 2026-08-06 and named the
> exact follow-up needed, but **the follow-up was never done, so §2.1 continued to state the
> unbuildable order for three days** and `deals-intake-build-spec.md` inherited it verbatim into its
> §2 *and* contradicted it in its own §7. A correction that lands only in the section that discovered
> the problem, and not in the section people actually read, is not a correction. **When a finding
> invalidates a rule stated elsewhere, fix the other place in the same edit.**

### 3.2b Dependency — one phone must resolve to one account

Path B's collision branch assumes a phone identifies at most one account. **It does not today:
775 numbers map to more than one, and 6 have a live account shadowed by a dead one.** The owner has
taken this as a **separate ticket** and wants it corrected *before* anything ships that could disrupt
a user caught in a collision. New standing rule (owner, 2026-08-06): **no duplicate phone numbers,
ever, including admin-created accounts.**

> ⛔ **SUPERSEDED 2026-08-09 — owner decision. This section previously ended: *"The intake build may
> proceed; its collision branch is blocked on that outcome."* THAT IS NO LONGER TRUE, and leaving it
> would hold work that is now released.**
>
> The uniqueness rule is **DEFERRED to Phase II → G40-359** — it carries more risk than it retires
> for a ~95%-disengaged population, and **must not be re-raised as urgent.** Root cause is a closed
> 2018 wound (email-only signup; 99.6% of duplicates created 2018–2021, only 6 since 2022, all
> contractor/test/disposable). Public signup already blocks duplicate phones. Two code fixes were
> **not** deferred: deterministic phone resolution, and a phone check on the admin create-user path.
>
> **Deals merchant intake is UNBLOCKED, with three binding conditions:**
>
> 1. **Resolve the merchant by account id or email — NEVER by phone lookup.**
> 2. **Treat a phone hit as *one or more* rows**, never as one. An un-ordered
>    `findOne({where:{telephone}})` is the live lockout bug; at that same call site a miss *creates
>    a new account*, so a format mismatch mints a duplicate silently.
> 3. The collision branch may be built, but must not assume a phone identifies exactly one account.
>
> **Also correcting the model-file claim in §3.2c** — that finding was already on record before this
> session found it, with a detail neither reader had: Sequelize's model-level `unique` performs **no
> pre-insert check at all** (it relies on the DB to raise), so the declaration is inert twice over,
> not merely unmaterialised. The same file declares `allowNull:false` on a column the DB leaves
> nullable — identical fiction, same place.
>
> **And a raw normalisation is not enough.** Exact-string collisions are 775; **normalised they are
> 807** — 36 pairs stored in different formats (`+18005551234` vs `8005551234`). Stripping
> non-digits alone does **not** fold the leading `1`, so it recovers only a handful of those 36. The
> constraint has to be on **`RIGHT(REGEXP_REPLACE(telephone,'[^0-9]','','g'),10)`**, and **partial**,
> excluding the 3,386 rows holding unusable or short phone values. Full inventory and proposed
> patch: `Documentation/Security/phone-uniqueness-discovery-2026-08-09.md` — **contains real
> customer PII; keep it out of this public repo.**

**Two intake requirements that come from defects observed in the current system — build both:**

1. **One click = one lead.** The prototype's `submitForm()` guarded only the geocode-callback race
   *within a single invocation*; a second **click** started a second submission. Real consequence,
   found in the exported Leads sheet: **four identical worker rows 2.5 seconds apart** from one user
   with one intent. Fixed in the prototype 2026-08-06 (module-scoped in-flight guard + button
   disable, set only after validation passes). **A public intake endpoint with no client-side
   debounce collects duplicate registrations** — and unlike the Sheet, duplicates in a `deals` table
   have downstream cost. ⚠️ **Amended 2026-08-09 — this line previously read "server-side
   idempotency on top is cheap insurance."** It is not, on `POST /api/v1/users`: that is live
   signup for both mobile apps, and it already refuses a known phone with a 422. **Where the guard
   belongs is settled in §3.2c** — client-side, moved to the account-creation boundary; deal
   retries are deduped server-side on content.
2. **Reject unknown fields; do not absorb them.** The Apps Script appends a new column for any key it
   has not seen (`Object.keys(data).filter(k => headers.indexOf(k) === -1)`), which is how one
   stray caller permanently widened the Leads header by five columns. **The `deals` record must have
   a fixed, validated schema** — an unrecognised field is a rejected request, not a schema change.

### 3.2c The real intake call shape (backend built 2026-08-09, `feat/deals-schema`)

Intake stops being one POST. The merchant form makes **three calls**: create the account
(`POST /api/v1/users`), verify the phone, then submit the deal (`POST /api/v1/users/deals`).
Everything below was verified at source on `origin/production` / the built branch — record it here
rather than in the session thread, because a finding that lives only in a message is the fossil this
document exists to prevent.

**⚠️ Correction to a claim this session made to the owner.** I reported that a double-click at the
new boundary would **manufacture duplicate Gopher accounts**, adding to the 775 in §3.2b. **That was
overstated.** `auth.create` (`controllers/user/auth.js:157-176`) does `findOne({where:{telephone}})`
and returns **422 "Phone number already registered. Please login using OTP."** before inserting, and
the same for email. A sequential double-click — 100–300 ms apart — is caught: click 1 creates,
click 2 gets the 422. The realistic human failure mode is **defended**.

**What is genuinely exposed** is narrower and harder to notice: that check is a **check-then-insert
with no transaction** (zero `transaction` references in `exports.create`), so two *concurrent*
requests — a retry-on-timeout, a client resend — can both pass `findOne` before either inserts.

**And there is no database backstop, despite what the model file says.** This is a trap worth
naming, because the model is the natural place to check:

> `models/users.model.js` declares `{ unique: true, fields: ['telephone'] }`. **The database does
> not enforce it** — 775 duplicate numbers exist in production, which is proof. The tell is that
> **`telephone` is the only unique index in that block with no `name:`**; every sibling carries a
> Rails-era `index_users_on_*` name from a real migration (`email`, `confirmation_token`,
> `reset_password_token`, `uid+provider`). The named ones exist; the unnamed one was added to the
> Sequelize model by hand and never materialised. **Reading the model and concluding "telephone is
> unique" is wrong** — that is exactly how email came to be enforced and phone did not.
>
> **Why it can never have landed, and what this means for the fix.** Schema is applied by
> `config/db.config.js` on boot as idempotent **`CREATE TABLE IF NOT EXISTS`**; there is no
> `migrations/` dir and no sequelize-cli. Against an already-existing `users` table that statement
> is a **no-op**, so an index added to a model file is never applied. ⚠️ **Consequence for the
> owner's phone-uniqueness ticket: adding `unique: true` in the model changes nothing** — it
> already says that. The constraint is a deliberate DDL act against the database, taken *after*
> the 775 are cleaned (a `CREATE UNIQUE INDEX` fails outright while duplicates exist). Anyone who
> "fixes" this in the model file will ship a silent no-op and believe it is done.

**Decisions that follow, and who owns them:**

| | |
|---|---|
| Client guard moves to the **account-creation** boundary | **Form (this repo).** Cheapest fix — prevents the second request existing. Today's guard sits inside `submitForm()`, which the new shape no longer reaches first. |
| **No** idempotency added to `POST /api/v1/users` | **Backend, declined deliberately.** That is live signup for both mobile apps; the existing check covers the realistic case, and the correct backstop is the UNIQUE constraint. Sequencing is fixed: stop new duplicates in code → clean the 775 → then constrain. |
| **Do not send an `idempotency_key`** | The field was allowlisted and never implemented; it has been **removed** rather than left accepting-and-ignoring, which would read as protection that isn't there. |

**Resume path when the account is created but the deal submit fails: it already exists, and it is
Path A.** The merchant returns, ticks **"I'm already a Gopher user"**, verifies phone, submits the
deal against the account they now have. **It does not touch the collision branch**, so it is *not*
blocked on §3.2b. The blocked branch is only reached if they return and **don't** tick the box —
making this a **form-affordance problem, not a backend gap**. The 422 above is the hook: it means
"this phone already has an account", which is precisely when the form should say *"you already have
an account — verify your phone to finish your deal"* rather than surfacing a registration error.

### 3.2d ✅ THE VERIFIED CONTRACT — driven end-to-end against production 2026-08-10

> ⚠️ **Read §3.2e before building against this.** The **server** contract below still stands
> (endpoints, payload allowlist, duplicate semantics). The **client sequence** it implies was
> simplified by owner ruling later the same day — `POST /users` is no longer called at all, and
> `sign_in` is what creates a new merchant's account. §3.2e is what shipped.

**Not a spec. Every response below was copied from a real run** by the HQ Dashboard session
against `https://api.gophergo.io`, creating user **141557** (`+1 805-555-0173`) and **deal row
id 1**. If the form sees anything different, that is a real difference — report it, do not
work around it.

| # | Call | Auth | Result |
|---|---|---|---|
| 1 | `POST /api/v1/otp/get` `{telephone}` | public | `200 {status:true}` |
| 2 | `POST /api/v1/users` (role `requestor`, `provider:"phone"`) | public | `200`, body has `data.id` |
| 3 | `POST /api/v1/users/email_otp/send` `{}` then `/verify` `{code}` | `access-token` | `200` each |
| 4 | `POST /api/v1/users/deals` | `access-token` | `201 {deal:{id,status:"pending",track:"dlm"}}` |

**⚠️ Two things that will each cost a build cycle if missed:**

1. **The token is returned in the `access-token` RESPONSE HEADER, not in the body.** Both
   `/users` and `/users/sign_in` behave this way (`access-control-expose-headers:
   access-token,refresh-token`). Nothing in the JSON carries it.
2. **The phone OTP SURVIVES signup — do not request a second one.** `auth.create` checks that
   a code exists but does not consume it; the same code works for signup *and* a following
   sign-in. Re-requesting mid-flow creates the "user holds two texts, enters the first"
   failure for no benefit.

**Field rules (tested, not assumed):** `category` must be the **key** — `restaurants` ·
`favorites` · `age` · `retail` (the form's `CATEGORY_KEY` map at payload-build is correct;
do **not** key the `<option value=>` — see §9.14 / Ruling 1). `keywords` ≤ 3, as an **array**.
**Never send** `customer_price`, `age`, `phone_verified`, or `owner_user_id` — each is
rejected by name, and `owner_user_id` is taken from the token, so a body-supplied one is
refused before the write. Validation returns **all** errors at once in `errors[]`, with a
`suggestion` field on an email typo.

**Status semantics:** `201` created · `200` + `duplicate:true` and the **same id** on an
identical resubmit (no second row, safe to retry) · `422` writes nothing, so retry after a
validation failure is always safe · **`440`** — not 401, not 500 — when unauthenticated ·
`422 "Phone number already registered. Please login using OTP."` on a duplicate phone at
step 2, which is the **collision hook** for the Path A resume affordance (§3.2c).

> **Two process findings from that run, both worth more than the contract itself.**
>
> **A unit test of a controller cannot see what its middleware does to the request.** The
> first live call failed `422 "Unrecognised field(s): app_type, fetched_user"` —
> `middleware.user_auth` injects **three** fields into `req.body` (`decoded`, `app_type`,
> `fetched_user`) and only the first was being stripped, so **every authenticated request
> failed** while the suite stayed green, because the tests call the controller directly and
> never run the middleware. Fixed and deployed (`19639902`).
>
> **Merged ≠ live, and the failure can be silent.** Production could not deploy from
> **2026-08-08 21:51**: Elastic Beanstalk sat at **1000/1000** application versions with
> pruning disabled, and CodePipeline's deploy stage failed while GitLab showed green —
> **four consecutive merges vanished.** Cleared by deleting 645 pre-2026 dev versions.
> Confirm any deploy **by content**, never by branch state or a 200 on the host.

**Retrying the same deal is safe (server-side, content-based).** Same owner + same `deal_text` +
still `pending` returns the **original** row with **200** and `duplicate: true` — success to the
merchant, distinguishable to the caller. A *different* deal from the same merchant is a normal 201.
A resubmit **after rejection** is deliberately a fresh 201, because editing and resending a rejected
deal is the documented flow (§5.2) and collapsing it onto the reviewed row would discard a real
submission. A 422 writes nothing, so retry after a validation failure is always safe.

> ### 3.2d-DLP addendum ✅ — the WORKER (dlp) side of the same contract, driven against production 2026-08-11
>
> The Go dashboard sign-in build (commits `a547e54`..`1b931cd`) drove the dlp track live with the
> authorized test numbers. Same rule as above: every fact here was copied from a real response.
>
> - **The intake field is `deal`, NOT `deal_text` — on both tracks.** `deal_text` is the database
>   COLUMN (`deals.model.js`) and is rejected by name (`422 Unrecognised field(s): deal_text`,
>   caught live). The allowlists are `DLM_FIELDS`/`DLP_FIELDS` in
>   `helpers/deals_intake_validation.js`. ⚠️ This section's own duplicate-retry paragraph above
>   says "same `deal_text`" — read that as the column the dedupe compares, not the field you send.
> - **DLP submit enforcement works:** an ineligible account's submit (valid fields) is refused
>   `403 "Not currently eligible to post a Service Provider deal."` and writes nothing.
> - **`GET /users/deals/eligibility` verdict shape (real body):** snake_case — `service_jobs`,
>   `service_rating`, plus `eligible`, `tier` (e.g. `"Standard"`), `tier_id`, `reasons
>   {jobs,rating,tier}`, `near_miss`, `bar {jobs,stars,window}`, `classification`, `grant`/`granted`.
> - **`POST /users/sign_in` body is NOT the users row** (`auth.js:894-914`): state is
>   **`user_status`** (not `aasm_state`), name is **`firstName`** (camelCase), `sign_in_count` is
>   absent. A freshly minted account additionally carries the
>   **`onboarding-<phone>@placeholder.gophergo.io`** email — the reliable mint marker. ⚠️ Do not
>   detect "new account" via top-level `onboardingRequired`: the existing-user branch sets it for
>   any gopher needing email verification OR payout setup (`auth.js:1479`).
> - **`otp/get` invalidates all prior unused codes first** (`otps.update({used:true})` before the
>   Twilio send), caps at **3 consecutive generations** (`OTP_GENERATE_MAX`, 429 + `blocked_until`
>   beyond it), and writes the row only inside Twilio's `.then()`. **The admin `/otp/csv` export is
>   newest-FIRST** — tail-reading it shows you stale rows while fresh ones sit at the top; that
>   cost this run twenty minutes.
> - **Test-state consequence:** `805-555-0198` → user **141561** (established,
>   `deals.test.0173`-style real email, enters the dashboard); `919-555-0142` → user **141564**
>   (INCOMPLETE mint, placeholder email — the live specimen of the mint shape). **Neither spare is
>   clean**; both had already been consumed 2026-08-10 after the handoff called them clean. Both
>   accounts need G40-359 tagging.
> - **Not proven live:** an eligible **201** dlp submit — no test account can meet the 20-service-
>   job bar. Field validation through to the eligibility gate is proven; the final insert is
>   inherited from the dlm 201 above.

**Consequence for the tabled deals@ wiring — SUPERSEDED, see §3.3.** *(The original text read: the
Apps Script snippets in `docs/handoff/deals-email-wiring.md` are the interim way to send from
`deals@gophergo.io` pre-launch, correct for now and dead at go-live. That is no longer the plan —
the doc is frozen and must not be followed. `deals@gophergo.io` does remain the sender/receiver
identity in both eras, **SP-PIPE** §6.)*

### 3.2e ✅ SHIPPED — the finalized merchant intake, live on all three hosts (owner ruling, 2026-08-10)

**This supersedes the two-stage arrangement described in §3.2c–§3.2d for the front end.** §3.2d's
*server* contract still holds — the endpoints, the payload allowlist, the duplicate semantics. What
changed is which calls the form makes and in what order. Owner ruling after the first live test:
the flow was **over-built**.

**The shape: one SMS recognises; email only if new.**

| | Known number | Unknown number |
|---|---|---|
| `POST /users/sign_in` | returns token + **real profile** | **creates** the account, returns token + `@placeholder.gophergo.io` |
| Owner fields | **auto-filled** from the account | merchant types them |
| Email step | **retired** — shows `✓ Email verified` | **required** — Verify button under the email field |
| Codes the merchant enters | **one** (SMS) | **two** (SMS, then email) |

**Four things here are load-bearing, and each one replaced a defect:**

1. **⭐ Recognition is the server's job, not the checkbox's.** `sign_in` validates the code *and*
   returns the account, creating one when the number is unknown. So a merchant who forgets to tick
   *"I'm already a Gopher user"* is recognised anyway and auto-filled; the checkbox is ticked **as a
   consequence**, never as the cause. **What used to be the trap is now the mechanism** — the
   handoff's warning that `sign_in` mints accounts for unknown numbers is still true, and is now
   exactly the intended account-creation path. `POST /users` is **gone from the flow entirely**,
   and the 422 "already registered" collision handling went with it.
2. **The new-user branch is distinguished by the placeholder email**, `@placeholder.gophergo.io` —
   not by a flag the client sets. That is the only signal the response carries.
3. **`PUT /users` saves the real details before the code is sent**, which is permitted on an
   unverified account. The code goes to the address the merchant just typed (it lands in
   `unconfirmed_email` and promotes to `users.email` with `confirmed_at` on verify) — **not** to the
   placeholder. ⚠️ **`address` is deliberately omitted from that PUT:** `update_user` expects an
   object carrying an `id` and this form holds free text, so sending a string **throws server-side**.
4. **An email already on another account is refused** — *"use a different address"* — rather than
   silently merging accounts.

**Submission is gated on `_emailVerified`**, so an unverified new account cannot reach
`POST /users/deals` (which sits behind `require_email_verified()` with `allowUnverified` false and
would 403 anyway). The gate exists so the merchant is stopped **at the field**, not at the last click
after filling in everything.

**⚠️ Autofill trap, fixed and worth not re-introducing.** Do **not** hand-format the date of birth.
`dcIsDob` requires **spaces** around the slashes (`/^\d{2} \/ \d{2} \/ \d{4}$/`), which `dcFormatDob`
produces as the merchant types. Writing `08/10/2000` directly is a **correct date the validator
rejects** — the first autofill did exactly that. Write raw `MMDDYYYY` digits and run the page's own
formatter over them, so the format can never drift from its validator again.

**Verified end to end against production, not asserted:** known number → `141554` returned with name,
email and DOB → autofilled, no email step; new number → `141568` created → details saved → code
delivered to the real address → verified and promoted → **deal 4 filed**.

**✅ RESOLVED 2026-08-10 — and it is NOT a Deals defect. Do not send anyone here to fix it.**

*(Superseded text: "⚠️ Inherited, NOT verified here — on the new-user path `auth.create` reportedly
checks only that an OTP row exists, not that the digits match, so a wrong-but-well-formed code still
creates the account." Also **`36ff358`'s commit message, which says the same thing, is superseded** —
it was true when written and stopped being true about four hours later, when the flow was simplified.)*

**The weakness is real, is worse than first described, and lives somewhere else.** Confirmed by the
HQ Dashboard session **by execution, not code-reading**: `POST /api/v1/users` was called with **no
`code` field at all** and returned **200**, creating user `141557`. `controllers/user/auth.js` (~L120)
only does `db.otps.findOne({ where: { telephone } })` and returns 401 when absent — **`code` is never
compared.** Since `POST /otp/get` is public and unauthenticated, a caller can manufacture the row for
any number first. Stated properly:

> **An unauthenticated caller can create an account on any phone number that does not already have
> one**, by calling `otp/get` and then `POST /users`. Numbers that already exist are protected —
> `auth.create` 422s on a known phone.

⛔ **But the merchant intake does not use that endpoint, and never did after the simplification.**
`sign_in` is the account-creation mechanism now, and it calls `verify_otp`, which **does** compare the
digits, honours the lockout counter, and marks the code used. **Verified independently here** against
the deployed page: the only `/users` calls in `gopher-deals.html` are `/users/sign_in` (`:3983`), a
**PUT** to `/users` for profile details (`:4085`), and the two email-OTP routes. There is **no
`POST /users` with a body anywhere in the merchant path.**

**Where it actually belongs: the signup endpoint used by the MOBILE APPS**, and it is **G40-359**
territory — an account created on a number nobody proved they control, on a `telephone` column with no
UNIQUE constraint (775 duplicates live). **File it as a signup-endpoint authentication weakness, not a
Deals one.** Filing it against merchant intake would send someone to code that no longer has the
problem — precisely the fossil this document keeps having to dig out.

**⚠️ Design note, reachable in production.** The account is created at the **phone** step, before the
Merchant Agreement is accepted at the final step. Abandonment between those points leaves a real
account — verified email and all — with **no accepted agreement and no deal**. Worth watching with
the first real merchant. `telephone` still has no UNIQUE constraint (775 duplicates live, **G40-359**,
deferred to Phase II).

**⚠️ `gopher-deals-101.html` now under-describes this flow and is LIVE on all three hosts.** It still
says both codes are collected and that the email code arrives when the merchant taps *"Review my
deal"*, and it tells existing users to tick the checkbox to be recognised. All three are now wrong.
Raised with the owner 2026-08-10 — see the standing rule that a user-facing change is not done until
its 101 guide is **reviewed**, not string-replaced.

### 3.3 RULING — HQ Dashboard takes registration ownership; the Apps Script goes (owner, 2026-08-06)

**Canonical rule.** The **HQ Dashboard is built to the SOW and takes ownership of fielding merchant
registrations and Service-Provider deals.** The Google Apps Script is **frozen now and retired at
cutover** — not extended, not migrated. Owner, verbatim: *"I want the app scripts issue resolved with
Deal session and want the HQ Dashboard to be built to the SOW to take the registration ownership for
fielding merchant and service provider deals as intended. This needs to be buttoned up before
launch."*

**Frozen means frozen at exactly today's behaviour** — lead capture plus a notification to
`deals@gophergo.io`.

> ✅ **VERIFIED 2026-08-06 — no longer inherited.** The owner opened the Apps Script project and
> exported the Sheet; the HQ Dashboard session confirmed the following at source, replacing the
> second-hand claims this section previously carried:
>
> - `NOTIFY_EMAIL = "deals@gophergo.io"` ✅ — **but it is the RECIPIENT.** The project is owned by
>   **`johnCnewbury@gmail.com`** with `Execute as: Me`, so every alert sends **from a personal
>   Gmail**, not from the brand. That is an additional, independent reason the welcome email must
>   never live here.
> - `doGet` returns a liveness string only ✅ — no data exposure.
> - `MailApp.sendEmail(NOTIFY_EMAIL, …)` targets a **fixed** address ✅ — confirming it cannot be
>   abused today, and confirming that mailing `data.email` would turn a public URL into an open relay.
> - ⚠️ **The Sheet header auto-widens from whatever JSON arrives** —
>   `Object.keys(data).filter(k => headers.indexOf(k) === -1)` appends new columns. That is exactly
>   how the inbox-composer POST added five, and **those columns are permanent** — still in row 1
>   after `40fc4eb` stopped the POSTs. Any field name a caller invents becomes schema.
>
> ⛔ **CORRECTION — the Status review queue described here does NOT exist.** The exported header has
> **no `Status` column**. `cleanupAndPrepSheet()`, which would create Status / Batch-date and the
> New/Approved/Rejected dropdown, exists in the project but was **never run against this sheet**.
> Treat it as **aspirational, not operational** — there is no manual review queue in the Sheet today.

**✅ The drain step is a NO-OP — verified 2026-08-06.** The owner exported the Leads sheet: **five
rows, all his own tests** — one merchant (keyboard-mash business name, 07-31) and four identical
worker submissions within 2.5 seconds (08-05). **Zero real merchant leads. Zero real SP leads.**
Nobody is waiting on a reply, and there is nothing to migrate. The Apps Script can be deleted with no
data migration once the three hosts are repointed.

⚠️ **Do not read zero registrations as a delivery fault.** The Deals page is **live but not
promoted** — no campaign, no traffic driven to it. Zero is the system working as configured.

*(This removes the only genuinely dangerous part of the cutover. The three-host repoint below still
stands, because leads arriving **after** a partial repoint would still be lost — but there is no
backlog to preserve.)*

**Deployment reality — ✅ STEP 2 IS COMPLETE (2026-08-10). All three hosts are repointed.**

*(Superseded text, 2026-08-06: "`GOPHER_FORM_ENDPOINT` is live on three hosts, and every one of them
carries both submit paths." That was true when written and is now wrong for the merchant path on
every host — the correction that prompted this rewrite.)*

**Current state — each host checked by fetching the served HTML and grepping it, 2026-08-10.** A 200
proves the file exists, not that it updated; branch state proves less still.

| Host | Merchant path | Worker/SP path | Who can update it |
|---|---|---|---|
| GitHub Pages | ✅ **real API** | Apps Script *(by design)* | `scripts/deploy.sh --push` |
| TigerTech | ✅ **real API** | Apps Script *(by design)* | same push (FTPS action) |
| **Netlify mirror** | ✅ **real API** | Apps Script *(by design)* | ⚠️ **owner-action only** — manual drag of `Final/`; no CLI, token or `netlify.toml` on this machine. **Redeployed by the owner 2026-08-10**, confirmed by content. |

⚠️ **Netlify is the one that can silently fall behind, and it is the one that matters most.** Its
entire stated job is fielding merchant registration. Between the Pages/TigerTech push and the owner's
manual drag, the mirror served the **old Apps Script merchant path** — a merchant landing there
completed the whole form and got **no account and no deal row**, only a lead. That window is closed,
but it reopens on every future change to this form. **Standing exception to the "don't flag Netlify
drift" rule (LOG, 2026-07-28): any change touching merchant registration must be raised with the
owner for a mirror redeploy.**

Remaining cutover steps: (1) HQ can receive — **not** the merchant path's blocker any more, it now
writes to the real API directly; (3) **drain is a verified no-op** (§ above: five rows, all owner
tests, zero real leads); (4) **delete the script** — still blocked, because the **worker/SP form
deliberately still posts to it**. The Apps Script cannot be deleted until that funnel is retired or
repointed, which is a separate decision (**SP-PIPE**), not an oversight.

**Owner decision + date.** Direction ruled **2026-08-06** (relayed via Total SOW Priorities); the
"no Apps Script in production" rule it completes was ruled **2026-07-24** (**SP-PIPE** §6). Build
half dispatched to the HQ Dashboard session the same day. **SOW Bucket F already scopes and prices
"two registration paths; full account creation"** — so anything built into the Apps Script now is
paid for twice and diverges from what the vendor builds, which is the commercial reason freezing
beats extending.

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
| `id` (surrogate) + `dealCode` (`DL-nnnn`, unique) | **DASH** `deals-merchants.js` Deal ID; admin actions key on `DL-nnnn`. ⟳ **Clarified 2026-08-06:** this row previously implied `DL-nnnn` *is* the primary key. **Keep them separate** — `DL-nnnn` is a human-facing business key that appears in review UI and support conversations; foreign keys (`placementBidId`, order links) should reference a surrogate. A varchar business key as PK propagates a format decision into every referencing table. |
| `track` — `dlm` \| `dlp` | **PATHWAY** opening table; drives redemption behaviour end to end |
| `ownerUserId` | **BUILD-SPEC** §5.3 / **D-016** — one Gopher account underlies every role |
| `businessId`, `locationId` | **PATHWAY** §Stage 2 — *deals are location-bound*, owner-confirmed |
| `category` | §7.1 below — **currently unresolvable, see §9.1** |
| `title` / `dealText` | **PATHWAY** §Stage 1 (`deal`) |
| `promoCode` | **BUILD-SPEC** §4.1 — display text only, never validated by Gopher |
| `keywords[]` (≤3) | **PATHWAY** §Stage 1 + §Stage 5 — *these become the customer search index* |
| `orderUrl`, `noOnlineOrdering` | **PATHWAY** §Stage 1 (`website`, `no_online_ordering`) |
| `mobileAddress` | **PATHWAY** §Stage 2 + seam #3 (`TODO(backend)`, `gopher-deals.html:5042`). ⚠️ **The consumer surfaces already carry this field under a DIFFERENT NAME — `mobile` — and the feed must reconcile the two. See §9.17.** |
| `earnAmount`, `customerPrice`, `normalPrice` | **BUILD-SPEC** §6.1 — DLP only; `customerPrice = earn × 1.10`. ⚠️ **`normalPrice` MUST be greater than `customerPrice`** — owner ruling 2026-08-05, enforced in the Go form and **missing from this table until 2026-08-06**. Below that, the "deal" is a markup wearing a discount label: the customer pays more than the provider's stated normal rate, and the card's strike-through does not render at all (it is gated on `normalPrice > price`). Enforce at intake, not only in the client. |
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

> ⛔ **ANTI-REQUIREMENT — do not add an `age` column, boolean, or flag to the deal record.**
> Age-restriction is a **function of `category`**, evaluated wherever it is needed. The sample data in
> `deals-merchants.js` will tempt exactly this during porting — it already carries the redundant flag.
> A deal whose `category` says Age-Restricted while its `age` flag says false is a **compliance
> failure that looks like a data bug**, and the failure mode is silent: the ID check simply doesn't
> happen. Same class as *reject unknown fields* (§3.2) — both are about refusing a second source of
> truth.

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

~~One authenticated read endpoint~~ **One PUBLIC read endpoint** serves every surface.

> **OWNER RULING 2026-08-11 — the feed is public, unauthenticated. Built and live (MR !266).**
> "Authenticated" below was written when the consuming surface was assumed to be the apps,
> where a token always exists. The deals rail renders on public WEB pages for visitors who
> have not signed up — the browse-before-joining funnel — and a web visitor has no token to
> present; a shared "public token" in page source would be authentication theater. What the
> endpoint serves is only what an admin explicitly approved for publication, and the
> sensitive exclusions below are enforced by a source-pin TEST in the feed controller
> (never touches `users`/`users_roles`, never names a contact column), not by promise.
> Owner, verbatim: *"Not worried about the public abuse risks yet. We can harden security
> later."* Hardening path if abuse appears: one auth-middleware line + LB rate limiting.
> **Do not "fix" the endpoint back to authenticated from this doc's old wording.**

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

> **AMENDMENT 2026-08-24 — the feed carries `provider_tier`, and the source-pin claim above
> needed correcting.** Owner-directed, after the first real provider deal (DL-0012) went live.
>
> **What was wrong.** The consumer card template read `m.tier || 'Gopher Elite'`. The feed had
> never carried a tier, so that fallback fired on **every** live provider deal: DL-0012 rendered
> as *Gopher Elite* on both consumer surfaces, a credential nobody verified for that provider.
> It was invisible until real deals existed, because every demo card sets its own tier. The
> literal appeared at **five** sites per page, not the two a `deal-tier` search finds — two of
> them wrote the invented tier into `payload.providerTier` and on into the accepted-provider
> card, so it outlived the deal card it came from.
>
> **What the feed now sends.** `provider_tier` — `'Elite'` / `'Elite+'`, or absent. The pages map
> it to their display vocabulary (`Gopher Elite+`) in the shared module, and render **no badge**
> when it is absent. Missing data must look missing.
>
> **Resolved LIVE, never from `deals.eligibility_tier`.** The snapshot column exists and would
> have saved a query, but it is captured at submit and a deal stays live for months — publishing
> it would advertise Elite+ for someone who has since dropped to Elite. This mirrors the rule
> already in force for a provider's image (`resolveProviderPics`), where a stored value does not
> go stale, it 404s. `eligibility_*` stays what it says it is: reviewer-side evidence.
>
> **Tier only.** `eligibility_service_jobs` and `eligibility_service_rating` remain private
> pending an explicit owner ruling — a rating shown to a browsing stranger is an
> INV-RATING-adjacent decision, not a payload that quietly grows. ⚠️ Note this is also the gap
> behind the launch-marketing line *"we promote your performance history"*: the feed carries no
> job count or rating today, so nothing on a card substantiates that promise.
>
> **⚠️ The source-pin sentence above ("never touches `users`/`users_roles`") was ALREADY FALSE
> when it was written into this doc, and the test that "enforced" it could not see the
> violation.** It grepped only the CONTROLLER file, while `resolveProviderPics` reads `users`,
> `users_infos` and `images` from a **helper** — invisible to that grep. The tier read would have
> slipped through the same blind spot. The test now states what the feed actually does and applies
> the check that carries the risk — **no personal detail in a storefront payload, and the person
> is looked up by numeric id only** — across the whole helper chain. Do not restore the
> single-table wording; it describes a feed that no longer exists.

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

> ⚠️ **This section is about DEALS categories only.** The SERVICE categories a customer picks
> when placing a request — and a worker picks in Go work settings — are a different list
> entirely, and crossing the two is a real failure mode. They are recorded in
> **`canonical-service-categories.md`**, which exists because three separate wrong service
> lists reached real work before anyone noticed. Do not derive either taxonomy by grepping
> code.

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
`paused` from `advertiserDeals.js`); recorded here because the handoff docs point the dev at the
wrong file. **CORRECTED 2026-08-06** — and it was **three** docs, not two: `G40-deals-initiative-orientation.md` (×2), `G40-286-deals-frontend-consolidated-handoff.md` (×2), and `gopher-deals-pathway.md` + its `.html` twin, which this finding originally missed. All now carry a dated correction pointing at `deals-merchants.js` and §4.1/§5.1/§7.

**A fourth doc — RESOLVED 2026-08-06 (owner).** `G40-180-admin-advertising-partner-entry.md` is
marked **"Built + verified"** and describes an **Advertising** section in the HQ Dashboard (nav entry,
routing, compiled output, click tracking, CSV export). The owner confirms the work *"has been
started"* — and the ambiguity turned out to be **in the document, not the history**:

- Its **"Scaffold: `advertiserDeals.js` … tested"** line is **accurate.** The file exists at
  `Documentation/Jira Tickets/advertiserDeals.js` — 44 lines, `createAdDeal` / `isDealLive` /
  `liveHomeDeals` / `trackClick` / `toCsv`, `AD_STATUS {active,paused}`, `CSV_COLUMNS`. **That is the
  started work.**
- Its **"Status: Built + verified"** and the **"What was built — Gopher HQ Dashboard"** section are
  **not.** Absent from `app_part*.js`, from `VIEWS`, from every Dashboard `.js`, from the built
  `output/Gopher_HQ_Dashboard.html`, from all Dashboard branches, and from that repo's history.

**So the engine is written and tested; the Dashboard surface that would use it is not built.** That
doc now carries the split, and everything below its "What was built" heading is marked **intended
design, not shipped code**. It remains no evidence that admin deal-review, click tracking or CSV
export exist today — the wired module is `deals-merchants.js`, which has none of them.

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

> **✅ The false claim is FIXED (2026-08-10, commit `1476b15`); the transport is still absent.**
> The form now says submissions aren't switched on yet — **before** the worker composes the deal
> as well as after — and `gopher-go-101.html` #offer-deals carries a matching note, since it
> described the same flow as working. **The underlying defect stands: `gopher-go.html` still makes
> zero `fetch` calls.** This was an interim honesty fix, not the wiring.
>
> ⚠️ **All three strings are marked in-code for REMOVAL by the commit that adds the deal POST.**
> Leaving them in place would make the product and its guide wrong in the other direction — a
> live feature advertised as switched off. Grep `switched on yet` across `Final/` before closing
> the wiring work.

### 9.13 The two Service-Provider surfaces produce no linked record

The public funnel (`gopher-deals.html`, `submitForm('worker')`) writes a `worker` row to the Apps
Script lead sheet carrying **`gopher_id`**. The in-app submission (`gopher-go.html`) writes nowhere
(§9.12). So a provider who completes both leaves two unconnected traces, and **`gopher_id` — the
obvious join key, collected precisely so the backend can verify tier/jobs/rating — is consumed by
nothing.** The union record in §4.1 is where these must converge.

### 9.14 SP eligibility — ✅ **BACKEND RESOLVED 2026-08-10.** The front end still doesn't read it

> ## ⚠️ CORRECTED 2026-08-10 — the heading below said "enforced nowhere". That is no longer true, and leaving it would have someone rebuild what exists.
>
> **Verified first-hand against production today**, not inherited:
>
> - **`GET /api/v1/users/deals/eligibility` is LIVE.** It returns **440** on
>   `https://api.gophergo.io`, while a bogus sibling (`/api/v1/users/deals/nonexistent-xyz`)
>   returns **404** — so 440 means *the route exists and wants auth*, not *no such route*.
>   Registered at `controllers/user/index.js:487`.
> - **Eligibility is enforced at submit, server-side.** `controllers/user/deals.js` computes it
>   live for `track:'dlp'` and refuses the write when it fails — it is not advisory.
> - **The verdict is snapshotted onto the row** (`eligibility_tier`, `eligibility_service_jobs`,
>   `eligibility_service_rating`, `eligibility_checked_at`), so a disputed verdict is answerable
>   after the fact rather than recomputed against changed data.
> - **The rule lives in `helpers/sp_eligibility.js`**, in the path a worker actually walks —
>   `regen_sp_eligibility.py` is no longer the only implementation.
>
> **What is NOT verified:** I did not authenticate and read a verdict body. Route existence and
> enforcement were confirmed from the live 440/404 pair plus source on `origin/production`.
>
> **What remains true, and is now the whole of this drift:** the front end does not read any of
> it. `Final/gopher-go.html` still hardcodes `var ELIGIBLE = true;` with a demo toggle and makes
> **zero `fetch` calls of any kind** — so the gate on screen is still presentation. ⛔ **The
> blocker is not the eligibility feed; it is that the Go dashboard has no authentication at
> all.** Its sign-in and OTP screens are a complete interface that calls nothing, and both deals
> endpoints require an `access-token` — which arrives in the **response HEADER, not the body**
> (§3.2d). Anyone scoping this as "wire two fetches" is wrong: real sign-in comes first.

The public funnel promises *"we'll email you with eligibility terms and next steps"*, implying a
tier/jobs/rating lookup. ~~No lookup exists.~~ **A lookup now exists server-side (see the box
above); the funnel is still not wired to it.** The in-app gate that would enforce it is a hardcoded
`var ELIGIBLE = true;` with a demo toggle (`gopher-go.html`).

The **only** real implementation of the amended bar is `regen_sp_eligibility.py` in the HQ Dashboard
— but it lives in the analytics tool, not in the path a worker walks. Production computes this
server-side and both surfaces read it. ⚠️ **Amended 2026-08-09 — this line previously called that
implementation "correct, and validated on live data (13 auto-eligible)."** Its category derivation
discarded **13.2% of completed service work** (a `' - '` head-split dropped `Other - <real
category>`, and free-text service titles had no vocabulary), so **13 was a floor; it is now 14**.
Fixed and re-baked; build production against the orders table's real `category_type` column rather
than any title heuristic. Detail: `sp-deal-pipeline.md` §1.

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

### 9.17 The mobile-pickup flag is named differently either side of the seam — and it made a built feature look missing

**The flag itself is not drifted. The NAME is, and that is enough to cause a false negative that
nearly produced a re-implementation of working code.**

| Side | Field | Shape |
|---|---|---|
| Merchant portal | `r.loc.mobileAddress` | per **location**, hydrated `gopher-deals.html:6168`, written back by `applyMobileAddr()` |
| Consumer surfaces | `m.mobile` | per **deal record** in `DEALS_DATA`, `gopher-request.html` + `gopher-connect.html` |

**⭐ The behaviour it gates is BUILT, in both consumer apps, and was built before this was written.**
Verified 2026-08-10:

- `gopher-request.html:24800` — `pickF.hidden = !(!isService && m.mobile)`; `:24801` clears the field
  on every open so it cannot be pre-populated; `:24879` —
  `const pick = m.mobile ? [customer-entered] : (m.address || '')`.
- `gopher-connect.html:15098` / `:15325` — **identical logic**, so the mirror rule was already honoured.
- The requirement is stated in a comment above the data at `gopher-request.html:23954`: *"`mobile:true`
  merchants (food trucks) have no fixed pickup, so the instant popup asks for a pickup address; fixed
  merchants auto-fill it from `address`."*
- Demo records with `mobile:true` carry **`address: null`**, so there is no merchant address available
  to leak into the pickup even by accident.

So the merchant-facing promise at `gopher-deals.html:2851` / `:5255` — *"we won't pre-fill this address
as the pickup"* — **is true today on both consumer surfaces.**

**⚠️ What IS unbuilt is the plumbing, not the branch.** The two sides sit on unconnected hardcoded
arrays; nothing carries `mobileAddress` from the location record into `mobile` on a deal. That is the
shared-feed seam (**§7.2**, **G40-286**), and **reconciling these two names is a concrete requirement
of it** — a feed that emits `mobileAddress` to a consumer reading `mobile` produces a silent
`undefined`, which is falsy, which means **every food truck would be treated as fixed** and Gophers
dispatched to an address the truck is not at. It fails in the dangerous direction.

**⛔ The method lesson, which cost time twice in one day.** G40-292 was reopened on the finding that
`gopher-request.html` had *"zero references to a mobile address — no branch to take."* That was a
**grep for the portal's field name against the consumer's code.** The same shape produced a false
"not deployed" reading against `origin/main` earlier the same day. **This codebase deliberately uses
different names either side of a seam, so absence of a term is not absence of the behaviour.** Search
for the behaviour — the field the consumer reads, the element it toggles — before concluding something
is unbuilt, and say which term you searched when reporting a negative.

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
3. ✅ **Registration transport — DONE 2026-08-10 for the merchant path** (§3.2e), live on all three
   hosts, localStorage fallback kept. **Still open:** the **worker/SP** form remains on the Apps
   Script by design, so the script **cannot yet be deleted** (**SP-PIPE** §6). Deleting it is gated
   on retiring or repointing that funnel — a separate decision, not a leftover task.
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
