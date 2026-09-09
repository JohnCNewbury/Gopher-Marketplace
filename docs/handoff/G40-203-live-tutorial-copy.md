# G40-203 — copy for the two LIVE tutorial pages

**Target pages (Elementor, gophergo.io — not in git):**

| Page | Title |
|---|---|
| `gophergo.io/become-a-gopher/gopher-go-support/` | Gopher Go Tutorial |
| `gophergo.io/hire-a-gopher/gopher-request-support/` | Gopher Request Tutorial |

> ## ⛔ DO NOT PUBLISH UNTIL THE STORE BUILD SHIPS
>
> Every word below describes a screen that does not exist in the live apps yet. The guide
> describes what the product does, not what it will do. Publish when *Lost access to this
> number?* is actually on the sign-in screen in the released build — not when the branch
> merges, not when the backend deploys.
>
> **The one exception is the DELETION in §1 of each page.** That sentence is false the moment
> the build ships, and it is currently steering people wrong — see below.

---

## 1 · The correction — both pages, in Personal Info › Helpful Tips

Both pages currently say, word for word:

> *Your name, birthday and phone number can't be changed once submitted so please double check
> before saving.*

**Replace with:**

> Your name and birthday can't be changed once submitted, so please double check before saving.
> Your email, physical address and bio can be updated at any time — and if your **phone number**
> changes, you can move your sign-in yourself (see *Lost access to your number?* below).

### Gopher Request page only — a second sentence to replace

It currently reads:

> *If after singing up, your name and/or number change, please email support@gophergo.io or use
> the contact us feature in the app and/or website.*

⚠️ Two problems: it sends every number change to support, which is the burden this removes —
and **"singing up" is a typo that is live on the page today.** Replace with:

> If your **name** changes after signing up, email support@gophergo.io or use the Contact Us
> feature in the app or on the website. If your **phone number** changes, you can move your
> sign-in yourself — see *Lost access to your number?* below.

---

## 2 · New section — GOPHER GO page

Suggested placement: immediately after **Personal Info**, before *Ride Sharing & Business Info*.

### Lost access to your number?

Your mobile number is how you sign in, so if you change numbers — or lose the phone — you can
move your sign-in over yourself. You don't need to call anyone, and **you don't need to create
a second account.**

⚠️ **Please don't sign up again.** A new account starts empty: your completed jobs, your
ratings, your Pro status and your payout account all stay behind on the old one, and we can't
move them across afterwards.

On the sign-in screen, tap **Lost access to this number?** — it's just below *Send verification
code*. It also appears on the code screen if a code doesn't turn up.

**Helpful Tips:**

- We'll email a **6-digit code to the email address already on your account**. You don't type
  your email in — we send it to the one on file, which is what keeps someone else from pointing
  your account at their phone.
- Next we'll ask for the **date of birth on your account**.
- Then enter your **new number** and we'll text that a code to prove it's yours.
- Codes last **10 minutes**.
- Once it's done, **everything comes with you** — your job history, your ratings, your tier and
  your Stripe payout account. Nothing needs setting up again.
- For your security we'll **sign you out on every device** and text your old number to say the
  change happened. Just sign back in with your new number.

**No longer use that email address?** Then we can't send you the code, and that's the one case
this can't solve on its own — email **support@gophergo.io** and we'll get you back in. Adding a
current email now, while you can still sign in, is the best five seconds you'll spend today.

---

## 3 · New section — GOPHER REQUEST page

Suggested placement: immediately after **Personal Info**, before *Payment Account*.

### Lost access to your number?

Your mobile number is how you sign in, so if you change numbers — or lose the phone — you can
move your sign-in over yourself. No need to email us, and **no need to start a new account.**

⚠️ **Please don't sign up again.** A new account starts empty: your Request History, your saved
payment methods and your favourite Gophers all stay behind on the old one.

On the sign-in screen, tap **Lost access to this number?** — it's just below *Send verification
code*. It also appears on the code screen if a code doesn't turn up.

**Helpful Tips:**

- We'll email a **6-digit code to the email address already on your account**. You don't type
  your email in — we send it to the one on file, which is what stops someone else pointing your
  account at their phone.
- Next we'll ask for the **date of birth on your account**.
- Then enter your **new number** and we'll text that a code to prove it's yours.
- Codes last **10 minutes**.
- Once it's done, **everything comes with you** — your Request History and your saved payment
  methods are exactly where you left them.
- For your security we'll **sign you out on every device** and text your old number to say the
  change happened. Just sign back in with your new number.

**No longer use that email address?** Then we can't send you the code — email
**support@gophergo.io** and we'll sort it out. Better still, check the email on your account is
current while you can still sign in.

---

## Notes for whoever publishes this

- **Tier wording is Pro / Pro+ on these pages.** They serve today's users. Elite / Elite+ is the
  unlaunched marketplace only — using it here describes a tier that does not exist to people
  signing up today.
- **"Request History" is correct here**, not "Previous requests". The latter is launch-products
  wording; the live app's screen is titled Request History.
- **Requester ends in `-er`.**
- **The limits are real and worth not overstating:** 10-minute codes, 3 recovery starts per hour
  per number, 5 tries at the email code, 3 at the date of birth, 5 at the SMS code, and 3 SMS
  sends. The copy above mentions only the 10 minutes deliberately — the rest are anti-abuse caps
  a legitimate user will never reach, and listing them reads as a warning to someone who is
  already locked out and anxious.
- **There is no resend button** in this flow, by design. If a code doesn't arrive the user starts
  again from the sign-in screen. Don't write copy promising a resend.
- **Two other surfaces carry the same tutorial content** and will drift once this is published:
  the in-app **Help Center** (under *More Stuff*) and the **YouTube** walkthroughs, both
  referenced at the top of these pages. Worth a note for whoever owns them.
