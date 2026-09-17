#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verification for the blog split — brief §3 items 1, 2, 5, 6."""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meta import POSTS, ORDER  # noqa: E402

ROOT = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code"
FINAL = os.path.join(ROOT, "Final")
HERE = os.path.dirname(os.path.abspath(__file__))

PAGES = [POSTS[p]["slug"] + ".html" for p in ORDER] + ["gopher-blog.html"]
EXTRA = ["feed.xml", "sitemap.xml"]

fails, warns = [], []


def F(msg):
    fails.append(msg)
    print("FAIL " + msg)


def W(msg):
    warns.append(msg)
    print("WARN " + msg)


# ── 1. paths: relative, existing, exact case, no leading slash ─────────────
print("=" * 72)
print("1. PATH / CASE CHECK")
print("=" * 72)

_listing = {}


def exists_exact(relpath):
    """True only if every path segment matches an on-disk name character for
    character. os.path.exists is case-insensitive on macOS, so compare against
    os.listdir."""
    cur = FINAL
    for part in relpath.split("/"):
        if part in ("", "."):
            continue
        if cur not in _listing:
            try:
                _listing[cur] = set(os.listdir(cur))
            except OSError:
                return False
        if part not in _listing[cur]:
            return False
        cur = os.path.join(cur, part)
    return True


ATTR = re.compile(r'\b(?:href|src)="([^"]+)"')
checked = 0
for page in PAGES:
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    for raw in ATTR.findall(t):
        ref = html.unescape(raw)
        if ref.startswith("#") or ref.startswith("mailto:") or ref.startswith("tel:"):
            continue
        if ref.startswith("/"):
            F("%s: ROOT-ABSOLUTE path %r" % (page, ref))
            continue
        if re.match(r"^[a-z]+:", ref):
            if not ref.startswith("https://"):
                F("%s: non-https absolute %r" % (page, ref))
            continue
        target = ref.split("#")[0].split("?")[0]
        if not target:
            continue
        checked += 1
        if not exists_exact(target):
            F("%s: MISSING or WRONG CASE -> %r" % (page, ref))
print("  %d relative href/src references checked across %d pages" % (checked, len(PAGES)))

# absolute URLs used in canonical/OG/JSON-LD must all be gophergo.io, and the
# only external hosts allowed are the ones already in the moved copy.
print("\n  external hosts referenced:")
hosts = {}
for page in PAGES:
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    for m in re.findall(r'https?://([a-z0-9.\-]+)', t):
        hosts.setdefault(m, set()).add(page)
for h in sorted(hosts):
    print("    %-34s %d page(s)" % (h, len(hosts[h])))

# no hotlinked stylesheet / script / image assets.
# rel="canonical" and rel="alternate" are absolute BY DESIGN — they are not assets.
for page in PAGES:
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    for tag in re.findall(r"<(?:link|script|img)\b[^>]*>", t):
        if re.search(r'rel="(canonical|alternate)"', tag):
            continue
        m = re.search(r'(?:href|src)="(https?://[^"]+)"', tag)
        if m:
            F("%s: HOTLINKED ASSET %s" % (page, m.group(1)))

# ── 2. JSON-LD ────────────────────────────────────────────────────────────
print()
print("=" * 72)
print("2. JSON-LD PARSE + REQUIRED KEYS")
print("=" * 72)

