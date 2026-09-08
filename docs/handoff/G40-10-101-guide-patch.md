# G40-10 — the `gopher-go-101.html` patch, staged NOT applied

**Status: written, deliberately not merged into the guide. Apply it on release day.**

## Why it is not applied

`Final/gopher-go-101.html` is **live and public** — linked from the header and footer on every
page of the site (`assets/js/gopher-header.js`, `assets/js/gopher-footer.js`). Real workers read
it. _(It is not in `sitemap.xml`; the header/footer links are what make it reachable.)_

The Best Practices Confirmation screen is **not in any shipped build**. `!247` is not merged,
and 3.9.2 reached 100% on both stores on 2026-09-07 without it. Publishing this section today
would describe a screen no worker can reach.

That is precisely the rule from 2026-08-05: **the guide describes what the product does, not
what it will do — if a feature isn't built, don't document it as working.** So the section is
written and parked here, and goes in with the store release.

**Apply when:** a build containing `!247` is live in both stores. Same gate as closing G40-10.

## The review itself (2026-09-08) — read, not string-matched

The guide walks sign-up as five sidebar sections ending at **Work settings & radius**, and its
intro states the count out loud: _"First you'll set up your account (**5 quick sections**)."_
G40-10 adds a sixth, after payout. **Three edits**, below.

Also noted, not changed:

- **Two tutorials are now public and they are not the same page.** The shipped checklist links
  to **"How To Use Gopher Go"** at `gophergo.io/become-a-gopher/gopher-go-support/` (owner
  ruling, 2026-09-08 — the *current* tutorial). This guide, `gopher-go-101.html`, is the
  Marketplace-era rebuild and is already public. A worker can reach both. **Owner may want to
  decide which one the header/footer "Tutorials" menu should point at**, but that is not
  G40-10's to settle.
- **Section ordering not verified.** The guide places payout *before* work settings; the
  prototype's `SIGNUP_IDS` has work settings *before* payout. `ONBOARDING_STEPS` in
  `src/utils/onboarding.js` is a set of completion flags and does not by itself establish the
  screen order, so **I did not confirm which is right** — flagging rather than asserting.
  Pre-existing either way, and independent of this patch.

## Edit 1 — sidebar, after the Work settings entry (`Final/gopher-go-101.html:351`)

```html
      <li><a href="#settings">Work settings &amp; radius</a></li>
      <li><a href="#best-practices">Confirm the best practices</a></li>
```

## Edit 2 — the count claim (line ~405)

`<b>5 quick sections</b>` → `<b>6 quick sections</b>`

## Edit 3 — the new section, immediately after `</section>` of `id="settings"` (~line 481), before `<!-- STEP 1 ... -->`

```html
    <!-- BEST PRACTICES  (G40-10) -->
    <section class="section" id="best-practices">
      <span class="eyebrow">Getting started</span>
      <h2>Confirm the best practices</h2>
      <p>The last step before the app opens up. Nine short commitments about how work gets done on Gopher Go — tap each one to confirm you've read it. <b>Understood &amp; Ready To Go!</b> stays greyed out until all nine are ticked.</p>
      <p>They cover the ground you'd expect: review the <b>How To Use Gopher Go</b> tutorial and set your radius before your first job, message the Requester when a job isn't clear, keep <b>Need it Now</b> jobs inside the hour, send an intro message when you accept, update your progress promptly and in the right place, stay courteous, hand age-restricted deliveries over in person, and finish what you accept. Read the exact wording on the screen rather than here — that is the version recorded against your account.</p>
      <div class="note tip"><span class="nico">🔗</span><div><span class="h">Two items link out</span>The <b>How To Use Gopher Go</b> tutorial and the <b>Work Settings &amp; Radius</b> walkthrough open in your browser. Tapping a link won't tick that item — you still confirm it yourself.</div></div>
      <div class="note warn"><span class="nico">📌</span><div><span class="h">You may see this again</span>Your confirmation is saved with the version of the list you agreed to. If the wording changes later, you'll be asked to confirm the new version once — nothing else about your account changes.</div></div>
    </section>
```

**Deliberately not reproduced here: the nine items verbatim.** A second copy of that text is a
second thing to keep in step, and this list has already drifted three ways (day-1 Figma →
prototype → `!247`). The app's `CHECKLIST` is the one copy, and it is versioned; the guide
summarises and points at it.
