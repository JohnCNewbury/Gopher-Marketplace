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
#   --site prototype   publish the PROTOTYPE TWIN instead of the live site:
#                   https://johncnewbury.github.io/Gopher-Marketplace-Prototype/
#                   (repo Gopher-Marketplace-Prototype, remote `proto`).
#
# TWO SITES, ONE SCRIPT — deliberately. A forked copy of this file would drift,
# and the half that drifts is the half with the safety guards in it. Every
# difference between the two sites is a conditional below and nothing else:
#
#   live (default)          prototype twin
#   --------------          --------------
#   remote origin           remote proto
#   11 allowlisted protos   + web-split-screen.html (the harness / "the TRUTH")
#   indexable               noindex on EVERY page, sitemap.xml withheld
#   PT off (fail-closed)    PT on — see the path rule in gopher-web-pt-bridge.js
#
# The twin is a PUBLIC COPY OF A LIVE, INDEXED SITE on the SAME hostname. That
# is why the noindex is not optional: without it the copy competes with
# production in search for every page it duplicates.
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO/Final"
BRANCH="main"
WORKTREE="$(mktemp -d)/gopher-deploy"

PUSH=false; ALLOW_DIRTY=false; MSG=""; SITE="live"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)        PUSH=true; shift ;;
    --allow-dirty) ALLOW_DIRTY=true; shift ;;
    --site)        SITE="${2:-}"; shift 2 ;;
    -m)            MSG="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$SITE" in
  live)      REMOTE="origin"; SITE_URL="https://johncnewbury.github.io/Gopher-Marketplace/" ;;
  prototype) REMOTE="proto";  SITE_URL="https://johncnewbury.github.io/Gopher-Marketplace-Prototype/" ;;
  *) echo "--site must be 'live' or 'prototype' (got: '$SITE')" >&2; exit 2 ;;
esac
git -C "$REPO" remote get-url "$REMOTE" >/dev/null 2>&1 || {
  echo "git remote '$REMOTE' does not exist — cannot deploy --site $SITE" >&2; exit 2; }

# Files that live on `main` but NOT in Final/. rsync --delete would wipe these.
# .nojekyll is load-bearing: without it Jekyll drops every underscore file
# (__maps-check.html, _redirects) and they 404 live. _prototypes/ is staged
# separately below, so it must survive the Final/ rsync too.
PRESERVE=( ".git" ".github" ".nojekyll" "README.md" "_prototypes" )

# ---------------------------------------------------------------- prototypes
# _prototypes/ is 186 files / 34 MB and MOSTLY INTERNAL: build briefs, session
# handoffs, the canonical flow doc (business decisions, fee tables, unreleased
# specs), backend wiring checklists, Stripe payout guardrails, scratch bundles,
# screenshots. The 2026-07-17 pass deliberately pulled internal docs out of the
# served tree; shipping this folder wholesale would undo that in one command.
#
# So: an ALLOWLIST of exactly the files the running prototypes need, derived by
# crawling the four entry points for href/src AND JS string literals. Anything
# not named here does not ship. Add a file only after reading what is in it.
PROTO=(
  split-screen.html
  Go/gopher-banner.js
  Go/gopher-go-prototype.html
  Request/gopher-banner.js
  Request/gopher-pay-store.js
  Request/gopher-request-home.html
  Request/gopher-request-flow.html
  Request/gopher-request-deals.html
  Request/gopher-request-inbox.html
  Request/gopher-request-inprogress.html
  Request/gopher-request-refer.html
)

# In Final/ but must never reach the public site. Root-anchored (a page really
# named docs.html should still ship). CLAUDE.md has to stay in Final/ for
# tooling, so it is excluded here rather than deleted.
EXCLUDE=( "CLAUDE.md" "_backups" "docs" "draft-content" )

# ------------------------------------------------- prototype-twin differences
# The harness ("the TRUTH") ships only to the twin. It is a DEV TOOL: it drives
# the real Final/ pages through ?pt=1 against the Go and Request prototypes, and
# on the live site ?pt=1 empties the visible dashboard. It has no business there.
#
# sitemap.xml is WITHHELD from the twin rather than rewritten: it lists the
# PRODUCTION urls, so shipping it would have the copy actively nominating the
# original's pages for indexing from the copy's own path.
if [[ "$SITE" == "prototype" ]]; then
  PROTO+=( web-split-screen.html )
  EXCLUDE+=( "sitemap.xml" )
