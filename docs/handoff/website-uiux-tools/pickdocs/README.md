# Pick docs and run sheets — the builders this seat used on 10/16

John decides UI **stage by stage, three options each**, on a **pick doc** (G40-596 model: Save-pick bars that
write to the artifact's db collection `rulings`). After every deploy he gets a **run sheet** (rows with
Pass / Fail / note that write to db `results`). Never a markdown table for either.

Copy a folder into your scratchpad, edit, build, look, publish. Don't build in the repo.

| Folder / file | Use it for | Example published from it |
|---|---|---|
| `page-mock/` | A stage where the options are **layouts**: each option is drawn as the real page section, at desktop width and inside a 375 px phone frame. `build.py` holds the section templates + `OPTS`; `template.html` holds the doc chrome, the page's own CSS (scoped under `.stage`) and the pick-bar script. | Pro/Pro+ stage 2, the tiers page — https://claude.ai/artifact/BvfSmTiBT1JFrnn3fSwfHn |
| `text-diff/` | A **copy-only** stage: every changed sentence as *where / now / after*, per option. | Pro/Pro+ stage 5, four blog posts — https://claude.ai/artifact/PXWDVxapwYZBkrsjqAJiHo |
| `runsheet-template.html` | The run sheet after a deploy. Edit the header chips, the tip, and `ROWS` (G rows = John's, C rows = yours). | Stage 5 run sheet — https://claude.ai/artifact/THGUw7SkXWLKcDdzpMEN5r |

## Steps that are not optional (each one bit someone)

1. **Facts first, then options.** Every name, badge, price, perk or rule on an option must be read from the
   live app / backend code (`git show origin/production:<file>` in `Dev/gopher-mobile-*` and
   `Dev/gopher-backend-api`, no checkout changes in Dev) or from the live page it claims to match. Cite the
   file in the doc. If you couldn't check it, say so in the option text.
2. **Images go in `img/`** next to `index.html` and are published with `files` (`root` = the doc folder).
3. **Look before publishing** — serve the folder with a temporary entry in the MAIN checkout's
   `.claude/launch.json` (python http.server), `preview_start`, check desktop + 375 px. The local file has no
   `<meta viewport>` (the publish wrapper adds it): inject one in the console before measuring phone width.
   Use HTML entities, not literal — → ’ “ ”: a local server sends no charset and they show as mojibake.
   Remove your launch.json entry when done.
4. **Publish** with `capabilities: {"db":{}, "user":{}}`, icon `badge` (pick docs) / `checklist` (run sheets).
5. **Prove the save path**: `ArtifactData set rulings/probe` → `get` → `delete` with `if_version`.
6. `Artifact open` it for John, then read the pick with `ArtifactData list rulings` when he says he saved.
7. Run sheets: pre-fill your C rows with `ArtifactData batch` (`by: "Claude"`) only AFTER the 3-host check passes.

A published doc's full HTML can always be read back with `Artifact read <url>` — that is how to reuse any
earlier doc (e.g. the stage 1/3/4/6 docs listed in the 10/16 PM handoff).
