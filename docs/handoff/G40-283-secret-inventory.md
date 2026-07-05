# G40-283 (SEC-1) — Full secret-exposure inventory & rotation plan

**Type:** Task · **Priority:** Highest · `security` · **Status:** groomed dev-ready — 2026-07-03.
Procedure: `Documentation/Jira Tickets/SEC-1-runbook.md` (+ `purge-secrets.sh`).
**Authoritative source for the full exposure:** `Documentation/AWS/Gopher-AWS-Infrastructure-and-Cost-Advisor-Recap.html` (and `Documentation/RFP/Gopher-AWS-Advisor-Recap.html`) + `Documentation/RFP/Gopher-Capacitor-and-Appflow-Brief.md` §6.
**No secret values recorded here — names / identifiers only.**

> ⚠️ **Scope reframe.** The ticket title says "committed" secrets, but the committed files are the *smallest* of **three** exposure surfaces. The real remediation (and the AWS recap's "Phase 0.5") rotates **all** live credentials regardless of where they sit — same effort, one pass. Treat SEC-1 as "rotate every live secret + purge the repo," not just the two files.

## Surface 1 — Git repo (verified in the June-2026 `gopher-backend-api` export)
Public since **2021-06-29** (`74587338`).
- **In HEAD + history:** `private.key` (RSA — app JWT signing key) · `serviceAccountKey.json` (Firebase/GCP service account, project `gopher-inc`, key id `b5a780fd5f497660ec1080777329c3c10ece2b0b`, live `private_key` confirmed).
- **History only** (`.gitignore` now blocks `.env*`, but they persist in history): `config/serviceAccountKey.{js,json}` (dup SA key) · `.env.dev` / `.env.development` / `.env.local` / `.env.qa` (live creds for AWS, Stripe, Twilio, SendGrid, Bing, Firebase, DB). `.env.sample` = template.
- No inline provider keys elsewhere in source (scanned `sk_live`/`AKIA`/Twilio SID/SendGrid/PEM).

## Surface 2 — Production Elastic Beanstalk environment (~40 plaintext properties) — the LARGEST surface
Per the AWS Advisor Recap: the prod EB environment stores ~40 properties as **Plain text**, including live credentials. By name:
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STRIPE_API_KEY` (live), `TWILIO_AUTH_TOKEN`, `SENDGRID_API_KEY`, `IDENFY_API_KEY` / `IDENFY_API_SECRET`, `INTERCOM_ACCESS_TOKEN`, `BING_API_KEY`, `ACCESS_TOKEN_SECRET_KEY` / `REFRESH_TOKEN_SECRET_KEY` (JWT signing secrets), `ADMIN_SECRET`.

## Surface 3 — Ionic Appflow build environment
Per the Capacitor/Appflow brief §6: an **Intercom key** is visible in the build env; build secrets `REACT_APP_MOBILE_CONFIG_TOKEN` and `SENTRY_AUTH_TOKEN` are present (masked in UI — confirm rotated alongside the rest).

## Rotation — do FIRST, in blast-radius order (from the recap's Phase 0.5)
1. **AWS IAM key** + **live Stripe key** — financial/infra exposure, rotate first.
2. Then **Twilio**, **SendGrid**, **iDenfy**, **Intercom**, **Bing**, **Google Maps**.
3. Then **DB password** + **JWT secrets** (`ACCESS/REFRESH_TOKEN_SECRET_KEY` **and** the committed `private.key`) — rotating JWT signing **forces all users to re-login**; schedule it.
4. **Firebase** — delete SA key id `b5a780fd…` on project `gopher-inc`, regenerate (covers both JSON files and any `FIREBASE_PRIVATE_KEY`).

Old values must be **dead** before the history rewrite.

## Destination (stop storing plaintext)
- Move all secrets to **AWS SSM SecureString / Secrets Manager**; app reads from there.
- **Replace the static AWS key with an EC2 instance role** so no AWS key lives in the env at all.
- Commit a `.env.example` (names, not values).

## Purge the repo
`purge-secrets.sh` currently lists only two files. Extend to the full set:
```
./purge-secrets.sh private.key serviceAccountKey.json \
  config/serviceAccountKey.json config/serviceAccountKey.js \
  .env.dev .env.development .env.local .env.qa
```
Then force-push all branches + tags; everyone re-clones (coordinate a freeze).

## Prevent recurrence — companion files (BUILT, staged in `Documentation/Jira Tickets/SEC-1-companions/`)
Drop-in folder mirroring the backend repo layout (see its `README.md` for the copy map):
- **`.env.example`** — complete NAMES-ONLY template, 57 real `process.env` keys grouped, secrets flagged (derived from the actual export, not guessed). Firebase note: creds load from the committed `serviceAccountKey.json` **file** (no `FIREBASE_*` env keys in current code) — that's why the file exists; mount it from a secret store instead.
- **`gitignore-additions.txt`** — adds `private.key` + `serviceAccountKey.json` (the `.gitignore` miss that caused this) + `config/serviceAccountKey.*`, env, and `*.pem/*.p12/*.key` patterns.
- **`.github/workflows/gitleaks.yml`** — blocking CI scan (full history, every push/PR).
- **`.pre-commit-config.yaml`** — local gitleaks hook.
- Runbook §2–4 updated to reference these; purge example corrected to the full 8-path list.

## Adjacent (tracked elsewhere, flagged here so they aren't missed)
- **DB TLS** `rejectUnauthorized:false` — encrypted but unauthenticated; verify against the current Aurora CA. (Separate SEC/bucket-G item.)
- Background uploader **JWT refresh** — confirm it refreshes (ties to the worker socket-auth "health flap").

## Acceptance
All exposed credentials rotated + old values rejected by each provider · repo files gone from tree **and** history (`gitleaks detect --log-opts=--all` clean) · app reads secrets only from SSM/Secrets Manager · static AWS key replaced by instance role · CI secret-scan + pre-commit active.
