#!/usr/bin/env python3
"""G40-533 — Moving anchors vs COMPLETED PRODUCTION ORDERS.

The check that had never been done for this category. Delivery's equivalent is
what surfaced the $50 hole and the 46% over-suggestion; Moving's anchors had
only ever been checked against the 2026-08-09 extract they were fitted on.

Source: Documentation/Dashboard/data/master/Orders.csv (production export).
        REAL production order data. Not test data.

Corpus definition mirrors moving-suggested-pricing-discovery.md §4b exactly:
  - completed only (AASM == 'delivered')
  - keyed on GOPHER OFFER (worker pay) -- NEVER 'GOPHER EARNINGS'
  - EXCLUDES 'Moving / Junk Removal - Junk Removal' (Junk jobs, median $40)
  - EXCLUDES 'Store Pick Up & Delivery' (§4b removed these before fitting)

⛔ THE DATE FORMAT IS `MM-DD-YYYY HH:MM AM/PM`. An ISO parser silently returns
   None for every row, and the "new orders since calibration" count then reads
   as a confident ZERO. That happened on the first run of this script. The
   probe check below exists so it cannot happen again unnoticed.
"""
import csv, re, statistics as st, collections, datetime, sys

csv.field_size_limit(10**9)
P = "/Users/johnnewbury/Desktop/All New Gopher/Documentation/Dashboard/data/master/Orders.csv"

INCLUDE = {
    'Moving', 'Moving - Location Move', 'Moving - Same Location Move',
    'Moving - Other', 'Moving / Junk Removal - Location Move',
    'Moving / Junk Removal - Same Location Move',
    'Location Move', 'Same Location Move',
}
SPD = {'Moving - Store Pick Up & Delivery',
       'Moving / Junk Removal - Store Pick Up & Delivery'}

RX_LARGE = re.compile(r"\b([3-9]|1[0-9])\s*(bed|br|bedroom)s?\b|\b(three|four|five)[- ]bedroom\b|\b(whole|entire|full)\s+(house|home)\b|\bresidential relocation\b|\b(large|big)\s+(house|home|move)\b|\boffice move\b|\brelocate office\b|\bmove cubicles\b|\bmove (my|our) (house|home)\b|\bhouse to house\b")
RX_SMALL = re.compile(r"\b(studio|efficiency)\b|\b([12])\s*(bed|br|bedroom)s?\b|\b(one|two)[- ]bedroom\b|\b(whole|entire)\s+apartment\b|\bapartment to apartment\b|\bmove (my|our) (apartment|condo)\b|\bmove (in)?to (a |an )?(new )?(apartment|condo)\b|\bmove out of (my |the )?apartment\b|\bmoving across town\b")
RX_TRUCK = re.compile(r"\b(u-?haul|uhaul|box truck|moving truck|trailer|pod|storage unit|storage|load(ing)?|unload(ing)?|need (a )?truck|truck required|will need (a )?truck|dorm|college move|student move|piano|appliances?|bedroom furniture|labor only)\b")
RX_FEW   = re.compile(r"\b(couch|sofa|loveseat|mattress|dresser|desk|table|nightstand|chair|headboard|bookcase|tv|boxes?|rearrange|pack(ing)?|unpack|wrap furniture|small move|a few (items|things|pieces))\b")

def detect(text):
    t = ' ' + str(text or '').lower() + ' '
    if RX_LARGE.search(t): return 'home_large', 'high'
    if RX_SMALL.search(t): return 'home_small', 'high'
    if RX_TRUCK.search(t): return 'truck', 'high'
    if RX_FEW.search(t):   return 'few', 'high'
    return 'truck', 'low'

ANCHOR = {'few': 75, 'truck': 110, 'home_small': 225, 'home_large': 375}
ORDER  = ['few', 'truck', 'home_small', 'home_large']

def money(s):
    try: return float(str(s).replace('$', '').replace(',', '').strip())
    except Exception: return None

def when(s):
    for f in ('%m-%d-%Y %I:%M %p', '%m-%d-%Y %H:%M',
              '%Y-%m-%d %H:%M:%S', '%Y-%m-%d',
              '%m/%d/%Y %I:%M %p', '%m/%d/%Y'):
        try: return datetime.datetime.strptime(str(s).strip(), f)
        except Exception: pass
    return None

rows, spd, parsed, unparsed, alldates = [], [], 0, 0, []
with open(P, newline='', encoding='utf-8', errors='replace') as f:
    for r in csv.DictReader(f):
        d = when(r.get('CREATED AT'))
        if d: parsed += 1; alldates.append(d)
        else: unparsed += 1
        if (r.get('AASM') or '').strip() != 'delivered': continue
        t = (r.get('TITLE') or '').strip()
        off = money(r.get('GOPHER OFFER'))
        if off is None or off <= 0: continue
        rec = dict(title=t, desc=(r.get('DESCRIPTION') or ''), offer=off, created=d)
        if t in INCLUDE: rows.append(rec)
        elif t in SPD:   spd.append(rec)

