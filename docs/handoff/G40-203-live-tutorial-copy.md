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

---

## ✅ Placement, verified against the LIVE pages — 2026-09-10

Both pages were fetched and their heading trees read, so the placements below are
against what is actually published today, not against a remembered structure. Every
sentence marked for replacement was found **word for word**, including the typo.

### Gopher Go Tutorial — `gophergo.io/become-a-gopher/gopher-go-support/`

Live heading order around the insertion point:

```
h2  Welcome to Gopher Go!
h2  Complete your profile.
    h3  Personal Info
        h4  Helpful Tips:          ← §1 correction goes INSIDE this list
h2  Ride Sharing & Business Info (Optional)      ← §2 new section goes ABOVE this
h2  Payout Account
```

- **§1 (correction).** Inside *Personal Info → Helpful Tips*. The live sentence is:
  *"Your name, birthday and phone number can't be changed once submitted so please
  double check before saving."* It is followed by *"Your email, physical address and
  bio can be updated at anytime."* — so when you paste the replacement, **delete that
  following sentence too**, or the page will say the same thing twice.
- **§2 (new section).** A new Elementor **section** between `Complete your profile.`
  and `Ride Sharing & Business Info (Optional)`. Heading style: **h2**, to match its
  neighbours — not h3, which is the *Personal Info* level.

### Gopher Request Tutorial — `gophergo.io/hire-a-gopher/gopher-request-support/`

```
h2  Welcome to Gopher Request!
h2  Complete your profile.
    h3  Personal Info
        h4  Helpful Tips:          ← §1 correction + the typo fix go INSIDE this list
h2  Payment Account                ← §3 new section goes ABOVE this
h2  The following info will help you find exactly what you're looking for!
```

- **§1 (correction) and the second sentence.** Both live, back to back, inside
  *Personal Info → Helpful Tips*. The typo sentence reads exactly:
  *"If after singing up, your name and/or number change, please email
  support@gophergo.io or use the contact us feature in the app and/or website."*
  **"singing up" is live on the page right now.**
- **§3 (new section).** A new Elementor **section** between `Complete your profile.`
  and `Payment Account`. Heading style: **h2**.

### ⚠️ These two pages just became far more load-bearing

The Help Center rebuild (2026-09-10, MRs !301 / !312) makes
**"Gopher Go Tutorial" / "Gopher Request Tutorial" the FIRST button on the Help Center
screen in both apps**, pointing at exactly these two URLs. Until now the Go page was
reachable only from a Best Practices link at sign-up and the Request page from nowhere
in the app at all. Once that store build ships, these pages are the front door of
in-app help — which is the same event that unblocks publishing §2 and §3 above.

**The order to do it in:** publish §1 (and the typo) whenever you like — those are
corrections to text that is wrong today. Publish §2 and §3 **on the day the store build
lands**, not before, because they describe a button that is not yet in anyone's app.
