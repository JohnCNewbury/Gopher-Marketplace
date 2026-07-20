#!/usr/bin/env python3
"""Session 6 — worker-promotion cluster opportunity. Emits HTML report + CSVs."""
import csv, math, json, html, re
from collections import defaultdict, Counter
from datetime import datetime

B    = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Dashboard"
CODE = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code"
RES  = f"{CODE}/docs/research"
CUTOFF, ENDD = datetime(2026, 1, 20), datetime(2026, 7, 20)
RADIUS_MI = 25.0

def pdt(s):
    s = (s or "").strip()
    for f in ("%m-%d-%Y %I:%M %p", "%m-%d-%Y"):
        try: return datetime.strptime(s, f)
        except ValueError: pass
def z5(s):
    d = "".join(c for c in (s or "") if c.isdigit())
    return d[:5].zfill(5) if d[:5] else None
def excluded(e):
    e = (e or "").strip().lower()
    return (not e) or "@gophergo.io" in e or "test" in e or "placeholder" in e or e == "johnnewbury@sbcglobal.net"
def tc(n):
    return "-".join(p.strip().title() for p in n.split("(")[0].strip().replace(" - ", "-").split("-"))

zinfo = {}
with open(f"{B}/.geonames/US.txt", encoding="utf-8") as f:
    for r in csv.reader(f, delimiter="\t"):
        if len(r) < 11 or not r[9] or not r[10]: continue
        try: zinfo[r[1].zfill(5)] = (float(r[9]), float(r[10]), r[2], r[4])
        except ValueError: pass
xw = json.load(open(f"{B}/zip_dma_crosswalk.json")); z2d, dnm = xw["zip2dma"], xw["names"]

req_z, gs_z, gv_z = defaultdict(int), defaultdict(int), defaultdict(int)
with open(f"{B}/data/master/Users.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        d = pdt(r.get("created_at"))
        if not d or d < CUTOFF or excluded(r.get("email")): continue
        z = z5(r.get("address_zip"))
        if not z or z not in zinfo: continue
        role = r.get("role") or ""
        if "Requester" in role: req_z[z] += 1
        if "Gopher" in role:
            gs_z[z] += 1
            if (r.get("Gopher Stripe Verified") or "").strip().lower() == "yes": gv_z[z] += 1

o_z, d_z, e_z, c_z = (defaultdict(int) for _ in range(4)); w_z = defaultdict(set)
with open(f"{B}/data/master/Orders.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        d = pdt(r.get("CREATED AT"))
        if not d or d < CUTOFF or excluded(r.get("REQUESTOR EMAIL")): continue
        z = z5(r.get("DROPOFF ZIP")) or z5(r.get("PICKUP ZIP"))
        if not z or z not in zinfo: continue
        st = (r.get("AASM") or "").strip().lower()
        o_z[z] += 1
        if st == "delivered":
            d_z[z] += 1
            g = (r.get("GOPHER ID") or "").strip()
            if g: w_z[z].add(g)
        elif st == "expired": e_z[z] += 1
        elif st == "cancelled": c_z[z] += 1

active = [z for z in (set(req_z)|set(gs_z)|set(o_z)) if z in zinfo]
def act(z): return req_z[z] + o_z[z]
def hav(a, b):
    R = 3958.7613; p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = math.radians(b[0]-a[0]), math.radians(b[1]-a[1])
    return 2*R*math.asin(math.sqrt(math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))

CELL = .5; grid = defaultdict(list)
for z in active:
    la, lo, _, _ = zinfo[z]; grid[(math.floor(la/CELL), math.floor(lo/CELL))].append(z)
assigned, cl = set(), []
for seed in sorted(active, key=lambda z: (-act(z), z)):
    if seed in assigned: continue
    c0 = zinfo[seed][:2]; ci, cj = math.floor(c0[0]/CELL), math.floor(c0[1]/CELL)
    mem = [zz for di in range(-2,3) for dj in range(-3,4) for zz in grid.get((ci+di,cj+dj),())
           if zz not in assigned and hav(c0, zinfo[zz][:2]) <= RADIUS_MI]
    assigned.update(mem)
    dw = Counter()
    for m in mem:
        i = z2d.get(m)
        if i is not None: dw[dnm[i]] += act(m)+1
    tz = max(mem, key=lambda z:(act(z), req_z[z])); _,_,city,stt = zinfo[tz]
    cl.append(dict(metro=tc(dw.most_common(1)[0][0]) if dw else f"{city} area",
        city=f"{city}, {stt}", seed=seed, zips=len(mem),
        req=sum(req_z[m] for m in mem), ord=sum(o_z[m] for m in mem), dlv=sum(d_z[m] for m in mem),
        exp=sum(e_z[m] for m in mem), can=sum(c_z[m] for m in mem),
        gs=sum(gs_z[m] for m in mem), gv=sum(gv_z[m] for m in mem),
        aw=len(set().union(*(w_z[m] for m in mem)) if mem else set())))

dma = defaultdict(lambda: defaultdict(int))
for c in cl:
    d = dma[c["metro"]]
    for k in ("req","ord","dlv","exp","can","gs","gv","aw"): d[k]+=c[k]
    d["n"] += 1
roll = sorted(dma.items(), key=lambda kv:-kv[1]["req"])

TOT = dict(req=sum(req_z.values()), ord=sum(o_z.values()), dlv=sum(d_z.values()),
           exp=sum(e_z.values()), can=sum(c_z.values()), gs=sum(gs_z.values()),
           gv=sum(gv_z.values()), aw=len(set().union(*w_z.values()) if w_z else set()))
RD = dma["Raleigh-Durham"]
BENCH = RD["ord"]/RD["aw"]           # requests per working gopher in the served market

def need(d):
    n = math.ceil(d["ord"]/BENCH)
    return n, max(0, n-d["aw"])

# ---------- CSVs ----------
with open(f"{RES}/worker-cluster-opportunity-2026-07.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow(["rank","metro","anchor_city","seed_zip","zips","requesters_added",
        "requests_submitted","delivered","expired","cancelled","expiry_pct","gopher_signups",
        "gophers_stripe_verified","working_gophers"])
    for i,c in enumerate(sorted(cl,key=lambda c:-c["req"]),1):
        w.writerow([i,c["metro"],c["city"],c["seed"],c["zips"],c["req"],c["ord"],c["dlv"],c["exp"],
                    c["can"], f'{100*c["exp"]/c["ord"]:.1f}' if c["ord"] else "", c["gs"],c["gv"],c["aw"]])
with open(f"{RES}/worker-cluster-opportunity-metro-2026-07.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow(["rank","metro","clusters_25mi","requesters_added","requests_submitted",
        "delivered","expired","cancelled","expiry_pct","gopher_signups","gophers_stripe_verified",
        "working_gophers","workers_needed_at_raleigh_ratio","worker_gap"])
    for i,(m,d) in enumerate(roll,1):
        n,g = need(d)
        w.writerow([i,m,d["n"],d["req"],d["ord"],d["dlv"],d["exp"],d["can"],
                    f'{100*d["exp"]/d["ord"]:.1f}' if d["ord"] else "", d["gs"],d["gv"],d["aw"],n,g])

