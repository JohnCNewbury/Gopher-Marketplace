# Spec — close the read-side user-data exposure (two MRs, one root cause)

**Traced from `gopher-backend-api` `origin/production` `c9c2d168`, 2026-08-25**, in a throwaway
worktree. Supersedes nothing; it is the build plan for findings recorded in
`read-side-authz-audit-2026-08-24.md` and `id-image-retention-findings.md` §4.4.

**Owner decisions this spec implements (2026-08-25):**
- Business credentials and completed-job photos **must not be publicly readable**. ("no")
- S3 access logging on `gopher-test` — **done**, enabled 2026-08-25.

⚠️ **Findings re-verified at `c9c2d168`, not inherited from the audit's `1e6e5c1d`.** All three
IDORs still present: `user_profile` 0 caller comparisons, `view_cog` 0, `view_counter_offer` 1 —
and that one still gates only "mark as viewed".

---

## 0. The root cause, which is one line

```js
// shared/S3.js
upload:      async (key, body, ..., acl = 'public-read')
uploadAsset: async (key, body, contentType, acl = 'public-read')
copy:        async (sourceKey, destinationKey, acl = 'public-read')
```

**Every upload helper defaults to world-readable, and ALL FIVE live call sites rely on the
default — not one passes an explicit ACL.** So nothing was ever *decided* to be public; it is
what happens when the argument is omitted. That is why identity documents (correctly
`ACL: 'private'`, set explicitly in `helpers/trustshield_files.js:138`) are private while business
credentials sitting one prefix away are not.

| Call site | Writes | Should be |
|---|---|---|
| `controllers/user/profile.js:297` | profile picture (`uploads/image/file/`) | public (rendered widely) |
| `controllers/user/profile.js:511` | **business credential** | ⛔ **private** |
| `controllers/user/profile.js:769` | **past-jobs photo** | ⛔ **private** |
| `controllers/user/deals.js:839` | merchant deal logo | public (public marketing surface) |
| `controllers/order/create.js:585` | order attachment copy | ⛔ **private** (review with owner) |

---

## MR 1 — make credentials and past-job photos private

### 1.1 Order of operations — this is the part that breaks production if reversed

⛔ **CODE FIRST, ACLs SECOND.** The app serves these two prefixes as **unsigned** URLs built by
`helpers/functions.js:90` `generate_image_url()`. Flip the ACLs first and every credential and
past-job image 403s in the live apps before the code that can sign them exists.

1. Add signed-URL serving (§1.2) and deploy it. Old public objects keep working — a signed URL to a
   public object is still valid, so this step is invisible to users.
2. Change the upload default (§1.3) and deploy. New objects land private and are served signed.
3. **Only then** back-fill ACLs on existing objects (§1.4).
4. Then, separately, Block Public Access (§1.5).

### 1.2 Serve them signed
`shared/S3.js:65` already has `getSecureUrl(key, expiresIn = 60)`. ⚠️ **The default is 60 seconds** —
too short for a page the user may sit on. TrustShield uses `URL_TTL_SECONDS` = 3600; match that
rather than the 60-second default, and pass it explicitly so the value is visible at the call site.

The credential/past-jobs keys are built in `controllers/user/profile.js` at **:568, :594, :826,
:852** (write paths) and the delete paths at **:475, :490, :713, :747**. The read path that returns
them to the client is `get_bussiness_docs(id)`, called from `user_profile`. Route that read through
`getSecureUrl` instead of the unsigned pattern.

### 1.3 Flip the default
Change `acl = 'public-read'` → `acl = 'private'` in all three `shared/S3.js` helpers, then pass
`'public-read'` **explicitly** at the two sites that genuinely need it (`profile.js:297`,
`deals.js:839`). ⚠️ **Flipping the default without those two explicit opt-ins takes profile
pictures and every merchant deal logo offline** — the deal logos render on `gopher-deals.html`,
a public marketing page with no session.