# ── PROVE THE PROBE before believing any zero it reports ────────────────────
print("PROBE CHECK — the date parser must be able to report a non-zero")
print(f"  CREATED AT parsed: {parsed}   unparsed: {unparsed}")
if unparsed or not alldates:
    sys.exit("  ⛔ ABORT: date parsing is broken; every 'since' count would be a false zero.")
print(f"  whole-file range: {min(alldates):%Y-%m-%d} .. {max(alldates):%Y-%m-%d}")
print(f"  control — rows created in the last 60 days, any category: "
      f"{sum(1 for d in alldates if d >= max(alldates) - datetime.timedelta(days=60))}")

def q(v, p):
    v = sorted(v)
    return st.quantiles(v, n=100)[p-1] if len(v) > 2 else (v[len(v)//2] if v else None)

print("\n" + "=" * 74)
print("MOVING ANCHORS vs COMPLETED PRODUCTION ORDERS")
print("=" * 74)
print(f"\nClean Moving corpus: N = {len(rows)}   [doc §4b calibration corpus was N = 155]")
offs = [r['offer'] for r in rows]
print(f"Envelope: p25 ${q(offs,25):.0f} · median ${st.median(offs):.0f} · "
      f"p75 ${q(offs,75):.0f} · p90 ${q(offs,90):.0f} · max ${max(offs):.0f}")
print("  [doc §3 clean envelope: p25 $60 · median $100 · p75 $150 · p90 $200 · max $390]")

by = collections.defaultdict(list)
for r in rows: by[detect(r['desc'])[0]].append(r['offer'])
print(f"\n{'tier':<12}{'n':>5}{'median':>9}{'mean':>8}{'anchor':>8}{'anchor vs median':>20}")
meds = {}
for k in ORDER:
    v = by.get(k, [])
    if not v:
        print(f"{k:<12}{0:>5}{'-':>9}{'-':>8}{ANCHOR[k]:>8}"); continue
    m = st.median(v); meds[k] = m
    print(f"{k:<12}{len(v):>5}{m:>8.0f}{st.mean(v):>8.0f}{ANCHOR[k]:>8}"
          f"{(ANCHOR[k]-m)/m*100:>+19.0f}%")
mono = all(meds[ORDER[i]] <= meds[ORDER[i+1]]
           for i in range(len(ORDER)-1) if ORDER[i] in meds and ORDER[i+1] in meds)
print("\nMonotonic on real data: " +
      ' < '.join(f"${meds[k]:.0f}" for k in ORDER if k in meds) +
      f"  ->  {'YES' if mono else 'NO'}")

cut = datetime.datetime(2026, 8, 9)
new = [r for r in rows if r['created'] and r['created'] >= cut]
print(f"\n-- NEW SINCE THE 2026-08-09 CALIBRATION --")
print(f"  completed Moving orders created on/after 2026-08-09: {len(new)} of {len(rows)}")
if new:
    print(f"  their median offer: ${st.median([r['offer'] for r in new]):.0f}")
    bn = collections.defaultdict(list)
    for r in new: bn[detect(r['desc'])[0]].append(r['offer'])
    for k in ORDER:
        v = bn.get(k, [])
        if v: print(f"    {k:<12} n={len(v):<4} median ${st.median(v):.0f}  (anchor ${ANCHOR[k]})")

print(f"\n-- STORE PICK UP & DELIVERY (excluded from the model corpus) --")
if spd:
    so = [r['offer'] for r in spd]
    print(f"  N = {len(so)} completed · median ${st.median(so):.0f} · "
          f"p25 ${q(so,25):.0f} · p75 ${q(so,75):.0f}")
    bs = collections.defaultdict(list)
    for r in spd: bs[detect(r['desc'])[0]].append(r['offer'])
    for k in ORDER:
        v = bs.get(k, [])
        if v:
            print(f"    detector would tier {len(v):>3} of them '{k}' "
                  f"(anchor ${ANCHOR[k]}) — their real median ${st.median(v):.0f}")

nosig = [r for r in rows if detect(r['desc'])[1] == 'low']
print(f"\n-- DETECTOR COVERAGE --")
print(f"  no tier signal (falls back to 'truck'): {len(nosig)}/{len(rows)} = "
      f"{len(nosig)/len(rows)*100:.0f}%   [doc: 23%]")
if nosig:
    print(f"  their median offer: ${st.median([r['offer'] for r in nosig]):.0f}   "
          f"[doc: $100 — which is why 'truck' is the correct fallback]")
