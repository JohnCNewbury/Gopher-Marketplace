#!/usr/bin/env python3
"""Builds the Pro / Pro+ stage 2 pick doc (the tiers page) from one set of section templates,
so the desktop and phone views of every option are the same markup."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))

HERO = """<section class="tp-hero">
  <span class="cursive">Earn your badge</span>
  <h1>Two ways to stand out as a <em>verified</em> Gopher.</h1>
  <p class="lead">Every customer wants to know who's showing up at their door. Verified Gophers get more requests, better tips, and access to perks the rest of the marketplace doesn't see. Pick the badge that fits the work you do.</p>
  <div class="anchors"><a href="#" tabindex="-1">Compare Pro and Pro+</a><a href="#" tabindex="-1">Get Pro or Pro+</a></div>
</section>"""

HEAD = """<div class="tp-head">
  <div class="eyebrow">Background-check badges</div>
  <h2>Pick your <em>badge</em>.</h2>
  <p>Gopher Pro and Pro+ are background checks run by Yardstik, our screening partner. You pay once, and when your check clears we add the badge and its perks to your Gopher Go profile.</p>
</div>"""

PRO_SEARCHES = ["National Criminal Search", "National Sex Offender Registry", "OFAC &amp; Most Wanted Lists", "Address &amp; SSN Trace"]
PERKS = ["Your Pro or Pro+ badge on your Gopher Go profile", "See new requests before Standard Gophers", "Take more than one request at a time", "Instant payouts from your first job"]

def pill(plus=False):
    if plus:
        return '<span class="tp-pillbox"><img class="tp-pill plus" src="img/badge-gopher-pro-plus.png" alt="Gopher Pro+ badge" width="501" height="227"></span>'
    return '<span class="tp-pillbox"><img class="tp-pill" src="img/badge-gopher-pro.png" alt="Gopher Pro badge" width="418" height="187"></span>'

def ul(items):
    return "<ul>" + "".join("<li>" + i + "</li>" for i in items) + "</ul>"

def card(plus, perks_inside):
    if plus:
        items = ["Everything in Pro", "MVR (Motor Vehicle Record)"]
        lede = "Everything in Pro, plus your motor vehicle record."
        price, cta = "$30", "Get Pro+"
    else:
        items = list(PRO_SEARCHES)
        lede = "The background check. Clear it and you get every Pro perk."
        price, cta = "$20", "Get Pro"
    if perks_inside:
        items = items + PERKS
    return f"""<article class="tp-card">{pill(plus)}
  <div class="price">{price}</div><div class="price-sub">One-time fee &middot; via Yardstik</div>
  <p class="tier-lede">{lede}</p>{ul(items)}
  <a class="tier-cta" href="#" tabindex="-1">{cta}</a></article>"""

def table():
    Y, N = '<span class="ck" aria-label="Yes"></span>', '<span class="no" aria-label="No">&ndash;</span>'
    rows = [("National Criminal Search", N, Y, Y), ("National Sex Offender Registry", N, Y, Y),
            ("OFAC &amp; Most Wanted Lists", N, Y, Y), ("Address &amp; SSN Trace", N, Y, Y),
            ("MVR (Motor Vehicle Record)", N, N, Y)]
    perks = [("Badge on your Gopher Go profile", N, Y, Y), ("See new requests before Standard Gophers", N, Y, Y),
             ("Take more than one request at a time", N, Y, Y),
             ("Instant payouts", '<span class="tx">After 10 paid jobs</span>', '<span class="tx">From your first job</span>', '<span class="tx">From your first job</span>')]
    def tr(r): return "<tr><th scope=\"row\">" + r[0] + "</th>" + "".join("<td>" + c + "</td>" for c in r[1:]) + "</tr>"
    return f"""<div class="tp-tablewrap"><table class="tp-table">
<thead><tr><th scope="col"><span class="sr">Compare</span></th><th scope="col"><span class="std">Standard</span></th><th scope="col">{pill()}</th><th scope="col">{pill(True)}</th></tr>
<tr class="pr"><th scope="row">One-time fee</th><td>Free</td><td><b>$20</b></td><td><b>$30</b></td></tr></thead>
<tbody><tr class="grp"><th colspan="4">The background check</th></tr>{"".join(tr(r) for r in rows)}
<tr class="grp"><th colspan="4">What you get</th></tr>{"".join(tr(r) for r in perks)}</tbody>
<tfoot><tr><td></td><td></td><td><a class="tier-cta" href="#" tabindex="-1">Get Pro</a></td><td><a class="tier-cta" href="#" tabindex="-1">Get Pro+</a></td></tr></tfoot>
</table></div>"""

YARD = """<section class="tp-yard">
  <h3>Get Pro or Pro+ through Yardstik</h3>
  <p>Finish your Gopher Go profile first. Then fill in Yardstik's short form and pick Gopher Pro ($20) or Gopher Pro+ ($30). Most checks come back in 1&ndash;3 days, and then we add your badge and perks to your Gopher Go account.</p>
  <a class="btn-yardstik" href="#" tabindex="-1">Continue to Yardstik &rarr;</a>
</section>"""

def page(k):
    if k == "A":
        mid = f'<div class="tp-grid">{card(False, True)}{card(True, True)}</div>'
    elif k == "B":
        perks = "".join(f'<div class="perk"><span class="ck" aria-hidden="true"></span><span>{p}</span></div>' for p in PERKS)
        mid = f'<div class="tp-grid">{card(False, False)}{card(True, False)}</div><div class="tp-perks"><div class="perks-h">Both badges get</div><div class="perks-row">{perks}</div></div>'
    else:
        mid = table()
    return f'<div class="tp-page">{HERO}<section class="tp-section">{HEAD}{mid}</section>{YARD}</div>'

OPTS = [
 ("A", "Two cards, perks in each", False,
  "Today's layout with two cards instead of three. Each card lists its searches, then the perks. Pro+ repeats the perks, so a quick reader may think it gets more than Pro."),
 ("B", "Two cards, perks shared below", True,
  "The cards show only what each check covers and costs. The four perks sit once underneath, under &ldquo;Both badges get&rdquo;. That's what the code does: Pro and Pro+ get the same perks, and Pro+ adds only the driving record."),
 ("C", "A table that includes Standard", False,
  "One table with Standard, Pro and Pro+ side by side, check marks like your live Become a Gopher Pro page. It shows what a Standard Gopher is missing, including when instant payouts start. On a phone the table is tight but fits."),
]

def build():
    opt_html = []
    for k, name, rec, facts in OPTS:
        p = page(k)
        opt_html.append(f"""<section class="opt" id="opt-{k.lower()}">
  <h2><span class="optlabel">{k}</span>{name}{' <span class="rec">&middot; recommended</span>' if rec else ''}</h2>
  <p class="facts">{facts}</p>
  <div class="views">
    <div class="desk"><div class="viewcap">Desktop</div><div class="stage">{p}</div></div>
    <div class="phone"><div class="viewcap">Phone</div><div class="stage phone-pad">{p}</div></div>
  </div>
</section>""")
    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    out = tpl.replace("<!--OPTIONS-->", "\n".join(opt_html))
    open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(out)
    print("wrote index.html", len(out), "bytes")

build()
