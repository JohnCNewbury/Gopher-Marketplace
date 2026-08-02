# Screen Implementation Spec — how to use this folder

**Start at [`index.html`](index.html)** (open it in a browser — everything is static,
no build step). One card per screen, grouped by app: Gopher Go (worker) and Gopher
Request (customer).

## What each screen page gives you

| Section | What it is | Where it comes from |
|---|---|---|
| Reference PNG | The whole screen, full scroll height, 2x | Captured from the rendered prototype |
| Component tree | Real DOM: class names, rendered sizes, text, what's interactive and where it navigates | Extracted from the rendered prototype |
| Token table | Every painted color/radius/font → its design-token name, or "literal, needs a token" | Extracted from the rendered prototype |
| Behaviour · endpoints · verdict | The rules the screen must obey, the backend seams it touches, and whether live code REUSEs / ADAPTs / is NET-NEW under the reskin | Authored (`notes/<id>.md`) |

For flow-level logic behind any screen (fees, counters, states, money movement), the
authored notes cite the canonical + as-built flow docs in the `gopher-dev-handoff`
repo — those are the deep source; this spec is the screen-by-screen index into them.

## The one rule

**This spec is generated from what the prototype RENDERS. Never edit the generated
files by hand, and never maintain a second copy of the UI in any tool (Figma
included).** The previous Figma-synced copy drifted into partial wrongness and was
quarantined (`_prototypes/Go/_day1-figma-archive/`) — that is the failure mode this
system exists to prevent. If a Figma deliverable is ever required, it must be
published *from* the generator output, one-way.

## Regenerating (after any prototype screen change)

```bash
# serve a COPY of the repo (not the Desktop tree — macOS TCC blocks Chrome from it)
python3 -m http.server 8141 --directory <repo-copy>

python3 scripts/screen-spec/gen-screen-spec.py     # all screens; args = subset of ids
python3 scripts/screen-spec/render-spec-site.py
```

The run is deterministic and idempotent: if nothing changed, the git diff is empty.
Any diff is the prototype change showing up — review it like code. (If results look
stale, check nothing else is already listening on port 8141.)

- Authored notes live in `notes/<id>.md` — the only hand-written files here; a page
  whose note is missing says so on the page rather than looking finished.
- Screens ship to the spec only if they render; a screen that breaks simply drops
  out of the next run, which is itself the signal.
