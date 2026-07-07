# G40-173 — Gopher Connect User Account Page

**Status:** ACs 1–4 already present; **ACs 5, 6, 7 built + verified**
**Jira:** G40-173 · Story · Medium · `connect` · Scaffold: `wave2/g40-173/connectAccount.js` (permission engine, fully tested)

## AC verdicts (verified in `Final/gopher-connect.html`)
| # | AC | Verdict |
|---|----|---------|
| 1 | Account accessible on a menu page | ✅ already — sidebar "Account" group (Business / Personal / Payment / Users & Access / MY Gophers), `data-dash-section=*` → `showSection()` |
| 2 | Profile accessible on account page | ✅ already — `data-section="personal"` (Personal Info) + `data-section="business"` |
| 3 | Add users, invited by **SMS or email** | ✅ already — Users & Access → Invite modal (`#inviteUserOverlay`) with channel toggle `#ivChannelSeg` (email/sms) |
| 4 | Roles **Owner / Admin / User** | ✅ already — role banner + `role-pill`; invite offers Admin/User (Owner not invitable, matching the engine) |
| 5 | Remove users via **checkbox + confirmation** | ✅ **built** |
| 6 | MY Gophers **add / remove / update** | ✅ **built** |
| 7 | Review a MY Gopher's **job history** | ✅ **built** |

## What was built (all bound to the tested `connectAccount.js` engine)
Owner is protected, removal requires confirmation, roles are Owner/Admin/User — the UI mirrors the engine's
`removeMembers` / `inviteMember` / `changeRole` semantics.

**AC5 — remove users (checkbox + confirmation).** `renderUsers` now renders a **checkbox** per non-owner row;
the owner row shows a 🔒 (never selectable — mirrors `removeMembers`'s owner protection). A **"Remove selected"**
button appears in the section head when ≥1 box is checked → opens a **confirmation modal** listing the users →
on confirm, filters `DASH_DATA.users` (owner-guarded) and re-renders.

**AC6 — MY Gophers add / remove / update.**
- **Add:** "+ Add MY Gopher" button (section head) → modal (name / specialty / tier) → pushes to
  `DASH_DATA.myGophers` → re-renders.
- **Remove:** in the MY Gopher profile modal → "Remove" → confirmation → drops from `DASH_DATA.myGophers`.
- **Update:** profile modal → "Edit" → modal to change name/specialty → updates the record → re-renders.

**AC7 — MY Gopher job history.** The previously-unwired **"Profile"** button on each MY Gopher card now opens a
**profile modal** showing the worker's photo/tier/specialty + a **"Job history with your team"** list (request
id, date, type, amount, rating). The modal also hosts the Edit/Remove actions (AC6).

Implementation is a single self-contained IIFE (`initConnectAccountMgmt`) using **delegated** click/change
handlers (survives `renderUsers`/`renderGophers` re-renders) + lazily-created modals — minimal footprint in the
5.6 MB file. Distinct control classes were used (NOT `.invite-btn`, which is globally wired to the invite modal).

## Verification (in-browser, real 5.6 MB file)
No console errors. Drove every flow:
- Users: 5 rows → **4 checkboxes + 1 owner 🔒**; check → "Remove selected" appears → confirm → row removed (5→4, correct user gone); button re-hides.
- MY Gophers: Add "Jordan P." (4→5 cards); Profile modal shows job history + Edit + Remove; Edit updated the specialty on the card; Remove (with confirm) deleted Jordan (5→4). Screenshot shared.

## Backend seam
- **Persist** members / invites / MY-Gopher edits (all client-side/in-memory here).
- **Deliver** invites by real SMS/email; enforce role permissions **server-side** (the engine `can()` matrix).
- **Real job-history** data per worker (the prototype synthesizes a plausible list from the saved record).

## Files
- `Final/gopher-connect.html` — Users checkbox column + "Remove selected"; MY Gophers "+ Add" button + `data-gopher-profile` on Profile; `initConnectAccountMgmt` IIFE (modals + handlers).