fi

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

# Same guard for the allowlisted prototype files. Scoped to the allowlist, not
# all of _prototypes/ — most of that folder is gitignored disk-only work by
# design (figma screens, Request variants), and blocking on it would make the
# deploy permanently unrunnable.
proto_dirty=""
for f in "${PROTO[@]}"; do
  s="$(cd "$REPO" && git status --porcelain -- "_prototypes/$f" 2>/dev/null)"
  [[ -n "$s" ]] && proto_dirty+="      $s"$'\n'
done
if [[ -n "$proto_dirty" ]]; then
  if $ALLOW_DIRTY; then
    note "prototype files are DIRTY and --allow-dirty was passed; shipping uncommitted work:"
    printf '%s' "$proto_dirty"
  else
    printf '  \033[31m✗\033[0m %s\n' \
      "uncommitted changes in allowlisted _prototypes/ files — commit them first, or pass --allow-dirty:"
    printf '%s' "$proto_dirty"
    fail=1
  fi
else
  ok "allowlisted prototype files clean (${#PROTO[@]} files)"
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
echo "staging $SITE site ($REMOTE/$BRANCH) in a worktree…"
cd "$REPO"
git fetch -q "$REMOTE" "$BRANCH"
git worktree add -q --detach "$WORKTREE" "$REMOTE/$BRANCH"
cleanup() { git worktree remove --force "$WORKTREE" 2>/dev/null || true; }
trap cleanup EXIT

RSYNC=( rsync -a --delete )
for p in "${PRESERVE[@]}";    do RSYNC+=( --exclude="/$p" ); done
for e in "${EXCLUDE[@]}";     do RSYNC+=( --exclude="/$e" ); done
for e in "${EXCLUDE_ANY[@]}"; do RSYNC+=( --exclude="$e"  ); done
"${RSYNC[@]}" "$SRC/" "$WORKTREE/"

# ------------------------------------------------------------ stage prototypes
# Rebuilt from scratch every run, so a file dropped from PROTO disappears from
# the site instead of lingering.
rm -rf "$WORKTREE/_prototypes"
for f in "${PROTO[@]}"; do
  [[ -f "$REPO/_prototypes/$f" ]] || { echo "  ✗ allowlisted _prototypes/$f is missing — aborting"; exit 1; }
  mkdir -p "$WORKTREE/_prototypes/$(dirname "$f")"
  cp "$REPO/_prototypes/$f" "$WORKTREE/_prototypes/$f"
done

# THE LAYOUT TRAP. In the repo, _prototypes/ and Final/ are siblings, so the
# phones load shared modules as ../../Final/assets/js/…. The deploy FLATTENS
# Final/ to the site root, so no Final/ directory exists on `main` and every one
# of those references 404s — silently, in the case of gopher-iq-data.js, which
# just degrades coverage and FAQ answers with nothing on screen to say so.
# Rewrite to ../../ on the shipped copies only; the source keeps its repo-layout
# paths, which is what the local serve and the tunnel need.
python3 - "$WORKTREE" <<'PY'
import sys,os,re
wt=sys.argv[1]; root=os.path.join(wt,'_prototypes')
NOINDEX='<meta name="robots" content="noindex,nofollow">'
for dp,_,fns in os.walk(root):
    for fn in fns:
        p=os.path.join(dp,fn)
        if not fn.endswith(('.html','.js')): continue
        t=open(p,encoding='utf-8',errors='surrogateescape').read()
        o=t
        # ANCHORED TO A QUOTE, not a blind string replace. These files also
        # DISCUSS Final/ paths in prose - the Go prototype has a comment saying
        # "reach it via ../Final/assets/js/ (case-exact)", which is telling a
        # reader about the REPO layout and is correct as written. A blind
        # replace rewrites that sentence into a lie about a path that does not
        # exist in the repo. It did exactly that when this rule was first
        # added, and the live-site dry run caught it as a mystery 2-line delta.
        #
        # Requiring an opening quote means only real references move: HTML
        # attributes (src="..." href="...") and JS string literals
        # (file:'../Final/gopher-request.html'). Prose keeps its own path.
        #
        # The quote anchor also makes these two order-independent - inside
        # '../../Final/' the shorter pattern is preceded by '/', not a quote -
        # but they stay longest-first anyway, because the next person to add a
        # third depth should not have to rediscover why that matters.
        t=re.sub(r'(?<=["\'])\.\./\.\./Final/', '../../', t)
        t=re.sub(r'(?<=["\'])\.\./Final/',        '../',    t)
        # Prototypes are a demo surface, not content. robots.txt cannot help
        # here: it is only honoured at the DOMAIN root, and this site is served
        # from /Gopher-Marketplace/. A meta tag is the mechanism that works.
        if fn.endswith('.html') and 'name="robots"' not in t:
            t=re.sub(r'(<head[^>]*>)', r'\1\n'+NOINDEX, t, count=1, flags=re.I)
        if t!=o: open(p,'w',encoding='utf-8',errors='surrogateescape').write(t)
