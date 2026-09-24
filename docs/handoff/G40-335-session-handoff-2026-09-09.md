# G40-335 (Stripe PaymentIntent order id) — session handoff, 2026-09-09

**Transcript:** `43dbdf38-f0a2-402a-af9a-eef3670b20d3.jsonl`
**Grep anchors:** `charge_metadata` · `stripe_order_id` · `pi_3UDZC5CQp3eawbpn1EVKqTMj` · `pi_3UD5ZBCQp3eawbpn1qoILY7J` · `G40-335-stripe-metadata-order-id` · `gopher-backend-api!526` · `856126b2` · `g40-335-payment-intent-order-metadata.test.js` · `checkout --ours -- .` · `RECOVERED-referral-qr-spec`

**This lane is CLOSED. No successor needed.** The ticket is Done and waiting on nothing. This
document exists as an index, not because work is in flight.

---

## State of play

**DONE and verified by content on live production.** Every PaymentIntent now carries
`metadata.order_id`. Merged as `gopher-backend-api!526` → `production` (merge `856126b2`, change
`5fb4efda`), CodePipeline deployed, and proven on real orders — not on a fixture.

| Verified 2026-09-09 on `origin/production` | |
|---|---|
| `cal_charges` metadata stamps | 2 (both `payment_options` branches) |
| `change_description` metadata stamp | 1 |
| `create.js` gated on `stripe_charge_token` | 1 |
| `test/g40-335-payment-intent-order-metadata.test.js` | 290 lines |
| Rolled back? | No — production has deployed *past* the merge on later work |

**Doc of record:** `gopher-dev-handoff` → `src/content/docs/platform/payment-flow.md` **§5.1**,
on `origin/main` via `!6`, strengthened by `!10`. Work-registry claim released.

Branch `G40-335-stripe-metadata-order-id` **retained** — delete-source was NO.

---

## The two corrections to the ticket — carry these, do not re-derive them

1. **The ticket blamed the bid-accept flow. Too narrow.** **Seven** call sites create charges
   (`order/create.js`, `order/order_bids.js`, `order/cost_adjustment.js`, `order/update.js` ×2,
   `order/re_schedule.js`, `middleware/crons.js`) and only **two** ever called
   `change_description`. The live failures came from the **re-authorisation** paths. The fix is
   central, in `cal_charges`; no call site changed.
2. **Root cause #3 in the ticket is false.** `create.js` does not keep the requestor description
   when `offer_by_gopher` is truthy — **that branch creates no PaymentIntent at all**, because the
   same flag guards charge creation. The gate was still changed to key on `stripe_charge_token`,
   for a different reason: the flag form fired a Stripe update with an *undefined* intent id
   whenever `charge.create` returned without one, and `change_description`'s own catch made that
   read as a Stripe outage.

---

## Deployed?

**Yes — live 2026-09-08 23:02Z, verified BY CONTENT.** First real order after the deploy:
`pi_3UDY8JCQ…` / order #65307. Best current proof (§5.1 cites it): `pi_3UDZC5CQp3eawbpn1EVKqTMj`,
order **#65308**, `succeeded`, **$124.18 captured**, `metadata {order_id:"65308"}`. **3 of 3**
intents after the deploy carried metadata, against **0 of 40** sampled before.

⚠️ `merge-base --is-ancestor` **is** valid in `gopher-backend-api` and `gopher-dev-handoff` —
ordinary repos. The ⛔ in `CLAUDE.md` is specific to the **Code** repo, whose `main` is a
flattened rsync lineage sharing no history with feature branches.

---

## Uncommitted / disk-only files

**None from this session.** No stashes (the 5 in `gopher-backend-api` all predate 2026-09-04),
no leftover worktrees. The other ` M` files in the shared backend clone predate this session.

---

## Traps that cost time — the highest-value section

- ⛔ **`git checkout --ours -- .` reverts the WHOLE tree, not the conflicted file.** This session
  destroyed four sessions' uncommitted work in `gopher-dev-handoff` with it. Three were recovered
  by luck (a saved patch, two `Documentation/` twins); the fourth — a **+28-line** section of
  `referral-qr-spec.md` — needed an APFS snapshot restore. Memory:
  `git-checkout-ours-dot-reverts-the-whole-tree`.
- **APFS snapshot recovery works and is not hard, but needs Full Disk Access on Terminal — not
  `sudo`.** `sudo mount_apfs` returns *Operation not permitted* without it; **with** FDA no sudo is
  needed at all. `mkdir -p /tmp/snap` first (the mount fails on a missing mount point), then
  `mount_apfs -o ro,nobrowse -s <snapshot> /System/Volumes/Data /tmp/snap`. Snapshots prune within
  ~a day. Turn FDA back off afterwards.
- ⛔ **A transcript search cannot tell a reader from an author.** This session handed the recovered
  file back to the wrong session on a keyword match. `originSessionId` is better — **but it
  identifies the file's creator, not each section's author.** Memory:
  `never-infer-authorship-from-a-transcript-match`.
- ⚠️ **`origin/main..HEAD` counts commit objects, never unpublished *work*.** Cherry-picks and
  separate-MR landings put identical content on both sides under different SHAs. Two sessions
  reported this session's §5.1 as unpublished when it had already shipped via `!6`/`!10`.
- ⚠️ **A green pipeline is green for the base it ran on.** `production` moved **11 commits**
  between !526 opening and merging (G40-11's card verification touches the same file). Rebased and
  re-ran CI before merging; merging on the original pipeline would have been merging blind.
- ⚠️ **A revert can wear a merge's clothes.** `origin/main` held the `!10` §5.1 while local `main`
  held the pre-`!10` version; a careless conflict resolution would have silently restored a
  cancelled intent as the doc's proof. Only a content check tells them apart.

---

## What I would do next, in order — all optional, none blocking

1. **Decide the backfill** (owner-run, described in the ticket). Intents before 2026-09-08 23:02Z
   still need the DB join, and a **superseded** intent cannot be joined from the DB *at all*:
   `orders.stripe_charge_token` is a single column each re-authorisation overwrites and the old id
   is never persisted. Two of order #65270's three intents are permanently in that state.
2. **`transfer_group` is null on every ordinary order** — production always takes the second
   `payment_options` branch, which sets none. Its own ticket; it changes transfer behaviour.
3. **Unrelated but live:** the recovered `referral-qr-spec.md` section says **Refer Yourself and
   the QR code create no referral at all**, against the owner's belief that all four paths counted.
   The September $10-per-referral campaign copy and the Go-side referral numbers both rest on it.
   Four-line fix sketched in that doc; not shipped.

---

## Open questions for John

**None.** The one decision this lane needed — whether to merge to production — he gave directly,
after the what-it-solves / risk / reward disclosure.
