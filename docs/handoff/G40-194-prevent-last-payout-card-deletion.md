# G40-194 — MERGED into G40-19

**G40-194 was merged into G40-19** (payout-card management umbrella) on 2026-07-07 and is to be **canceled as a
duplicate**. Same worker payout-card recovery flow: a payout fails → the Gopher adds a replacement, and must
never be able to delete their only card mid-recovery and orphan the Stripe account.

The full content — root cause (`lib/payment.stripe.js:583` / `controllers/user/payment.js:383`), the server-side
`length <= 1 → 409 LAST_PAYOUT_CARD` guard, default-card/concurrency edge cases, acceptance mapping, and the
"Attention!" modal (built to G40-308) — now lives in:

➡️ **`docs/handoff/G40-19-payout-failure.md`** → section *"Merged: G40-194 — Prevent deletion of the last payout card"*.

Modals: `docs/handoff/G40-308-modal-kit.html` (`demoB('lastcard')`) · tracked in `docs/handoff/G40-309-modal-dispositions.md`.
