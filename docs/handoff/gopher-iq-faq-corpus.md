# Gopher iQ — FAQ Corpus (from Intercom support history)

**Source:** 5,197 Intercom conversations (Oct 2024 – Jul 2026) → scrubbed to 3,033 clean Q&A threads → 217 clusters. This file synthesizes the highest-volume clusters into canonical FAQ entries, written in Gopher's voice from how support actually answered.

**Status:** Owner-reviewed draft. Two items marked **[CONFIRM]** need a decision before publish. Intended for merge into the existing iQ FAQ store (the one `build_iq.py` bakes into `gopher-iq-engine.html`), then re-run the build. *No Claude API integration required — this is FAQ content for the existing keyword engine.*

**Coverage:** These ~8 entries account for the large majority of clustered support volume. The remaining 200-ish clusters are mostly alternate phrasings of these same intents plus one-off noise.

---

## 1. Order / request status  *(merges clusters #3, #5, #6, #8, #13, #17, #18, #21, #22, #25, #27, #29, #30, #34-partial, #35, #37, #38 — ~90+ threads, the single biggest intent)*

**Canonical question:** Where's my order? / Was my request accepted? / Why is it still pending? / How long does it take?

**Alternate phrasings / keywords:** order status, pending, accepted, still waiting, did it go through, how long, picked up, delivery time, no one taking my order, request expire

**Answer:**
Your request stays open and broadcasts to available Gophers nearby for up to one hour. A confirmation email means it's being broadcast. If a Gopher accepts, you'll hear a unique notification and your screen switches to show the worker's profile and live map progress — and you can text or call them right in the app. If no one accepts within the hour, the request expires automatically, and you're never charged for an expired request. Keep in mind Gopher isn't an auto-fulfillment service: the offer you set is treated as the worker's wage, so a fair offer is the biggest factor in getting matched quickly.

---

## 2. Cancel an order  *(merges #1, #19, #36 — ~30+ threads)*

**Canonical question:** How do I cancel my order?

**Alternate phrasings / keywords:** cancel request, cancel order, stop my order, why was I charged, canceled but charged

**Answer:**
If a Gopher has already accepted, message them directly in the app and they can cancel it on their end. If your request is still pending, you don't need to do anything — it expires on its own after an hour. Your card is never charged for a request that isn't completed; it's only authorized once a driver accepts. If a driver cancels after accepting, that authorization drops off your card shortly on its own.

---

## 3. Payout — how and when you get paid  *(merges #4, #12, #13, #15, #23, #40 — ~35+ threads)*

**Canonical question:** How and when do I get paid? / I didn't get paid / Where's my pay?

**Alternate phrasings / keywords:** payout, get paid, didn't get paid, where is my money, payment delayed, instant payout, deposit

**Answer:**
Payouts run through Stripe to the payout account you set up under Account → Payout Account. For your first 10 completed requests, standard Gophers are paid exactly 2 hours after a request is confirmed. After 10, you're upgraded to Instant Payout and deposits land in about 1–2 minutes. Gopher Pros get Instant Payout from the start. If a payout is delayed, it's almost always the payout card — if your bank stopped accepting the deposit, add a new payout card **before** deleting the old one, and your next deposit will go to the good card. Stripe keeps retrying, so the money is still yours.

---

## 4. Change your phone number  *(merges #2, #24, #31, #32, #39 — ~25+ threads)*

**Canonical question:** How do I change my phone number?

**Alternate phrasings / keywords:** update phone number, new number, change my number

**Answer:**
You can update it yourself in the app. Open your profile, enter your new number, and we'll email you a confirmation code to verify it. Once you enter that code, your number is updated — sign out and back in for the change to take effect.

> *Note: confirm the exact in-app menu path to your profile so the wording matches the current app.*

---

## 5. Can I pay with cash?  *(cluster #16 — 6 threads)*

**Canonical question:** Can I pay cash on delivery?

**Alternate phrasings / keywords:** pay cash, cash on delivery, pay with cash

**Answer:**
No — cash isn't an option. We have to guarantee payment to the worker before a request can be accepted, so all payment runs through the app.

---

## 6. How does Gopher work?  *(clusters #34, #37, plus a correction woven through many answers)*

**Canonical question:** How does Gopher work? / Are there gophers in my area?

**Alternate phrasings / keywords:** how it works, marketplace, auto fulfillment, hire a worker, find a gopher, gophers in my area

**Answer:**
Gopher is a marketplace to hire a local worker for whatever you need — you're hiring them directly, with our help. It's not an auto-fulfillment service, so the offer you set is treated as the worker's wage, and a fair offer is the biggest factor in getting matched. Just submit a request and we'll broadcast it to available workers nearby.

---

## 7. Reaching a person / support  *(merges #10, #20 — ~14 threads)*

**Canonical question:** I need help / Can I talk to someone?

**Alternate phrasings / keywords:** help, talk to someone, live chat, contact support, need help asap

**Answer:**
Happy to help. Most common questions are answered instantly in the app under More → Help Center — that's the fastest route, any time. For anything account-specific, our support team is available by chat Monday through Saturday, 8am–5pm.

> *Note: add the timezone (e.g. ET) to the hours if you want it explicit for out-of-area customers.*

---

## Flagged clusters (decisions, not drafted)

- **Closing / duplicate orders (#7 — 9 threads).** RESOLVED — no FAQ entry needed. The new app prevents this at the source: duplicate requests are flagged inline with a forced user acknowledgment before the user can continue. Since the app now stops duplicates from being created, these support requests should largely disappear on their own.
- **Cigarettes / age-restricted delivery (#9, #11 — ~15 threads).** Already answered in Gopher iQ. **No new entry** — verify the existing iQ answer during merge, and confirm it carries whatever age/legal stance the moderation policy (G40-35) requires.

## Dropped as noise
Greetings ("Good morning" #14), thanks/pleasantries (#28), and email-signature artifacts (Yahoo Mail / "Sent from my iPhone" fragments, #26, #32) — no FAQ content.