# ---------- HTML ----------
CSS = """:root{--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;
--grid:#e1e0d9;--baseline:#c3c2b7;--border:rgba(11,11,11,.10);--s1:#2a78d6;--s2:#1baf7a;--warn:#fab219;--crit:#d03b3b;}
@media (prefers-color-scheme:dark){:root{--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;
--muted:#898781;--grid:#2c2c2a;--baseline:#383835;--border:rgba(255,255,255,.10);--s1:#3987e5;--s2:#199e70;}}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);
font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:36px 28px 64px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:40px 0 6px}
.sub{color:var(--ink2);margin:0 0 24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px 22px;margin:16px 0}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.kpi .label{color:var(--ink2);font-size:13px}.kpi .value{font-size:30px;font-weight:600;margin:2px 0}
.kpi .note{color:var(--muted);font-size:12.5px}
.tablewrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13.5px}
th{text-align:left;color:var(--ink2);font-weight:600;border-bottom:1px solid var(--baseline);
padding:7px 10px 7px 0;white-space:nowrap}
td{border-bottom:1px solid var(--grid);padding:6px 10px 6px 0;vertical-align:middle}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td.name{font-weight:600;white-space:nowrap}.muted{color:var(--muted);white-space:nowrap}
.chip{display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;margin-left:8px}
.cbad{background:var(--crit);color:#fff}.cwarn{background:var(--warn);color:#0b0b0b}
.cok{background:var(--s2);color:#fff}
ul{margin:8px 0 0;padding-left:20px}li{margin:5px 0}
.note{color:var(--ink2);font-size:13.5px}"""

def esc(s): return html.escape(str(s))
def pct(a,b): return f"{100*a/b:.0f}%" if b else "—"