PY

# ------------------------------------------------------- twin: noindex it all
# The twin duplicates a live, INDEXED site on the SAME hostname. robots.txt
# cannot help: it is only honoured at the DOMAIN root (johncnewbury.github.io/),
# which this project does not own - it is a user Pages host shared with the
# production site. A meta tag on every page is the mechanism that works here.
if [[ "$SITE" == "prototype" ]]; then
python3 - "$WORKTREE" <<'NOIDX'
import sys,os,re
wt=sys.argv[1]
NOINDEX='<meta name="robots" content="noindex,nofollow">'
n=0
for dp,_,fns in os.walk(wt):
    if os.sep+'.git' in dp: continue
    for fn in fns:
        if not fn.endswith('.html'): continue
        fp=os.path.join(dp,fn)
        t=open(fp,encoding='utf-8',errors='surrogateescape').read()
        if 'name="robots"' in t: continue
        o=t
        t=re.sub(r'(<head[^>]*>)', r'\1\n'+NOINDEX, t, count=1, flags=re.I)
        if t==o: t=NOINDEX+'\n'+t   # no <head> to anchor to
        open(fp,'w',encoding='utf-8',errors='surrogateescape').write(t); n+=1
print('  noindex added to %d page(s) site-wide' % n)
NOIDX
# Fail loudly rather than publish an indexable copy of production. -L lists
# files WITHOUT a match; an empty list is the pass condition.
missing="$(cd "$WORKTREE" && grep -rL 'name="robots"' --include='*.html' . 2>/dev/null | head -5 || true)"
if [[ -n "$missing" ]]; then
  echo "  X pages without a robots meta tag would be indexed - aborting:"
  echo "$missing" | sed 's/^/      /'; exit 1
fi
fi

# ------------------------------------------- twin: the ROOT URL is the harness
# The twin exists to BE the split screen. Landing on the marketing homepage is
# the wrong destination for the one link that gets shared.
#
# FRAME-AWARE ON PURPOSE, and this is the whole subtlety. A plain redirect here
# would also fire inside the harness's OWN left pane -- gopher-request.html and
# gopher-connect.html each link "Home" to index.html, and the harness lets you
# navigate the site freely -- so clicking Home would load the harness INSIDE
# the harness. Guarding on window.top === window.self splits the two cases:
# a top-level visit goes to the harness, an iframed visit renders the real
# homepage, which is exactly what the pane wants.
#
# location.search is carried through so a future ?flag on the shared link is
# not silently dropped at the redirect.
if [[ "$SITE" == "prototype" ]]; then
python3 - "$WORKTREE" <<'IDXR'
import sys,os,re
wt=sys.argv[1]; p=os.path.join(wt,'index.html')
SNIP = """<script>
/* Prototype twin: the root URL is the harness, not the marketing home.
   Frame-aware -- see scripts/deploy.sh. A bare redirect would nest the
   harness inside its own left pane when the user clicks Home. */
if (window.top === window.self) {
  location.replace('_prototypes/web-split-screen.html' + location.search);
}
</script>
<noscript><p style="font:14px/1.5 system-ui;padding:20px">
<a href="_prototypes/web-split-screen.html">Open the Web &#8596; Go harness &rarr;</a></p></noscript>"""
t=open(p,encoding='utf-8',errors='surrogateescape').read()
if 'web-split-screen.html' in t:
    print('  ! index.html already carries the redirect - skipped'); sys.exit(0)
