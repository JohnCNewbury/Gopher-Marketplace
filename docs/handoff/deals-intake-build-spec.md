# Gopher Deals — merchant & service-provider intake: build spec

**Status:** awaiting owner approval. No intake code written yet.
**Owner ruling:** John Newbury, 2026-08-09 — *"build the intake endpoint."*
**Schema:** already built and reviewed — `502cd3d2`, branch `feat/deals-schema`.
**Companion spec:** `deals-registration-to-publication-config.md` (§2.1, §3.2, §4.1) — that
document is the contract; this one describes the build against it.

---

## 0. The thing most likely to be misunderstood

**This is a user intake that carries a deal. It is not a lead form that writes a row.**

I got this wrong first time and it changed the whole design, so it is stated first. The form's own
copy says it plainly:

> *"This is the standard Personal Info for every Gopher account — it sets up your owner login.
> (You'll add a profile photo the first time you sign in.)"*

Owner, 2026-08-09:

> *"THIS IS A POTENTIAL ACCOUNT CREATION… This registration link can be viewed just as much as a
> new user lead intake as it is a merchant registration."*

**Consequences that follow from that one fact:**

- Submitting creates or links a **real Gopher user**, at submit time — not at approval.
- A **rejected deal still leaves a real, marketable Requester** who enters the ordinary Request
  pipeline. Nothing is lost when a deal is declined.
- Intake therefore cannot be a standalone insert. It has to ride the existing signup path.

---

## 1. Scope

**In scope**
- The public intake endpoint
- Creating or linking the Gopher user
- The email OTP step that does not exist today
- Writing the `deals` record
- Approval-time tagging and the two export columns

**Out of scope, deliberately**
- Publication, the bid board, redemption — **not part of THIS build, not cancelled.** The bid
  board is settled (companion spec §8, Ruling 7) and has live tickets G40-355 and G40-357. Owner
  confirmed 2026-08-09 that "out of scope" here means sequencing only.
- The `gopher-deals.html` repoint and the three-host cutover — owned by the Gopher Deals session
- Deleting the Apps Script — last step of the cutover, after leads are confirmed arriving
- Any change to how phone uniqueness is enforced — **separate ticket, owned personally by John**
  (see §6)

---

## 2. The two paths

The form's **"I'm already a Gopher user"** checkbox chooses the path.

### Path A — box ticked (existing user)

- Only the phone number is collected. Email, name, DOB and address are disabled in the form.
- Phone OTP → on success, the account's details populate the form.
- **Links** to the existing `user_id`. Creates nothing.
- **No collision is possible by design** — the user has asserted who they are and proven it.

### Path B — box unticked (new user)

Collects the standard Personal Info set: first name, last name, DOB, phone, email, address,
and `discover_gopher` ("How did you discover Gopher?").

1. **Phone OTP** — exists today; the form already sets `phone_verified`.
2. **Email OTP** — ⚠️ **does not exist today. This is the gap.** Owner: it is
   *"the piece missing before the registration process continues to actually reviewing the screens
   we've made."*
3. On both verifying: **create a real Gopher user, Requester role (3)**, in the ordinary signup
   state. Not a special Deals user — an ordinary Requester who happens to have arrived this way.

### Path B, collision branch

The box is unticked, but the phone and/or email already belongs to an account.

- Show a confirmation prompt — *"It looks like you already have a Gopher account. Is this you?"*
- On confirm → issue OTP → on success the existing details populate → **the flow becomes Path A**.
- **Never create a second account.**
- Nothing about the matched account is revealed before the OTP succeeds. The prompt must not
  disclose the name, email or any detail of the account it matched — otherwise the endpoint becomes
  an account-enumeration oracle on a public URL.

---

## 3. The deal record

One row in `deals`, `status: 'pending'`, `owner_user_id` set to the user from §2.

The user and the deal are independent from this point. See `deals-registration-to-publication-config.md`
§4.1 for the field list and §5.1 for the status vocabulary.

**Validation at intake** — these are application-level, not database constraints, and the reasons
are recorded in `config/db.config.js`:

| Rule | Why |
|---|---|
| **Reject unknown fields** | The Apps Script absorbed whatever it was sent and permanently grew five junk columns. An allowlist, and a 4xx on anything outside it. Do not absorb. |
| `keywords` ≤ 3 | It is the customer search index (§4.1). Must not become "whatever the client sent". |
| `category` ∈ the four registerable values | `restaurants`, `favorites`, `age`, `retail`. `providers` is publication-only — never registerable here (§9.1). |
| **`normal_price` >= `customer_price`** (DLP) | Owner ruling 2026-08-05, **clarified 2026-08-09: equal to OR greater than** the boosted price the customer is shown — not strictly greater. The Deal Boost sits *on top of* the earn while the customer compares against the *boosted* price, so `earn 100 / normal 100 / customer pays 110` passes a naive check and ships a markup wearing a discount label. At equality the card's strike-through correctly does not render — there is no saving to show. |
| `age` is never accepted as an input | It derives from `category`. A second source of truth on whether a 21+ ID check is required fails silently: the check simply does not happen. |

---

## 4. Service providers

**SPs never create a user.** They submit from the Go app, so they are already a Gopher with a worker
role. Intake links only.

Eligibility is checked **live at submit** — a worker can qualify at page load and lapse before
submitting, so the submit-time verdict is authoritative. The verdict and its inputs are captured on
the deal row (`eligibility_tier`, `eligibility_service_jobs`, `eligibility_service_rating`,
`eligibility_checked_at`) so a later dispute is answerable. Null for merchants.

The bar itself is settled and must not be re-derived here — Elite/Elite+/Pro · 20+ completed
**service** jobs · 4.75★ over the last 20 **service** jobs, with Delivery/Ride/Other excluded from
both (§2.3). **The backend owns the rule; every caller asks it.** See §7.

---

## 5. Approval, tagging and the export

**Tagging happens on approval, never at submit.** Until HQ approves, the user is an ordinary
Requester. Owner: *"ONCE the Deal is approved in HQ, that Requester's User details would represent a
Deal Owner. Not before approved however."*

Two columns on the Dashboard's exportable User report:

| Column | Values | Written |
|---|---|---|
| `Deals` | `Merchant` / `Service Provider` | On HQ approval |
| `Deal status` | `active` / `inactive` | Follows the deal's current state |

The second column exists because **the user outlives the deal.** A merchant whose deal has expired
is still a Deal Owner in the export, with an inactive deal.

---

## 6. ⛔ Dependency — phone uniqueness

**The collision branch in §2 assumes a phone number resolves to at most one account. It currently
does not.**

`users.telephone` carries no uniqueness constraint, and authentication resolves accounts by phone
with no ordering. Measured 2026-08-08: **775 numbers carry more than one account**; **6** have a
live account sharing with a dead one; **4** of those currently resolve to the dead account — real
lockouts, all dormant since 2019–2022.

**Owner standing rule, 2026-08-09:** *"100% of the user accounts have a unique number, there should
be NO duplicates"* — explicitly including admin-created accounts.

**John owns this personally, as its own ticket and session, and wants it decided and corrected
before anything ships that could disrupt a user caught in a collision.**

**Gate (owner, 2026-08-09): confirm with the Total SOW Priorities session before green-lighting
the collision branch.** It is not enough that the cleanup ticket has closed — that session tracks
platform-wide identity work and must sign off.

So: the intake build proceeds, and **the collision branch is written but must not go live ahead of
that outcome.** Sequencing there cannot be reordered — stop new duplicates in code → clean the 775 →
then constrain.

---

## 7. Endpoints — what is new and what already exists

**Reuse, do not reinvent:**

| Need | Use |
|---|---|
| Phone OTP send/verify | The existing SMS OTP path |
| Email OTP send/verify | `POST /users/email_otp/send` and `/verify` — **the endpoints fixed on 2026-08-08** (`796f0e8e`), which now let a confirmed account re-request a code. Do not build a second email-OTP mechanism. |
| User creation | The existing signup path, so a Deals user is indistinguishable from any other Requester |
| Eligibility | One backend endpoint returning **the verdict *and its inputs*** — tier, service-job count, last-20 service rating. Not a boolean: HQ renders near-miss (10–19 jobs) and the filtered-by-amendment view, and if it only receives a boolean it must re-derive the counts, which means re-implementing the bar. Needs **both** a single-worker check (the submit gate) and a bulk read (the nightly bake over ~2,042 workers). |

**Genuinely new:**
- The public intake endpoint
- The **email OTP step in the registration flow** — front-end and wiring; the endpoints exist

---

## 8. Abuse controls

The intake endpoint is **the only genuinely public, unauthenticated surface in the Deals pipeline**.
It writes to the database. That combination deserves more care than the rest of the build put
together.

- **Rate limit per IP and per phone.** The platform's only current limit is 30 requests/second per
  IP — far too loose for this, and already observed producing a dead-end *"Failed to load
  configuration"* screen on a real device rather than a usable message.
- **Allowlist validation**, rejecting unknown fields (§3).
- **No enumeration.** Reveal nothing about a matched account before its OTP succeeds.
- **`submitted_ip` is retained 90 days, then nulled.** It is personal data. The purge job does not
  exist yet and needs writing.
- **Email is sent via the G40-305 dispatcher (`sendEmail.js`), never by this endpoint directly and
  never by the Apps Script** — which runs as a personal Gmail account and would make a public URL an
  open relay if it mailed whatever address arrived in the POST body.

### 8.1 The three emails (owner, 2026-08-09)

| When | Email |
|---|---|
| New user **fully verified** (phone + email OTP both passed) | Standard **welcome to Gopher Request** — the same one any new Requester gets |
| **Deal submitted** | **Pending deal** — confirms it is in review. Must state the **5 business day** activation SLA, never 1 |
| **Deal approved** in HQ | **Your deal is live** |

The first fires on the *user* becoming real, the other two on the *deal* changing state — which is
the same user/deal independence as everywhere else. A Path A merchant (existing user) gets only the
second and third; they are already a Requester and have had their welcome long ago.

---

## 9. Build order

1. Sequelize model for `deals` *(written, uncommitted)*
2. Public intake endpoint — Path A and Path B, validation, rate limiting
3. Email OTP step wired into the registration flow *(the gap John identified)*
4. Eligibility endpoint — single-worker and bulk
5. HQ review surface — the shared queue, approve/reject per §6 of the companion spec
6. Approval-time tagging and the two export columns
7. **Then**, and only then: front-end repoint, three-host cutover, Apps Script deletion

Steps 2 and 3 together are what let a real merchant register without touching Google. Step 7 is what
lets the Apps Script be deleted, and it is owned by the Gopher Deals session.

### 9.1 The deal image (owner, 2026-08-09)

**The Apps Script never carried a picture. This intake does, and it is a UX risk, not a plumbing
detail.** A merchant uploads whatever their phone produces — a 12 MP portrait, a screenshot, a logo
with transparency — and it lands on a card with a fixed aspect ratio on every consumer surface.

Handled at intake, not at render, so a bad asset never reaches production:

- **Normalise on upload** — resize to the card's dimensions, convert to WebP, cap file size. The
  same treatment the site's other imagery already gets.
- **Reject what cannot be made to work** — wrong aspect beyond a sane crop, unreadable format, or
  an image so small it will pixelate. Tell the merchant at submit, while they can fix it.
- **The review surface must show the deal image as the customer will see it**, cropped to the real
  card, not as a thumbnail. Approving an image you have only seen small is how a broken card ships.

`deal_img` and `id_img` already exist on the schema; what does not exist is the pipeline behind
them.

---

## 10. What this does not solve

- **The merchant portal login story.** A merchant now has a real Gopher account, but nothing yet
  routes them into a merchant view on sign-in.
- **The existing 775 duplicate phone numbers** — separate ticket, see §6.
- **The Netlify host.** Owner-action only; no CLI or token exists on this machine. At cutover it is
  an explicit ask-and-wait, and it must not be assumed handled because the other two hosts repoint
  from the same push.
