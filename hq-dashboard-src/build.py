# Canonical build: assembles the single-file dashboard from source + data + assets.
# Run from /home/claude/work :  python3 build.py
import json, base64, os
m=json.load(open('metrics.json')); parity=json.load(open('pricing_parity.json'))
m['_parity']={'truth':parity['truth'],'backend':parity['backend'],'client':parity['client'],'summary':parity['summary']}
m['_brand']={'iqLogo':open('iq_logo_datauri.txt').read().strip(),
             'gopherMark':open('logos/gopher_mark_datauri.txt').read().strip(),
             'platformLogos':{k:open('logos/%s_datauri.txt'%k).read().strip() for k in ['request','go','connect','deal','rewards']}}
# --- Gopher iQ knowledge index for the upload/triage portal (INTERNAL dashboard only).
#     The public engine never gets the moderation lexicon — build_iq.py enforces that. ---
import re as _re
if os.path.exists('iq_routing.json'):
    _iqr=json.load(open('iq_routing.json'))
    _slugs=[{'slug':c['slug'],'label':c.get('label',c['slug'])} for c in _iqr['categories']]
    _w2s={}
    for c in _iqr['categories']:
        for fld in ('tokens','hints','pwords','phrases'):
            for term in (c.get(fld) or []):
                for w in _re.findall(r'[a-z]+',str(term).lower()):
                    if len(w)>=3:
                        _w2s.setdefault(w,[])
                        if c['slug'] not in _w2s[w]: _w2s[w].append(c['slug'])
    _mod_pol=[]; _t2p={}
    if os.path.exists('moderation_rules.json'):
        _mod=json.load(open('moderation_rules.json'))
        _mod_pol=list((_mod.get('categories') or {}).keys())
        _tun=_mod.get('tuning',{}) or {}
        for term in (_tun.get('excluded_regulated') or []):
            _t2p.setdefault(term.lower(),[])
            if 'regulated_items' not in _t2p[term.lower()]: _t2p[term.lower()].append('regulated_items')
        for pol,phrases in (_tun.get('extra_phrases',{}) or {}).items():
            for term in (phrases or []):
                k=term.lower(); _t2p.setdefault(k,[])
                if pol not in _t2p[k]: _t2p[k].append(pol)
    m['_iqcore']={'routing':{'slugs':_slugs,'word2slugs':_w2s},
                  'moderation':{'policies':_mod_pol,'term2policies':_t2p},
                  '_note':'iQ knowledge index for the triage portal. Internal only; public engine excludes moderation.'}
    print('baked _iqcore: routing words',len(_w2s),'| moderation policies',len(_mod_pol),'terms',len(_t2p))
else:
    print('iq_routing.json not present — _iqcore not baked (portal shows a setup notice)')
import time as _time
m['_built_at']=int(_time.time()*1000)  # precise refresh time (epoch ms) for the data stamp
_appfiles=['app_part1.js','app_part2.js','app_part3.js','app_part4.js']
if os.path.exists('deals-coverage.js'): _appfiles.append('deals-coverage.js')  # Deals → Raleigh DMA merchant-coverage tracker (renders below Deal economics)
if os.path.exists('deals-merchants.js'): _appfiles.append('deals-merchants.js')  # Deals → merchant deal list (live / pending / expired+rejected)
if os.path.exists('user-trends-data.js'): _appfiles.append('user-trends-data.js')  # Users → behavior-trends data, baked by regen_user_trends.py each refresh
if os.path.exists('user-trends.js'): _appfiles.append('user-trends.js')  # Users → behavior-trends section (renders below User records)
if os.path.exists('app_part5_iq.js'): _appfiles.append('app_part5_iq.js')  # Gopher iQ portal (registers after init)
if os.path.exists('app_part6_admin.js'): _appfiles.append('app_part6_admin.js')  # Admin-Panel parity views (G40-321 step 4; registers Admin nav group)
if os.path.exists('app_part7_integrations.js'): _appfiles.append('app_part7_integrations.js')  # Integrations launcher (registers Integrations nav group + in-dashboard web views)
js='\n'.join(open(f).read() for f in _appfiles)
# Bake the Raleigh DMA basemap (dropped into assets/) as a data URI for the coverage tracker.
_mapsrc=''
for _p in ('assets/raleigh-dma-map.png','assets/raleigh-dma-map.webp','assets/raleigh-dma-map.jpg'):
    if os.path.exists(_p):
        _mime={'png':'image/png','webp':'image/webp','jpg':'image/jpeg'}[_p.rsplit('.',1)[1]]
        _mapsrc='data:%s;base64,%s'%(_mime,base64.b64encode(open(_p,'rb').read()).decode())
        print('baked Raleigh DMA basemap:',_p,round(len(_mapsrc)/1e6,2),'MB datauri'); break