t2,n=re.subn(r'(<head[^>]*>)', lambda m: m.group(1)+'\n'+SNIP, t, count=1, flags=re.I)
if n!=1:
    print('  X index.html has no <head> to anchor the redirect - aborting'); sys.exit(1)
open(p,'w',encoding='utf-8',errors='surrogateescape').write(t2)
print('  root index.html -> harness (frame-aware redirect)')
IDXR
# Prove it landed rather than trusting the writer above.
grep -q "web-split-screen.html" "$WORKTREE/index.html" || {
  echo "  X root redirect missing from index.html - aborting"; exit 1; }
grep -q "window.top === window.self" "$WORKTREE/index.html" || {
  echo "  X root redirect is not frame-aware - it would nest the harness - aborting"; exit 1; }
fi

# Verify the rewrite: no LOADABLE Final/ reference may survive, and every path
# the prototypes pull must actually exist at the flattened location. Matches
# attribute values and quoted JS literals only — these files also DISCUSS
# Final/… paths in code comments ("ported from Final/gopher-go.html"), and those
# are prose, not fetches. A plain substring grep flags all of them and makes the
# guard cry wolf, which is how a real one ends up waved through.
leftover="$(cd "$WORKTREE/_prototypes" && grep -rlE '(src|href|data-src)[[:space:]]*=[[:space:]]*"[^"]*Final/|"[^"[:space:]]*Final/[^"]*"' . 2>/dev/null || true)"
if [[ -n "$leftover" ]]; then
  echo "  ✗ unrewritten Final/ references remain — these would 404 live:"
  echo "$leftover" | sed 's/^/      /'; exit 1
fi
for dep in assets/js/gopher-iq-data.js assets/js/gopher-message-guard.js \
           assets/js/gopher-request-logic.js assets/js/gopher-category-classifier.js \
           assets/js/gopher-age-keywords.js assets/js/gopher-age-supplement.js \
           assets/img/01-delivery.webp gopher-request-101.html; do
  [[ -e "$WORKTREE/$dep" ]] || { echo "  ✗ prototypes need /$dep but it is not on the site — aborting"; exit 1; }
done

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

# Nothing outside the allowlist may reach the public site. This is the guard that
# keeps the internal docs in _prototypes/ (canonical flow doc, build briefs,
# handoffs, backend/Stripe notes) from being published by accident.
shipped="$(cd "$WORKTREE" && find _prototypes -type f 2>/dev/null | sed 's|^_prototypes/||' | sort)"
allowed="$(printf '%s\n' "${PROTO[@]}" | sort)"
sneaked="$(comm -23 <(printf '%s\n' "$shipped") <(printf '%s\n' "$allowed"))"
if [[ -n "$sneaked" ]]; then
  echo "  ✗ files outside the prototype allowlist staged — aborting:"
  echo "$sneaked" | sed 's/^/      /'; exit 1
fi
n_noindex="$(grep -rl 'name="robots" content="noindex' "$WORKTREE/_prototypes" 2>/dev/null | wc -l | tr -d ' ')"
echo "  ✓ CLAUDE.md excluded · .nojekyll and README.md preserved"
echo "  ✓ prototypes: ${#PROTO[@]} allowlisted file(s), 0 strays, $n_noindex noindex'd, Final/ paths rewritten"

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
git push -q "$REMOTE" "HEAD:$BRANCH"

echo
echo "=== deployed ============================================================"
echo "  $(git rev-parse --short HEAD) -> $REMOTE/$BRANCH"
echo "  $SITE_URL"
echo "  (Pages takes ~1 min; hard-refresh to bypass cache)"
echo
