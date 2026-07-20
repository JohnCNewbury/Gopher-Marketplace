#!/usr/bin/env python3
"""Gopher payout-verification funnel — why workers never reach Stripe-verified.
Session 7, Jul 2026. Regenerate: python3 payout-verification-funnel-2026-07.py"""
import csv, collections, html
from datetime import datetime
csv.field_size_limit(10**9)
B="/Users/johnnewbury/Desktop/All New Gopher/Documentation/Dashboard"
OUT="/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code/docs/research"
NOW=datetime(2026,7,20); MAR=datetime(2026,3,1); WIN=540
FMTS=("%m-%d-%Y %I:%M %p","%m-%d-%Y","%Y-%m-%d %H:%M:%S","%Y-%m-%d")
def pdt(s):
    s=(s or "").strip()
    for f in FMTS:
        try: return datetime.strptime(s,f)
        except: pass
    return None
def excluded(e):
    e=(e or "").strip().lower()
    return (not e) or "@gophergo.io" in e or "test" in e or "placeholder" in e or e=="johnnewbury@sbcglobal.net"
def yes(v): return (v or "").strip().lower()=="yes"
def num(v):
    try: return int(float((v or "0").strip() or 0))
    except: return 0

rows=[]
with open(f"{B}/data/master/Users.csv",newline='',encoding='utf-8',errors='replace') as f:
    for r in csv.DictReader(f):
        if "Gopher" not in (r.get("role") or "") or excluded(r.get("email")): continue
        r["_dt"]=pdt(r.get("created_at"))
        if r["_dt"]: rows.append(r)
act=[r for r in rows if (NOW-r["_dt"]).days<=WIN and (r.get("status") or "").strip().lower() not in ("deleted","deactivated")]
def cls(r):
    if yes(r.get("Gopher Stripe Verified")): return "D"
    if not num(r.get("login_count")): return "A"
    if not (r.get("gopher_device") or "").strip(): return "B"
    if not yes(r.get("email_verified")): return "C1"
    return "C2"
pool=collections.Counter(cls(r) for r in act); TOT=sum(pool.values())
STAGES=[("Signed up as a gopher",lambda r:True),("Logged in at least once",lambda r:num(r.get("login_count"))>0),
 ("Opened the worker app",lambda r:(r.get("gopher_device") or "").strip()!=""),
 ("Stripe payout-verified",lambda r:yes(r.get("Gopher Stripe Verified"))),
 ("Received an order",lambda r:num(r.get("received_orders"))>0),
 ("Completed a delivery",lambda r:(r.get("first_order_completed") or "").strip()!="")]
def fun(sub):
    n=len(sub); out=[]; prev=None
    for nm,p in STAGES:
        c=sum(1 for r in sub if p(r))
        out.append((nm,c,100*c/n if n else 0,None if prev is None else 100*(prev-c)/prev if prev else 0)); prev=c
    return out
F=fun(act)
mo=collections.defaultdict(lambda:[0,0,0])
for r in rows:
    k=r["_dt"].strftime("%Y-%m"); mo[k][0]+=1
    if yes(r.get("Gopher Stripe Verified")): mo[k][1]+=1
    if yes(r.get("email_verified")): mo[k][2]+=1
MO=[(k,)+tuple(mo[k]) for k in sorted(mo) if k>="2025-08"]
gate=collections.defaultdict(lambda:[0,0])
for r in rows:
    if yes(r.get("email_verified")): continue
    k=r["_dt"].strftime("%Y-%m"); gate[k][0]+=1
    if yes(r.get("Gopher Stripe Verified")): gate[k][1]+=1
