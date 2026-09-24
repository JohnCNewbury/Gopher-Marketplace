# iDenfy removal — www.gophergo.io (WordPress) — OWNER ACTION

**The marketplace side is done** (`d16da0e`, not yet deployed). This file covers the **live
WordPress site**, which is not editable from this repo. Two pages still name the vendor.

**Audit method:** pulled `sitemap_index.xml`, fetched **all 107 published URLs**, matched
`[Ii][Dd]enfy` against the rendered HTML. 107 scanned, **0 fetch errors**. The privacy policy and
*both* TrustShield pages (`/hire-a-gopher/trustshield/` and `/become-a-gopher/trustshield/`) were in
scope; only the two below matched. Scanned 2026-08-19.

⚠️ This catches **rendered page text only.** It does not see: unpublished drafts, media filenames,
theme/Elementor global blocks not rendered on a public URL, WP menus, SEO plugin fields not emitted
on these pages, or anything behind a login. Check those in the admin.

---

## 1. `/hire-a-gopher/trustshield/` — 1 occurrence

Elementor text widget (`data-id="ecd3a12"`, `text-editor.default`). Current text:

> Flex your TrustShield ™ badge by completing our free identity verification process, **powered by
> IDenfy.**

**Change to:**

> Flex your TrustShield ™ badge by completing our free identity verification process.

Same edit already made on the rebuild's `Final/gopher-trustshield.html`, so the two stay consistent.

⚠️ **Also check this page's SEO/social fields.** On the rebuild, the identical sentence appeared in
**three** meta descriptions (`og:description`, `twitter:description`, `name="description"`) that
were invisible in the body copy but indexed by search engines and shown in link previews. They did
not render in the WP page text, so this scan could not see them — open the SEO plugin (Yoast/Rank
Math) for this page and check the meta description and social preview text by hand.

---

## 2. `/terms-and-conditions/` — 3 occurrences ⚠️ legal document

All three sit in the TrustShield clause:

> Gopher TrustShield (ID Verification **with iDenfy**)
> Gopher has teamed up with **iDenfy** to offer an ID Verification for Gopher Request users. Once
> verified, users are rewarded with a TrustShield badge…

**Change to:**

> Gopher TrustShield (ID Verification)
> Gopher offers ID Verification for Gopher Request users, provided directly by Gopher, Inc. Once
> verified, users are rewarded with a TrustShield badge…

Matches the wording now in the rebuild's ToS §22.

⚠️ **This is the live, operative contract** — the one today's app users actually accepted, unlike the
rebuild's Terms, which bind nobody until launch. Two consequences:

1. It is the **only** one of these two edits with legal weight. Treat it as a Terms amendment, not a
   copy tweak, and set the "last updated" date if the page carries one.
2. The live Terms' own change-notice clause (if it mirrors the rebuild's §1) may oblige a user
   notification. The pre-launch exemption the owner granted on 2026-08-19 applies to the **rebuild's**
   documents only and does **not** extend here.

---

## What I did NOT find, and it is worth knowing

**The privacy policy does not name iDenfy** — on either the WordPress site or the rebuild. Both
describe identity and biometric handling in the first person ("we collect", "we permanently
destroy", "we do not sell"). So bringing verification in-house **aligns the privacy notice with
reality** instead of breaking it, and closes a latent mismatch: those sentences already claimed
first-party collection while a third party was doing the collecting.

That said, in-housing moves **who actually holds government ID images and selfies** onto Gopher, Inc.
The notice language survives unchanged, but the underlying BIPA/CUBI exposure is now first-party.
That is a question for counsel, not a copy edit, and it is outside what this file covers.

---

## Still carrying the name elsewhere (deliberately not scrubbed)

- **Backend code.** The mirror-serving path is live and reads from our S3, with the vendor only as
  fallback and write-through backfill. Removing that code is an engineering task with a real
  regression risk to existing holders, not a text change. Do not scrub it as part of this pass.
- **Internal handoff docs and session history** in `docs/handoff/`, plus
  `_prototypes/Request/CARRYOVER-gopher-request.md` and one `.bak` snapshot. These are the record of
  *why* the exit happened. Neither is served to users. Scrubbing them would destroy the audit trail
  for a vendor severance, which is the opposite of useful.
- **Source comments on the public site** were handled differently: the *name* was replaced with a
  neutral descriptor ("the third-party ID vendor") so no vendor is named in shipped files, while the
  reasoning those comments record stays readable.
