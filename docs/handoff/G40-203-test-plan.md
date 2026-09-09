# G40-203 — test plan

## The point of this ordering

The five `/recovery/*` endpoints are **live on production and have never been called by a real
client** — nothing could reach them until now. That is the genuine unknown in this ticket, and
it does **not** need a store build to test.

So: **prove the backend first, by hand, today.** Then the app release only has to prove that two
links navigate — which is a much smaller thing to discover a problem in, and a much cheaper one
to fix if it goes wrong.

⚠️ **Everything in Phase 1 writes to PRODUCTION on a real account.** Use an account you own and
are happy to move. It ends with that account signed out on every device and its phone number
changed. **Never use a real person's number**, and the destination number must not already be on
a Gopher account or the flow refuses it (correctly).

⚠️ I have not run any of Phase 1. Probing that a route exists is safe and I did that; executing
the flow changes a live row, which is yours.

---

## Phase 0 — the baseline, before anything

**Count `recovery_attempts`.** Expected: **0 rows, ever.** That is the direct confirmation that
nothing has run this flow, and it is the number that later tells you whether the ticket works.

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE decoy = false) AS real_attempts,
       count(*) FILTER (WHERE stage = 'done') AS completed
FROM recovery_attempts;
```

Needs the production DB, which is SG-to-SG only since G40-409 — tunnel from a Gopher-Production
instance. **If this returns anything other than 0, stop and tell me** — it would mean something
has been calling these endpoints and my "never run" premise is wrong.

---

## Phase 1 — prove the five endpoints, no build required

Set up two things you can watch: **the email inbox on the test account**, and **a phone that can
receive SMS at the number you are moving to**.

```bash
API=https://api.gophergo.io/api/v1
OLD=9195550111      # the number on the test account, 10 digits
NEW=9195550222      # the number you are moving to — must be on NO account
```

### 1 · start — a code to the email ON FILE

```bash
curl -s -X POST "$API/recovery/start" -H 'Content-Type: application/json' \
  -d "{\"telephone\":\"$OLD\"}"
```

**Expect:** `{"success":true,"recovery_token":"…","message":"If that number belongs to a Gopher account, a code is on its way to the email on file."}`

**Then check the inbox.** Subject: **"Your Gopher account recovery code"**. This is the first
real send of SendGrid template 39.

- ⚠️ **That message is identical for a number with no account.** It is not confirmation your
  account was found — only the email arriving is. If no email comes, that is the finding.
- Save the token: `TOKEN=…`

### 2 · verify_email

```bash
curl -s -X POST "$API/recovery/verify_email" -H 'Content-Type: application/json' \
  -d "{\"recovery_token\":\"$TOKEN\",\"code\":\"123456\"}"
```

**Expect:** `{"success":true,"next":"identity"}`

**Worth doing once with a WRONG code first** — expect `That code didn't match or has expired.`
You get 5 tries before the attempt dies.

### 3 · verify_identity — the DOB on the account

```bash
curl -s -X POST "$API/recovery/verify_identity" -H 'Content-Type: application/json' \
  -d "{\"recovery_token\":\"$TOKEN\",\"date_of_birth\":\"04/12/1991\"}"
```

**Expect:** `{"success":true,"next":"new_number"}` · accepts `MM/DD/YYYY` or `YYYY-MM-DD` · 3 tries.

### 4 · new_number — an SMS to the number you are moving to

```bash
curl -s -X POST "$API/recovery/new_number" -H 'Content-Type: application/json' \
  -d "{\"recovery_token\":\"$TOKEN\",\"new_telephone\":\"$NEW\"}"
```

**Expect:** `{"success":true,"next":"confirm"}` and **a text on the new handset**:
*"Gopher account recovery code: NNNNNN…"*

**Worth testing the guard:** send a number that IS on an account — expect
`That number is already on a Gopher account.` and **no SMS**.

### 5 · confirm — the only write

```bash
curl -s -X POST "$API/recovery/confirm" -H 'Content-Type: application/json' \
  -d "{\"recovery_token\":\"$TOKEN\",\"code\":\"654321\"}"
```

**Expect:** `{"success":true,"message":"Your sign-in number is updated. Sign in with your new number now."}`

**Then verify all four side effects — this is the part that has never happened:**

| # | Check | Where |
|---|---|---|
| 1 | `users.telephone` is now the new number | DB, or sign in with it |
| 2 | Email **"Your Gopher sign-in number was changed"** arrives | inbox — template 40, first ever send |
| 3 | SMS to the **OLD** number: *"Your Gopher sign-in number was just changed via account recovery…"* | old handset |
| 4 | ⛔ **The account is signed out on a PHONE** | see below |

### The check that matters most — #4

This is the one that was broken and is the reason for MR !539. **Before** running the flow, have
the test account **signed in on a real handset** with the app open. **After** `confirm`, pull to
refresh or open any screen that calls the API.

- **Expected:** the app kicks you to sign-in (a 440).
- **If it keeps working:** `sessions_invalidated_at` is not doing its job — that is a real finding
  and the backend should not be considered proven.

⚠️ **Only true once !539 is merged and deployed.** Run this check *after* the deploy, or you will
be testing the old behaviour and it will "fail" correctly.

### Stripe stays attached

Open the test account's payment or payout screen after the change. Cards and payout account should
be exactly as before — they hang off `users.stripe_id`, not the phone number.

---

## Phase 2 — the app entry points, after a build

Only after Phase 1 passes. This proves navigation, not the flow.

1. **Sign-in screen** — *"Lost access to this number?"* under **Send verification code**. Tapping
   it opens the recovery screen with the number you typed carried across.
2. **OTP screen** — enter a number, tap Send, wait out the 60s, tap **Resend**, wait again. Once a
   resend has happened, *"Lost access to this number?"* appears. **It should NOT be there before
   the resend** — that is deliberate.
3. **Support fallbacks** — *"Still can't get in? Contact support"* under the sign-in link, and
   *"No longer use that email address?"* on the email-code step. Both should be visible to
   everyone, always.
4. **Both apps, iOS and Android.**

---

## What would make me say "stop, don't ship"

- No recovery email arrives at step 1 (template 39 never sent for real).
- The old number gets no SMS at step 5 — that is the security notice.
- The handset keeps working after `confirm` — the revocation is not reaching mobile.
- A number already on an account is accepted at step 4.

Anything else is a defect to log, not a stop.
