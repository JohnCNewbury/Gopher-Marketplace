# G40-140 — Activate Intercom's AI (ML) for chats

**Jira:** G40-140 (Task) · Epic **G40-3 AI Inclusion** · Label `spine` · Priority Lowest
**Nature:** **Intercom-console activation + knowledge/data ingestion** — not a code build. Intercom is already
SDK-wired in the backend (`lib/intercom.js`: `intercom-client`, `INTERCOM_ACCESS_TOKEN`, contact sync by
`externalId`). This ticket turns on Intercom's AI answering and feeds it Gopher's content + history.

Ticket: *"Implement Intercom's feature to learn from existing coms to users along with additional email
conversations pre-intercom implementation."*

---

## What "activate" means (Intercom workspace, admin task)
1. **Enable Intercom's AI agent** — Fin AI Agent (or Custom Answers / Resolution Bot, per plan tier) in the
   Intercom workspace. This is a console toggle + content configuration, not app code.
2. Point it at the knowledge sources below and set the answer/hand-off behavior (auto-answer → escalate to a
   human on low confidence).

## Knowledge sources to feed it (the "learn from existing coms" part)
| Source | Where it lives | How to use |
|---|---|---|
| **Gopher iQ FAQ store (primary KB)** | `Documentation/Dashboard/iq_faq.json` — **182 curated Q&As** | Import as Intercom **Articles / Fin content** — the highest-quality, on-brand answer set. This is the biggest win: the curated brain becomes Fin's knowledge base. |
| **Past Intercom conversations** | Intercom itself | Fin learns from retained conversation history natively — ensure retention is on. |
| **Pre-Intercom email conversations** | export via `Dashboard/export_user_messages.py`; historical support email | Normalize → import as Fin content / past-conversation examples. |
| **In-app chat history** | backend `inbox` + `inbox_users` models | Optional pipe to Intercom (the only code touchpoint — `lib/intercom.js` already has the client). |

## Guardrail — respect the messaging policy
Fin's answers and any surfaced content must honor the **Gopher iQ moderation policy** (off-platform / foul
language) — see G40-35 / `moderation_rules.json`. Cross-ref the in-app communication policy work so AI
replies don't contradict the guard.

## Scope / dependencies
- **Ops-led, not dev-led:** the bulk is Intercom console config + a one-time content import. The only optional
  code is piping `inbox`/`inbox_users` history into Intercom via the existing `lib/intercom.js`.
- **Plan dependency:** requires an Intercom tier that includes Fin AI / Custom Answers (per-resolution cost —
  RFP Annex §3 lists Intercom as a current integration). Confirm the plan before enabling.
- **Data-prep owner:** whoever runs `export_user_messages.py` + assembles the email history for import.

## Acceptance criteria
1. Intercom AI answering (Fin / Custom Answers) is enabled in the workspace.
2. It is trained on: the Gopher iQ FAQ set (`iq_faq.json`), retained Intercom conversations, and imported
   pre-Intercom email/chat history.
3. Low-confidence queries escalate to a human.
4. AI replies respect the Gopher iQ moderation policy (G40-35).

## Notes
- Because Intercom contacts already sync from the backend (`lib/intercom.js` `ensureIntercomContactExists`),
  Fin can attribute conversations to real Gopher users out of the box.
- Ties to the broader Gopher iQ brain (`Documentation/Dashboard/`, `iq_faq.json` / `iq_routing.json`); Fin is
  the consumption side of the same curated content.
