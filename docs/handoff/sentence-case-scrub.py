import re,sys,html as ihtml
CANON={w.lower():w for w in ('Gopher Gophers TrustShield Google Maps Stripe Apple Android iOS PDF Dashboard '
 'Connect Deals Go Starter Enterprise Standard Elite Pro Pros Marketplace Yardstik').split()}  # note: Business dropped (ambiguous)
SPECIAL={'safe-guarding':'Safeguarding'}
ACR_UP={'i':'I',"i'll":"I'll","i'm":"I'm",'id':'ID','tv':'TV','faq':'FAQ','faqs':'FAQs','usa':'USA','rx':'Rx','ai':'AI','iq':'iQ','seo':'SEO','gps':'GPS','sms':'SMS','ev':'EV','wifi':'WiFi','uhaul':'UHaul','ok':'OK','pin':'PIN','otp':'OTP','eta':'ETA','vip':'VIP','diy':'DIY','fast':'FAST','asap':'ASAP','hq':'HQ'}
KEEP_PHRASES={'hire. consider. deny.','need asap','request details','request submitted','request any service','office & commercial cleaning','skilled trades & handymen','event staffing & setup','bulk labor','courier & delivery','warehouse & fulfillment','home & indoor services','yard & outdoor','delivery & errands','moving & heavy lifting','junk removal & hauling','rides & transportation','hourly help & an extra pair of hands','entire gopher go workforce','gopher elite and pros'}
BLOCK=[re.compile(r"^Order directly from "),re.compile(r"^Our Story$",re.I),re.compile(r"^The Gopher Blog$",re.I)]  # merchant names
DANGER=re.compile(r"(\\u|\\x|\\\\|\$\{|'\+|\+'|\.length|\.push|=>|j\.[a-z]|\$[0-9A-Za-z]|[0-9]{2,}|\s[0-9]\s|\s\+\s|→[^→]*→)")
CATS=[c for c in KEEP_PHRASES if '&' in c or 'hourly help' in c]
def has_cat(s):
    sl=s.lower()
    return any(c in sl for c in CATS)
def clean(x): return re.sub(r'\s+',' ',ihtml.unescape(re.sub(r'<[^>]+>',' ',x))).strip()
def canon(word):
    low=word.lower().replace('’',"'")
    if low in CANON: return CANON[low]
    if low.endswith("'s") and low[:-2] in CANON: return CANON[low[:-2]]+"'s"
    if low.endswith("s") and low[:-1] in CANON: return CANON[low[:-1]]+"s"
    return None
def is_titlecase(s):
    s=s.strip()
    if not s or s.isupper() or '${' in s or '{{' in s or s.lower() in KEEP_PHRASES or DANGER.search(s) or has_cat(s): return False
    words=[w for w in re.split(r'\s+',s) if re.search(r'[A-Za-z]',w)]
    if len(words)<2 or len(words)>6 or len(s)>60: return False
    for i,w in enumerate(words):
        wc=w.strip('.,:;!?™®()"\'“”·+/|&-').replace('’',"'")
        if not wc or not wc[0].isalpha() or i==0: continue
        if canon(wc) or wc.lower() in ACR_UP or (wc.isupper() and len(wc)>1): continue
        if wc[0].isupper(): return True
    return False
def sentence_case(s):
    parts=re.split(r"(\s+)", s); wl=[re.sub(r"[^A-Za-z'’-]",'',p).lower().replace('’',"'") for p in parts]
    out=[]; start=True
    for pi,p in enumerate(parts):
        if not p.strip(): out.append(p); continue
        m=re.match(r"^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*)(.*)$", p, re.S)
        if not m:
            out.append(p); 
            if re.search(r'[.!?:]\s*$',p): start=True
            continue
        pre,word,post=m.groups(); low=word.lower().replace('’',"'")
        nxt=next((wl[k] for k in range(pi+1,len(parts)) if wl[k]),''); prv=next((wl[k] for k in range(pi-1,-1,-1) if wl[k]),'')
        c=canon(word)
        if low in SPECIAL: w=SPECIAL[low]
        elif word.isupper() and len(word)>1: w=word
        elif low=='my': w='MY' if nxt in('gopher','gophers') else ('My' if start else 'my')
        elif low in('request','requests'): w=(word[0].upper()+word[1:].lower()) if (start or prv in('gopher','visit')) else low
        elif c: w=c
        elif low in ACR_UP: w=ACR_UP[low]
        elif start: w=word[0].upper()+word[1:].lower()
        else: w=low
        out.append(pre+w+post); start=bool(re.search(r'[.!?:]\s*$', pre+w+post))
    return ''.join(out)
