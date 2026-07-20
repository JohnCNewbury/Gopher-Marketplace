# App Prototypes — how to run them

`Go/` and `Request/` are the two phone prototypes; `split-screen.html` runs both side by side
against one shared in-browser database.

## Serve from the REPO ROOT — not from this folder

Both phones pull shared logic out of the live site tree with relative paths:

    ../../Final/assets/js/gopher-iq-data.js         # the coverage / location "data brain"
    ../../Final/assets/js/gopher-message-guard.js   # in-app messaging moderation
    ../../Final/assets/js/gopher-request-logic.js   # shared request logic (flow page)
    ../../Final/assets/img/01-delivery.webp         # Delivery / Errand category photo

`../../` from `_prototypes/Request/` resolves to the repo root, so the document root must be
`…/Claude Code Review:Cleanup/Code/`. Serving `_prototypes/` directly puts those files outside
the root and every one of them 404s.

```bash
cd "…/Claude Code Review:Cleanup/Code"
python3 -m http.server 8123
# then open http://localhost:8123/_prototypes/split-screen.html
```

Use **port 8123** — it is the port on the Google Maps API key's referrer allowlist. Maps-backed
features (ride distance pricing) die silently on any other port, and `file://` can never be
allowlisted.

## Why this matters more than it looks

Only one of those 404s is visible: the Delivery / Errand card shows a broken-image icon. The
rest fail **silently** — `gopher-iq-data.js` missing means ZIP/city coverage answers and the
FAQ pill's location tier quietly stop working, while the demo otherwise looks perfectly healthy.
That is an easy way to review the prototypes and reach a wrong conclusion about them.

`split-screen.html` therefore self-checks ~2.5s after boot and replaces the status line with a
loud warning if either phone came up without `GopherIQData`. If you see that banner, your
document root is wrong — it is not a bug in the apps.

## Scratchpad copies

Browser-pane preview servers cannot read the Desktop tree (macOS TCC), so sessions typically
`rsync` `_prototypes/` **and** `Final/` into a scratchpad dir and serve that. Copy both, keeping
them siblings — copying only `_prototypes/` reintroduces exactly the breakage above.
