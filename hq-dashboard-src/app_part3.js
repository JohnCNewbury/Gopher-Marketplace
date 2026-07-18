/* ========== GROWTH & ACQUISITION ========== */
/* ----- Referrals & Invites: complex iQ + filters ----- */
function refRole(s){s=(s||'').toLowerCase();const g=s.includes('gopher'),q=s.includes('requester');return g&&q?'Both':g?'Gopher':q?'Requester':'Other';}
function refIQParse(text){
  const t=' '+(text||'').toLowerCase().replace(/[,]/g,' ')+' ';
  const o={filters:[],chips:[],mode:'filter',dim:'referrer',dimLabel:'referrer',metric:'referrals',metricLabel:'referrals',n:10,asc:false,q:'',range:'all'};
  if(/\b(last 7|past 7|7 day|last week)\b/.test(t)){o.range='7';o.chips.push(['Date','Last 7 days']);}
  else if(/\b(last 30|past 30|30 day|last month)\b/.test(t)){o.range='30';o.chips.push(['Date','Last 30 days']);}
  else if(/\b(last 90|past 90|90 day|quarter|3 month)\b/.test(t)){o.range='90';o.chips.push(['Date','Last 90 days']);}
  // referrer role
  if(/\bgopher referrer|referrers?\s+(?:who|that)?\s*(?:are|is)?\s*gophers?|from gophers?\b/.test(t)){o.filters.push(r=>{const x=refRole(r[2]);return x==='Gopher'||x==='Both';});o.chips.push(['Referrer','Gopher']);}
  else if(/\brequester referrer|referrers?\s+(?:who|that)?\s*(?:are|is)?\s*requesters?|from (?:requesters?|customers?)\b/.test(t)){o.filters.push(r=>{const x=refRole(r[2]);return x==='Requester'||x==='Both';});o.chips.push(['Referrer','Requester']);}
  // referred role
  if(/\bbecame (?:a )?gophers?|referred[^?]*\bgophers?\b|turned into (?:a )?gophers?\b/.test(t)){o.filters.push(r=>{const x=refRole(r[4]);return x==='Gopher'||x==='Both';});o.chips.push(['Referred','Gopher']);}
  else if(/\bbecame (?:a )?(?:requesters?|customers?)|referred[^?]*\brequesters?\b/.test(t)){o.filters.push(r=>{const x=refRole(r[4]);return x==='Requester'||x==='Both';});o.chips.push(['Referred','Requester']);}
  // activity
  if(/\b(dormant|inactive|never (?:made|placed|ordered)|no requests?|didn.?t activate|not activated|zero requests?|0 requests?)\b/.test(t)){o.filters.push(r=>(+r[5]||0)===0);o.chips.push(['Activity','Dormant (0 made)']);}
  else if(/\b(activated|active|made (?:a )?requests?|placed (?:a )?requests?|who ordered|converted)\b/.test(t)){o.filters.push(r=>(+r[5]||0)>0);o.chips.push(['Activity','Activated (≥1 made)']);}
  if(/\b(serviced|fulfilled|completed (?:a )?requests?|delivered)\b/.test(t)){o.filters.push(r=>(+r[6]||0)>0);o.chips.push(['Activity','Serviced ≥1']);}
  // name search
  let nm=text.match(/["'\u201c\u2018]([^"'\u201d\u2019]{2,40})["'\u201d\u2019]/)||text.match(/\b(?:named|name|search|find|called)\s+([A-Za-z][A-Za-z'\- ]{1,28}[A-Za-z])/i);
  if(nm){o.q=nm[1].trim();o.chips.push(['Name','“'+o.q+'”']);}
  // ranking intent
  const rank=/\b(top|most|highest|best|rank|ranking|leaderboard|biggest|largest|who (?:referred|brought)|which referrer)\b/.test(t);
  const bottom=/\b(bottom|least|fewest|lowest|worst|smallest)\b/.test(t);
  if(rank||bottom){o.mode='rank';o.asc=bottom&&!rank;}
  // dimension
  if(/\breferrer role|referrer type|by role of referrer\b/.test(t)){o.dim='rrole';o.dimLabel='referrer role';}
  else if(/\breferred role|referred type|what (?:do|did) referred\b/.test(t)){o.dim='drole';o.dimLabel='referred role';}
  // metric
  if(/\b(requests? made|made requests?|orders? placed|placed requests?)\b/.test(t)){o.metric='made';o.metricLabel='requests made';}
  else if(/\b(serviced|requests? serviced|fulfilled|completed requests?)\b/.test(t)){o.metric='serviced';o.metricLabel='requests serviced';}
  else if(o.mode==='rank' && /\b(activated|active users?|brought active|activations?)\b/.test(t)){o.metric='activated';o.metricLabel='activated referrals';}
  // top N
  let mn=t.match(/\b(?:top|bottom|first|best|highest|lowest)\s+(\d{1,3})\b/)||t.match(/\b(\d{1,3})\s+(?:referrers?|results?)\b/);
  if(mn)o.n=Math.max(1,Math.min(50,+mn[1]));
  return o;
}
function buildGrowthReferrals(){
  const REF=(M._reports&&M._reports.referrals)?M._reports.referrals:null;
  const INV=(M._reports&&M._reports.invites)?M._reports.invites:null;
  const wrap=el('div');
  if(!REF){return wrap;}
  const ROWS=REF.rows, DC=(REF.datecol==null?-1:REF.datecol);
  let refNow=0; if(DC>=0) ROWS.forEach(r=>{const t=repParseDate(r[DC]);if(!isNaN(t)&&t>refNow)refNow=t;});
  let iqSpec=null, shown=ROWS.slice();
  wrap.appendChild(el('div','',`<div style="margin:26px 0 4px;font-size:13px;font-weight:800;letter-spacing:.04em;color:var(--muted);text-transform:uppercase">Referrals &amp; Invites</div>`));
  // iQ pill
  const iq=el('div','card'); iq.style.cssText='background:linear-gradient(120deg,#0B1A2B,#13283E);border:none;color:#fff';
  const EG=['top 10 referrers by requests made','referrers who are gophers ranked by serviced','referred users who became gophers','activated referrals in the last 30 days','which referrers brought the most active users'];
  iq.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:13px">
      <div style="display:flex;align-items:center;gap:9px"><div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,${C.greenB},${C.green});display:grid;place-items:center"><svg viewBox="0 0 24 24" width="15" fill="#04230f"><path d="m12 3 1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3Z"/></svg></div><span style="font-weight:800;font-size:14.5px;color:#fff">gopher iQ</span></div>
      <div style="font-size:12.5px;color:#9fb3c4;font-weight:600">Ask anything about the ${num(ROWS.length)} referrals — rank, filter, aggregate</div></div>
    <div class="iqpill"><div class="iqpill-plus">+</div>
      <input id="greq" placeholder="e.g. ${EG[0]}">
      <button class="iqpill-go" id="greq-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>Ask iQ</button></div>
    <div style="margin-top:10px;font-size:11.5px;color:#8aa0b3">Try: ${EG.map(e=>`<span class="greq-eg" style="cursor:pointer;text-decoration:underline;text-decoration-color:#33507a">${e}</span>`).join(' · ')}</div>
    <div id="greq-chips" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"></div>`;
  wrap.appendChild(iq);
  // KPI box (scoped)
  const kbox=el('div','row kpis'); wrap.appendChild(kbox);
  // analysis (rank) box
  const anaBox=el('div'); anaBox.style.display='none'; wrap.appendChild(anaBox);
  // table card with filters
  const c=el('div','card pad0');
  c.innerHTML=`<div class="card-h" style="padding:18px 18px 4px"><div><h3>Referral records</h3><div class="sub" id="gref-sub">${REF.desc||'Who referred whom, and what the referred user did.'} · newest first</div></div></div>`;
  const tools=el('div','tbl-tools');
  tools.innerHTML=`<div class="search" style="min-width:180px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg><input id="gref-search" placeholder="Search name…"></div>
    <div class="fl"><label>Date</label><select id="gref-range"><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
    <div class="fl"><label>Referrer role</label><select id="gref-rr"><option value="all">All</option><option>Gopher</option><option>Requester</option><option>Both</option><option>Other</option></select></div>
    <div class="fl"><label>Referred role</label><select id="gref-dr"><option value="all">All</option><option>Gopher</option><option>Requester</option><option>Both</option><option>Other</option></select></div>
    <div class="fl"><label>Activity</label><select id="gref-act"><option value="all">All</option><option value="activated">Activated (≥1 made)</option><option value="serviced">Serviced ≥1</option><option value="dormant">Dormant (0 made)</option></select></div>
    <button class="btn primary" id="gref-x" style="margin-left:auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>Export CSV</button>`;
  c.appendChild(tools);
  const tbox=el('div','tbl-wrap'); c.appendChild(tbox);
  wrap.appendChild(c);
  // invites summary
  if(INV){
    const iv=el('div','card');
    iv.innerHTML=`<div class="card-h"><div><h3>Invites — referred contacts not yet converted</h3><div class="sub">An invite is when a user refers an SMS or email address that has not become a Gopher user yet.</div></div></div>
      <div class="row kpis" style="margin-top:4px">${(INV.kpis||[]).map((kp,i)=>kp&&kp[0]!=='—'?`<div class="kpi"><div class="kpi-h"><span class="dot" style="background:${[C.violet,C.green,C.blue,C.amber][i%4]}"></span>${kp[0]}</div><div class="kpi-v">${typeof kp[1]==='number'?num(kp[1]):kp[1]}</div><div class="kpi-s">${kp[2]||''}</div></div>`:'').join('')}</div>
      <div class="note" style="margin-top:8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>KPIs reflect the full invites dataset. The full record-level invites table (with its own search, date and Became-user filters) lives under Reports → Invites. Re-upload a fresh Invites export to refresh these numbers.</div>`;
    wrap.appendChild(iv);
  }
  // ---- rendering ----
  function val(sel){const e=$(sel);return e?e.value:null;}
  function filtered(){
    const q=(val('#gref-search')||'').toLowerCase().trim();
    const range=val('#gref-range')||'all', rr=val('#gref-rr')||'all', dr=val('#gref-dr')||'all', act=val('#gref-act')||'all';
    return ROWS.filter(r=>{
      if(q && !r.some(c=>(''+(c==null?'':c)).toLowerCase().includes(q))) return false;
      if(range!=='all' && DC>=0){const t=repParseDate(r[DC]); if(isNaN(t)||t<refNow-(+range)*86400000) return false;}
      if(rr!=='all' && refRole(r[2])!==rr) return false;
      if(dr!=='all' && refRole(r[4])!==dr) return false;
      if(act==='activated' && !((+r[5]||0)>0)) return false;
      if(act==='serviced' && !((+r[6]||0)>0)) return false;
      if(act==='dormant' && (+r[5]||0)!==0) return false;
      if(iqSpec){
        for(const f of iqSpec.filters){ if(!f(r)) return false; }
        if(iqSpec.q){const qq=iqSpec.q.toLowerCase(); if(!r.some(c=>(''+(c==null?'':c)).toLowerCase().includes(qq))) return false;}
        if(iqSpec.range && iqSpec.range!=='all' && DC>=0){const t=repParseDate(r[DC]); if(isNaN(t)||t<refNow-(+iqSpec.range)*86400000) return false;}
      }
      return true;
    });
  }
  function renderKPIs(rows){
    const total=rows.length, activated=rows.filter(r=>(+r[5]||0)>0).length;
    const made=rows.reduce((a,r)=>a+(+r[5]||0),0), serviced=rows.reduce((a,r)=>a+(+r[6]||0),0);
    const cr=total?(activated/total*100).toFixed(1):'0';
    const scoped=(total!==ROWS.length);
    kbox.innerHTML='';
    kbox.appendChild(kpi('Referrals'+(scoped?' (matching)':''),num(total),scoped?'of '+num(ROWS.length)+' total':'total recorded',{dot:C.violet}));
    kbox.appendChild(kpi('Activated',num(activated),cr+'% made ≥1 request',{dot:C.green}));
    kbox.appendChild(kpi('Requests made',num(made),'by referred users',{dot:C.blue}));
    kbox.appendChild(kpi('Requests serviced',num(serviced),'completed by referred',{dot:C.amber}));
  }
  function renderRank(rows,spec){
    const keyf=r=>spec.dim==='rrole'?refRole(r[2]):spec.dim==='drole'?refRole(r[4]):((r[1]||'—').trim()||'—');
    const agg={};
    rows.forEach(r=>{const k=keyf(r);const a=agg[k]||(agg[k]={k,referrals:0,made:0,serviced:0,activated:0});a.referrals++;a.made+=(+r[5]||0);a.serviced+=(+r[6]||0);if((+r[5]||0)>0)a.activated++;});
    let arr=Object.values(agg).map(a=>({k:a.k,v:a[spec.metric]})).filter(x=>x.v>0||spec.metric==='referrals');
    arr.sort((a,b)=>spec.asc?a.v-b.v:b.v-a.v);
    const top=arr.slice(0,spec.n), maxv=Math.max(1,...top.map(x=>x.v)), totv=arr.reduce((a,x)=>a+x.v,0);
    const cols=[C.green,C.blue,C.violet,C.amber,C.greenD,'#d97757'];
    const bl=el('div','barlist');
    top.forEach((x,i)=>{const it=el('div','it');it.innerHTML=`<span class="nm" style="min-width:160px">${(''+x.k).replace(/</g,'&lt;')}</span><div class="track"><div class="fill" style="width:${x.v/maxv*100}%;background:${cols[i%cols.length]}"></div></div><span class="v">${num(x.v)}</span>`;bl.appendChild(it);});
    const dd=top.slice(0,6).map((x,i)=>({label:(''+x.k).slice(0,18),value:x.v,color:cols[i%cols.length]}));
    const tailv=totv-dd.reduce((a,x)=>a+x.value,0); if(tailv>0)dd.push({label:'Others',value:tailv,color:'#cbd5e1'});
    const body=el('div','row g2'); body.style.alignItems='center';
    const left=el('div'); left.appendChild(bl); body.appendChild(left);
    const right=el('div'); right.style.cssText='display:grid;place-items:center'; right.appendChild(donut(dd,{size:180,thick:28,center:num(totv),centerSub:spec.metricLabel})); body.appendChild(right);
    anaBox.innerHTML='';
    const title=`${spec.asc?'Bottom':'Top'} ${top.length} ${spec.dimLabel}${spec.dimLabel==='referrer'?'s':''} by ${spec.metricLabel}`;
    anaBox.appendChild(card(title,`Across the ${num(rows.length)} referrals matching your question.`,body));
    anaBox.style.display='';
  }
  function renderTable(rows){
    let rs=rows.slice(); if(DC>=0) rs.sort((a,b)=>{const ta=repParseDate(a[DC]),tb=repParseDate(b[DC]);return (isNaN(tb)?-1:tb)-(isNaN(ta)?-1:ta);});
    shown=rs; const disp=rs.slice(0,300);
    tbox.innerHTML = rs.length? `<table><thead><tr>${REF.cols.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${disp.map(row=>'<tr>'+row.map((cell,i)=>`<td${i===0?' class="tnum" style="color:var(--blue);font-weight:700"':''}>${(''+(cell==null?'':cell)).replace(/</g,'&lt;')}</td>`).join('')+'</tr>').join('')}</tbody></table>${rs.length>disp.length?`<div style="padding:12px 16px;color:var(--muted);font-size:12px;border-top:1px solid var(--line-2)">Showing first ${disp.length} of ${num(rs.length)} matches. Export for the full set.</div>`:''}` : '<div style="padding:46px;text-align:center;color:var(--muted)">No referrals match these filters.</div>';
    const sub=$('#gref-sub'); if(sub)sub.textContent=`${num(rs.length)} of ${num(ROWS.length)} referrals · newest first`;
  }
  function render(){const rows=filtered(); renderKPIs(rows); if(iqSpec&&iqSpec.mode==='rank')renderRank(rows,iqSpec); else {anaBox.innerHTML='';anaBox.style.display='none';} renderTable(rows);}
  function renderChips(chips){const box=$('#greq-chips');if(!box)return;if(!chips||!chips.length){box.innerHTML='';return;}box.innerHTML=chips.map(c=>`<span class="iqchip">${c[0]}: ${c[1]}</span>`).join('')+`<span class="iqchip clear" id="greq-clear">Clear all ✕</span>`;const cl=$('#greq-clear');if(cl)cl.onclick=()=>{iqSpec=null;if($('#greq'))$('#greq').value='';['#gref-search','#gref-range','#gref-rr','#gref-dr','#gref-act'].forEach(s=>{if($(s))$(s).value=(s==='#gref-search')?'':'all';});renderChips([]);render();};}
  function runIQ(text){iqSpec=refIQParse(text);['#gref-range','#gref-rr','#gref-dr','#gref-act'].forEach(s=>{if($(s))$(s).value='all';});if($('#gref-search'))$('#gref-search').value='';renderChips(iqSpec.chips);render();}
  setTimeout(()=>{if(!wrap.isConnected)return;
    const go=$('#greq-go'),inp=$('#greq');
    if(go)go.onclick=()=>runIQ(inp.value);
    if(inp)inp.onkeydown=e=>{if(e.key==='Enter')runIQ(inp.value);};
    wrap.querySelectorAll('.greq-eg').forEach(s=>s.onclick=()=>{inp.value=s.textContent;runIQ(s.textContent);});
    ['#gref-search','#gref-range','#gref-rr','#gref-dr','#gref-act'].forEach(s=>{const e=$(s);if(e){const h=()=>{if(iqSpec){iqSpec=null;if($('#greq'))$('#greq').value='';renderChips([]);}render();};e.oninput=h;e.onchange=h;}});
    const x=$('#gref-x');if(x)x.onclick=()=>exportCSV(shown.map(row=>{const o={};REF.cols.forEach((cn,i)=>o[cn]=row[i]);return o;}),'gopher_referrals');
    render();
  },0);
  return wrap;
}
VIEWS.growth=()=>{
  const v=el('div');
  const r=window.GF&&window.GF.range;
  const su=(r&&r!=='all')?M.signups.slice(-(+r)):M.signups;const last=su[su.length-1]||{Requester:0,Gopher:0,Both:0},prev=su[su.length-2]||{Requester:0,Gopher:0,Both:0};
  const gn=(typeof gfNote==='function')&&gfNote();if(gn)v.appendChild(gn);
  const k=el('div','row kpis');
  const totalNew=su.reduce((a,d)=>a+d.Requester+d.Gopher+d.Both,0);
  k.appendChild(kpi('New requesters / mo',num(last.Requester),trendTag(prev.Requester?(last.Requester-prev.Requester)/prev.Requester*100:0),{dot:C.blue,spark:su.map(d=>d.Requester)}));
  k.appendChild(kpi('New gophers / mo',num(last.Gopher),trendTag(prev.Gopher?(last.Gopher-prev.Gopher)/prev.Gopher*100:0)+' supply shrinking',{dot:C.green,spark:su.map(d=>d.Gopher)}));
  k.appendChild(kpi('Activation rate',(M.people.placed_request/M.people.total*100).toFixed(1)+'%',`${num(M.people.placed_request)} ever placed a request`,{dot:C.amber}));
  k.appendChild(kpi('Referral conversion',M.referrals.rate+'%',`${num(M.referrals.converted)} joined of ${fmt(M.referrals.invites)} invites`,{dot:C.violet}));
  v.appendChild(k);

  // signups stacked
  const rows=su.map(d=>({label:monShort(d.ym),Requester:d.Requester,Gopher:d.Gopher,Both:d.Both}));
  const sc=stackChart(rows,['Requester','Gopher','Both'],[C.blue,C.green,C.violet],{h:250});
  const scCard=card('New sign-ups by month','Requester demand is exploding while gopher supply declines — the gap behind the fulfillment problem.',sc);
  scCard.appendChild(legend([{label:'Requesters',color:C.blue},{label:'Gophers',color:C.green},{label:'Both',color:C.violet}]));
  v.appendChild(scCard);

  // acquisition + funnel
  const acq=M.acquisition;const maxa=Math.max(...acq.map(a=>a.n));
  const bl=el('div','barlist');
  acq.forEach(a=>{const it=el('div','it');it.innerHTML=`<span class="nm">${a.src}</span><div class="track"><div class="fill" style="width:${a.n/maxa*100}%;background:${C.blue}"></div></div><span class="v">${fmt(a.n)}</span>`;bl.appendChild(it);});
  const acqCard=card('Acquisition channels','How users say they found Gopher (self-reported).',bl);

  // requester funnel
  const f=M.funnel_requester;const fw=el('div','funnel');const maxf=f.values[0];const cols=[C.violet,C.blue,C.green,C.amber];
  f.labels.forEach((l,i)=>{const st=el('div','step');const w=Math.max(8,f.values[i]/maxf*100);
    st.innerHTML=`<div class="fbar" style="width:${w}%;background:${cols[i]}">${fmt(f.values[i])}</div><div class="fmeta">${l}${i>0?` · <b>${(f.values[i]/f.values[i-1]*100).toFixed(1)}%</b>`:''}</div>`;fw.appendChild(st);});
  const fCard=card('Requester activation funnel','Registration → first completed request. The drop from “logged in” to “placed” is the money leak.',fw);
  v.appendChild((()=>{const g=el('div','row g2');g.appendChild(fCard);g.appendChild(acqCard);return g;})());

  v.appendChild(buildGrowthReferrals());

  // geography
  const geo=M.geo_users;const maxg=geo[0].n;const bl2=el('div','barlist');
  geo.forEach(g=>{const it=el('div','it');it.innerHTML=`<span class="nm">${g.state}</span><div class="track"><div class="fill" style="width:${g.n/maxg*100}%;background:${C.green}"></div></div><span class="v">${fmt(g.n)}</span>`;bl2.appendChild(it);});
  v.appendChild(card('Users by state','North Carolina is roughly half the base — concentration risk and expansion opportunity both.',bl2));
  return v;
};

/* ========== PEOPLE ========== */
// --- gopher iQ analytical layer for Users (mirrors the Orders "iQ answer" panel) ---
function userDma(zip){const k=(''+(zip||'')).trim().slice(0,5).padStart(5,'0');const ZD=M._zipdma||{},ZN=M._dmaNames||[];const i=ZD[k];return i==null?'':ZN[i];}
function dimKeyU(u,dim){
  if(dim==='dma')return userDma(u.zip)||'Unmapped (no metro)';
  if(dim==='state')return u.state||'—';
  if(dim==='dev')return u.dev||'Unknown';
  if(dim==='tier')return u.gopherType||'—';
  if(dim==='source')return u.source||'—';
  if(dim==='year')return String(dayToYear(u.signupDay));
  if(dim==='role')return u.role||'—';
  return '';
}
function iqAnalysisUsers(text){
  const t=(text||'').toLowerCase();
  let dim=null,dimLabel='',pl='';
  if(/\bcit(y|ies)\b|\bdmas?\b|\bmetros?\b|media market/.test(t)){dim='dma';dimLabel='city';pl='cities';}
  else if(/\bmarkets?\b|\bstates?\b|\bregions?\b/.test(t)){dim='state';dimLabel='state';pl='states';}
  else if(/\bdevices?\b|by platform/.test(t)){dim='dev';dimLabel='device';pl='devices';}
  else if(/\btiers?\b/.test(t)){dim='tier';dimLabel='tier';pl='tiers';}
  else if(/\bsources?\b|acquisition|channels?|by discover/.test(t)){dim='source';dimLabel='source';pl='sources';}
  else if(/\byears?\b|cohorts?|signup year|by signup/.test(t)){dim='year';dimLabel='signup year';pl='signup years';}
  if(!dim) return null;
  if(!/\b(top|rank|ranking|breakdown|break down|most|least|leading|highest|lowest|by|bottom|fewest)\b/.test(t)) return null;
  let metric='users',metricLabel='users';
  if(/completed (a )?jobs?|jobs done|by completed|completed jobs/.test(t)){metric='completed';metricLabel='completed jobs';}
  else if(/placed requests?|by placed|requests placed/.test(t)){metric='placed';metricLabel='placed requests';}
  else if(/logins?|sign-?ins?|log ?ins/.test(t)){metric='logins';metricLabel='logins';}
  let n=5;const nm=t.match(/top\s+(\d+)/)||t.match(/bottom\s+(\d+)/)||t.match(/(\d+)\s+(?:most|highest|top)/);if(nm)n=Math.min(20,Math.max(3,+nm[1]));
  const asc=/\b(least|lowest|worst|bottom|fewest)\b/.test(t);
  return {dim,dimLabel,pl,metric,metricLabel,n,asc};
}
function iqAggregateU(rows,spec){
  const m=new Map();
  rows.forEach(u=>{
    const k=dimKeyU(u,spec.dim);if(k==null||k==='')return;
    let e=m.get(k);if(!e){e={k,users:0,gophers:0,requesters:0,completed:0,placed:0,logins:0};m.set(k,e);}
    e.users++;
    if(u.role==='Gopher'||u.role==='Both')e.gophers++;
    if(u.role==='Requester'||u.role==='Both')e.requesters++;
    e.completed+=(+u.completed||0);e.placed+=(+u.placed||0);e.logins+=(+u.logins||0);
  });
  let arr=[...m.values()];
  const val=e=>spec.metric==='completed'?e.completed:spec.metric==='placed'?e.placed:spec.metric==='logins'?e.logins:e.users;
  arr.sort((a,b)=>spec.asc?val(a)-val(b):val(b)-val(a));
  return {arr,val};
}
VIEWS.people=()=>{
  const v=el('div');const p=M.people;
  const k=el('div','row kpis');
  k.appendChild(kpi('Total users',num(p.total),`${num(p.active)} active · ${num(p.deleted)} deleted`,{dot:C.violet}));
  k.appendChild(kpi('Requesters',num(p.requesters),'demand side',{dot:C.blue}));
  k.appendChild(kpi('Gophers',num(p.gophers),`+ ${num(p.both)} do both`,{dot:C.green}));
  k.appendChild(kpi('Never logged in',num(p.never_logged_in),(p.never_logged_in/p.total*100).toFixed(0)+'% of accounts',{dot:C.amber}));
  v.appendChild(k);

  // composition donut + gopher tiers
  const comp=donut([
    {label:'Requesters',value:p.requesters,color:C.blue},
    {label:'Gophers',value:p.gophers,color:C.green},
    {label:'Both',value:p.both,color:C.violet},
  ],{center:fmt(p.total),centerSub:'USERS'});
  const cw=el('div');const ch=el('div');ch.style.cssText='display:flex;justify-content:center';ch.appendChild(comp);cw.appendChild(ch);
  cw.appendChild(legend([{label:`Requesters · ${num(p.requesters)}`,color:C.blue},{label:`Gophers · ${num(p.gophers)}`,color:C.green},{label:`Both · ${num(p.both)}`,color:C.violet}]));
  const compCard=card('Base composition','Your two-sided split.',cw);

  // gopher tiers
  const gt=M.gopher_type;const tot=Object.values(gt).reduce((a,b)=>a+b,0);
  const tierBody=el('div');
  const tiers=[['Standard',gt.Standard||0,C.grey],['Elite',(gt.Elite||gt.Pro||0),C.green],['Elite+',(gt['Elite+']||gt['Pro+']||0),C.violet]];
  tiers.forEach(t=>{const d=el('div');d.style.cssText='margin-bottom:13px';
    d.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:5px"><span>${t[0]}</span><span class="tnum">${num(t[1])} <span style="color:var(--muted);font-weight:600">(${(t[1]/tot*100).toFixed(1)}%)</span></span></div><div class="track" style="height:9px;background:var(--line-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${t[1]/tot*100}%;background:${t[2]};border-radius:6px"></div></div>`;tierBody.appendChild(d);});
  tierBody.appendChild(el('div','note',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>Elite & Elite+ are your reliable supply. Converting Standard gophers into Elites is a direct lever on completion rate.`));
  const tierCard=card('Gopher tiers',`Of gophers with a tier assigned (${num(tot)}).`,tierBody);
  v.appendChild((()=>{const g=el('div','row g2');g.appendChild(compCard);g.appendChild(tierCard);return g;})());

  // verification
  const ver=M.verification;
  const vbody=el('div');
  const vit=[
   ['Email verified',ver.email_verified,p.total,C.blue],
   ['Requester Stripe verified',ver.stripe_requester,p.requesters+p.both,C.green],
   ['Gopher Stripe verified',ver.stripe_gopher,p.gophers+p.both,C.amber],
   ['TrustShield verified',ver.trustshield,p.gophers+p.both,C.violet],
  ];
  vit.forEach(t=>{const r=t[1]/t[2]*100;const d=el('div');d.style.cssText='margin-bottom:13px';
    d.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:5px"><span>${t[0]}</span><span class="tnum">${num(t[1])} <span style="color:var(--muted);font-weight:600">/ ${fmt(t[2])} · ${r.toFixed(0)}%</span></span></div><div class="track" style="height:9px;background:var(--line-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100,r)}%;background:${t[3]};border-radius:6px"></div></div>`;vbody.appendChild(d);});
  v.appendChild(card('Verification & trust','Low TrustShield and gopher-Stripe coverage limit how many jobs can actually be fulfilled and paid out.',vbody));

  // ---- User records explorer with gopher iQ (mirrors the Orders experience) ----
  if(USR.length){
    let UF={q:'',role:'all',state:'all',zip:null,ver:'all',act:'all',dev:'all',tier:'all',status:'all',deactFrom:null,deactTo:null,joinFrom:null,joinTo:null};

    // iQ bar — identical treatment to Orders
    const iq=el('div','card');iq.style.cssText='background:linear-gradient(120deg,#0B1A2B,#13283E);border:none;color:#fff';
    iq.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:13px">
        <div style="display:flex;align-items:center;gap:9px"><div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,${C.greenB},${C.green});display:grid;place-items:center"><svg viewBox="0 0 24 24" width="15" fill="#04230f"><path d="m12 3 1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3Z"/></svg></div><span style="font-weight:800;font-size:14.5px;color:#fff">gopher iQ</span></div>
        <div style="font-size:12.5px;color:#9fb3c4;font-weight:600">Ask for any slice of your users in plain English</div></div>
      <div class="iqpill">
        <div class="iqpill-plus">+</div>
        <input id="uiq-q" placeholder="e.g. Elite+ gophers in NC with TrustShield who completed a job">
        <button class="iqpill-go" id="uiq-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>Ask iQ</button>
      </div>
      <div style="margin-top:10px;font-size:11.5px;color:#8aa0b3">Try: <span class="iq-eg">top 5 cities with gophers</span> · <span class="iq-eg">gophers in NC who completed a job</span> · <span class="iq-eg">requesters on iOS</span> · <span class="iq-eg">rank states by completed jobs</span></div>
      <div id="uiq-chips" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"></div>
      <div id="uiq-warn" style="margin-top:8px"></div>`;
    v.appendChild(iq);

    // matching KPI summary
    const sum=el('div','row kpis');sum.id='u-kpis';v.appendChild(sum);
    // iQ analytical answer panel (rendered for "top N <dim> by <metric>" questions)
    const uana=el('div');uana.id='u-analysis';v.appendChild(uana);

    // structured filters + table
    const uc=el('div','card pad0');
    uc.innerHTML=`<div class="card-h" style="padding:18px 18px 4px"><div><h3>User records</h3><div class="sub" id="u-sub">${US.sampleNote}. Filter to a segment, then export the full record for each qualifying user.</div></div></div>`;
    const tools=el('div','tbl-tools');
    tools.innerHTML=`
      <div class="search" style="min-width:200px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg><input id="u-q" placeholder="Search name, email, or id…"></div>
      <div class="fl"><label>Role</label><select id="u-role"><option value="all">All</option><option>Requester</option><option>Gopher</option><option>Both</option></select></div>
      <div class="fl"><label>State</label><select id="u-state"><option value="all">All</option>${[...new Set(USR.map(u=>u.state))].filter(s=>s!=='—').sort().map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="fl"><label>Verified</label><select id="u-ver"><option value="all">All</option><option value="trustshield">TrustShield ✓</option><option value="trustshield_no">No TrustShield ✗</option><option value="stripeG">Stripe · gopher ✓</option><option value="stripeG_no">No Stripe ✗</option><option value="email">Email confirmed ✓</option><option value="email_no">Email NOT confirmed ✗</option></select></div>
      <div class="fl"><label>Activity</label><select id="u-act"><option value="all">All</option><option value="ag">Completed a job</option><option value="ar">Placed a request</option><option value="never">Never logged in</option></select></div>
      <div class="fl"><label>Device</label><select id="u-dev"><option value="all">All</option><option>iOS</option><option>Android</option><option>Web</option><option>Unknown</option></select></div>
      <div class="fl"><label>Tier</label><select id="u-tier"><option value="all">All</option>${userTiers().map(t=>`<option value="${t}">${_tierName(t)}</option>`).join('')}</select></div>
      <div class="fl"><label>Status</label><select id="u-status"><option value="all">All</option><option value="active">Active</option><option value="deactivated">Deactivated</option>${userStatuses().filter(s=>{const v=(''+s).toLowerCase();return v!=='active'&&v!=='deactivated';}).map(s=>`<option value="${(''+s).toLowerCase()}">${_statusLabel(s)}</option>`).join('')}</select></div>
      <button class="btn primary" id="u-export"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>Export CSV</button>`;
    uc.appendChild(tools);
    const uwrap=el('div','tbl-wrap');uc.appendChild(uwrap);
    v.appendChild(uc);
    v.appendChild(el('div','note',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>iQ and these filters now run across the full ${num(M.people.total)}-user base. The charts above use the same full base; the table previews the first 300 matches for speed, and Export returns every qualifying user.`));

    let uLast=[];
    let uAna=null;
    function syncControls(){
      $('#u-q').value=UF.q||'';$('#u-role').value=UF.role;$('#u-state').value=UF.state;
      $('#u-ver').value=UF.ver;$('#u-act').value=UF.act;$('#u-dev').value=UF.dev;$('#u-tier').value=UF.tier;if($('#u-status'))$('#u-status').value=UF.status||'all';
    }
    function renderChips(chips){
      const box=$('#uiq-chips');if(!chips||!chips.length){box.innerHTML='';return;}
      box.innerHTML=chips.map(c=>`<span class="iqchip">${c[0]}: ${c[1]}</span>`).join('')+`<span class="iqchip clear" id="uiq-clear">Clear all ✕</span>`;
      const cl=$('#uiq-clear');if(cl)cl.onclick=()=>{UF={q:'',role:'all',state:'all',zip:null,ver:'all',act:'all',dev:'all',tier:'all',status:'all',deactFrom:null,deactTo:null,joinFrom:null,joinTo:null};uAna=null;$('#uiq-q').value='';const wb=$('#uiq-warn');if(wb)wb.innerHTML='';renderChips([]);syncControls();urender();};
    }
    function urender(){
      const q=(UF.q||'').toLowerCase();
      const rows=USR.filter(u=>{
        if(UF.role!=='all'){
          // a "Both" user is both a gopher and a requester — match them under either, consistent with the KPI counts
          if(UF.role==='Gopher'){if(u.role!=='Gopher'&&u.role!=='Both')return false;}
          else if(UF.role==='Requester'){if(u.role!=='Requester'&&u.role!=='Both')return false;}
          else if(u.role!==UF.role)return false;
        }
        if(UF.state!=='all'&&u.state!==UF.state)return false;
        if(UF.zip&&(''+(u.zip||'')).replace(/\D/g,'').slice(0,5)!==UF.zip)return false;
        if(UF.ver==='trustshield'&&!u.trustshield)return false;
        if(UF.ver==='trustshield_no'&&u.trustshield)return false;
        if(UF.ver==='stripeG'&&!u.stripeG)return false;
        if(UF.ver==='stripeG_no'&&u.stripeG)return false;
        if(UF.ver==='email'&&!u.emailV)return false;
        if(UF.ver==='email_no'&&u.emailV)return false;
        if(UF.act==='ag'&&!(u.received>0))return false;
        if(UF.act==='ar'&&!(u.completed>0))return false;
        if(UF.act==='never'&&u.logins>0)return false;
        if(UF.dev!=='all'&&u.dev!==UF.dev)return false;
        if(UF.tier!=='all'&&u.gopherType!==UF.tier)return false;
        if(UF.joinFrom!=null||UF.joinTo!=null){const jy=u.signupDay?dayToYear(u.signupDay):0;if(UF.joinFrom!=null&&jy<UF.joinFrom)return false;if(UF.joinTo!=null&&jy>UF.joinTo)return false;}
        if(UF.status&&UF.status!=='all'){
          const _st=(''+(u.status||'')).toLowerCase();
          if(UF.status==='deactivated'){
            const isDeact=(u.deactDay>0)||/deactiv|disabl|suspend|banned|deleted|removed|terminat/i.test(_st);
            if(!isDeact)return false;
            if(UF.deactFrom!=null||UF.deactTo!=null){const dy=u.deactDay?dayToYear(u.deactDay):0;if(UF.deactFrom!=null&&dy<UF.deactFrom)return false;if(UF.deactTo!=null&&dy>UF.deactTo)return false;}
          } else if(UF.status==='active'){
            const isDeact=(u.deactDay>0)||/deactiv|disabl|suspend|banned|deleted|removed|terminat/i.test(_st);
            if(isDeact)return false;
          } else { if(_st!==UF.status)return false; }
        }
        if(UF.city&&_cityNorm(u.city)!==UF.city)return false;
        if(UF.missing&&UF.missing.length){ for(const _mf of UF.missing){ if((''+(u[_mf]||'')).trim()!=='')return false; } }
        if(UF.thresh&&UF.thresh.length){ for(const _th of UF.thresh){ const _v=+(u[_th.field]||0); if(_th.op==='>'&&!(_v>_th.val))return false; else if(_th.op==='>='&&!(_v>=_th.val))return false; else if(_th.op==='<'&&!(_v<_th.val))return false; else if(_th.op==='<='&&!(_v<=_th.val))return false; else if(_th.op==='=='&&!(_v===_th.val))return false; } }
        if(q&&!((''+u.id+' '+u.name+' '+u.email).toLowerCase().includes(q)))return false;
        return true;
      });
      // newest signups first — merged/appended rows would otherwise sink to the end and never show in the first 300
      rows.sort((a,b)=>(b.signupDay||0)-(a.signupDay||0)||(b.id||0)-(a.id||0));
      // analytical scoping — "top N <dim> by <metric>" narrows the cards + table to the answer
      let scoped=rows, uAnaData=null, scopedLabel='';
      if(uAna){
        uAnaData=iqAggregateU(rows,uAna);
        const topN=uAnaData.arr.slice(0,uAna.n);
        const keys=new Set(topN.map(e=>e.k));
        scoped=rows.filter(u=>keys.has(dimKeyU(u,uAna.dim)));
        scopedLabel=`in ${uAna.asc?'bottom':'top'} ${topN.length} ${topN.length>1?uAna.pl:uAna.dimLabel}`;
      }
      uLast=scoped;
      const reqN=scoped.filter(u=>u.role==='Requester'||u.role==='Both').length;
      const gophN=scoped.filter(u=>u.role==='Gopher'||u.role==='Both').length;
      const jobN=scoped.filter(u=>u.received>0).length;
      sum.innerHTML='';
      sum.appendChild(kpi('Matching users',num(scoped.length),uAna?scopedLabel:`of ${num(USR.length)} total`,{dot:C.violet}));
      sum.appendChild(kpi('Requesters',num(reqN),uAna?scopedLabel:'in this segment',{dot:C.blue}));
      sum.appendChild(kpi('Gophers',num(gophN),uAna?scopedLabel:'in this segment',{dot:C.green}));
      sum.appendChild(kpi('Completed a job',num(jobN),uAna?scopedLabel:'active supply in match',{dot:C.amber}));
      renderUAnalysis(rows,uAnaData);
      $('#u-sub').textContent=`${num(scoped.length)} matching users (of ${num(USR.length)} total). Showing first ${Math.min(300,scoped.length)}; Export pulls every match.`;
      const rc={Requester:'t-blue',Gopher:'t-green',Both:'t-violet',Other:'t-grey'};
      const show=scoped.slice(0,300);
      let h='<table><thead><tr><th>#</th><th>Name</th><th>Role</th><th>State</th><th>Device</th><th>Joined</th><th style="text-align:right">Placed</th><th style="text-align:right">Completed</th><th style="text-align:right">Jobs done</th><th>Tier</th><th>Verified</th></tr></thead><tbody>';
      show.forEach(u=>{const badges=[u.trustshield?'<span class="tag t-violet" style="padding:1px 6px">TS</span>':'',u.stripeG?'<span class="tag t-green" style="padding:1px 6px">SG</span>':'',u.emailV?'<span class="tag t-grey" style="padding:1px 6px">E</span>':''].join(' ');
        h+=`<tr><td class="tnum"><span class="dd-link" data-id="${u.id}" style="color:var(--blue);font-weight:700;cursor:pointer">${u.id}</span></td><td>${(u.name||'—').replace(/</g,'&lt;')}</td><td><span class="tag ${rc[u.role]||'t-grey'}">${u.role}</span></td><td>${u.state}</td><td>${u.dev}</td><td class="tnum">${u.signupDay?dayToStr(u.signupDay):'—'}</td><td style="text-align:right" class="tnum">${num(u.placed)}</td><td style="text-align:right" class="tnum">${num(u.completed)}</td><td style="text-align:right" class="tnum">${num(u.received)}</td><td>${_tierName(u.gopherType)}</td><td>${badges||'—'}</td></tr>`;});
      h+='</tbody></table>';
      uwrap.innerHTML=scoped.length?h:'<div style="padding:50px;text-align:center;color:var(--muted)">No users match these filters.</div>';
      if(scoped.length>show.length) uwrap.insertAdjacentHTML('beforeend',`<div style="padding:12px 16px;color:var(--muted);font-size:12px;border-top:1px solid var(--line-2)">Showing first ${show.length} of ${num(scoped.length)}. Export for the full set.</div>`);
      uwrap.querySelectorAll('.dd-link').forEach(b=>b.onclick=()=>openUserDetail(b.dataset.id));
    }
    const UANAC=[C.green,C.blue,C.violet,C.amber,C.red,'#14b8a6','#0ea5e9','#f97316','#ec4899','#84cc16'];
    function renderUAnalysis(rows,pre){
      const box=$('#u-analysis');if(!box)return;
      if(!uAna){box.innerHTML='';return;}
      const {arr,val}=pre||iqAggregateU(rows,uAna);
      const topN=arr.slice(0,uAna.n);
      if(!topN.length){box.innerHTML=`<div class="card"><div style="font-size:13px;color:var(--muted)">No data to rank by ${uAna.dimLabel} for this question.</div></div>`;return;}
      const max=val(topN[0])||1;
      const totalAll=arr.reduce((a,e)=>a+val(e),0),topSum=topN.reduce((a,e)=>a+val(e),0);
      const dd=topN.map((e,i)=>({label:e.k,value:val(e),color:UANAC[i%UANAC.length]}));
      if(totalAll>topSum)dd.push({label:'Other',value:totalAll-topSum,color:'#cbd5e1'});
      const cardEl=el('div','card');
      cardEl.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span style="width:7px;height:7px;border-radius:50%;background:${C.green};display:inline-block"></span><span style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:800">iQ answer</span><button class="btn" id="uana-x" style="margin-left:auto;padding:4px 10px;font-size:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>Export</button></div>
        <h3 style="margin:0 0 2px;font-size:17px">${uAna.asc?'Bottom':'Top'} ${topN.length} ${topN.length>1?uAna.pl:uAna.dimLabel} by ${uAna.metricLabel}</h3>
        <div class="sub" style="margin-bottom:15px">Across the ${num(rows.length)} users matching your question${uAna.dim==='dma'?' · metro areas (DMA), the closest stand-in for city':''}.</div>
        <div class="ana-grid"><div class="ana-list"></div><div class="ana-pie"></div></div>`;
      const list=cardEl.querySelector('.ana-list');
      topN.forEach((e,i)=>{const row=el('div');row.style.cssText='display:flex;align-items:center;gap:11px;margin-bottom:12px';
        row.innerHTML=`<div style="width:23px;height:23px;border-radius:6px;background:${UANAC[i%UANAC.length]}22;color:${UANAC[i%UANAC.length]};font-weight:800;font-size:12px;display:grid;place-items:center;flex:none">${i+1}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${(''+e.k).replace(/"/g,'&quot;')}">${(''+e.k).replace(/</g,'&lt;')}</div><div style="height:6px;background:var(--line-2);border-radius:4px;margin-top:5px;overflow:hidden"><div style="height:100%;width:${val(e)/max*100}%;background:${UANAC[i%UANAC.length]}"></div></div></div>
          <div class="tnum" style="font-weight:800;font-size:14px;white-space:nowrap">${num(val(e))}</div>`;
        list.appendChild(row);});
      const pie=cardEl.querySelector('.ana-pie');
      pie.appendChild(donut(dd,{size:184,thick:30,center:num(topSum),centerSub:'top '+topN.length}));
      const lg=el('div');lg.style.cssText='display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;margin-top:10px';
      lg.innerHTML=dd.map(d=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:9px;height:9px;border-radius:2px;background:${d.color};flex:none"></span>${(''+d.label).length>18?(''+d.label).slice(0,18)+'…':d.label}</span>`).join('');
      pie.appendChild(lg);
      box.innerHTML='';box.appendChild(cardEl);
      const x=$('#uana-x');if(x)x.onclick=()=>exportCSV(arr.map((e,i)=>({rank:i+1,[uAna.dimLabel]:e.k,users:e.users,gophers:e.gophers,requesters:e.requesters,completed_jobs:e.completed,placed_requests:e.placed,logins:e.logins})),'gopher_'+(uAna.asc?'bottom':'top')+'_'+uAna.dim+'_by_'+uAna.metric);
    }
    function runIQ(text){const {F:nf,chips,warn}=iqParseUsers(text);UF=Object.assign(UF,nf);uAna=iqAnalysisUsers(text);renderChips(chips);
      const wb=$('#uiq-warn');if(wb){wb.innerHTML=(warn&&warn.length)?`<div style="background:rgba(217,119,87,.14);border:1px solid rgba(217,119,87,.35);color:#b85c3c;border-radius:9px;padding:8px 11px;font-size:12px;font-weight:600">⚠ Couldn't apply: ${warn.join('; ')}. Showing results for the conditions iQ could match.</div>`:'';}
      syncControls();urender();}

    setTimeout(()=>{ if(!v.isConnected)return;
      $('#uiq-go').onclick=()=>runIQ($('#uiq-q').value);
      $('#uiq-q').onkeydown=e=>{if(e.key==='Enter')runIQ($('#uiq-q').value);};
      v.querySelectorAll('.iq-eg').forEach(s=>s.onclick=()=>{$('#uiq-q').value=s.textContent;runIQ(s.textContent);});
      $('#u-q').oninput=e=>{UF.q=e.target.value.trim();urender();};
      $('#u-role').onchange=e=>{UF.role=e.target.value;urender();};
      $('#u-state').onchange=e=>{UF.state=e.target.value;urender();};
      $('#u-ver').onchange=e=>{UF.ver=e.target.value;urender();};
      $('#u-act').onchange=e=>{UF.act=e.target.value;urender();};
      $('#u-dev').onchange=e=>{UF.dev=e.target.value;urender();};
      $('#u-tier').onchange=e=>{UF.tier=e.target.value;urender();};
      if($('#u-status'))$('#u-status').onchange=e=>{UF.status=e.target.value;if(UF.status==='all'){UF.deactFrom=null;UF.deactTo=null;}urender();};
      $('#u-export').onclick=()=>exportCSV(uLast.map(u=>({
        user_id:u.id, name:u.name, email:u.email, phone:u.phone||'', role:u.role, status:u.status,
        gopher_tier:_tierName(u.gopherType), state:u.state, city:u.city||'', zip:u.zip||'',
        address_1:u.addr1||'', address_2:u.addr2||'', date_of_birth:u.dob||'', device:u.dev,
        acquisition_source:u.source, signup_date:u.signupDay?dayToStr(u.signupDay):'',
        deactivation_date:u.deactDay?dayToStr(u.deactDay):'', login_count:u.logins,
        placed_requests:u.placed, completed_requests:u.completed, jobs_completed_as_gopher:u.received,
        email_verified:u.emailV?'yes':'no', trustshield_verified:u.trustshield?'yes':'no',
        stripe_gopher_verified:u.stripeG?'yes':'no', stripe_requester_verified:u.stripeR?'yes':'no'
      })),'gopher_users_filtered');
      urender();
    },0);
  }
  // User + Worker behavior trends — below User records (baked by regen_user_trends.py each refresh)
  if(window.renderUserTrends)v.appendChild(window.renderUserTrends());
  if(window.renderWorkerTrends)v.appendChild(window.renderWorkerTrends());
  return v;
};

/* ========== REVENUE ========== */
VIEWS.revenue=()=>{
  const v=el('div');const fo=gfOrders();const t=gfTotals(fo);const m=monthly();
  const gn=gfNote();if(gn)v.appendChild(gn);
  const k=el('div','row kpis');
  k.appendChild(kpi(gfActive()?'GMV (filtered)':'Lifetime GMV',money(t.gmv),`${num(t.completed)} completed orders`,{dot:C.green,spark:m.slice(-12).map(d=>d.gmv)}));
  k.appendChild(kpi('Net revenue',money(t.net_rev),'fees after Stripe',{dot:C.blue,spark:m.slice(-12).map(d=>d.net)}));
  k.appendChild(kpi('Take rate',t.take_rate+'%','net revenue ÷ GMV',{dot:C.violet}));
  k.appendChild(kpi('Net / order',moneyFull(t.avg_net),'avg per completed order',{dot:C.amber}));
  v.appendChild(k);

  // GMV + net dual line
  const lc=lineChart([
    {name:'GMV',color:C.green,data:m.map(d=>({x:monShort(d.ym),y:d.gmv}))},
  ],{h:230,area:true,money:true});
  const gmvCard=card('GMV by month','Gross marketplace value of completed orders.',lc);

  const lc2=lineChart([
    {name:'Net',color:C.blue,data:m.map(d=>({x:monShort(d.ym),y:d.net}))},
  ],{h:230,area:true,money:true});
  const netCard=card('Net revenue by month','What Gopher, Inc. keeps after Stripe.',lc2);
  v.appendChild((()=>{const g=el('div','row g2');g.appendChild(gmvCard);g.appendChild(netCard);return g;})());

  // fee composition
  const fees=gfActive()?gfFees(fo):M.fees;
  const fd=donut([
    {label:'Instant transfer (8%)',value:fees.instant_transfer,color:C.green},
    {label:'Age-restricted fee',value:fees.age_fee,color:C.red},
    {label:'Gopher fee',value:fees.gopher_fee,color:C.blue},
  ],{center:money(fees.instant_transfer+fees.age_fee+fees.gopher_fee),centerSub:'GROSS FEES'});
  const fw=el('div');const fh=el('div');fh.style.cssText='display:flex;justify-content:center';fh.appendChild(fd);fw.appendChild(fh);
  fw.appendChild(legend([
    {label:`Instant transfer · ${money(fees.instant_transfer)}`,color:C.green},
    {label:`Age-restricted · ${money(fees.age_fee)}`,color:C.red},
    {label:`Gopher fee · ${money(fees.gopher_fee)}`,color:C.blue},
  ]));
  fw.appendChild(el('div','note',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>Instant-transfer fees dominate revenue — gophers want fast payouts. Lifetime, Stripe takes ${money(M.fees.stripe)} and promos cost ${money(M.fees.promo)}.`));
  const feeCard=card('Where revenue comes from','Gross fees on completed orders, before Stripe.',fw);

  // by category financials
  const cats=(gfActive()?gfByCategory(fo):M.by_category).filter(c=>c.completed>0).sort((a,b)=>b.gmv-a.gmv);
  const tb=el('div','card pad0');
  tb.innerHTML=`<div class="card-h" style="padding:18px 18px 8px"><div><h3>Economics by category</h3><div class="sub">Where the money actually is.</div></div></div>`;
  let h='<table><thead><tr><th>Category</th><th style="text-align:right">Completed</th><th style="text-align:right">Completion</th><th style="text-align:right">GMV</th><th style="text-align:right">Net rev</th></tr></thead><tbody>';
  cats.forEach(c=>{h+=`<tr><td style="font-weight:700">${c.cat}</td><td style="text-align:right" class="tnum">${num(c.completed)}</td><td style="text-align:right"><span class="tag ${c.comp_rate<25?'t-red':c.comp_rate<35?'t-amber':'t-green'}">${c.comp_rate}%</span></td><td style="text-align:right" class="tnum">${money(c.gmv)}</td><td style="text-align:right" class="tnum" style="font-weight:700">${money(c.net)}</td></tr>`;});
  h+='</tbody></table>';const w=el('div');w.innerHTML=h;tb.appendChild(w);
  v.appendChild((()=>{const g=el('div','row g2');g.appendChild(feeCard);g.appendChild(tb);return g;})());
  return v;
};
