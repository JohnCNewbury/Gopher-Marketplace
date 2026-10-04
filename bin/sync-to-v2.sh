#!/usr/bin/env bash
# Sync the legacy static tree into the Laravel app (marketplace-v2).
#
#   bin/sync-to-v2.sh [path/to/marketplace-v2]     (default: ../marketplace-v2)
#
# What it copies — and why these are copies, not commits, in marketplace-v2:
#   Final/assets/{css,fonts,img,js,video}  → public/assets/   (same paths, so every src/href survives)
#   Final/*.mp4 (the 12 root scene videos)  → public/assets/video/
#   unported pages (everything that is NOT a family-A service page)
#                                           → public/legacy/   (served verbatim by LegacyPageController)
#   docs/port-notes/{services,categories}.json → database/data/  (the seeder input; see database/data/README.md)
#
# Rules: never overwrites gopher-header.css (that one is the port's own extraction);
# never deletes anything in v2 — as pages get ported, delete their public/legacy copy by hand.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"          # Gopher-Marketplace
V2="${1:-$HERE/../marketplace-v2}"
[[ -f "$V2/artisan" ]] || { echo "not a Laravel app: $V2" >&2; exit 1; }

mkdir -p "$V2/public/assets" "$V2/public/legacy" "$V2/database/data"

rsync -a --exclude 'originals/' "$HERE/Final/assets/" "$V2/public/assets/" --exclude 'css/gopher-header.css'
rsync -a "$HERE"/Final/*.mp4 "$V2/public/assets/video/" 2>/dev/null || true

n=0
for f in "$HERE"/Final/*.html; do
  grep -q 'assets/css/gopher-fd.css' "$f" && continue            # family A: ported, not legacy
  case "$(basename "$f")" in gopher-header.html|gopher-footer.html|4-pill-markup.html|__maps-check.html|1-engine-css-block.html|2-engine-js-block.html) continue;; esac
  cp "$f" "$V2/public/legacy/"; n=$((n+1))
done
cp "$HERE/Final/robots.txt" "$V2/public/legacy/robots.legacy.txt" 2>/dev/null || true

cp "$HERE/docs/port-notes/services.json" "$HERE/docs/port-notes/categories.json" "$V2/database/data/"

echo "assets → $V2/public/assets ($(du -sh "$V2/public/assets" | cut -f1))"
echo "legacy pages → $V2/public/legacy ($n files)"
echo "seeder data → $V2/database/data (services.json, categories.json)"
echo "next: cd $V2 && php artisan migrate && php artisan db:seed --class=ServiceSeeder && npm run build"
