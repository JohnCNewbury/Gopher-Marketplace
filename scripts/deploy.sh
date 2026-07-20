#!/usr/bin/env bash
#
# deploy.sh — publish Final/ to the `main` branch (GitHub Pages).
#
# WHY THIS EXISTS
#   The deploy copies from the WORKING TREE, not from committed state. On
#   2026-07-19 that silently shipped 141 uncommitted files to production
#   alongside an unrelated feature. They happened to be finished work; next
#   time they might not be. This script refuses to run against a dirty tree.
#
# WHAT IT DOES
#   Final/ is flattened to the root of `main` (Final/index.html -> /index.html),
#   because GitHub Pages serves `main` at
#   https://johncnewbury.github.io/Gopher-Marketplace/
#
# USAGE
#   scripts/deploy.sh                 # dry run — checks + diff, changes nothing
#   scripts/deploy.sh --push          # actually commit + push to main
#   scripts/deploy.sh --push -m "..."  # with a custom commit message
#
#   --allow-dirty   deploy anyway with an unclean tree. Deliberately verbose;
#                   you are shipping code that exists nowhere in git history.
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO/Final"
BRANCH="main"
WORKTREE="$(mktemp -d)/gopher-deploy"

PUSH=false; ALLOW_DIRTY=false; MSG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)        PUSH=true; shift ;;
    --allow-dirty) ALLOW_DIRTY=true; shift ;;
    -m)            MSG="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Files that live on `main` but NOT in Final/. rsync --delete would wipe these.
# .nojekyll is load-bearing: without it Jekyll drops every underscore file
# (__maps-check.html, _redirects) and they 404 live.
PRESERVE=( ".git" ".github" ".nojekyll" "README.md" )

# In Final/ but must never reach the public site. Root-anchored (a page really
# named docs.html should still ship). CLAUDE.md has to stay in Final/ for
# tooling, so it is excluded here rather than deleted.
EXCLUDE=( "CLAUDE.md" "_backups" "docs" "draft-content" )

# Junk to drop at ANY depth — macOS scatters .DS_Store through the tree.
EXCLUDE_ANY=( ".DS_Store" "Thumbs.db" "*.swp" )

