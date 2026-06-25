# CLAUDE.md — Gopher Marketplace

## What this is

This repository is an **AI-generated static HTML prototype** for "Gopher Marketplace."
It is a **visual blueprint, not production code.** Do not treat it as a real, working
platform. It exists to be handed off to a human developer who will perform a
production rebuild.

Every page is self-contained static HTML (no build step, no framework, no backend).

## Repository layout

The prototype lives in the **`Final/`** folder — that folder is the **site root**
(the page served at the GitHub Pages URL is `Final/index.html`, and pages reference
each other and their assets relative to `Final/`). It contains ~132 HTML pages plus
`.css` files, `.mp4` scene videos, and image assets.

`Final.zip` is the original archive `Final/` was extracted from; it is kept only as a
backup and is not part of the served site.

## Scope of AI work (important)

Limit all AI work to **cleanup, documentation, and front-end reference fixes.**

**Do NOT implement or modify any of the following — they are reserved for a human
developer:**

- Payments / billing
- Authentication / accounts
- Database / persistence
- Matching logic (connecting requesters and "Gophers")
- Security logic

If a task seems to require any of the above, stop and flag it rather than building it.

## Deployment constraints (these cause real bugs)

The prototype is deployed via **GitHub Pages at a subdirectory URL:**

> https://johncnewbury.github.io/Gopher-Marketplace/

Two consequences follow directly from this, and both are easy to get wrong:

1. **All paths must be relative — never root-absolute.**
   Because the site lives under the `/Gopher-Marketplace/` subdirectory, a leading
   slash resolves to the domain root, not the project root.
   - ❌ `/scenes/delivery.mp4` → 404
   - ❌ `<a href="/index.html">` → 404
   - ✅ `scenes/delivery.mp4`, `./delivery.mp4`, `index.html`
   This applies to **every** href, src, link, and asset reference (pages, videos,
   images, CSS, JS).

2. **File references are case-sensitive.**
   GitHub Pages serves on **Linux**, which is case-sensitive, even though macOS
   (where these files were authored) is not. A reference must match the actual
   filename casing **exactly**, character for character.
   - If the file is `Junk-Removal.mp4`, then `junk-removal.mp4` will 404 on the
     live site even though it "works" locally on macOS.
   - When fixing references, verify against the real filename, not from memory.

## Known issues

These are known and expected in the prototype. Document/clean them as appropriate;
do not assume they indicate deeper problems.

- **Very large, base64-bloated pages.** Several HTML files embed large base64 assets
  inline, making them multi-megabyte. (e.g. `gopher-connect.html`,
  `gopher-request.html`, and `index.html` are each in the megabytes.) These should
  eventually be replaced with external asset references in the production rebuild.
- **Duplicate element IDs.** The same `id` value appears on multiple elements within
  a page. This is invalid HTML and breaks `getElementById`-style lookups.
- **Demo-only JavaScript.** Some functions are placeholders/stubs that only simulate
  behavior for the prototype. Known demo-only functions include:
  - `bookService`
  - `analyzeUpload`
  - `contactSupport`
  These do not perform real work and must not be relied on as functional logic.

## How to work in this repo

- Treat every page as **reference/blueprint output**, not as a system to extend.
- When fixing front-end references, prefer relative paths and exact-case filenames.
- Keep changes scoped to cleanup, documentation, and reference correctness.
- Do not introduce backend behavior, real data flows, or security/auth/payment code.
