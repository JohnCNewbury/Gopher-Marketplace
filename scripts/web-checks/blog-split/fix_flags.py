#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply the two owner-approved copy fixes to the LIVE blog pages.

  Flag 2 — "background-checked" -> the correct model (identity-verified, with a
           clean background check on Elite / Elite+). Three body lines, plus the
           seniors page's derived Key-takeaways bullet and FAQPage answer.
  Flag 1 — retitle "A gig you'll actually dig" -> "A job you'll actually dig",
           which is what the slug already says. The SLUG DOES NOT CHANGE, so no
           URL moves and no redirect is needed.

The post pages are now the source of truth for post copy — `build.py` was a
one-shot migration out of the old single-page blog and must not be re-run.
Every replacement below asserts its expected hit count, so a miss is a hard
failure rather than a silent no-op.
"""
import os
import re
import sys

ROOT = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code"
FINAL = os.path.join(ROOT, "Final")

edits = []   # (file, old, new, expected_count, label)


def E(f, old, new, n, label):
    edits.append((f, old, new, n, label))


# ─────────────────────────────────────────────────────────────────────────
# FLAG 2 — three posts state the verification model wrongly
# ─────────────────────────────────────────────────────────────────────────

# 1. Connect post — "background-checked local Gophers claim it"
E("blog-on-demand-local-workforce.html",
  "set a fair price, and background-checked local Gophers claim it.",
  "set a fair price, and identity-verified local Gophers claim it.",
  1, "connect: background-checked -> identity-verified")

# 2. Age-restricted post — step 2 of the how-it-works strip
E("blog-age-restricted-deliveries.html",
  "<h4>Match</h4><p>A background-checked Gopher accepts it.</p>",
  "<h4>Match</h4><p>An identity-verified Gopher accepts it.</p>",
  1, "age-restricted: step 2")

# 3. Seniors post — the body promise, and the two places the split derived from it
E("blog-a-marketplace-seniors-can-trust.html",
  "<li><b>Trusted &amp; safe</b> — background checks, real ratings, and verified "
  "identities, so you know exactly who's coming.</li>",
  "<li><b>Trusted &amp; safe</b> — verified identities and real ratings, with a clean "
  "background check on Elite and Elite+ Gophers, so you know exactly who's coming.</li>",
  1, "seniors: body promise")

E("blog-a-marketplace-seniors-can-trust.html",
  "<li>Help is requested in a few taps, and you know exactly who&rsquo;s coming &mdash; "
  "background checks, real ratings, verified identities.</li>",
  "<li>Help is requested in a few taps, and you know exactly who&rsquo;s coming &mdash; "
  "verified identities, real ratings, and a clean background check on Elite and Elite+ "
  "Gophers.</li>",
  1, "seniors: Key takeaways bullet")

E("blog-a-marketplace-seniors-can-trust.html",
  '"text": "Background checks, real ratings and verified identities, so you know exactly '
  'who is coming."',
  '"text": "Verified identities and real ratings, with a clean background check on Elite '
  'and Elite+ Gophers, so you know exactly who is coming."',
  1, "seniors: FAQPage acceptedAnswer")

# ─────────────────────────────────────────────────────────────────────────
# FLAG 1 — retitle. Slug unchanged; only the rendered title moves.
# ─────────────────────────────────────────────────────────────────────────
OLD_T = "A gig you'll actually dig"
NEW_T = "A job you'll actually dig"

E("blog-a-job-you-ll-actually-dig.html", OLD_T, NEW_T, 6,
  "post page: title, og:title, twitter:title, JSON-LD headline, breadcrumb name, H1")
E("gopher-blog.html", OLD_T, NEW_T, 2,
  "index: Blog JSON-LD stub headline + teaser card title")
E("gopher-blog.html", "<!-- A GIG YOU'LL DIG (workers) -->", "<!-- A JOB YOU'LL DIG (workers) -->", 1,
  "index: stale section comment")
E("feed.xml", "<title>%s</title>" % OLD_T, "<title>%s</title>" % NEW_T, 1, "feed item title")
for f in ("blog-worker-centric-way-to-earn.html", "blog-refer-yourself.html"):
    E(f, OLD_T, NEW_T, 1, "%s: Related-reading link text" % f)

# The two body sentences on that post carry the banned word independently of the
# title. A retitle that leaves them is a half-fix, so they go too — minimal,
# meaning-preserving, and called out in the report rather than buried.
E("blog-a-job-you-ll-actually-dig.html",
  "Looking for a flexible gig you can do on your own time and your own terms?",
  "Looking for flexible work you can do on your own time and your own terms?",
  1, "a-job: lead-in sentence")
E("blog-a-job-you-ll-actually-dig.html",
  "That's a gig worth digging.",
  "That's a job worth digging.",
  1, "a-job: closing line")

# DELIBERATELY NOT TOUCHED:
#   blog-the-marketplace-your-community-runs-on.html - "not anonymous gig accounts"
#   names what Gopher is NOT, which is the one legitimate use of the word.

# ─────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    fail = False
    touched = {}
    for f, old, new, n, label in edits:
        p = os.path.join(FINAL, f)
        t = touched.get(f) or open(p, encoding="utf-8").read()
        got = t.count(old)
        if got != n:
            print("FAIL  %-52s expected %d hit(s), found %d  [%s]" % (f, n, got, label))
            fail = True
            continue
        touched[f] = t.replace(old, new)
        print("  ok  %-52s x%d  %s" % (f, n, label))
    if fail:
        print("\nNOTHING WRITTEN — fix the mismatches above first.")
        sys.exit(1)
    for f, t in touched.items():
        open(os.path.join(FINAL, f), "w", encoding="utf-8").write(t)
    print("\nwrote %d file(s)" % len(touched))

    # wordCount in BlogPosting must follow the copy it describes
    def visible_body(t):
        i = t.index('<div class="reading">')
        j = t.index('<aside class="related">')
        frag = t[i:j]
        frag = re.sub(r'<p class="post-lead">.*?</p>', "", frag, count=1, flags=re.S)
        frag = re.sub(r'<aside class="takeaways">.*?</aside>', "", frag, count=1, flags=re.S)
        frag = re.sub(r"(?is)<(script|style).*?</\1>", " ", frag)
        frag = re.sub(r"(?s)<[^>]+>", " ", frag)
        import html as _h
        return len(re.sub(r"\s+", " ", _h.unescape(frag)).strip().split())

    print("\nwordCount refresh:")
    for f in sorted(set(x[0] for x in edits) - {"gopher-blog.html", "feed.xml"}):
        p = os.path.join(FINAL, f)
        t = open(p, encoding="utf-8").read()
        want = visible_body(t)
        m = re.search(r'"wordCount": (\d+)', t)
        if not m:
            print("  %-52s no wordCount" % f)
            continue
        have = int(m.group(1))
        if have != want:
            t = t.replace('"wordCount": %d' % have, '"wordCount": %d' % want, 1)
            open(p, "w", encoding="utf-8").write(t)
            print("  %-52s %d -> %d" % (f, have, want))
        else:
            print("  %-52s %d (unchanged)" % (f, have))
