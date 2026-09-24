"""Single definition of where the screen spec is READ FROM and WRITTEN TO.

WHY THIS FILE EXISTS: three scripts emit into the spec directory —
gen-screen-spec.py, render-spec-site.py and audit-conformance.py. When the
destination moved (owner, 2026-08-03), two of them were listed and the third was
not. Repointing them individually would have left the audit silently recreating
the spec inside the PUBLIC repo after the move — re-publishing the exact content
the move exists to protect. One definition, imported everywhere, makes that
class of miss impossible.

READ side  : the Code repo — the prototypes live here and are served on :8141.
WRITE side : the PRIVATE handoff repo. The spec's notes/*.md carry VERDICT lines,
             fee/counter rules and REUSE-vs-NET-NEW scope boundaries, which are
             procurement-sensitive and do not belong in a public repo.

Override with GOPHER_SPEC_OUT to write elsewhere (CI, a scratch run, a fork).
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))

# The Code repo root — prototypes, tooling. Two levels up from scripts/screen-spec/.
REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))

# "All New Gopher" — the shared parent of the Code repo and Dev/ clones.
_WORKROOT = os.path.abspath(os.path.join(REPO, "..", "..", ".."))
_HANDOFF_REPO = os.path.join(_WORKROOT, "Dev", "gopher-dev-handoff")

OUT = os.environ.get("GOPHER_SPEC_OUT") or os.path.join(_HANDOFF_REPO, "screen-spec")
NOTES = os.path.join(OUT, "notes")


def require_destination():
    """Fail loudly rather than writing 15 MB into a directory that isn't the repo.

    Without this, a missing/renamed/unmounted handoff clone would silently create a
    stray tree that nobody commits and nobody finds — the spec would look generated
    and be nowhere.
    """
    if os.environ.get("GOPHER_SPEC_OUT"):
        return                      # explicit override: caller owns the path
    if not os.path.isdir(os.path.join(_HANDOFF_REPO, ".git")):
        sys.exit(
            f"destination repo not found: {_HANDOFF_REPO}\n"
            "  The screen spec is written into the PRIVATE handoff repo.\n"
            "  Clone it, or set GOPHER_SPEC_OUT to write somewhere else."
        )