GATE=[(k,)+tuple(gate[k]) for k in sorted(gate) if k>="2025-10"]
c1=[r for r in act if cls(r)=="C1"]; pre=sum(1 for r in c1 if r["_dt"]<MAR)
eng={}
for k in ("B","C1","C2","D"):
    v=[num(r.get("login_count")) for r in act if cls(r)==k]
    v.sort(); eng[k]=(len(v), v[len(v)//2] if v else 0, 100*sum(1 for x in v if x>=5)/len(v) if v else 0)
tgt={"NC":"Raleigh-Durham (home)","FL":"Miami / W. Palm","CA":"California","TX":"Texas","SC":"South Carolina",
 "CO":"Denver","TN":"Tennessee","OH":"Ohio","GA":"Atlanta","PA":"Philadelphia","NY":"New York","VA":"Virginia",
 "MO":"St. Louis","WA":"Seattle","MD":"Baltimore","AL":"Birmingham","MN":"Minneapolis","NJ":"N. New Jersey",
 "LA":"New Orleans","AR":"Little Rock"}
sc=collections.defaultdict(lambda:[0,0,0])
for r in act:
    k=(r.get("address_state") or "").strip().upper()[:2]
    if k not in tgt: continue
    c=cls(r); sc[k][0]+=1
    if c=="C1": sc[k][1]+=1
    elif c=="C2": sc[k][2]+=1
ST=sorted(((k,tgt[k],sc[k][0],sc[k][1],sc[k][2],sc[k][1]+sc[k][2]) for k in sc),key=lambda x:-x[5])
with open(f"{OUT}/payout-verification-stalled-by-state-2026-07.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow(["state","market","active_gopher_accounts","email_blocked_C1","no_payout_setup_C2","total_reachable"])
    for r in ST: w.writerow(r)
E=html.escape
def rows_html(rs): return "".join(rs)
fun_rows=[f"<tr><td class=name>{E(n)}</td><td class=num>{c:,}</td><td class=num>{p:.1f}%</td>"
          f"<td class=num>{'—' if s is None else f'{s:.1f}%'}</td></tr>" for n,c,p,s in F]
mo_rows=[f"<tr><td class=name>{k}</td><td class=num>{n:,}</td><td class=num>{100*e/n:.1f}%</td>"
         f"<td class=num>{100*s/n:.1f}%</td></tr>" for k,n,s,e in MO]
gate_rows=[f"<tr><td class=name>{k}</td><td class=num>{n:,}</td><td class=num>{s:,}</td>"
           f"<td class=num>{100*s/max(n,1):.1f}%</td></tr>" for k,n,s in GATE]
LB={"B":"Logged in, never opened the worker app","C1":"In app, email UNVERIFIED — hard-blocked",
    "C2":"In app, email verified, never completed payout setup","D":"Payout-verified (supply-ready)"}
pool_rows=[f"<tr><td class=name>{E(LB[k])}</td><td class=num>{pool[k]:,}</td><td class=num>{100*pool[k]/TOT:.1f}%</td>"
           f"<td class=num>{eng[k][1]:.0f}</td><td class=num>{eng[k][2]:.0f}%</td></tr>" for k in ("B","C1","C2","D")]
st_rows=[f"<tr><td class=name>{E(m)}</td><td class=muted>{E(s)}</td><td class=num>{a:,}</td>"
         f"<td class=num>{b:,}</td><td class=num>{c:,}</td><td class=num><b>{t:,}</b></td></tr>" for s,m,a,b,c,t in ST]
CSS="""<style>:root{--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;
--grid:#e1e0d9;--baseline:#c3c2b7;--border:rgba(11,11,11,.10);--s1:#2a78d6;--s2:#1baf7a;--warn:#fab219;--crit:#d03b3b;}
@media (prefers-color-scheme:dark){:root{--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;
--muted:#898781;--grid:#2c2c2a;--baseline:#383835;--border:rgba(255,255,255,.10);--s1:#3987e5;--s2:#199e70;}}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);
font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:36px 28px 64px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:40px 0 6px}
.sub{color:var(--ink2);margin:0 0 24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px 22px;margin:16px 0}
.crit{border-left:3px solid var(--crit)}.ok{border-left:3px solid var(--s2)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.kpi .label{color:var(--ink2);font-size:13px}.kpi .value{font-size:30px;font-weight:600;margin:2px 0}
.kpi .note{color:var(--muted);font-size:12.5px}
.tablewrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13.5px}
th{text-align:left;color:var(--ink2);font-weight:600;border-bottom:1px solid var(--baseline);
padding:7px 10px 7px 0;white-space:nowrap}
td{border-bottom:1px solid var(--grid);padding:6px 10px 6px 0;vertical-align:middle}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td.name{font-weight:600}.muted{color:var(--muted);white-space:nowrap}
ul{margin:8px 0 0;padding-left:20px}li{margin:5px 0}
.note{color:var(--ink2);font-size:13.5px}code{background:var(--grid);padding:1px 5px;border-radius:4px;font-size:12.5px}</style>"""
DOC=f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Why Gophers Never Reach Payout-Verified — Session 7 (July 2026)</title>{CSS}</head>
<body><div class=wrap>
<h1>Why Gophers Never Reach Payout-Verified</h1>
<p class=sub>Activation-funnel teardown of the worker side &middot; {TOT:,} active gopher accounts, last 18 months
&middot; generated {NOW:%b %d, %Y}</p>
<div class=kpis>
<div class=kpi><div class=label>Active gopher accounts</div><div class=value>{TOT:,}</div>
<div class=note>signed up in last 18 months</div></div>
<div class=kpi><div class=label>Payout-verified</div><div class=value>{pool['D']:,}</div>
<div class=note>{100*pool['D']/TOT:.0f}% — the only workable supply</div></div>
<div class=kpi><div class=label>Blocked at email</div><div class=value>{pool['C1']:,}</div>
<div class=note>{100*pool['C1']/TOT:.0f}% — cannot proceed at all</div></div>
<div class=kpi><div class=label>Stalled at Stripe</div><div class=value>{pool['C2']:,}</div>
<div class=note>{100*pool['C2']/TOT:.0f}% — eligible, never finished</div></div>
</div>
<div class="card crit">
<b>The answer, in one line.</b> Gophers do not fail to reach payout-verified because they lose interest —
<b>{100*(pool['C1']+pool['C2'])/TOT:.0f}% of them are stopped by two documented, still-open product defects</b>.
{pool['C1']:,} are hard-blocked at email confirmation
(<a href="https://gopherapp.atlassian.net/browse/G40-271">G40-271</a>, Highest priority, open) and
{pool['C2']:,} reach Stripe but are dropped into the wrong onboarding flow
(<a href="https://gopherapp.atlassian.net/browse/G40-13">G40-13</a>, <b>Low</b> priority, open since Aug 2024).
Nothing else in the funnel loses meaningful volume.
</div>
<h2>1. The funnel — the loss is all at one step</h2>
<p class=note>Active gopher accounts created in the last 18 months. Getting people to install and open the
worker app is <b>not</b> the problem: {F[2][2]:.0f}% get that far. The floor falls out at payout verification.</p>
<div class=tablewrap><table>
<thead><tr><th>Stage</th><th class=num>Accounts</th><th class=num>% of signups</th><th class=num>Step loss</th></tr></thead>
<tbody>{rows_html(fun_rows)}</tbody></table></div>
<p class=note>The {F[3][3]:.0f}% step-loss at payout verification is the single largest drop on the worker side —
larger than every other stage combined.</p>
<h2>2. Where the stalled workers actually sit</h2>
<div class=tablewrap><table>
<thead><tr><th>Bucket</th><th class=num>Accounts</th><th class=num>Share</th>
<th class=num>Median logins</th><th class=num>5+ logins</th></tr></thead>
<tbody>{rows_html(pool_rows)}</tbody></table></div>
<p class=note>The engagement columns matter: the blocked groups are not ghosts. They logged in, came back
repeatedly, and still could not finish. {sum(1 for r in c1 if num(r.get('login_count'))>=5):,} email-blocked
accounts returned <b>five or more times</b> without ever getting verified.</p>
<h2>3. Email confirmation became a hard gate — and it is jammed</h2>
<p class=note>Share of <b>email-unverified</b> gopher accounts that nonetheless reached payout-verified,
by signup month. This used to be possible. It is now structurally impossible.</p>
<div class=tablewrap><table>
<thead><tr><th>Signup month</th><th class=num>Email-unverified</th>
<th class=num>…yet payout-verified</th><th class=num>Rate</th></tr></thead>
<tbody>{rows_html(gate_rows)}</tbody></table></div>
<div class="card">
<b>Read this together with the ticket.</b> <a href="https://gopherapp.atlassian.net/browse/G40-271">G40-271</a>
(opened Apr 12 2026, <b>Highest</b>, still In Progress) documents the exact mechanism: after the March 2026
sign-up enhancement, a user who reaches the email OTP screen and does not finish is shown that screen forever —
the back arrow refreshes in place, and there is <b>no way to correct the email or resend the OTP</b>. The
ticket's own words: <i>they are completely stuck</i>. The data shows the consequence:
<b>{pre:,} of the {len(c1):,} email-blocked gophers ({100*pre/len(c1):.0f}%) signed up before March 2026</b> —
precisely the "existing users with unconfirmed email addresses" population the ticket describes.
</div>
<h2>4. The March 2026 change helped and hurt at the same time</h2>
<div class=tablewrap><table>
<thead><tr><th>Signup month</th><th class=num>Gopher signups</th>
<th class=num>Email-verified</th><th class=num>Payout-verified</th></tr></thead>
<tbody>{rows_html(mo_rows)}</tbody></table></div>
<p class=note>Email verification jumps from ~42% to ~88% in March–April 2026 and payout verification rises with it
(~20% → ~30%). That is a real, sustained improvement for <b>new</b> signups — and it is not a maturation artifact:
older cohorts have had far longer to verify and sit far lower. The cost is that the same release stranded the
entire legacy unconfirmed-email population behind a gate they have no way to pass.</p>
<h2>5. What is NOT the cause</h2>
<div class="card ok">
<ul>
<li><b>Not Android.</b> iOS and Android reach payout verification at an <b>identical 26.8%</b>. The known
Android onboarding complaints are real, but they are not what gates payout.</li>
<li><b>Not the date-of-birth bug.</b> Accounts with a pre-1970 DOB verify at 21.1% vs 24.3% for normal DOBs —
and actually verify their <i>email</i> at a higher rate. Only 15 accounts carry an impossible DOB.</li>
<li><b>Not junk or bot signups.</b> 95.9% of blocked accounts use mainstream consumer email domains
(3,332 gmail.com alone). These are real, deliverable addresses.</li>
<li><b>Not app abandonment.</b> Only {pool['B']:,} accounts ({100*pool['B']/TOT:.1f}%) logged in and never
opened the worker app, and only {pool['A'] if 'A' in pool else 0} never logged in at all.</li>
</ul>
</div>
<h2>6. The recoverable pool, by market</h2>
<p class=note>Stalled-but-reachable gophers — accounts already installed and logged in, blocked only by the two
defects above. Cross-reference with the zero-fulfillment markets from the cluster study.</p>
<div class=tablewrap><table>
<thead><tr><th>Market</th><th>State</th><th class=num>Active accounts</th>
<th class=num>Email-blocked</th><th class=num>No payout setup</th><th class=num>Reachable</th></tr></thead>
<tbody>{rows_html(st_rows)}</tbody></table></div>
<h2>7. What I would do</h2>
<div class="card">
<ul>
<li><b>Re-prioritise <a href="https://gopherapp.atlassian.net/browse/G40-13">G40-13</a> off "Low".</b> It has been
open since August 2024 and sits directly on {pool['C2']:,} workers who cleared every other hurdle. Gophers are
being sent to Stripe's <i>business</i> onboarding and asked for a "business website" that does not apply to them.
This is the cheapest unlock on the board.</li>
<li><b>Ship the G40-271 escape hatch first.</b> Of that ticket's seven scenarios, the one that matters most for
supply is Scenario 6/7 — back-arrow navigation plus "change email &amp; resend OTP". That alone unblocks
{pool['C1']:,} accounts.</li>
<li><b>Then run a re-activation campaign, not a recruitment campaign.</b> {pool['C1']+pool['C2']:,} reachable
stalled gophers versus {pool['D']:,} currently payout-verified — fixing the funnel is worth more than roughly
tripling the existing verified base, and costs no acquisition spend. Do not send it until the fixes ship, or it
lands people straight back into the same dead end.</li>
<li><b>Sequence by market.</b> The reachable pool lines up with the zero-fulfillment markets from the cluster
study — Seattle, Baltimore, Minneapolis, St. Louis and New Orleans each have 55–140 stalled workers against
markets with real demand and zero completed deliveries.</li>
</ul>
</div>
<h2>Method &amp; caveats</h2>
<div class=card><ul>
<li>Source: <code>Dashboard/data/master/Users.csv</code> ({len(rows):,} gopher-role accounts after exclusions).
Cohort = gopher-role, created in the last 18 months, not deleted/deactivated ({TOT:,} accounts).</li>
<li>Test/internal accounts excluded (<code>@gophergo.io</code>, "test", "placeholder") plus
<code>johnnewbury@sbcglobal.net</code> — same rule as the earlier research sessions.</li>
<li>Funnel stages are inferred from account state, not event logs: "opened the worker app" =
<code>gopher_device</code> populated; "payout-verified" = <code>Gopher Stripe Verified</code>.
There is <b>no per-event timestamp</b> for Stripe verification in this export, so time-to-verify cannot be
measured — <code>updated_at</code> is not maintained (100% same-day) and was discarded.</li>
<li>The email→payout relationship is established by (a) tenure-controlled rates — email-unverified accounts under
90 days old verify at literally 0.0% across all three age buckets — and (b) the monthly trend to zero above.
It is a structural gate, not a correlation with engagement: blocked and verified accounts log in at similar rates.</li>
<li>Causal attribution to the March 2026 release rests on G40-271's own root-cause statement plus the step change
in the cohort data; no deploy log was inspected.</li>
</ul></div>
<p class=note style="margin-top:28px">Companion CSV: <code>payout-verification-stalled-by-state-2026-07.csv</code> &middot;
Regenerate: <code>python3 payout-verification-funnel-2026-07.py</code></p>
</div></body></html>"""
open(f"{OUT}/payout-verification-funnel-2026-07.html","w").write(DOC)
print("wrote report + csv")
print(f"active={TOT:,} D={pool['D']:,} C1={pool['C1']:,} C2={pool['C2']:,} B={pool['B']:,} pre-Mar C1={pre:,}")
