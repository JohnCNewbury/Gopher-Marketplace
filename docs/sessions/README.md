# docs/sessions — internal session briefs

**Not dev-partner documentation.** Everything in this folder is a work order written for a
Claude Code session: objectives, pass criteria, environment traps, tooling paths.

Dev-facing material lives in **`docs/handoff/`**. Keep the two apart — a session brief sitting
in the handoff folder reads to an incoming developer like unfinished scaffolding, and buries the
documents they actually need.

| Folder | Audience | Contains |
|---|---|---|
| `docs/handoff/` | the incoming dev partner | flow specs, as-built audits, build seams, ticket detail |
| `docs/sessions/` | a Claude Code session | objectives, pass criteria, tooling, environment traps |

Both are excluded from the deploy (`EXCLUDE` in `scripts/deploy.sh`), so nothing here publishes
to the live site.
