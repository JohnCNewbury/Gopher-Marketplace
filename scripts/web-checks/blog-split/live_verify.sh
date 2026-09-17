#!/usr/bin/env bash
# Content-verify the blog split on BOTH live hosts.
# By STRING, never by status code alone. Cache-busted on every request.
# gophergo.io/<file> returns a 301 and reads as a false failure — use the
# TigerTech preview host.
set -u

PAGES=(
  "https://johncnewbury.github.io/Gopher-Marketplace"
  "https://gophergo.io.customers.tigertech.net/preview"
)
NAMES=("GitHub Pages" "TigerTech ")

POSTS=(
  blog-gopher-marketplace-on-one-page.html
  blog-merchant-deals-skip-the-delivery-app-cut.html
  blog-service-provider-deals.html
  blog-the-marketplace-your-community-runs-on.html
  blog-help-for-busy-realtors.html
  blog-no-gopher-nearby-yet.html
  blog-on-demand-local-workforce.html
  blog-age-restricted-deliveries.html
  blog-junk-removal-the-easy-way.html
  blog-a-marketplace-seniors-can-trust.html
  blog-worker-centric-way-to-earn.html
  blog-restaurant-delivery-without-the-30-percent-bite.html
  blog-refer-yourself.html
  blog-a-job-you-ll-actually-dig.html
)

fail=0
get() { curl -s -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' "$1?cb=$(date +%s%N)$RANDOM"; }
code() { curl -s -o /dev/null -w "%{http_code}" -H 'Cache-Control: no-cache' "$1?cb=$(date +%s%N)$RANDOM"; }

for h in 0 1; do
  B="${PAGES[$h]}"; N="${NAMES[$h]}"
  echo "======================================================================"
  echo "  $N  —  $B"
  echo "======================================================================"

  # 1. the stylesheet EVERY page depends on
  css=$(get "$B/assets/css/gopher-blog.css")
  if grep -q "gopher-blog.css — shared styles" <<<"$css" && grep -q "POST PAGES (blog-\*.html)" <<<"$css"; then
    echo "  [ok]   assets/css/gopher-blog.css  ($(wc -c <<<"$css" | tr -d ' ') bytes, header + post-page rules present)"
  else
    echo "  [FAIL] assets/css/gopher-blog.css  code=$(code "$B/assets/css/gopher-blog.css")"; fail=1
  fi

  # 2. the index: teasers, no post bodies, shim, Blog JSON-LD
  idx=$(get "$B/gopher-blog.html")
  for s in 'Fragment redirect shim' '"@type": "Blog"' '<article class="post-card' 'href="feed.xml"'; do
    grep -qF "$s" <<<"$idx" && echo "  [ok]   gopher-blog.html contains: $s" || { echo "  [FAIL] gopher-blog.html missing: $s"; fail=1; }
  done
  grep -qF '<details class="post-card' <<<"$idx" && { echo "  [FAIL] gopher-blog.html STILL has <details> post cards"; fail=1; } \
    || echo "  [ok]   gopher-blog.html has no <details> post cards (bodies moved out)"
  n=$(grep -o '<article class="post-card' <<<"$idx" | wc -l | tr -d ' ')
  [ "$n" = "14" ] && echo "  [ok]   gopher-blog.html has 14 teaser cards" || { echo "  [FAIL] $n teaser cards"; fail=1; }

  # 3. every post page: unique title, Key takeaways, BlogPosting, breadcrumb, related
  for p in "${POSTS[@]}"; do
    b=$(get "$B/$p")
    t=$(sed -n 's/.*<title>\(.*\)<\/title>.*/\1/p' <<<"$b" | head -1)
    ok=1
    for s in 'Key takeaways' '"@type": "BlogPosting"' '"@type": "BreadcrumbList"' 'Related reading' "canonical\" href=\"https://gophergo.io/$p\""; do
      grep -qF "$s" <<<"$b" || { ok=0; echo "  [FAIL] $p missing: $s"; fail=1; }
    done
    [ "$ok" = "1" ] && printf "  [ok]   %-52s %s\n" "$p" "${t:0:46}"
  done

  # 4. FAQ schema on the five posts that carry it
  for p in blog-service-provider-deals.html blog-merchant-deals-skip-the-delivery-app-cut.html \
           blog-age-restricted-deliveries.html blog-a-marketplace-seniors-can-trust.html \
           blog-restaurant-delivery-without-the-30-percent-bite.html; do
    get "$B/$p" | grep -qF '"@type": "FAQPage"' \
      && echo "  [ok]   FAQPage schema live on $p" \
      || { echo "  [FAIL] no FAQPage on $p"; fail=1; }
  done

  # 5. feed
  f=$(get "$B/feed.xml")
  items=$(grep -c '<item>' <<<"$f")
  if grep -q '<rss version="2.0"' <<<"$f" && [ "$items" = "14" ]; then
    echo "  [ok]   feed.xml is RSS 2.0 with 14 <item>s"
  else
    echo "  [FAIL] feed.xml rss=$(grep -c '<rss version' <<<"$f") items=$items"; fail=1
  fi

  # 6. sitemap
  sm=$(get "$B/sitemap.xml")
  n=$(grep -c '/blog-' <<<"$sm")
  if [ "$n" = "14" ] && grep -qF 'https://gophergo.io/gopher-blog.html' <<<"$sm"; then
    echo "  [ok]   sitemap.xml has 14 blog rows and kept the gopher-blog.html row"
  else
    echo "  [FAIL] sitemap blog rows=$n"; fail=1
  fi

  # 7. the one inbound link that was repointed
  get "$B/gopher-go.html" | grep -qF 'href="blog-refer-yourself.html"' \
    && echo "  [ok]   gopher-go.html now links blog-refer-yourself.html" \
    || { echo "  [FAIL] gopher-go.html link not repointed"; fail=1; }

  # 8. the three rider files the owner let ride
  for r in gopher-privacy-policy-stores.md gopher-privacy-policy-elementor.txt gopher-privacy-policy-elementor-html.txt; do
    printf "  [rider] %-42s %s\n" "$r" "$(code "$B/$r")"
  done
  echo
done

echo "======================================================================"
[ "$fail" = "0" ] && echo "  LIVE VERIFY: PASS on both hosts" || echo "  LIVE VERIFY: FAILURES ABOVE"
echo "======================================================================"
exit $fail