### 1.4 Back-fill existing objects
Re-put ACLs to `private` under `uploads/image/user_attachement/business_credential/` and
`.../past_jobs/`. **Not** `uploads/image/file/` or `business_profile/` — those stay public.
Do it after §1.2 is live, and spot-check one object of each type afterwards.

### 1.5 Block Public Access — last, and not a switch
BPA is currently **not configured at all** on `gopher-test`. It cannot simply be turned on:
`uploads/image/file/`, `uploads/image/business_profile/` and `uploads/attachment/file/` are served
unsigned and would break platform-wide. Correct shape is a prefix-scoped bucket policy that keeps
those readable and denies the rest, *then* the BPA settings that do not conflict.

---

## MR 2 — the three read-side IDORs

### 2.1 Fix the projection FIRST — it is the bigger win
All three leak through one helper: `services/users.services.js:30`
`get_users_details(ids, include_address)`, whose field list (`required_user_fields`, :6) is
**`email, first_name, last_name, telephone, date_of_birth, fcm_token, trust_shield_verified,
confirmed_at, created_at`** — plus address when the second arg is true.

**There is no counterparty projection of a user.** Every handler that needs a worker's name and
rating pulls the whole record. So even with authorization perfectly fixed, a requester still
receives their worker's **date of birth and home address** on a legitimate request.

Add `counterparty_user_fields` — id, first name, last initial, profile image, tier, aggregate
rating — and switch §2.2's two order endpoints to it. **This shrinks the blast radius of every
route at once, including any this audit missed.**

⚠️ **`fcm_token` should not be in any user-facing response at all.** It is a push-delivery
credential, not profile data. Remove it from `required_user_fields` and pass it explicitly only
where a notification path needs it.

### 2.2 Then the guards

| Route | Handler | Fix |
|---|---|---|
| `GET /api/v1/users/profile/:id` | `controllers/user/profile.js:62` | Require `+req.params.id === +decoded.id`, or an explicit relationship. Today `decoded` picks `role_id` only. |
| `GET /api/v1/orders/:id/cog` | `controllers/order/cost_adjustment.js:275` | Bind to order participants. **The pattern already exists 140 lines below** in `reject_cog` (:418): `+order.gopher_id === +decodedToken.id && decodedToken.gopher`. |
| `GET /api/v1/orders/:id/counter_offer` | `controllers/order/counter_offer.js:231` | ⚠️ **Looks guarded and is not.** It contains `decoded.requestor && +decoded.id === +order.requestor_id` — that gates `set_counter_viewed()` only; the response returns unconditionally below it. **The comparison must gate the RESPONSE.** |

Model the fail-closed shape on `re_schedule.js` `view_reschedule_request`, which already does it
right: `!decoded || (+order.gopher_id !== +decoded.id && +order.requestor_id !== +decoded.id)`.

### 2.3 Extend the guard script
`scripts/check-route-authz.js:60` is `const MUTATING = 'post|put|patch|delete'`. **GET is outside
its remit by construction** — that is how the `!367` IDOR passed it, and why the write in
`cost_adjustment.js` was hardened while the read beside it was not. Extend it to GET with an
explicit allowlist for genuinely public reads. Until then, **its green is scoped to writes and the
file header should say so.**

---

## 3. Testing — mutation-prove or it is decorative

Every test here must be **shown to FAIL before the fix**, per the standing rule. For the IDORs the
failing assertion is concrete: authenticate as user A, request user B's id, assert **not 200**.

⛔ **Do not mock the handler under test.** The 332-line G40-35 suite passed through a week-long
outage because it stubbed the very function that was broken.

## 4. Not covered

- **Query-string-scoped reads** (`?user_id=`) — only path-parameterised routes were enumerated.
- **The 21 admin GET routes** — the mount is gated (26 of 28 `router.use` carry `verify_auth`; the
  two without are login and a webhook), so handlers were not read individually.
- **Any runtime proof.** Everything here is source reading plus unsigned HTTP requests against S3.
  **No request was made against the API with anyone's token.** A staging repro is the natural next
  step and needs owner authorization.