REQ = {
    "BlogPosting": ["headline", "description", "image", "datePublished",
                    "dateModified", "author", "publisher", "mainEntityOfPage",
                    "url", "articleSection", "wordCount", "inLanguage"],
    "BreadcrumbList": ["itemListElement"],
    "FAQPage": ["mainEntity"],
    "Blog": ["name", "url", "blogPost"],
}
LD = re.compile(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', re.S)
total_blocks = 0
for page in PAGES:
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    blocks = LD.findall(t)
    types = []
    for b in blocks:
        total_blocks += 1
        try:
            obj = json.loads(b)
        except Exception as e:
            F("%s: JSON-LD does not parse: %s" % (page, e))
            continue
        ty = obj.get("@type")
        types.append(ty)
        if obj.get("@context") != "https://schema.org":
            F("%s: %s missing @context" % (page, ty))
        for k in REQ.get(ty, []):
            if k not in obj:
                F("%s: %s missing %r" % (page, ty, k))
        if ty == "BlogPosting":
            for k in ("image", "url"):
                if not str(obj[k]).startswith("https://gophergo.io/"):
                    F("%s: BlogPosting.%s not absolute" % (page, k))
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", obj["datePublished"]):
                F("%s: bad datePublished" % page)
        if ty == "FAQPage":
            for q in obj["mainEntity"]:
                if not q["acceptedAnswer"]["text"].strip():
                    F("%s: empty FAQ answer" % page)
        if ty == "BreadcrumbList":
            pos = [i["position"] for i in obj["itemListElement"]]
            if pos != list(range(1, len(pos) + 1)):
                F("%s: breadcrumb positions %s" % (page, pos))
    print("  %-56s %s" % (page, ", ".join(types) or "(none)"))
print("  %d JSON-LD blocks parsed" % total_blocks)

# every post's canonical/og:url must equal its own URL
for pid in ORDER:
    page = POSTS[pid]["slug"] + ".html"
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    want = "https://gophergo.io/" + page
    for pat, label in ((r'<link rel="canonical" href="([^"]+)"', "canonical"),
                       (r'<meta property="og:url" content="([^"]+)"', "og:url")):
        got = re.search(pat, t).group(1)
        if got != want:
            F("%s: %s is %s" % (page, label, got))

# ── 5. banned words ───────────────────────────────────────────────────────
print()
print("=" * 72)
print("5. BANNED-WORD GREP (Style Guide)")
print("=" * 72)
BANNED = ["ecosystem", "seamlessly", "platform", "users", "gig", "leverage",
          "optimize", "unlock", "empower", "utilize"]


def visible(t):
    t = re.sub(r"(?is)<script.*?</script>", " ", t)
    t = re.sub(r"(?is)<style.*?</style>", " ", t)
    t = re.sub(r"(?s)<!--.*?-->", " ", t)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    return html.unescape(t)


hits = {}
for page in PAGES:
    t = visible(open(os.path.join(FINAL, page), encoding="utf-8").read())
    for w in BANNED:
        n = len(re.findall(r"\b%ss?\b" % w, t, re.I))
        if n:
            hits.setdefault(w, []).append((page, n))
if not hits:
    print("  no hits")
for w in BANNED:
    for page, n in hits.get(w, []):
        print("  %-11s x%d  %s" % (w, n, page))

# Every hit above must be PRE-EXISTING copy. The text written for this task
# (meta descriptions, key takeaways, FAQ answers) must be clean.
print("\n  new-text-only scan (descriptions / takeaways / FAQ):")
newtext = []
for pid in ORDER:
    m = POSTS[pid]
    newtext.append(m["desc"])
    newtext += m["takeaways"]
    for q, a in m["faq"]:
        newtext += [q, a]
blob = visible(" ".join(newtext))
clean = True
for w in BANNED:
    n = len(re.findall(r"\b%ss?\b" % w, blob, re.I))
    if n:
        clean = False
        F("banned word %r appears %d time(s) in NEW text" % (w, n))
if clean:
    print("    clean — 0 banned words in any text written for this task")

# ── 6. word-count parity ──────────────────────────────────────────────────
print()
print("=" * 72)
print("6. WORD-COUNT PARITY (moved copy vs. the old card body)")
print("=" * 72)
base = json.load(open(os.path.join(HERE, "baseline_words.json")))

# The parity check proves the MIGRATION dropped nothing. Copy deliberately
# changed AFTER the migration is recorded here rather than silencing the check,
# so an unexplained drift still fails. Applied 2026-09-16 by fix_flags.py, on
# the owner's instruction to fix flag 2 and retitle the flag-1 post.
EXPECTED_DELTA = {
    # "Trusted & safe" bullet restated to the correct verification model:
    # identity-verified + real ratings, background check on Elite / Elite+.
    "seniors": +8,
    # "Looking for a flexible gig you can do..." -> "...flexible work you can do..."
    # and "That's a gig worth digging." -> "That's a job worth digging."
    "a-gig": -1,
    # end-of-post CTA button: "Open the map" -> "Explore the interactive map".
    # The new .map-lead band is excluded from the count (it is a link, not prose).
    "how-it-fits": +1,
}


def body_words(page, pid):
    t = open(os.path.join(FINAL, page), encoding="utf-8").read()
    i = t.index('<div class="reading">')
    j = t.index('<aside class="related">')
    frag = t[i:j]
    # the two blocks that are NEW on the post page are excluded
    frag = re.sub(r'<p class="post-lead">.*?</p>', "", frag, count=1, flags=re.S)
    frag = re.sub(r'<aside class="takeaways">.*?</aside>', "", frag, count=1, flags=re.S)
    # the map invitation band is a link, not article prose — same reason the
    # breadcrumb and the byline are outside this range
    frag = re.sub(r'<a class="map-lead".*?</a>', "", frag, count=1, flags=re.S)
    return len(re.sub(r"\s+", " ", visible(frag)).strip().split())


print("  %-22s %6s %6s %8s %8s" % ("post", "before", "after", "delta", "expected"))
for pid in ORDER:
    page = POSTS[pid]["slug"] + ".html"
    b, a = base[pid], body_words(page, pid)
    d = a - b
    exp = EXPECTED_DELTA.get(pid, 0)
    unexplained = d - exp
    pct = (unexplained / b * 100) if b else 0
    note = "" if exp == 0 else "  (deliberate copy fix)"
    flag = "" if abs(pct) <= 2 else "   <-- UNEXPLAINED DRIFT"
    print("  %-22s %6d %6d %+8d %+8d%s%s" % (pid, b, a, d, exp, flag, note))
    if abs(pct) > 2:
        F("%s: unexplained word-count drift %.1f%% (delta %+d, expected %+d)"
          % (pid, pct, d, exp))
print("  %-22s %6d %6d" % ("TOTAL", sum(base.values()),
                           sum(body_words(POSTS[p]["slug"] + ".html", p) for p in ORDER)))

# ── extras: feed + sitemap ────────────────────────────────────────────────
print()
print("=" * 72)
print("EXTRA: feed.xml + sitemap.xml")
print("=" * 72)
import xml.dom.minidom  # noqa: E402
for f in EXTRA:
    p = os.path.join(FINAL, f)
    try:
        d = xml.dom.minidom.parse(p)
        if f == "feed.xml":
            n = len(d.getElementsByTagName("item"))
            print("  feed.xml parses, %d <item>s" % n)
            if n != 14:
                F("feed.xml has %d items" % n)
            for it in d.getElementsByTagName("item"):
                link = it.getElementsByTagName("link")[0].firstChild.data
                if not link.startswith("https://gophergo.io/blog-"):
                    F("feed item link %s" % link)
        else:
            locs = [u.getElementsByTagName("loc")[0].firstChild.data
                    for u in d.getElementsByTagName("url")]
            newn = [l for l in locs if "/blog-" in l]
            print("  sitemap.xml parses, %d urls, %d new blog urls" % (len(locs), len(newn)))
            if len(newn) != 14:
                F("sitemap has %d blog urls" % len(newn))
            if len(set(locs)) != len(locs):
                F("sitemap has duplicate locs")
            for pid in ORDER:
                u = "https://gophergo.io/" + POSTS[pid]["slug"] + ".html"
                if u not in locs:
                    F("sitemap missing %s" % u)
            if "https://gophergo.io/gopher-blog.html" not in locs:
                F("sitemap lost the gopher-blog.html entry")
    except Exception as e:
        F("%s: %s" % (f, e))

# every new page must be reachable from the index
t = open(os.path.join(FINAL, "gopher-blog.html"), encoding="utf-8").read()
for pid in ORDER:
    page = POSTS[pid]["slug"] + ".html"
    if 'href="%s"' % page not in t:
        F("index does not link %s" % page)
    if 'id="%s"' % pid not in t:
        F("index lost the #%s card id" % pid)
    if '"%s": "%s"' % (pid, page) not in t:
        F("fragment shim missing %s -> %s" % (pid, page))
print("  index links all 14 posts, keeps all 14 old ids, shim maps all 14")

# no full post body left on the index
if "<details class=\"post-card" in t:
    F("index still has <details> post cards")
idx_words = len(re.sub(r"\s+", " ", visible(t)).strip().split())
print("  index visible words now: %d (was ~%d with all bodies inline)"
      % (idx_words, idx_words + sum(base.values())))

print()
print("=" * 72)
print("RESULT: %d failures, %d warnings" % (len(fails), len(warns)))
print("=" * 72)
sys.exit(1 if fails else 0)