fail=0; dirty_only=true
note() { printf '  \033[33m!\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; fail=1; dirty_only=false; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }

echo
echo "=== preflight ==========================================================="

# ---------------------------------------------------------------- 1. dirty tree
# The guard. Anything uncommitted under Final/ would ship without existing in
# git history — unreviewable and unrevertable.
dirty="$(cd "$REPO" && git status --porcelain -- Final/ | sed 's/^/      /')"
if [[ -n "$dirty" ]]; then
  if $ALLOW_DIRTY; then
    note "tree is DIRTY and --allow-dirty was passed; shipping uncommitted work:"
    echo "$dirty"
  else
    # sets fail directly, not via bad(), so --allow-dirty stays a valid hint
    printf '  \033[31m✗\033[0m %s\n' \
      "uncommitted changes under Final/ — commit them first, or pass --allow-dirty:"
    echo "$dirty"
    fail=1
  fi
else
  ok "working tree clean under Final/"
fi

# ------------------------------------------------------- 2. required asset dirs
# Each of these has shipped broken at least once by being left out.
for d in assets/css assets/js assets/img assets/fonts; do
  if [[ -d "$SRC/$d" ]]; then ok "$d present"; else bad "$d MISSING — the site will lose it"; fi
done

# ------------------------------------------------------ 3. root-absolute paths
# The site is served from a subdirectory, so a leading slash resolves to the
# domain root and 404s.
abs="$(grep -rlE '(href|src)="/[^/]' "$SRC" --include='*.html' --include='*.css' 2>/dev/null | head -5 || true)"
if [[ -n "$abs" ]]; then
  bad "root-absolute paths found (these 404 under /Gopher-Marketplace/):"
  echo "$abs" | sed 's/^/      /'
else
  ok "no root-absolute paths"
fi

# ------------------------------------------------------- 4. external hotlinks
# Regressions of work already done: font self-hosting, wp-content localisation.
# Match real references — href=, src=, url() — not the domain merely being
# mentioned in a comment (gopher-fonts.css documents what it replaced).
HOTHOST='fonts\.googleapis\.com|fonts\.gstatic\.com|gophergo\.io/wp-content'
hot="$(grep -rlE "((href|src)=[\"']|url\([\"']?)https?://($HOTHOST)" \
        "$SRC" --include='*.html' --include='*.css' --include='*.js' 2>/dev/null | head -5 || true)"
if [[ -n "$hot" ]]; then
  bad "external hotlinks reintroduced (fonts should be self-hosted):"
  echo "$hot" | sed 's/^/      /'
else
  ok "no external font/image hotlinks"
fi

# --------------------------------------------------------- 5. internal docs
for e in "${EXCLUDE[@]}"; do
  [[ -e "$SRC/$e" ]] && note "$e present in Final/ — will be excluded from the deploy"
done
n_junk=$(find "$SRC" -name '.DS_Store' 2>/dev/null | wc -l | tr -d ' ')
[[ "$n_junk" -gt 0 ]] && note "$n_junk .DS_Store file(s) in Final/ — excluded at any depth"

echo
if [[ $fail -ne 0 ]]; then
  if $dirty_only; then
    echo "=== BLOCKED: commit the changes above, or re-run with --allow-dirty ==="
  else
    echo "=== BLOCKED: fix the ✗ items above ==="
  fi
  echo
  exit 1
fi
echo "=== preflight passed ===================================================="

# ------------------------------------------------------------------ stage it
echo
echo "staging $BRANCH in a worktree…"
cd "$REPO"
git fetch -q origin "$BRANCH"
git worktree add -q --detach "$WORKTREE" "origin/$BRANCH"
cleanup() { git worktree remove --force "$WORKTREE" 2>/dev/null || true; }
trap cleanup EXIT

RSYNC=( rsync -a --delete )
for p in "${PRESERVE[@]}";    do RSYNC+=( --exclude="/$p" ); done
for e in "${EXCLUDE[@]}";     do RSYNC+=( --exclude="/$e" ); done
for e in "${EXCLUDE_ANY[@]}"; do RSYNC+=( --exclude="$e"  ); done
"${RSYNC[@]}" "$SRC/" "$WORKTREE/"

cd "$WORKTREE"
git add -A

echo
echo "=== what would ship ====================================================="
git diff --cached --stat | tail -20
echo
changed=$(git diff --cached --name-only | wc -l | tr -d ' ')
echo "  $changed file(s) changed"

# sanity: the excluded files must not have crept in, and the preserved ones
# must still be there.
for e in "${EXCLUDE[@]}"; do
  git diff --cached --name-only | grep -qx "$e" && { echo "  ✗ $e staged — aborting"; exit 1; }
done
for p in .nojekyll README.md; do
  [[ -e "$WORKTREE/$p" ]] || { echo "  ✗ $p was deleted from main — aborting"; exit 1; }
done
echo "  ✓ CLAUDE.md excluded · .nojekyll and README.md preserved"

if [[ $changed -eq 0 ]]; then
  echo
  echo "nothing to deploy — main already matches Final/"
  exit 0
fi

if ! $PUSH; then
  echo
  echo "=== DRY RUN — nothing pushed. Re-run with --push to deploy. ==="
  echo
  exit 0
fi

# --------------------------------------------------------------------- ship
[[ -n "$MSG" ]] || MSG="Deploy: sync Final/ -> main"
git -c user.name="$(git -C "$REPO" config user.name)" \
    -c user.email="$(git -C "$REPO" config user.email)" \
    commit -q -m "$MSG"
git push -q origin "HEAD:$BRANCH"

echo
echo "=== deployed ============================================================"
echo "  $(git rev-parse --short HEAD) -> $BRANCH"
echo "  https://johncnewbury.github.io/Gopher-Marketplace/"
echo "  (Pages takes ~1 min; hard-refresh to bypass cache)"
echo
