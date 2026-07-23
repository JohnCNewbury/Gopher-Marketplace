# Users & Access — Invite Protocol (Connect + Deals shared)

**Status:** Owner-APPROVED 2026-07-22 ("proceed with best practices standards
recommendation") — every decision below is LOCKED, including the five former
veto items at the end. Do not re-open with the dev. Governs the **Gopher Connect** business dashboard
and the **Gopher Deals** merchant portal (which carries a 1:1 port of the section,
owner spec 2026-07-22). One protocol, two org types.

**What exists today:** the prototypes demonstrate the send side (invite modal:
name + email-or-SMS + role), the roster lifecycle (pending → active, resend,
cancel, role change, single/bulk remove, ownership transfer), and the
role-visibility matrix (Owner / Admin / User). The **acceptance side is now
demoed too**: an "invite acceptance preview" simulator (entry points: the
invite-sent confirmation and Manage on any pending row) walks all four §4
branches with the exact copy of this spec — including the Branch-D claim
screen and its verify-then-continue-as OTP — and can optionally flip the
pending row to Active on completion. Persistence, real message delivery, and
OTP issuance remain the backend seam; the simulator is reference behavior,
not logic to port.

---

## 1 · Identity model (the foundation everything rests on)

- **One Gopher account per person, platform-wide.** The same account is used
  across Request, Go, Connect, and Deals — the prototypes already share one
  canonical profile form. There is no separate "business login."
- **Membership is the join object:** `(org, person, role, status)`. An org is a
  Connect business or a Deals merchant. A person may hold many memberships —
  across orgs AND across products. Being a Gopher Go worker never conflicts
  with being a business User; they're different contexts on one identity.
- **Membership follows the ACCOUNT, not the contact string.** If a member later
  changes their account email, their memberships come with them. The invited
  email/phone is only the delivery address and the initial match key.
- **Unique identifiers are email and phone. Nothing else.** Matching is
  case-insensitive and trimmed, and considers pending `unconfirmed_email`
  values (canon: G40-147 / G40-271). Name, DOB, and address are **never** used
  to match, populate, or link accounts in this flow — fuzzy identity matching
  exists only in the trust-&-safety layer (G40-143) and stays there.

## 2 · Who can invite, and what the first user means

- **The Owner exists by construction** — whoever created the business/merchant
  org is its Owner. "Adding the first user" is simply the first invite; there is
  no special bootstrap flow.
- **Owner and Admin can invite** (per the visibility matrix, commit `cb01186`).
  Users cannot. Admins may grant Admin or User; only the Owner role transfers,
  and only via ownership transfer — an invite can never create an Owner.

## 3 · The invite: channel, format, lifetime

- **Channel is the sender's option: email or text (SMS).** Already built into
  the modal. Rationale: office staff live in email; field staff live in texts.
  One channel per invite — re-invite to switch.
- **Format: a magic link + a 6-digit fallback code.** The link opens the accept
  flow directly; the code exists for the person who can't tap the link where it
  landed (e.g. SMS received on a phone, accepting on a laptop). Both are the
  same single-use token.
- **Lifetime: 7 days, single-use, revocable.**
  - **Resend** issues a fresh token and **invalidates the old link** (prototype
    stamps "Invite re-sent M/D").
  - **Cancel invite** kills the token immediately; the row leaves the roster.
  - An expired or revoked link opens a dead-end page: "This invite is no longer
    active — ask ⟨business⟩ to send a new one." Nothing about the org's roster
    is revealed on that page.
- **Role is attached to the invite** and editable on the pending row up to
  acceptance; after acceptance it's a normal role change.

### Message copy (production should start from these)

**Email — subject:** `⟨Inviter first name⟩ added you to ⟨Business⟩ on Gopher Connect`
**Email — body:**
> ⟨Inviter⟩ invited you to join **⟨Business⟩** on Gopher Connect as
> **⟨Role⟩** — ⟨one-line role description from the role banner⟩.
> **[Accept invite]** (button → magic link)
> Or enter this code when prompted: **⟨6-digit⟩**
> This invite expires in 7 days. Didn't expect it? Ignore this email —
> nothing happens without you.

**SMS:** `⟨Inviter⟩ invited you to join ⟨Business⟩ on Gopher Connect as ⟨Role⟩.
Accept: ⟨short link⟩ (code ⟨6-digit⟩, expires in 7 days)`

Deals swaps the product name; everything else is identical.

## 4 · Acceptance — the decision tree (the core of this spec)

The invited person taps the link (or enters the code). The system looks up the
**invited contact** against existing accounts. Four branches:

**A · Contact matches an account, and they're signed in to it.**
One screen: business name, role, inviter → **Accept** / Decline. One tap. Their
existing profile is untouched; the org sees name + contact + role + activity,
never DOB/address/payment data (see §7).

**B · Contact matches an account, signed out.**
Standard OTP sign-in to that account (the platform's existing primitive), then
Branch A's accept screen. **No signup is offered** — the account exists; we
never let a matched contact create a duplicate.

**C · No match — genuinely new person.**
Minimal signup, in the invite's context: name prefilled from the invite,
**the invited contact is verified by OTP as part of signup** (it's already
proven reachable — the invite arrived there), then the remaining canonical
profile fields. Account created → membership active → lands in the dashboard.

**D · Claims new, but enters a contact that matches an existing account.**
This is the owner's scenario: everyone fills in the same personal info
everywhere, and people forget they have accounts. During Branch-C signup they
type an email or phone that's already registered. The system responds:

> **"⟨contact⟩ already has a Gopher account."**
> **[Send me a code]** — verify it's you and continue with that account
> **[Use a different email/number]**

- **Verify-then-continue, never copy.** The OTP goes to the matched contact.
  Passing it doesn't "populate their info into a new account" — it **signs them
  into the account that already owns that info**, which then accepts the invite
  as Branch A. One person, one account, zero duplication. This is the answer to
  "do we give them a way to enter an OTP to populate the existing info" — yes,
  and the mechanism is continue-as, not copy-into.
- **Fail or abandon the OTP → nothing is revealed.** No name, no partial
  profile, no hint of what the account is. They may use a different contact
  (which, being unique-key-clean, proceeds as Branch C). Disclosure that *an
  account exists* for a contact is accepted product canon (G40-147 ships "That
  email is already in use") — disclosure of anything more is not.
- **Same person, different contact (the fuzzy case):** if they sign up with a
  *new* email/phone but the same name/DOB/address as an existing account, the
  signup **proceeds** — matching on those fields is not safe (common names,
  shared addresses) and confirming a match would itself leak PII. Optionally
  emit the G40-143-style **non-blocking near-miss audit event** so support can
  offer an account merge later. Never auto-link, never block (the blocking
  variant is reserved for admin-deactivated accounts, per G40-143).

**Decline** (any branch): token consumed, row leaves the roster, inviter's
dashboard shows nothing beyond the row's absence. No notification in v1.

## 5 · Lifecycle states

| State | Entered by | Exits to |
|---|---|---|
| **Pending** | Owner/Admin sends invite | Active (accept) · gone (cancel / decline / expire) |
| **Active** | Acceptance | gone (remove) · role changes in place |
| *(re-sent)* | Resend on a pending row | still Pending — new token, old link dead |

Removal revokes org access only — the person's Gopher account and their other
memberships are untouched. Their past requests remain in the org's history
(prototype confirm copy already says so). A removed person can be re-invited.

## 6 · Edge cases (all decided)

| # | Case | Behavior |
|---|---|---|
| 1 | Invite a contact already on this roster (active or pending) | Block at send: "Already a member" / "Invite already pending — resend it from the table." |
| 2 | Invite your own contact | Block at send ("That's you."). |
| 3 | Contact typo discovered after send | Cancel invite → send a new one. No in-place contact edit — a token is bound to its contact. |
| 4 | Invitee already a Gopher user in another app (Request customer, Go worker) | Branches A/B — same account gains a membership. Being a worker is not a conflict. |
| 5 | Invitee's OTP fails repeatedly in Branch D | Standard OTP rate limiting; offer "use a different contact"; never reveal account data. |
| 6 | Email bounces / SMS undeliverable | Row stays Pending with delivery-failed marker (post-v1 polish); sender's fix is cancel + re-invite. |
| 7 | Invited email is another account's pending `unconfirmed_email` | Counts as a match (G40-147 canon) → Branch B/D handling. |
| 8 | Case/format variants (`ME@X.com`, spaces; phone formatting) | Normalize before matching: casefold + trim emails; digits/E.164 phones (G40-147). |
| 9 | Invitee under minimum signup age | Branch C signup enforces the platform's existing age gate (G40-154). |
| 10 | Invited contact belongs to a deactivated account | OTP sign-in fails as deactivated → route to support. The G40-143 re-signup block still applies if they try Branch C with new contacts. |
| 11 | Multiple orgs invite the same person | Fine — one account, several memberships; the accept screen always names which org. |
| 12 | Owner leaves/unreachable | Not an invite problem: ownership transfer exists in-product; owner-recovery beyond that is an account-support process, out of scope here. |
| 13 | Invite link forwarded to someone else | The token is bearer + contact-bound: accepting requires controlling the invited contact (OTP in every branch that creates or claims an account). A signed-in Branch-A accept requires the signed-in account to BE the matched account. |
| 14 | Same contact invited as Admin by one org, User by another | Independent memberships; roles are per-org. |

## 7 · What the org sees about a member (privacy line)

Name, contact used for the invite, role, status, last-active, and their
requests **within that org**. Never: DOB, home address, payment methods,
activity in other orgs or apps. The canonical profile belongs to the person;
the org sees the membership.

## 8 · Security invariants (testable)

1. A membership is created only by: org creation (Owner) or invite acceptance.
2. An invite can never create or become an Owner.
3. Tokens are single-use; resend and revoke both invalidate prior tokens.
4. Every path that attaches an invite to an account proves control of the
   invited contact (session on the matched account, or OTP).
5. No existing-account data is ever rendered before that proof (Branch D shows
   only "already has a Gopher account").
6. Fuzzy personal-info similarity never links, populates, or blocks in this
   flow (audit-only; blocking is G40-143's job, on its own criteria).
7. Matching uses normalized email/phone incl. pending addresses — nothing else.
8. Exactly one Owner per org at all times (transfer is atomic swap — `e01f877`).

## 9 · Deals reuse

Same protocol verbatim: org type = merchant, product name swapped in message
copy. The Deals portal already carries the ported Users & access section; the
rebuild should implement **one** invite/membership service consumed by both
surfaces, not two. If merchant-side roles ever diverge (e.g. a "Redemptions
only" staff role), that's a new role *label* on the same machinery — the
protocol doesn't change.

## 10 · Deliberately deferred (do not build in v1)

Seat limits/billing, bulk CSV invites, SSO/SCIM, custom roles, invite
approval chains, decline notifications, delivery-status webhooks (edge #6
marker is enough), and support-side account merge tooling (the near-miss
audit events from §4-D accumulate the evidence for it).

---

### Decisions LOCKED (owner approval 2026-07-22, best-practices standard)

1. **7-day expiry** on invites — LOCKED (industry range is 3–30; 7 is the
   Slack/Workspace-zone default).
2. **Resend invalidates the old link** — LOCKED (single-active-token; the safer
   standard everywhere).
3. **Admins may grant Admin** — LOCKED, Stripe/Linear-style. The stricter
   Slack variant (owner-only grants Admin) was considered and rejected: for
   the 5–50-person businesses Connect targets, requiring the Owner for every
   admin grant adds friction without meaningful risk reduction — the Owner
   still solely controls ownership, billing, and can demote any Admin.
4. **Decline is silent** in v1 — LOCKED.
5. **Near-miss audit events** on fuzzy matches (§4-D) — LOCKED, build them
   (pure backend, invisible to users; feeds future support-side merge tooling).
