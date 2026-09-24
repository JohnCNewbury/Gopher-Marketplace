# Go → Deal Registration — session handoff (retired 2026-08-24)

**This is an INDEX, not a diary.** The transcript is permanent and searchable; this
file exists so you know what to search for.

**Transcript:** `~/.claude/projects/-Users-johnnewbury-Desktop-All-New-Gopher-Documentation-Claude-Code-Review-Cleanup-Code/0597f022-99b4-47a6-99e7-7096eba9dbc1.jsonl`

**Grep anchors** (distinctive, will find the reasoning):
`blocked_requestors` · `recovery_attempts` · `patchRow` · `dealsReferUrl` ·
`applyReferralPrefill` · `GoRecovery` · `qr-card-hero` · `run_iq_starters_test` ·
`gopher-backend-api!323` · `!329` · `!345` · `817055e8` · `aab3d419`

---

## State of play — what this session shipped, all LIVE

Everything below was verified **by content on both hosts**, not by SHA.

### Backend (`gopher-backend-api`, GitLab `origin`, all merged to `production`)

| MR | What | Merge commit | Route check |
|---|---|---|---|
| **!315** | `GET /users/deals/mine` — worker reads own deals | `688253a0` | 440 |
| **!323** | Worker→requester blocking: `blocked_requestors` table, toggle + list, 2nd `NOT EXISTS` in dispatcher + both notification queries | `aab3d419` | 440 |
| **!329** | Sign-in recovery: 5 unauthenticated `/recovery/*` endpoints, decoy-row enumeration safety | `7b932703` | 400 |
| **!345** | **Fix**: raw rows have no `.update()` — see "the lesson" below | `817055e8` | — |

Live probe method that actually discriminates: **440 = route exists behind auth, 404 = absent**
(bogus control returns 404). ⚠️ Use the RIGHT HTTP METHOD — I twice recorded a false 404 by
POSTing to a GET route.

### Web (`Final/`, Pages + TigerTech, both verified)

- **Block Requesters pane LIVE** as a *manage* surface — real list + Unblock. It never
  CREATES a block (trigger is a 1–2 rating, which lives in the app). Toggle-drift defended:
  response-message check → undo → re-fetch.
- **Account recovery LIVE** — `GoRecovery`, server-driven. The page verifies nothing.
- **Refer Gopher restructured** — Refer Yourself promoted to the headline (`qr-card-hero`),
  four cards below, ID shown once, Deals card with a derived-absolute `?ref=` share link.
- **Deals registration `?ref=<id>` pre-fill** — `applyReferralPrefill`.
- **Ask Gopher iQ modal** on Go + Deals (ported from Connect/Request).

---

## Apps Script severance — COMPLETE (checklist item 2)

**Zero live Apps Script code on any host.** `gopher-go.html`: 0 matches.
`gopher-deals.html`: 4 matches on both hosts, and **all four are tombstone COMMENTS**
(lines ~3543, ~5246, ~5250, ~7239) — `grep -cE 'var GOPHER_FORM_ENDPOINT *= *"https|fetch\(GOPHER_FORM_ENDPOINT'` returns **0**.

That severance was the **HQ Dashboard session's** work (`193bd8d` / deploy `7fa5a60`), not
mine. Netlify was re-dragged by the owner and landed. **No debt remains to remove** — do not
"fix" the comments; they're the record.

---

## The one lesson worth carrying (it cost a live bug)

**A stub must be as MEAN as production.** `config/db.config.js` sets
`query: { raw: true }` **globally**, so every finder returns a PLAIN OBJECT — which is why no
controller in the codebase calls `row.update()`. My recovery controller used the instance API
at 11 sites. **25 assertions and four mutation tests all passed** because my stub returned a
fake instance with an `update()` method. It 500'd on the first real request
(`row.update is not a function`). Fixed in !345 via one `patchRow()` helper.

Second defect in the same incident: the client rendered that 500 as *"That code didn't match
or has expired"* — telling the owner his correct code was wrong. A 5xx is OUR fault and must
say so.

---

## Open / not started

1. **⛔ THE ONE BLOCKING ITEM for SP deals:** the whole SP spine is live (eligibility →
   server-gated submit → HQ queue → public feed), but **`gopher-request.html` and
   `gopher-connect.html` render deals from ~19 hardcoded arrays each and never call
   `GET /api/v1/deals`.** An approved SP deal publishes into a feed almost nothing renders.
   *Next task; owner agreed the sequence is: he submits + approves one first, then wire.*
2. **Performance history has no data path** — the feed payload carries no rating, tier or job
   count (verified in the live response), yet launch marketing promises *"we promote your
   performance history."* Fold into the wiring pass.
3. **Blocking + recovery client halves** need a **store release** (app rating-flow trigger;
   requester app moving onto the same trigger).
4. **Phase B of the recovery test never ran** — SMS to a new number, the `users.telephone`
   write, both notices, session kill. Deliberate: costs an unregistered number and reshapes an
   account. The first real locked-out worker at launch proves it for free.

---

## Owner-facing, still unanswered

- **DL-0009 (Brittany Brewer)** — a real merchant, still `pending` in the HQ queue awaiting
  the owner's approval.
- **~2,460 placeholder accounts** exist (~440–500/month, none ever ordered or worked) because
  `POST /users/sign_in` mints on an unrecognised number. Raised; inflates every roster metric.

---

## MEMORY.md lines owed

MEMORY.md is over its limit and twelve sessions are retiring at once, so these were NOT
appended. Memory files themselves are written. Add these index lines when it's safe:

```
- [⚠️ Pinned deploy can REVERT live work](pinned-deploy-can-revert-live-work.md) — pin at HEAD, never an older commit; riders and reverts look identical in a diffstat
- [Launch docs internal until launched](launch-docs-internal-until-launch.md) — pre-launch ToS amendments need no user notice; §1 activates at launch
```

---

## Uncommitted at retirement

**Nothing of mine.** All three repos clean of my work: `Code` (loose files are other
sessions' retire docs + `.claude` config backups), `gopher-backend-api` (clean, sitting on
another session's branch), `gopher-dev-handoff` (clean, in sync with origin).
No gitignored disk-only prototype files were edited by this session.
