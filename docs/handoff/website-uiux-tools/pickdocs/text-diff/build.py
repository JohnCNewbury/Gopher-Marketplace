#!/usr/bin/env python3
"""Builds the Pro / Pro+ stage 5 pick doc (four blog posts): before / after sentences per post,
for each of three options."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))

L_TIERS = '<a href="#" tabindex="-1">'  # stands in for a real link in the preview
E = '</a>'

POSTS = [
 ("A marketplace seniors can trust", "For neighbors", [
   ("FAQ answer in the page data (search engines read it)",
    "Verified identities and real ratings, with a clean background check on Elite and Elite+ Gophers, so you know exactly who is coming.",
    {"A": "Verified identities and real ratings, with a clean background check on Gopher Pro and Pro+ Gophers, so you know exactly who is coming.",
     "B": "Verified identities and real ratings, with a clean background check on Gopher Pro and Pro+ Gophers, so you know exactly who is coming.",
     "C": "Verified identities and real ratings, and a clean background check on any Gopher with a pro or pro+ badge, so you know exactly who is coming."}),
   ("Summary list",
    "verified identities, real ratings, and a clean background check on Elite and Elite+ Gophers.",
    {"A": "verified identities, real ratings, and a clean background check on Gopher Pro and Pro+ Gophers.",
     "B": f"verified identities, real ratings, and a clean background check on {L_TIERS}Gopher Pro and Pro+{E} Gophers.",
     "C": "verified identities, real ratings, and a clean background check on any Gopher with a pro or pro+ badge (their profile says &ldquo;Background checked&rdquo;)."}),
   ("&ldquo;Trusted &amp; safe&rdquo; bullet",
    "verified identities and real ratings, with a clean background check on Elite and Elite+ Gophers, so you know exactly who's coming.",
    {"A": "verified identities and real ratings, with a clean background check on Gopher Pro and Pro+ Gophers, so you know exactly who's coming.",
     "B": "verified identities and real ratings, with a clean background check on Gopher Pro and Pro+ Gophers, so you know exactly who's coming.",
     "C": "verified identities and real ratings, and a clean background check on any Gopher with a pro or pro+ badge, so you know exactly who's coming."}),
 ]),
 ("A worker-centric way to earn", "For Gophers", [
   ("Summary list",
    "You climb a status ladder your neighbors can see: <b>Standard &rarr; Elite &rarr; Elite+</b>, earned one solid job at a time.",
    {"A": "You build a reputation your neighbors can see, one solid job at a time, and you can add a <b>Gopher Pro</b> or <b>Pro+</b> badge with an optional background check.",
     "B": "You build a reputation your neighbors can see, one solid job at a time, and you can add a <b>Gopher Pro</b> or <b>Pro+</b> badge with an optional background check.",
     "C": "You build a reputation your neighbors can see, one solid job at a time, and you can add a <b>Gopher Pro</b> or <b>Pro+</b> badge with an optional one-time background check ($20 or $30 through Yardstik)."}),
   ("Body paragraph",
    "From there you climb a status ladder your neighbors can see &mdash; <b>Standard &rarr; Elite &rarr; Elite+</b> &mdash; earned one solid job at a time. That reputation is yours, it's local, and it brings repeat customers who request you by name&hellip;",
    {"A": "From there you build a reputation your neighbors can see, one solid job at a time, and you can add a <b>Gopher Pro</b> or <b>Pro+</b> badge with an optional background check. That reputation is yours, it's local, and it brings repeat customers who request you by name&hellip;",
     "B": f"From there you build a reputation your neighbors can see, one solid job at a time, and you can add a {L_TIERS}<b>Gopher Pro</b> or <b>Pro+</b> badge{E} with an optional background check. That reputation is yours, it's local, and it brings repeat customers who request you by name&hellip;",
     "C": "From there you build a reputation your neighbors can see, one solid job at a time. Add a <b>Gopher Pro</b> or <b>Pro+</b> badge with an optional one-time background check and you'll see new requests before Standard Gophers, take more than one at a time, and get paid instantly from your first job. That reputation is yours, it's local, and it brings repeat customers who request you by name&hellip;"}),
   ("Closing paragraph",
    "Set your rate, pick your jobs, and build a reputation in your own neighborhood &mdash; from Standard to Elite to Elite+.",
    {"A": "Set your rate, pick your jobs, and build a reputation in your own neighborhood &mdash; with a Gopher Pro or Pro+ badge if you want one.",
     "B": "Set your rate, pick your jobs, and build a reputation in your own neighborhood &mdash; with a Gopher Pro or Pro+ badge if you want one.",
     "C": "Set your rate, pick your jobs, and build a reputation in your own neighborhood &mdash; with a Gopher Pro or Pro+ badge if you want one."}),
 ]),
 ("The Gopher marketplace on one page", "For everyone", [
   ("Summary list",
    "Nobody deals with a stranger directly: neighbors are identity-verified, and Gophers carry Elite, Elite+ and Pro badges on top.",
    {"A": "Nobody deals with a stranger directly: neighbors are identity-verified, and Gophers can add a Gopher Pro or Pro+ background-check badge on top.",
     "B": "Nobody deals with a stranger directly: neighbors are identity-verified, and Gophers can add a Gopher Pro or Pro+ background-check badge on top.",
     "C": "Nobody deals with a stranger directly: neighbors are identity-verified, and a Gopher with a pro or pro+ badge has passed a background check too."}),
   ("Body paragraph",
    "Gophers are verified for neighbors, with Elite, Elite+, and Pro badges on top.",
    {"A": "Gophers are verified for neighbors, and can add a Gopher Pro or Pro+ background-check badge on top.",
     "B": f"Gophers are verified for neighbors, and can add a {L_TIERS}Gopher Pro or Pro+{E} background-check badge on top.",
     "C": "Gophers are verified for neighbors, and a Gopher with a pro or pro+ badge has passed a background check too: their profile says &ldquo;Background checked&rdquo;."}),
 ]),
 ("The marketplace your community runs on", "For neighbors", [
   ("Summary list",
    "Everyone is identity-verified with ratings you can see; Elite and Elite+ Gophers add a clean background check on top.",
    {"A": "Everyone is identity-verified with ratings you can see; Gopher Pro and Pro+ Gophers add a clean background check on top.",
     "B": "Everyone is identity-verified with ratings you can see; Gopher Pro and Pro+ Gophers add a clean background check on top.",
     "C": "Everyone is identity-verified with ratings you can see; a Gopher with a pro or pro+ badge has passed a clean background check too."}),
   ("Body paragraph",
    "Elite and Elite+ Gophers add a clean background check on top, and you can pick the tier you want.",
    {"A": "Gopher Pro and Pro+ Gophers add a clean background check on top, and with Select My Gopher you can see who wants the job and pick the one you want.",
     "B": f"{L_TIERS}Gopher Pro and Pro+{E} Gophers add a clean background check on top, and with Select My Gopher you can see who wants the job and pick the one you want.",
     "C": "A Gopher with a pro or pro+ badge has passed a clean background check (their profile says &ldquo;Background checked&rdquo;), and with Select My Gopher you can see who wants the job and pick the one you want."}),
 ]),
]

OPTS = [
 ("A", "Swap the names, fix the two wrong claims", True,
  "Every sentence keeps its shape. Elite and Elite+ become Gopher Pro and Pro+. The two lines the apps don&rsquo;t back get rewritten: a badge &ldquo;earned one solid job at a time&rdquo;, and &ldquo;pick the tier you want&rdquo;. Smallest change."),
 ("B", "A, plus one link per post", False,
  "The same words, with the first body mention in each post linked. The worker post links to the tiers page; the three neighbor posts link to the Marketplace page&rsquo;s worker ladder, which now explains the badges. (Shown underlined below; links aren&rsquo;t live in this preview.)"),
 ("C", "Say what the badge means in practice", False,
  "Neighbor posts say what to look for (the pro or pro+ badge and &ldquo;Background checked&rdquo; on a profile, the app&rsquo;s own words). The worker post spells out the price and the three perks the code gives. Longest change, and every added fact is one already verified for the tiers page."),
]

def build():
    out_opts = []
    for k, name, rec, facts in OPTS:
        blocks = []
        for title, aud, rows in POSTS:
            trs = "".join(f'<div class="row"><div class="where">{w}</div><div class="was"><span class="lab">Now</span>{before}</div><div class="new"><span class="lab">{k}</span>{after[k]}</div></div>' for w, before, after in rows)
            blocks.append(f'<article class="post"><header><h3>{title}</h3><span class="aud">{aud}</span></header>{trs}</article>')
        out_opts.append(f'''<section class="opt" id="opt-{k.lower()}">
  <h2><span class="optlabel">{k}</span>{name}{' <span class="rec">&middot; recommended</span>' if rec else ''}</h2>
  <p class="facts">{facts}</p>
  <div class="posts">{''.join(blocks)}</div>
</section>''')
    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    out = tpl.replace("<!--OPTIONS-->", "\n".join(out_opts))
    open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(out)
    print("wrote index.html", len(out), "bytes")

build()
