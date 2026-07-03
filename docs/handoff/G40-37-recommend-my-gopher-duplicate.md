# G40-37 — Recommend MY Gopher: duplicate inbox entries

**Jira:** G40-37 (Bug, Low) · Components **Gopher App (Requestor)** + **Gopher Go App** · Label `request`
**Assignee:** John Newbury
**Corrected name (John):** this is a **"Recommend MY Gopher"** ticket (not "Refer"). MY Gopher
recommendations **do not expire**; a **declined** recommendation **may be sent again**.
**Surface:** legacy backend `gopher-backend-api`; go-forward front-end recommend surface is a stub (see bottom).
**Scope:** BACKEND fix (referral persistence + inbox). Per `Final/CLAUDE.md`, persistence/matching is
developer-only — no code written here. This is a red-carpet spec with the exact fix already present in a
sibling controller. **No open questions.**

---

## TL;DR

When a customer recommends a MY Gopher to someone, the recommendation can show up in the **referee's
inbox multiple times**. Root cause: the **Recommend MY Gopher** endpoint creates a `refer_favorites`
row **every time with no dedup**, and the referee's inbox renders **one message per row**. The
**identical "already sent" guard already exists** in the sibling generic-referrals endpoint and the
**mobile client already handles the 409** — it was simply never wired into the Recommend-MY-Gopher
path. Bring the guard over (keyed on `refer_favorites` so declined recs can be re-sent) and collapse
existing duplicate rows.

**Answer to "does this logic already exist?" — Partially.** It exists for `POST /referrals`
(`controllers/common/referrals.js`), **not** for `POST /refer-favorite`
(`controllers/common/fav_gopher.js`). The client expects it for both.

---

## Root cause (exact locations)

**1. The referee's inbox = one message per `refer_favorites` row.**
`controllers/user/inbox_message.js:166-169`:
```sql
from refer_favorites rf
join users u ON rf.referrer_id = u.id
LEFT JOIN images i ON rf.referrer_id = CAST(i.imageable_id AS int) AND i.imageable_type='User'
where rf.referred_to_id = :user_id and rf.completed_action is not true and 1 = :conditional
```
So **N rows → N inbox messages.** (Secondary latent risk: the `images` LEFT JOIN fans out a single
referral into multiple inbox rows if a referrer ever has >1 `User` image. Profile-photo updates
delete-then-insert today, so normally 1 image — but the join is not `DISTINCT`, so it's fragile.)

**2. `refer_favorite_gopher` creates a row unconditionally — no dedup.**
`controllers/common/fav_gopher.js` calls `db.referFavorite.create(...)` at **4 sites** with no
"already recommended?" check:
- `:295` — recommend to a **phone** (main ticket path)
- `:383` — recommend to an **email** (main ticket path)
- `:476`, `:496` — `refer_yourself` (worker self-referral; same table/inbox, same duplication risk)

The only guard present (`existance_refferal = db.invites.findOne({ telephone, referrer_id })` at
`:282` / `:371`) protects **only the marketing SMS/email invite for non-app users** — it does **not**
gate `referFavorite.create`, and it never throws. The `refer_favorites` table has **no unique
constraint** (`models/refer_favorite.model.js`), and there is **no dedup branch** in git history.

**3. The fix already exists next door.** `controllers/common/referrals.js:80-84` and `:120-124`
throw `409 "Referrals have already been sent."` when a prior invite exists. The customer mobile app
already catches exactly this: `src/component/referInputMobile.js:96-97` handles
`"This number has already been sent a referral link."` / `"Referrals have already been sent."` and
shows the "already sent" state (`refer_sms_failed`). **The Recommend-MY-Gopher endpoint just never
emits it.**

---

## The fix (backend)

### 1. Add a dedup guard in `fav_gopher.js` before each `referFavorite.create` (`:295`, `:383`, and the `refer_yourself` sites `:476`/`:496`)
Dedup against **`refer_favorites`** (the inbox source), NOT `invites` — because the rule depends on
the recommendation's *status*, which lives on `refer_favorites`:

- Look for an **active** existing recommendation matching **(referrer_id = sender, recipient, and the
  same MY Gopher)** where recipient = `referred_to_id` (app user) or `ref_to_contact` (phone/email),
  and the row is still active: `completed_action IS NOT TRUE` **and** the gopher is **not** in
  `denied_gophers` (i.e., not declined).
- **If an active match exists for a gopher → do not create a second row, do not send inbox/push/socket
  for it.** If *every* selected gopher is already active for that recipient, throw
  `409 "Referrals have already been sent."` (reuse the exact string — the client already handles it).
- **Declined or completed → allowed to re-send** (recs don't expire; a declined gopher is eligible
  again — John confirmed).
- A recommendation can include **multiple gophers**; dedup **per gopher**, submit the genuinely-new
  ones, and only 409 when nothing new remains.

> Note: don't copy the sibling's `numbers.length === 1` limitation from `referrals.js:80` — that lets
> batch sends bypass the guard. Dedup each recipient/gopher independently.

### 2. Make the inbox query duplicate-proof (defense-in-depth)
In `inbox_message.js:166`, guarantee one row per referral: `SELECT DISTINCT ON (rf.id) …` (or collapse
the `images` join to a single image via a correlated subquery / `MAX(i.id)`), so even legacy duplicate
rows or a multi-image referrer can't render the same recommendation twice.

### 3. One-time cleanup of existing duplicates
Migration/script to collapse existing **active** duplicate `refer_favorites` (same
`referrer_id` + recipient + overlapping `referred_gopher_ids`, `completed_action IS NOT TRUE`, not
declined) down to a single row, so currently-affected referees stop seeing multiples.

---

## Acceptance / QA

- Recommend the same MY Gopher to the same person twice → referee's inbox shows it **once**; the second
  send returns `409 "Referrals have already been sent."` and the app shows the "already sent" alert.
- Recommend **Gopher A + Gopher B**, where only A was already sent to that person → **B is submitted**,
  A is skipped; no duplicate A in the inbox.
- Referee **declines** a recommendation → the customer **can send it again**, and it reappears (recs
  don't expire).
- Existing affected referees: after the cleanup migration, duplicate inbox entries collapse to one.
- Regression: generic `POST /referrals` behavior unchanged; `refer_yourself` no longer duplicates.

---

## Front-end status (go-forward) — NOT built; spec for the dev

The Recommend-MY-Gopher surface is **prototype-stub** in the new build:
- **Connect** (`Final/gopher-connect.html:7685+`) has a "Recommend MY Gopher" modal, but the SMS/Email
  step (`:17953-17965`) never collects a recipient and pushes straight to a demo array — **no dedup**.
- **Request** (`Final/gopher-request.html`) has **no** recommend-a-favorite surface yet.
- **Go** (`Final/gopher-go.html:2747+`) has Refer & Earn tiles that only `showToast` (`:3417`).

When the real surface is built, on a `409 "Referrals have already been sent."` it must show the
**standard "already sent" alert** and block that send (the old app did this via `refer_sms_failed`).
Everything the front end needs is the 409 contract above.
