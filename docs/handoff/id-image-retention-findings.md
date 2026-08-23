# ID images — what we actually hold, and what we've told users

**Status: FINDINGS + open owner decisions. 2026-08-23.**
Written because the in-house TrustShield flow makes us the custodian of identity documents rather
than a vendor. **The retention question turned out to sit on top of a disclosure gap**, so the facts
come first and the periods come second.

⚠️ **Nothing here is legal advice.** §5 flags where counsel review looks genuinely warranted.

---

## 1. There are THREE ID-image streams, not one

Only the first was in scope when this was raised. All three are verified from the live docs/code.

| # | Stream | Where it lives | Verified |
|---|---|---|---|
| 1 | **TrustShield enrollment** — front, back, selfie | iDenfy → **now our own S3 mirror** (`get_idenfy_files`, `ed270b91`) | serving `source:'mirror'` |
| 2 | **Delivery-time ID photo** — the Gopher photographs the physical ID | worker app → wherever that upload lands | ToS |
| 3 | **Support email** — users told to email ID photos in | `support@gophergo.io` **mailbox** | TrustShield page |

**Stream 2, from the Terms of Service:**
> *"you… will provide a physical, valid government-issued ID to your Gopher upon delivery (a picture
> of the ID is not allowed). **Your Gopher will take a photo of the physical ID before items are
> exchanged.**"*

So **every age-restricted delivery produces an ID photograph**, taken by a worker, on their device.
That is a far larger and less controlled corpus than TrustShield enrollment.

**Stream 3, from `gopher-trustshield.html`:**
> *"To keep your previous requests, **email a clear photo of the front and back of your ID to
> support@gophergo.io**."*

Government ID images arriving in a shared mailbox, retained by whatever the mail provider's default
is, visible to whoever reads that inbox. **This is the least controlled stream and the easiest to
stop.**

---

## 2. There is also a SHARING fact nobody has written down

From `gopher-trustshield.html`:
> *"If you're TrustShield verified, **your worker will already see your ID and photo in their app**
> — the in-person check just confirms the match."*

**Workers see the requester's identity document and photograph.** That is a disclosure to a third
party — an independent contractor, on their own device — and it is a deliberate product behaviour,
not a leak. It is *not* mentioned in the privacy policy.

---

## 3. ⛔ The privacy policy does not describe any of this

`Final/gopher-privacy.html`, **Effective Date November 8, 2024**. Measured occurrences in the
rendered text:

| Term | Count |
|---|---|
| `retention` / `retain your` / `how long` | **0** |
| `delete your` | **0** |
| `biometric` | **0** |
| `identity document` / `selfie` | **0** |
| `TrustShield` / `iDenfy` / `ID verification` | **0** |
| `encrypt` | **0** |

Its "Personal Data" list is: contact information, usage data, cookies, shared content (*"reviews and
ratings… or photos you upload"*), payment information, and communications.

**So the policy:**
1. **Does not disclose that we collect government ID images or selfies at all.**
2. **Has no retention section** — no statement of how long anything is kept.
3. **Does not disclose that workers see a requester's ID.**
4. Predates TrustShield.

⚠️ **This is why retention could not be answered as asked.** A retention period is a promise about
data the policy does not admit to collecting. **The disclosure gap is the prior problem**, and it
exists *today* — it is not created by the in-house flow. The in-house flow only removes the ability
to point at a vendor.

---

## 4. Open decisions

**4.1 — Disclosure (do this first, it gates the rest).** Update the privacy policy to describe what
is collected (ID front/back, selfie, delivery-time ID photo), why, **who sees it including workers**,
and how long it is kept. Everything below is a detail of this.

**4.2 — Retention period, per stream.** They should differ:
- **Enrollment images:** the badge is durable, so what is the *image* still for once verified? A
  recommendation is in §6.
- **Delivery-time photos:** the ToS ties these to dispute evidence — so the period should be the
  dispute/chargeback window, not indefinite.
- **Support-mailbox images:** see 4.5.

**4.3 — Deletion triggers.** What happens to images on account deletion, on TrustShield removal, on
a worker's device? Today nothing is specified. Note `users.updated_at` is **not** auto-stamped
(`timestamps:false`), so "last activity" is not a reliable clock for expiry — a retention job needs
its own timestamp.

**4.4 — Access control.** Who internally can view an ID image, is it logged, and is the S3 mirror
encrypted and non-public? **Not yet verified by this session** — the TrustShield session built the
mirror and should confirm bucket policy, encryption at rest, and whether access is audited.

**4.5 — Stop stream 3.** The support-mailbox path exists to solve one narrow problem (an alias
account whose name won't match the ID). **Recommendation: remove that instruction and replace it
with an in-product path.** It is the only stream where identity documents sit in a general-purpose
mailbox, and it is a copy change plus a small flow — the cheapest risk reduction available here.

**4.6 — Worker-side handling.** Stream 2 produces ID photos on contractor devices. Are they uploaded
and removed locally, or do they persist in a camera roll? **Unknown — needs checking in the worker
app**, and it is the stream with the least platform control.

---

## 5. ⚠️ Where counsel review looks warranted

Not legal advice — but three things a lawyer would want to see, flagged so the decision is informed:

1. **The selfie is plausibly a biometric identifier** under several US state laws. **Illinois BIPA**
   carries a private right of action and statutory damages **per violation**, and its requirements
   are specific — written notice, written consent, and **a published retention/destruction
   schedule**. A published schedule is exactly what §3 shows we do not have.
2. **Disclosure to workers** (§2) is a sharing of identity documents with third parties, currently
   undisclosed.
3. **The policy is silent on retention entirely**, which several state privacy statutes treat as a
   required disclosure independent of the data type.

**None of this is new exposure created by the in-house flow — it is the current state.** Going
in-house changes who holds the data, not whether it was disclosed.

---

## 6. Recommendations (owner decides; these are starting points)

1. **Update the privacy policy first.** Nothing else is coherent until the policy admits the data
   exists. This is also the cheapest item.
2. **Kill the support@ email path** (§4.5) — smallest change, largest risk reduction.
3. **Enrollment images: keep only what the product needs.** The badge is a boolean; the images are
   evidence. If nothing after approval reads them except the worker-facing display, then the
   question is whether that display justifies indefinite retention — **or whether the ID front alone
   suffices and the selfie can be destroyed after matching.** ⚠️ *Note this interacts with the
   barcode work: the selfie there is captured but nothing compares it to the ID, which is already
   flagged as "deterrent or theatre — decide."*
4. **Delivery photos: tie to the dispute window**, since that is the stated purpose.
5. **Publish the schedule.** Under BIPA-style regimes the published schedule is itself the
   requirement, not just the practice.

---

## 7. What this session verified vs inherited

**Verified here:** the three streams (ToS + TrustShield page quotes above), the privacy policy's
omissions (measured counts, §3), the worker-visibility statement.
**Inherited, not verified:** that the S3 mirror is encrypted/private and access-controlled (§4.4) —
the TrustShield session owns that and should confirm.
**Not investigated:** worker-device handling of delivery photos (§4.6), and where those uploads land.
