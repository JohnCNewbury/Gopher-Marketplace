# G40-10 — on-device test pass

**Ten minutes. One notched iPhone (14 or later) + one Android.** Run it on the release build,
before the ramp if possible.

**Why this exists:** everything about this screen was verified by driving the real component in a
browser. That caught the logic and the copy. It **cannot** see the two things most likely to
break on a handset, and it passed the screen three times while one of them was live.

**Prerequisite — check the build actually contains it.** The screen is only in a build carrying
`f2d07f156` (the screen), `!279` (copy v3) and `!283` (the safe-area fix), all on `production`.
If item 4 reads "Need ASAP" rather than "Need it Now", the build predates `!279` and the rest of
this pass is measuring the wrong thing.

**How to reach it:** it is the **last step of Gopher Go sign-up**, immediately after the Payout
account screen. You need a fresh worker account that reaches payout — an existing account will
not show it, because nothing re-prompts (see #7).

---

## The seven checks

**1 · The CTA takes a tap — iPhone only, and this is the important one.**
Tick all nine items, then tap **Understood & Ready To Go!** *without* scrolling first.
→ **Pass:** it responds on the first tap.
→ **Fail:** nothing happens, and it still does nothing on a second tap, but it works if you scroll
the page slightly first. That is the home-indicator strip eating the touch, not a dead handler.
*Measured before the fix: 2–9pt of clearance above the gesture zone. `!283` should have moved it
to ~39pt. This check confirms the fix landed on a real device.*

**2 · The two links open, and come back.**
Tap **How To Use Gopher Go** (item 1), then **Work Settings & Radius** (item 2).
→ **Pass:** each opens its page, and you can return to the checklist with your ticks intact.
→ **Fail, and this strands a worker mid-sign-up:** it opens *inside* the app with no back
affordance, or it does nothing at all. `window.open(url, "_blank")` in a Capacitor webview can do
either. **If this fails, it blocks the release** — the worker cannot finish sign-up.

**3 · A link tap does not tick its item.**
→ **Pass:** the row is still unticked when you return.

**4 · The CTA is genuinely locked until nine of nine.**
Tick eight. The button must stay grey and do nothing. Tick the ninth — it turns navy.

**5 · It renders on a small screen and an old iOS.**
On an SE-sized phone the content is taller than the viewport and the page must **scroll** to the
button. On **iOS 15.0–15.3** specifically, confirm the screen is not collapsed or clipped — below
15.4 the sizing token falls back to `100vh`, a path no desktop browser exercises.

**6 · Type and touch targets.**
Urbanist renders (not a system fallback), and each of the nine rows is comfortably tappable with a
thumb — the whole row is the target, not just the box.

**7 · Confirm, then relaunch. Know what you are looking at.**
Confirm, land in the app, force-quit, reopen.
→ **Expected:** straight into the app. **You will not see the checklist again, and that is correct
as built** — nothing gates on the acknowledgment, by design. Only worth reporting if you *do* get
re-prompted, which would mean the ack write failed silently.

---

## What "fail" means

| Check | If it fails |
|---|---|
| 2 — links strand the worker | **Blocks the release.** Sign-up cannot be completed. |
| 1 — CTA tap | **Blocks the release.** Same: sign-up cannot be completed. |
| 4 — gating | Blocks. The acknowledgment is meaningless if the CTA opens early. |
| 5 — old iOS | Assess. Depends how badly it renders and on the 15.0–15.3 install base. |
| 3, 6 — link tick, type | Ship and fix next release. Cosmetic or minor. |

Record results in `TESTING-FINDINGS-LEDGER.html` alongside the rest of the release pass.