rows_cluster = "".join(
    f"<tr><td class=name>{esc(c['metro'])}</td><td class=muted>{esc(c['city'])}</td>"
    f"<td class=num>{c['req']:,}</td><td class=num>{c['ord']:,}</td><td class=num>{c['dlv']:,}</td>"
    f"<td class=num>{c['exp']:,}</td><td class=num>{pct(c['exp'],c['ord'])}</td>"
    f"<td class=num>{c['gs']:,}</td><td class=num>{c['aw']:,}</td></tr>"
    for c in sorted(cl, key=lambda c:-c["req"])[:30])

def metro_rows(items, extra=False):
    out=[]
    for m,d in items:
        n,g = need(d)
        chip = ('<span class="chip cbad">no supply</span>' if d["aw"]==0
                else '<span class="chip cwarn">thin</span>' if d["ord"]/max(d["aw"],1) > BENCH*1.5 else "")
        out.append(f"<tr><td class=name>{esc(m)}{chip}</td><td class=num>{d['req']:,}</td>"
                   f"<td class=num>{d['ord']:,}</td><td class=num>{d['dlv']:,}</td>"
                   f"<td class=num>{d['exp']:,}</td><td class=num>{pct(d['exp'],d['ord'])}</td>"
                   f"<td class=num>{d['gs']:,}</td><td class=num>{d['gv']:,}</td><td class=num>{d['aw']:,}</td>"
                   + (f"<td class=num><b>{g:,}</b></td>" if extra else "") + "</tr>")
    return "".join(out)

zero_rows = "".join(
    f"<tr><td class=name>{esc(m)}</td><td class=num>{d['ord']:,}</td><td class=num>{d['exp']:,}</td>"
    f"<td class=num>{d['can']:,}</td><td class=num>{d['req']:,}</td><td class=num>{d['gs']:,}</td>"
    f"<td class=num>{d['gv']:,}</td></tr>"
    for m,d in sorted(dma.items(), key=lambda kv:-kv[1]["ord"]) if d["dlv"]==0 and d["ord"]>=40)

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Worker-Promotion Cluster Opportunity — Session 6 (July 2026)</title><style>{CSS}</style></head>
<body><div class=wrap>
<h1>Worker-Promotion Cluster Opportunity</h1>
<p class=sub>Where new requester demand is landing and no one is there to serve it &middot;
{CUTOFF:%b %-d, %Y} – {ENDD:%b %-d, %Y} &middot; 25-mile radius clusters</p>

<div class=kpis>
<div class=kpi><div class=label>New requesters</div><div class=value>{TOT['req']:,}</div>
<div class=note>signed up in window</div></div>
<div class=kpi><div class=label>Requests submitted</div><div class=value>{TOT['ord']:,}</div>
<div class=note>{TOT['dlv']:,} delivered ({pct(TOT['dlv'],TOT['ord'])})</div></div>
<div class=kpi><div class=label>Expired unfilled</div><div class=value>{TOT['exp']:,}</div>
<div class=note>{pct(TOT['exp'],TOT['ord'])} — no gopher accepted</div></div>
<div class=kpi><div class=label>Gophers actually working</div><div class=value>{TOT['aw']:,}</div>
<div class=note>of {TOT['gs']:,} signups / {TOT['gv']:,} payout-verified</div></div>
</div>

<div class=card>
<b>The headline.</b> {TOT['req']:,} new requesters arrived in the last six months and placed
{TOT['ord']:,} requests — but only {TOT['dlv']:,} ({pct(TOT['dlv'],TOT['ord'])}) were delivered.
{TOT['exp']:,} ({pct(TOT['exp'],TOT['ord'])}) <b>expired with no gopher ever accepting them</b>.
Nationwide only <b>{TOT['aw']:,} gophers completed a single delivery</b> in the entire window.
Demand is not the constraint; workers are. Raleigh-Durham is the one market with real coverage
({RD['aw']} working gophers, {pct(RD['exp'],RD['ord'])} expiry) and it is the benchmark used below:
<b>~{BENCH:.0f} requests per working gopher</b>.
</div>

<h2>Top clusters — 25-mile radius</h2>
<p class=note>Each row is a self-contained 25-mile catchment, labelled by its media market and the
busiest city inside it. Large metros legitimately split into several clusters at this radius.</p>
<div class=tablewrap><table>
<thead><tr><th>Metro</th><th>Anchor city</th><th class=num>Requesters<br>added</th>
<th class=num>Requests<br>submitted</th><th class=num>Deliv</th><th class=num>Expired</th>
<th class=num>Exp %</th><th class=num>Gopher<br>signups</th><th class=num>Working<br>gophers</th></tr></thead>
<tbody>{rows_cluster}</tbody></table></div>

