# The five attention labels — review, copy, and one defect (2026-10-03)

Owner said "go" on the attention labels for the home container. **Correction to
what I told him first: all five already exist in the prototype.** I said only
`bid` did. They are in `_prototypes/Request/gopher-request-home.html`.

So this is a review and a tightening, not a blank page — plus one real bug.

---

## 1 · ⛔ DEFECT — `gcancel` renders "Your cancelled"

```js
var who = by || r.hired || 'Your Gopher'
…
type:'gcancel', label: who.split(' ')[0] + ' cancelled — review your options'
```

The first-name extraction is right for a real name — `"Marcus Webb"` → `"Marcus"`.
It breaks on the fallback: `"Your Gopher".split(' ')[0]` → `"Your"`, so the label
reads **"Your cancelled — review your options"**.

Reachable whenever a cancellation arrives without `by` or `r.hired` — a Gopher
cancelling before the hire is recorded, which is exactly when a cancellation is
most likely. The other four interpolate `who` whole and are unaffected.

**Fix:** take the first name only when there is a real name to take it from —
`(by || r.hired) ? (by||r.hired).split(' ')[0] : 'Your Gopher'`.

---

## 2 · Two structural questions, not copy

**`confirm` and `adjust` describe the same event two different ways.**

| | current label |
|---|---|
| `confirm` | "{Gopher} adjusted the charge to $84.00 — confirm to close it out" |
| `adjust`  | "{Gopher} sent a cost adjustment — review, approve or decline" |

A customer cannot tell these apart, and nor can I from the code. If they are
genuinely different moments, the copy has to say how. If they are the same
moment, one of them should go.

**`bid` carries two unrelated events** under one type — a bid above your offer,
and a Gopher accepting your price. Those want different words, and arguably
different urgency.

---

## 3 · Proposed copy

Rule applied: state what happened, then the one thing to do. Warm, direct, not
curt — and never more verbs than the user needs.

| type | now | proposed | why |
|---|---|---|---|
| `bid` (over offer) | New bid from Dana — above your offer | **Dana bid above your offer — review it** | states a fact but no action; adds the next step |
| `bid` (accepted) | Dana accepted — approve to hire | **unchanged** | already does both jobs |
| `rate` | Rate Marcus — job complete | **Job complete — rate Marcus** | lead with the good news, then the ask |
| `gcancel` | Marcus cancelled — review your options | **unchanged** (fix the fallback) | copy is right; the bug is mechanical |
| `confirm` | Marcus adjusted the charge to $84.00 — confirm to close it out | **Marcus adjusted the charge to $84 — confirm to close it out** | drop `.00` on whole amounts |
| `adjust` | Marcus sent a cost adjustment — review, approve or decline | **Marcus sent a cost adjustment — review it** | three verbs in a one-line label; approve/decline live on the detail screen |

---

## 4 · Minor — one fallback, four spellings

`'Your Gopher'` (13), `'your Gopher'` (9), `'the Gopher'` (2), `'A Gopher'` (2).
Same missing-name case, four different renderings depending on the code path.
Worth collapsing to one constant.

---

**Nothing implemented.** This is the review; the defect in §1 is the only item
here that is a bug rather than a preference.