if not _mapsrc: print('assets/raleigh-dma-map.png not present yet — coverage map shows the drop-it fallback')
js='window.RALEIGH_DMA_MAP=%s;\n'%json.dumps(_mapsrc)+js
xlsx=open('libs/node_modules/xlsx/dist/xlsx.full.min.js').read()
pdf=open('libs/node_modules/pdfjs-dist/legacy/build/pdf.min.js').read()
worker_b64=base64.b64encode(open('libs/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js','rb').read()).decode()
libs=f'<script>{xlsx}</script>\n<script>{pdf}</script>\n<script>window.__PDFWORKER_B64="{worker_b64}";</script>'
gopher_mark=open('logos/gopher_mark_datauri.txt').read().strip()
# --- Live admin API config injection seam (G40-321) ---
# The static build bakes an EMPTY <script id="hq-cfg"></script> so no admin token ever
# touches disk and the file opens in offline/demo mode. The serving shim (step 2) injects
# window.MSG_CONFIG server-side, per authenticated request, by replacing that empty tag.
# LOCAL testing only: set HQ_BAKE_MSG_CONFIG="<base>|<token>" to bake a config in (never distribute such a build).
_mc=os.environ.get('HQ_BAKE_MSG_CONFIG','').strip()
if _mc and '|' in _mc:
    _b,_t=_mc.split('|',1)
    msg_config_js='window.MSG_CONFIG={base:%s,token:%s};'%(json.dumps(_b.strip()),json.dumps(_t.strip()))
    print('WARNING: MSG_CONFIG BAKED into the static build — it can call the live admin API. Do NOT distribute this file.')
else:
    msg_config_js=''
# --- Promo codes: bake the Coupons export so the Promo Codes view lists all active/inactive offline ---
import glob as _glob, csv as _csv
from datetime import datetime as _dt
def _coup_ms(s):
    s=(s or '').strip()
    if not s: return None
    for _f in ('%m-%d-%Y %I:%M %p','%m-%d-%Y %H:%M','%m-%d-%Y','%Y-%m-%d %H:%M:%S','%Y-%m-%d'):
        try: return int(_dt.strptime(s,_f).timestamp()*1000)
        except Exception: pass
    return None
_coup=(sorted(_glob.glob('data/master/Coupons*.csv')) or sorted(_glob.glob('data/incoming/Coupons*.csv'))
       or sorted(_glob.glob('data/incoming/_processed/*Coupons*.csv')))
if _coup:
    _cr=[]
    with open(_coup[-1], newline='', encoding='utf-8-sig') as _cf:
        for _row in _csv.DictReader(_cf):
            _cr.append({'id':_row.get('id'),'code':_row.get('code'),'description':_row.get('description'),
                'applies_to':_row.get('applies_to'),'type':_row.get('type'),'value':_row.get('value'),
                'reduces':_row.get('reduces'),'duration':_row.get('duration'),
                'max_redemption':_row.get('max_redemption'),'once_per_acct':_row.get('once_per_acct'),
                'redemptions':_row.get('order_count'),'created_at':(_row.get('created_at') or '').strip(),
                'redeem_by':_coup_ms(_row.get('redeem_by')),'redeem_by_str':(_row.get('redeem_by') or '').strip()})
    m['_coupons']=_cr
    print('baked', len(_cr), 'promo codes from', os.path.basename(_coup[-1]))
else:
    print('no Coupons*.csv found — Promo Codes view will be empty')
html=open('dashboard.html').read().replace('__METRICS__',json.dumps(m)).replace('__LIBS__',libs).replace('__APP_JS__',js).replace('__GOPHER_MARK__',gopher_mark).replace('__MSG_CONFIG__',msg_config_js)
# Preserve "Alert learnings" (moderation calibration) across rebuilds: bake alert_learnings.json into the iafb block.
learn='{"actions":{}}'
if os.path.exists('alert_learnings.json'):
    try:
        _l=json.load(open('alert_learnings.json'))
        if isinstance(_l,dict) and isinstance(_l.get('actions'),dict):
            learn=json.dumps({'actions':_l['actions']})
            print('baked', len(_l['actions']), 'alert learnings')
    except Exception as e:
        print('alert_learnings.json present but unreadable — skipped:', e)
# Preserve "Cancellation learnings" across rebuilds: bake cancel_learnings.json alongside the iafb block (injected as cxfb).
cxlearn='{"actions":{}}'
if os.path.exists('cancel_learnings.json'):
    try:
        _cl=json.load(open('cancel_learnings.json'))
        if isinstance(_cl,dict) and isinstance(_cl.get('actions'),dict):
            cxlearn=json.dumps({'actions':_cl['actions']})
            print('baked', len(_cl['actions']), 'cancellation learnings')
    except Exception as e:
        print('cancel_learnings.json present but unreadable — skipped:', e)
html=html.replace('<script id="iafb" type="application/json">{"actions":{}}</script>',
                  '<script id="iafb" type="application/json">'+learn+'</script>'
                  '<script id="cxfb" type="application/json">'+cxlearn+'</script>')
OUT=os.environ.get('GOPHER_OUT','output'); os.makedirs(OUT,exist_ok=True)
open(os.path.join(OUT,'Gopher_HQ_Dashboard.html'),'w').write(html)
print('built', os.path.join(OUT,'Gopher_HQ_Dashboard.html'), round(len(html)/1e6,2),'MB')
