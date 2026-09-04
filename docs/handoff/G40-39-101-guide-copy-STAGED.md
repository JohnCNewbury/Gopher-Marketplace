# G40-39 — 101-guide copy for completion photos — ⛔ STAGED, DO NOT PUBLISH YET

> **This copy is written and ready. It must NOT go into `Final/` until a store release ships the
> completion-photo fixes.** The gate and the reason are below. Everything else in this file is
> paste-ready once that gate clears.
>
> ⚠️ **Deliberately kept OUT of `Final/`.** `scripts/deploy.sh` publishes from the **working tree**,
> so copy sitting in `Final/` can be published by *any* session's `--allow-dirty` run, including one
> that knows nothing about this gate. Staging it here makes early publication impossible by
> accident rather than by discipline.

## The gate — why this is not publishable today

The standing rule (owner, 2026-08-05): **a 101 guide describes what the product *does*, not what it
will do.** Today the completion-photo flow is *partially* live, and the half that is missing is
exactly the half this copy describes.

| Piece | On the current store build | Merged to `production` |
|---|---|---|
| Worker captures photos via `ordercard.js` | ✅ live (a real worker captured one 2026-09-02) | ✅ |
| Worker reaches the photo step from the **Active tab** (`RequestDetailPullOver.js`) | ❌ **skips the step entirely** | ✅ !266 (`3a28f1c21`) |
| Requester sees photos on `orderConfirmation.js` | ✅ live | ✅ |
| Requester sees photos on **`Orderdispute.js`** — the screen a real push notification opens | ❌ **no photo code at all** | ✅ !271 (`18cb0de0f`) |

So on today's shipped apps, a worker completing from the Active tab is never offered the photo step,
and a requester arriving from the "Order Completed" push never sees photos. Publishing copy that
says "you'll be taken to a photo step" and "your Gopher's photos appear above Confirm" would
describe behaviour **most** users cannot get — the precise failure the 101 rule exists to prevent.

**Publish when:** an App Store / Play release containing `3a28f1c21` (Go) and `18cb0de0f`
(Requester) is live to users. Not at merge. Not at TestFlight.

## Accuracy constraints — verified in code, do not drift from these

Checked against `helpers/completion_photo_policy.js` on 2026-09-04:

- **The photo step applies to ALL non-age-restricted orders**, not just Delivery. `applies` is
  `!is_age_restricted(order)` and reads nothing else — no order type, no category.
- **Age-restricted orders never get the photo step** — they run the ID-capture flow instead.
- **Only the *skip-confirmation dialog* is Delivery-specific** (`skip_needs_confirmation` is true
  only when `category_type === 'delivery'`).
- **Photos are optional. Skip is always available.** Never write copy implying they are required.
- **Max photos is served by the backend, currently 3.** Say "up to 3" only while that holds.
- ⛔ **Never promise the requester that photos will appear.** A legitimate skip and an upload still
  in flight are indistinguishable to the requester's app — `photo_requirement` is served only to the
  *Gopher's* app, never the requester's. Absence of photos is not evidence of a problem, and the
  copy must not teach requesters to read it as one.

---

## 1. `Final/gopher-go-101.html` — Step 7, "Update & complete"

### 1a. Stepper, step 3 — REPLACE the `sd` text

The stepper currently ends the worker's journey at "Completed", which is no longer the last thing
they do.

**Find:**
```html
<div class="stp"><div class="sc">3</div><div class="sh">Completed</div><div class="sd">Signals the job is done — one step from your payout. As soon as the customer confirms, you're paid.</div><span class="gps">📍 GPS + time stamped</span></div>
```

**Replace with:**
```html
<div class="stp"><div class="sc">3</div><div class="sh">Completed</div><div class="sd">Signals the job is done. On most jobs we'll ask for a quick photo next — then it's one step from your payout. As soon as the customer confirms, you're paid.</div><span class="gps">📍 GPS + time stamped</span></div>
```

### 1b. The completion-photo note — REPLACE entirely

The existing note undersells this badly: it reads as an optional profile-boosting nicety, when the
app now actively walks the worker into a photo step.

**Find:**
```html
<div class="note info"><span class="nico">📸</span><div>Adding a completion photo (when relevant) is a great way to verify the job was finished right — and it boosts your profile when customers review your previous jobs.</div></div>
```

**Replace with:**
```html
<div class="note info"><span class="nico">📸</span><div><span class="h">After you tap Completed: the photo step</span>On every job that isn't age-restricted, tapping <b>Completed</b> takes you straight to a photo screen. Add <b>up to 3 photos</b> from your camera or gallery, then tap Submit. Your customer sees them on their confirmation screen — the screen where they release your payout — so a clear photo of the finished work is the fastest way to get confirmed without questions. <b>You can Skip</b>; on deliveries we'll ask you to confirm that you meant to. Photos also build your profile, which is one of the biggest drivers of getting requested by name.</div></div>
```

### 1c. Age-restricted section — no change needed

The A/R section already correctly describes the ID-photo requirement, which is a *different* flow.
Leave it alone; do not cross-reference the completion photo step there, since A/R jobs don't get it.

---

## 2. `Final/gopher-request-101.html` — "Confirm & rate"

### 2a. The confirm steps — REPLACE the intro line and step 1

**Find:**
```html
      <p>When your Gopher marks the job complete, you'll get an app notification and a text. Tap through to the confirmation screen.</p>
      <ol class="brand">
        <li>Tap <b>Confirm</b> once you've verified the job was done right.</li>
```

**Replace with:**
```html
      <p>When your Gopher marks the job complete, you'll get an app notification and a text. Tap through to the confirmation screen.</p>
      <ol class="brand">
        <li><b>Check the photos, if your Gopher left any.</b> On most jobs your Gopher is asked for a photo of the finished work, and it appears under <b>View pic(s) of completed request</b> right above the Confirm button. Tap any thumbnail to see it full size.</li>
        <li>Tap <b>Confirm</b> once you've verified the job was done right.</li>
```

### 2b. Add a note after the steps — INSERT

Insert immediately **after** the closing `</ol>` of that list and **before** the existing
"Confirm promptly" warn note:

```html
      <div class="note info"><span class="nico">📸</span><div><span class="h">No photos there?</span>Photos are optional for your Gopher, and some jobs don't suit one — so a request with no photo isn't a red flag on its own. If a photo was taken seconds ago it may take a moment to appear. Judge the work, not the photo count; if something's genuinely wrong, use <b>Dispute</b> rather than withholding confirmation.</div></div>
```

### 2c. History section — INSERT one line

The photos stay with the request afterwards (Scenario 8, MR !269). Add to the
`id="history"` section, right after the opening paragraph about **Previous requests**:

```html
      <p>Completed requests keep their <b>photos of the finished work</b> too — open one and they're on the card, same as on the confirmation screen.</p>
```

---

## Before publishing — the checklist that applies to this repo

1. Confirm the store release actually shipped both commits (see gate above). Verify the **shipped
   build**, not the branch.
2. Paste all three blocks. **Do not string-replace** — the 2026-08-05 Deals incident came from
   exactly that (see the 101-guide standing rule).
3. Mobile-verify at **375px** before publishing (`mobile-verify-before-publishing`).
4. Scope-check the deploy dry-run file list: a push to `main` publishes to **both** GitHub Pages and
   TigerTech, and the deploy reads the **working tree**.
5. Content-verify after: `curl` both live hosts and grep for `View pic(s) of completed request`.
   A 200 only proves the file exists.