<h2>Metro rollup — clusters merged by market</h2>
<p class=note>The 25-mile view fragments big metros (New York spans 11 clusters). This merges them
so each market reads as one line, and adds the worker gap at the Raleigh ratio.</p>
<div class=tablewrap><table>
<thead><tr><th>Metro</th><th class=num>Requesters<br>added</th><th class=num>Requests<br>submitted</th>
<th class=num>Deliv</th><th class=num>Expired</th><th class=num>Exp %</th><th class=num>Gopher<br>signups</th>
<th class=num>Payout<br>verified</th><th class=num>Working<br>gophers</th>
<th class=num>Workers<br>needed</th></tr></thead>
<tbody>{metro_rows(roll[:30], extra=True)}</tbody></table></div>

<h2>Zero-fulfillment markets</h2>
<p class=note>Real, repeated demand and <b>not one completed delivery</b> in six months. These are the
cleanest promotion targets — the requesters already exist and every request died unserved.</p>
<div class=tablewrap><table>
<thead><tr><th>Metro</th><th class=num>Requests</th><th class=num>Expired</th><th class=num>Cancelled</th>
<th class=num>Requesters<br>added</th><th class=num>Gopher<br>signups</th>
<th class=num>Payout<br>verified</th></tr></thead>
<tbody>{zero_rows}</tbody></table></div>

<h2>What this says to do</h2>
<div class=card><ul>
<li><b>Activation before recruitment.</b> {TOT['gs']:,} people signed up as gophers in the window;
only {TOT['gv']:,} ({pct(TOT['gv'],TOT['gs'])}) finished payout verification and only {TOT['aw']:,}
ever delivered. In most target markets there is already a bench larger than the gap — Minneapolis has
{dma['Minneapolis-St. Paul']['gs']} signups, {dma['Minneapolis-St. Paul']['gv']} verified, 0 working.
Converting existing signups is cheaper than buying new ones.</li>
<li><b>Biggest absolute prize: New York.</b> {dma['New York']['req']:,} new requesters and
{dma['New York']['ord']:,} requests against {dma['New York']['aw']} working gophers — the largest
demand pool on the platform with effectively no supply.</li>
<li><b>Fastest credibility win: the zero-fulfillment list.</b> Minneapolis-St. Paul, Seattle-Tacoma and
Baltimore each have 95–150 requests and literally zero deliveries. A handful of activated workers
flips these from 0% to a working market.</li>
<li><b>Protect what works.</b> Raleigh-Durham is {pct(RD['ord'],TOT['ord'])} of all requests and
{pct(RD['dlv'],TOT['dlv'])} of all deliveries. Its {pct(RD['exp'],RD['ord'])} expiry rate is the
proof the model works when supply is present.</li>
</ul></div>

<h2>Method &amp; caveats</h2>
<div class=card class=note><ul>
<li>Window {CUTOFF:%Y-%m-%d} → {ENDD:%Y-%m-%d} from <code>Dashboard/data/master/Users.csv</code> and
<code>Orders.csv</code>. Requesters counted by <code>created_at</code> + home ZIP; requests by
<code>CREATED AT</code> + dropoff ZIP (pickup ZIP as fallback).</li>
<li>ZIPs geocoded from GeoNames <code>US.txt</code> centroids; clusters built greedily — busiest
unassigned ZIP seeds a cluster and absorbs every unassigned ZIP within {RADIUS_MI:.0f} miles. Metro
labels come from the ZIP→DMA crosswalk.</li>
<li>Test/internal accounts excluded (<code>@gophergo.io</code>, "test", "placeholder") plus
<code>johnnewbury@sbcglobal.net</code> — same rule as the earlier research sessions. That removed
8.4% of in-window signups and 126 orders concentrated in Holly Springs.</li>
<li>"Working gophers" = distinct <code>GOPHER ID</code> on a delivered order in the window — actual
delivered supply, not registrations. "Workers needed" applies the Raleigh ratio (~{BENCH:.0f} requests per
working gopher) to current volume — it sizes the gap for <em>today's</em> demand and does not model
the additional demand better coverage would unlock.</li>
<li>Cluster counts are radius-bound: a metro wider than 50 miles appears as several clusters in the
first table. Use the metro rollup for market-level totals.</li>
</ul></div>
</div></body></html>"""
open(f"{RES}/worker-cluster-opportunity-2026-07.html","w",encoding="utf-8").write(doc)
print("report written")
print(f"benchmark {BENCH:.2f} req/working gopher | totals {TOT}")
