#!/usr/bin/env bash
# preview-tunnel.sh — serve the app prototypes and (optionally) expose them on a
# temporary public URL via Cloudflare Tunnel, for showing an advisor or a dev.
#
#   ./scripts/preview-tunnel.sh          local only  — prints a 127.0.0.1 URL
#   ./scripts/preview-tunnel.sh --public local + a public https://*.trycloudflare.com URL
#
# Ctrl-C stops everything. The public URL is ephemeral: it dies with this process and
# is different every run. Nothing is uploaded and nothing persists.
#
# ── Three things this script exists to get right ──────────────────────────────────
#
# 1. IT PUBLISHES A COPY, NOT THE REPO. Serving the repo root would expose the whole
#    tree — docs/, scripts/, handoff notes, anything a session left lying around —
#    over a public URL. Instead it stages an explicit allow-list into a temp dir and
#    serves only that. If a file is not named below, it cannot be reached.
#
# 2. THE DEPENDENCY PATHS ARE LOAD-BEARING. The prototypes reference
#    ../../Final/assets/js/*.js for the iQ coverage brain, the category classifier and
#    the age-keyword data. Serving _prototypes/ on its own leaves those 404ing, and the
#    apps DO NOT ERROR — iQ just quietly stops answering location questions and the
#    classifier mis-files categories. The stage dir reproduces the two-levels-up layout
#    so those resolve, and the script hard-fails if they don't.
#
# 3. THE PORT MIGHT NOT BE YOURS. Other Claude sessions run http.server on this machine.
#    A stale 200 from someone else's server is indistinguishable from success — that
#    happened on 2026-07-21, and a "working" link served a different project's dashboard.
#    So: pick a verified-free port, then fingerprint the response before trusting it.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC=0
[[ "${1:-}" == "--public" ]] && PUBLIC=1

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
note() { printf '  \033[33m•\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── stage: an explicit allow-list, nothing more ──────────────────────────────────
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/gopher-proto.XXXXXX")"
mkdir -p "$STAGE/_prototypes/Go" "$STAGE/_prototypes/Request" "$STAGE/Final/assets/js"

cd "$REPO"
cp _prototypes/split-screen.html "$STAGE/_prototypes/" 2>/dev/null || die "missing _prototypes/split-screen.html"

# Every top-level .html/.js under Go/ and Request/ — this is the set the apps link to.
# Subdirectories (reqpkg/, _stale_pre_upload/) are deliberately NOT copied: the first is
# a gitignored mirror, the second is dead weight. Neither is reachable from the demo.
for d in Go Request; do
  for f in _prototypes/$d/*.html _prototypes/$d/*.js; do
    [[ -f "$f" ]] && cp "$f" "$STAGE/_prototypes/$d/"
  done
done

DEPS=(gopher-age-keywords gopher-age-supplement gopher-category-classifier
      gopher-iq-data gopher-message-guard gopher-request-logic)
for d in "${DEPS[@]}"; do
  src="Final/assets/js/$d.js"
  [[ -f "$src" ]] || die "missing shared dependency $src"
  cp "$src" "$STAGE/Final/assets/js/"
done

# Hard-fail rather than silently serve a half-working iQ (see note 2 above).
for d in "${DEPS[@]}"; do
  [[ -s "$STAGE/Final/assets/js/$d.js" ]] || die "$d.js did not stage — iQ would answer wrongly"
done

n_files=$(find "$STAGE" -type f | wc -l | tr -d ' ')
size=$(du -sh "$STAGE" | cut -f1)

# Landing page, so the tunnel root is a menu rather than a directory listing.
cat > "$STAGE/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Gopher — app prototypes</title>
<meta name="robots" content="noindex,nofollow">
<style>
 body{font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b1b3a;
      color:#e8eefc;margin:0;padding:48px 22px;display:flex;justify-content:center}
 .w{max-width:560px;width:100%} h1{font-size:21px;margin:0 0 6px}
 p{color:#9fb2d8;margin:0 0 26px;font-size:14px}
 a{display:block;background:#132a55;border:1px solid #24406f;border-radius:12px;padding:15px 17px;
   margin-bottom:11px;color:#fff;text-decoration:none}
 a:hover{background:#1a3567} b{display:block;font-size:15px}
 span{color:#9fb2d8;font-size:12.5px} .f{margin-top:26px;color:#6f83ad;font-size:12px}
</style>
<div class=w>
 <h1>Gopher — app prototypes</h1>
 <p>Static blueprints. No backend; state lives in the browser.</p>
 <a href="_prototypes/split-screen.html"><b>Request ↔ Go — split screen</b>
   <span>Both apps side by side, sharing one in-browser store. Start here.</span></a>
 <a href="_prototypes/Request/gopher-request-home.html"><b>Request app</b>
   <span>Customer side — home, flow, deals, referrals.</span></a>
 <a href="_prototypes/Go/gopher-go-prototype.html"><b>Gopher Go app</b>
   <span>Worker side — jobs, offers, payouts.</span></a>
 <p class=f>Temporary preview. This link stops working when the session ends.</p>
</div>
HTML

bold "Staged"
ok "$n_files files, $size — allow-listed copy, not the repo"

# ── port: verified free, then fingerprinted (see note 3 above) ───────────────────
PORT=""
for p in $(seq 8240 8260); do
  if ! lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
done
[[ -n "$PORT" ]] || die "no free port in 8240-8260"

( cd "$STAGE" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 ) >/dev/null 2>&1 &
SERVER_PID=$!
CF_PID=""

cleanup() {
  printf '\n'
  [[ -n "$CF_PID" ]] && kill "$CF_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$STAGE"
  ok "stopped; staged copy removed"
}
trap cleanup EXIT INT TERM

for _ in $(seq 20); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/index.html" && break
  sleep 0.25
done

# Fingerprint: prove this is OUR server, not another session's that grabbed the port.
curl -sf "http://127.0.0.1:$PORT/index.html" | grep -q 'Gopher — app prototypes' \
  || die "port $PORT answered, but with someone else's content — aborting"
curl -sf -o /dev/null "http://127.0.0.1:$PORT/Final/assets/js/gopher-iq-data.js" \
  || die "iQ data not served — the apps would answer location questions wrongly"

bold "Serving"
ok "http://127.0.0.1:$PORT/  (this machine only)"

# ── optional public URL ──────────────────────────────────────────────────────────
if [[ "$PUBLIC" -eq 1 ]]; then
  # Resolved rather than assumed: cloudflared was installed to ~/bin (no Homebrew on this
  # machine), and ~/bin is not on PATH. Looking here avoids editing the shell profile.
  CF="$(command -v cloudflared 2>/dev/null || true)"
  [[ -z "$CF" && -x "$HOME/bin/cloudflared" ]] && CF="$HOME/bin/cloudflared"
  if [[ -z "$CF" ]]; then
    printf '\n'; note "cloudflared is not installed — serving locally only."
    note "Install (Apple silicon, official Cloudflare release):"
    printf '\n      curl -L -o ~/bin/cloudflared \\\n'
    printf '        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz\n'
    printf '      # (tarball — extract, chmod +x, put on PATH)\n\n'
    note "Then re-run with --public."
  else
    LOG="$STAGE/.cf.log"
    "$CF" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate >"$LOG" 2>&1 &
    CF_PID=$!
    URL=""
    for _ in $(seq 40); do
      URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
      [[ -n "$URL" ]] && break
      sleep 0.5
    done
    printf '\n'
    if [[ -n "$URL" ]]; then
      bold "Public (temporary — anyone with this link can open it)"
      ok "$URL"
      printf '     split screen  %s/_prototypes/split-screen.html\n' "$URL"
      printf '     Request app   %s/_prototypes/Request/gopher-request-home.html\n' "$URL"
      printf '     Go app        %s/_prototypes/Go/gopher-go-prototype.html\n' "$URL"
    else
      note "cloudflared started but printed no URL yet — check $LOG"
    fi
  fi
fi

printf '\n'
note "Ctrl-C to stop."
wait "$SERVER_PID"