def scan(txt):
    c=set()
    for m in re.finditer(r'<button[^>]*>(.*?)</button>',txt,re.S|re.I): 
        s=clean(m.group(1)); c.add(s) if is_titlecase(s) else None
    for m in re.finditer(r'<a[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)</a>',txt,re.S|re.I):
        s=clean(m.group(1)); c.add(s) if is_titlecase(s) else None
    for m in re.finditer(r'<(\w+)[^>]*class="[^"]*(?:label|eyebrow|kicker|overline|chip|tab|pill|card-title|panel-title|sheet-title|section-title|field-label|kpi|info-label|dash-section)[^"]*"[^>]*>(.*?)</\1>',txt,re.S|re.I):
        s=clean(m.group(2)); c.add(s) if is_titlecase(s) else None
    for m in re.finditer(r'<(h[3-6])[^>]*>(.*?)</\1>',txt,re.S|re.I):
        s=clean(m.group(2)); c.add(s) if is_titlecase(s) else None
    return c
def in_textnode(s,i):
    j=i-1
    while j>=0 and s[j] not in '<>': j-=1
    return j>=0 and s[j]=='>'

_PROTECT_RE=re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S|re.I)
def protected_spans(txt):
    """Regions the scrub must never edit: inline <script> (holds the Gopher iQ engine
    and the const FAQS = [...] JSON data block) and <style>. Sentence-casing inside these
    would corrupt data/JS. HTML label targets never live here."""
    return [(m.start(), m.end()) for m in _PROTECT_RE.finditer(txt)]
def in_protected(spans, i):
    return any(a<=i<b for a,b in spans)
SEP={'&':r'(?:&amp;|&)','·':r'(?:&middot;|&#183;|·)'}
def tolerant(core):
    toks=core.split(' '); pat=[]
    for t in toks:
        pat.append(SEP.get(t, re.escape(t)))
    return r'\s+'.join(pat)
def apply_file(fn):
    txt=open(fn,encoding='utf-8',errors='ignore').read(); orig=txt
    _spans=protected_spans(txt)
    keep=set()
    for m in re.finditer(r'<(h[12])[^>]*>(.*?)</\1>',txt,re.S|re.I):
        k=clean(m.group(2)).lower()
        if k and len(k)<60: keep.add(k)
    cands=scan(txt); pairs=[]
    for s in cands:
        if any(b.search(s) for b in BLOCK): continue
        sl=s.lower()
        if any(k==sl or k in sl or sl in k for k in keep): continue
        core=s.strip(); core=re.sub(r'^[^A-Za-z]+','',core); core=re.sub(r'[^A-Za-z:.]+$','',core)  # strip lead/trail non-letters (keep trailing :/.)
        if not core: continue
        nc=sentence_case(core)
        if nc!=core: pairs.append((core,nc))
    pairs=sorted(set(pairs), key=lambda p:-len(p[0]))
    applied=[]
    for old,new in pairs:
        n=0
        if '&' in old or '·' in old:
            reg=re.compile(tolerant(old))
            res=[]; last=0
            # build new with tolerant seps preserved via captured matched text
            for m in reg.finditer(txt):
                if in_textnode(txt,m.start()) and not in_protected(_spans,m.start()):
                    # reconstruct: replace each word case per sentence_case, keep matched separators
                    seg=m.group(0)
                    # apply sentence_case token-wise using entity-aware: split seg on &amp;/& and ·
                    newseg=seg
                    # map: recompute by aligning words
                    ow=old.split(' '); nw=new.split(' ')
                    tmp=seg
                    for a,b in zip(ow,nw):
                        if a!=b and a not in SEP:
                            tmp=re.sub(r'(?<![A-Za-z])'+re.escape(a)+r'(?![A-Za-z])', b, tmp, count=1)
                    res.append(txt[last:m.start()]); res.append(tmp); last=m.end(); n+=1
            res.append(txt[last:]); 
            if n: txt=''.join(res)
        else:
            res=[]; idx=0
            while True:
                i=txt.find(old,idx)
                if i<0: res.append(txt[idx:]); break
                if in_textnode(txt,i) and not in_protected(_spans,i): res.append(txt[idx:i]); res.append(new); n+=1
                else: res.append(txt[idx:i+len(old)])
                idx=i+len(old)
            if n: txt=''.join(res)
        if n: applied.append((n,old,new))
    import os
    if txt!=orig and not os.environ.get("DRY"): open(fn,"w",encoding="utf-8").write(txt)
    print(f"##### {fn}: {sum(a[0] for a in applied)} replacements, {len(applied)} phrases #####")
    for n,o,nw in sorted(applied,reverse=True): print(f"  {n:>2}  {o!r} -> {nw!r}")
import os
if __name__=='__main__':
  for fn in sys.argv[1:]:
    if not os.environ.get('DRY'):
        import shutil; shutil.copy(fn, '/tmp/claude-501/'+fn.replace('/','_')+'.bak')
    apply_file(fn)
