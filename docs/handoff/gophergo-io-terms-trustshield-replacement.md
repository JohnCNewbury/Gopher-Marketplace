# gophergo.io `/terms-and-conditions/` — TrustShield clause replacement

**Live, operative contract.** This is the agreement today's app users actually accepted — unlike the
rebuild's Terms, which bind nobody until launch. Treat as an amendment, not a copy tweak.

---

## THE EDIT — replace this section

### Find (current live text)

> **Gopher TrustShield (ID & identity Verification )**
>
> Gopher has teamed up with [iDenfy](https://www.yardstik.com/) to offer an ID Verification for
> Gopher Request users. Once verified, users are rewarded with a TrustShield badge that will be
> showcased on their profile when submitting requests. We encourage all our Gopher Request users to
> take advantage of this voluntary program at no cost to the Requestor. A valid US Gov't ID is
> required to participate in Gopher TrustShield.

### Replace with

> **Gopher TrustShield (ID & Identity Verification)**
>
> Gopher offers ID Verification for Gopher Request users, provided directly by Gopher, Inc. Once
> verified, users are rewarded with a TrustShield badge that will be showcased on their profile when
> submitting requests. We encourage all our Gopher Request users to take advantage of this voluntary
> program at no cost to the Requestor. A valid US Gov't ID is required to participate in Gopher
> TrustShield.

**Three things changed:** the vendor name is gone; the hyperlink is gone; and the heading's stray
space and lowercase "identity" are tidied. The following two paragraphs ("Certain requests submitted
will have a fee reduction…" and the "NOTE: For Age-Restricted deliveries…") are **unchanged** — leave
them exactly as they are.

⚠️ **The link was already broken.** `[iDenfy](https://www.yardstik.com/)` pointed at **Yardstik**, the
background-check vendor — not iDenfy. So anyone who clicked the ID-verification vendor link landed on
the wrong company's site. That has been live for some time; it disappears with this edit.

---

## Also check: the page's SEO fields

The crawl reads rendered page text only. On the rebuild site the same vendor sentence was **also**
sitting in three meta fields that never appeared in body copy — `og:description`,
`twitter:description`, and the standard meta description — which are what Google indexes and what
renders in a link preview. Open the SEO plugin (Yoast / Rank Math) on this page and check the meta
description and social preview text by hand.

---

# Separate — defects found while reading the live Terms

**None of these are applied above.** Reported so they are your decision, not mine. Ordered by
seriousness.

### 1. ⚠️ A double negative reverses the meaning of a dispute clause

In **Gopher Go Payout Account**, the dispute example reads:

> "If the customer clearly asked for "X" and the items delivered were "Y", **that is not an issue
> that Gopher, Inc is not responsible for** and nor is the customer."

Two negatives make that say Gopher, Inc. **is** responsible — the opposite of the intent, in a clause
about who eats the cost of a wrong item.

The **Dispute Protocol** section further down states the same rule correctly:

> "this is **not** an issue that Gopher, Inc **is** responsible for and nor is the customer."

So the contract contradicts itself on liability for a wrong delivery. Recommended fix: delete the
second "not" in the Payout Account version so both passages match.

### 2. ⚠️ The minor-cosigner age contradicts the age floor

**Age of Usage** sets the floor at 16, then says:

> "If you are a worker on the Gopher Go app **under the age of 16**, when entering your payout
> account… Stripe will require a parent or guardian to cosign."

Nobody under 16 can be on the platform at all, so as written the cosigner rule can never apply. It
should read **under the age of 18** (which is what the rebuild's Terms say, and what Stripe actually
requires for a minor).

### 3. "Gopher Pro" is described as a platform

> "Gopher Request, Gopher Go and Gopher **Pro** are the names of the 3 platforms used."

Gopher Pro is a worker *badge/tier*, not a platform — the same document later describes it that way
under the Yardstik section. Flagging rather than fixing because I don't know whether the live
platform set is meant to be two (Request + Go) or three; the rebuild uses Request / Go / Connect.

### 4. Typos and small errors

| Where | Current | Should be |
|---|---|---|
| Opening paragraph | "the mobile and **wed** app(s)" | "web app(s)" |
| Opening paragraph | "We require **to you agree**" | "We require you to agree" |
| Gopher Request Fees | "Gopher, Inc **reservices** the right" | "reserves" |
| Suspended Access | "suspends sign-up / **sing-in** access" | "sign-in" |
| Payout Account + Dispute Protocol | "pay close attention to **this this** dispute example" | "this dispute example" (appears twice) |
| Payout sequence | steps numbered 1, 2, 3, 4, **6** | renumber — step 5 is missing |
| Cost Adjustments | paragraph ends "…only purchase what the amount can cover.  " | missing closing parenthesis and full stop |

### 5. Worth knowing — the live Terms are *stronger* than the rebuild in two places

Not a defect. When the rebuild's Terms are finalised, these are worth carrying across:

- **Device requirement.** The live text says plainly: *"Please do not engage in accepting a request
  if you do not have reliable service and/or reception. You must keep your device linked to the app
  always charged."* The rebuild had no device standard at all until it was added on 2026-08-19.
- **Chargeback cost recovery.** The live text assesses *"up to $100 to offset the dispute fees
  assessed by our payment merchant"* on an age-restricted no-show chargeback. The rebuild's §19
  threatens damages generally but names no figure — and a named figure is far easier to enforce.
