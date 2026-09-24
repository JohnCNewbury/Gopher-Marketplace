# Help Center rebuild — the 101-guide update, prepared and deliberately NOT applied

**Status: STAGED. Do not apply until the store build ships.**

The Help Center in both apps was rebuilt on 2026-09-10 (no ticket — owner request
in session). Two mismatched buttons under three undifferentiated paragraphs became
three buttons on one geometry, in the owner's stated order:

> **Gopher Go / Gopher Request Tutorial → FAQs → Message Support**

Merge requests, both targeting `production`:

| Repo | MR |
|---|---|
| `gopher-mobile-gopher-capacitorjs` | [!301](https://gitlab.com/gophergo/gopher-mobile-gopher-capacitorjs/-/merge_requests/301) |
| `gopher-mobile-requester-capacitorjs` | [!312](https://gitlab.com/gophergo/gopher-mobile-requester-capacitorjs/-/merge_requests/312) |

> ## ⛔ WHY THIS IS NOT APPLIED
>
> The standing rule is that **a user-facing change is not done until its 101 guide is
> updated** — and the equally standing rule is that **the guide describes what the
> product does, not what it will do.** Right now the tutorial button does not exist in
> any released build; it exists in two unmerged MRs. Publishing §1 below today would
> put a button in the guide that nobody can find in their app.
>
> Apply when the **Appflow store build with this change is live in both stores**, not
> when the MRs merge and not when the branches deploy. Same gate, and the same reason,
> as `G40-203-live-tutorial-copy.md`.
>
> **§2 is different — it is wrong today and stays wrong after the build ships**, so it
> can be applied at any time, independently of the rest.

---

## 1 · New bullet — BOTH guides, in "Need help?" (§`#help`)

The tutorial is the whole point of the change and neither guide mentions it. Add it as
the **first** bullet of the list, because the in-app order is now tutorial-first and the
guide should not contradict the screen.

### `Final/gopher-go-101.html` — insert above the "Ask Gopher iQ" bullet

```html
<li>Open <b>More Stuff → Help Center → Gopher Go Tutorial</b> — the full walkthrough of how the app works, start to finish. It is the first button on the screen for a reason.</li>
```

### `Final/gopher-request-101.html` — insert above the "Tap More → Help Center" bullet

```html
<li>Open <b>More → Help Center → Gopher Request Tutorial</b> — how to post a request, start to finish. It is the first button on the screen for a reason.</li>
```

⚠️ **Do not link these to `gopher-faqs.html`.** The in-app buttons point at the live
Elementor pages — `gophergo.io/become-a-gopher/gopher-go-support/` and
`gophergo.io/hire-a-gopher/gopher-request-support/` (both verified 200, titled
"Gopher Go Tutorial" / "Gopher Request Tutorial"). `gopher-faqs.html` is the prototype
FAQ page and is a different destination from the app's FAQs button as well; that
mismatch predates this work and is **not** in scope here.

---

## 2 · A correction — `Final/gopher-request-101.html`, and it is live-wrong TODAY

Line ~784 currently reads:

> `<li>Tap <b>More → Help Center</b> in the app, then <b>“Send us a message.”</b></li>`

**There is no "Send us a message" anywhere in the Request app.** The button has read
**Message Support** since before this rebuild (`IntercomChatButton.js`), and it still
reads Message Support afterwards. A requester following this guide is hunting for a
control that does not exist.

**Replace with:**

```html
<li>Tap <b>More → Help Center → Message Support</b> in the app — it opens a chat with us right there.</li>
```

This one is safe to apply now: it describes the CURRENT build, not the pending one.

---

## 3 · Checked and deliberately left alone

- **Sidebar "Still stuck?" blocks** (both guides, ~line 385) — *"The Help Center lives
  under More Stuff / More in the app."* Still true; the entry point did not move, only
  what is inside it.
- **Go's "Ask Gopher iQ" bullet** — iQ is in the Help *screen*, a different surface from
  the Help Center gateway this rebuild touches. Unaffected.
- **`gopher-faqs.html` links** in both guides — see the warning in §1. Pre-existing
  divergence from the app's FAQ destination; raising it is a separate decision.

---

## 4 · How to apply

⚠️ `Final/` is the live site root and `scripts/deploy.sh` **reads the working tree** and
publishes to **both** GitHub Pages and TigerTech. This clone is shared, so scope-check
the dry-run file list before `--push` and get an owner OK on anything in it that is not
these two files.
