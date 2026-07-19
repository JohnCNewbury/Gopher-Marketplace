/* ============ VIEWS ============ */
const VIEWS={};

function kpi(lab,val,meta,opts={}){
  const c=el('div','card kpi');
  c.innerHTML=`<div class="lab"><span class="dot" style="background:${opts.dot||C.green}"></span>${lab}</div>
    <div class="val tnum">${val}</div>
    <div class="meta">${meta||''}</div>`;
  if(opts.spark){const s=el('div','spark');s.appendChild(spark(opts.spark,opts.dot||C.green));c.appendChild(s);}
  return c;
}
function trendTag(v){const cls=v>0.5?'up':v<-0.5?'down':'flat';const ar=v>0.5?'▲':v<-0.5?'▼':'■';return `<span class="trend ${cls}">${ar} ${Math.abs(v).toFixed(1)}%</span>`;}

/* ---- global filter engine (topbar Range / Market / Platform) ---- */
window.GF={range:'all',market:'all',platform:'all'};
function gfOrders(){
  let r=ORD; const F=window.GF||{};
  if(F.market&&F.market!=='all') r=r.filter(o=>o.state===F.market);
  if(F.platform&&F.platform!=='all'&&F.platform!=='Request') r=r.filter(()=>false);
  if(F.range&&F.range!=='all'){const mx=ORD.reduce((a,o)=>o.day>a?o.day:a,0);const cut=mx-(+F.range)*30;r=r.filter(o=>o.day>=cut);}
  return r;
}
function gfActive(){const F=window.GF||{};return (F.range&&F.range!=='all')||(F.market&&F.market!=='all')||(F.platform&&F.platform!=='all');}
function gfLabel(){const F=window.GF||{};const p=[];if(F.market&&F.market!=='all')p.push(F.market);if(F.platform&&F.platform!=='all')p.push(F.platform);if(F.range&&F.range!=='all')p.push('last '+F.range+' mo');return p.length?p.join(' · '):'all data';}
function gfTotals(rows){
  const c=rows.filter(o=>o.status==='delivered'),ca=rows.filter(o=>o.status==='cancelled'),ex=rows.filter(o=>o.status==='expired');
  const gmv=c.reduce((a,o)=>a+o.total,0),net=c.reduce((a,o)=>a+o.net,0);
  return {orders:rows.length,completed:c.length,cancelled:ca.length,expired:ex.length,
    completion_rate:rows.length?+(c.length/rows.length*100).toFixed(1):0,
    gmv:Math.round(gmv),net_rev:Math.round(net),take_rate:gmv?+(net/gmv*100).toFixed(1):0,
    aov:c.length?+(gmv/c.length).toFixed(2):0,avg_net:c.length?+(net/c.length).toFixed(2):0,
    age_restricted_share:rows.length?+(rows.filter(o=>o.ar).length/rows.length*100).toFixed(1):0};
}
function gfMonthly(rows){
  const mp={};rows.forEach(o=>{const k=ymOf(o.day);(mp[k]=mp[k]||{ym:k,requests:0,completed:0,gmv:0,net:0,comp_rate:0});mp[k].requests++;if(o.status==='delivered'){mp[k].completed++;mp[k].gmv+=o.total;mp[k].net+=o.net;}});
  return Object.values(mp).sort((a,b)=>a.ym<b.ym?-1:1).map(d=>{d.comp_rate=d.requests?+(d.completed/d.requests*100).toFixed(1):0;return d;});
}
function gfByCategory(rows){
  const mp={};rows.forEach(o=>{(mp[o.cat]=mp[o.cat]||{cat:o.cat,orders:0,completed:0,gmv:0,net:0});mp[o.cat].orders++;if(o.status==='delivered'){mp[o.cat].completed++;mp[o.cat].gmv+=o.total;mp[o.cat].net+=o.net;}});
  return Object.values(mp).map(d=>({...d,comp_rate:d.orders?+(d.completed/d.orders*100).toFixed(1):0})).sort((a,b)=>b.orders-a.orders);
}
function gfNote(){ if(!gfActive())return null; return el('div','note',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>Filtered to <b>${gfLabel()}</b> — order metrics on this page reflect the filter. User/supply counts (signups, verification) are lifetime and don't move with these filters.`); }
function gfFees(rows){const d=rows.filter(o=>o.status==='delivered');return {gopher_fee:Math.round(d.reduce((a,o)=>a+o.gopherFee,0)),age_fee:Math.round(d.reduce((a,o)=>a+o.arf,0)),instant_transfer:Math.round(d.reduce((a,o)=>a+o.itf,0))};}
function gfStatusTrend(rows){
  const mp={};rows.forEach(o=>{const k=ymOf(o.day);(mp[k]=mp[k]||{ym:k,delivered:0,cancelled:0,expired:0});if(mp[k][o.status]!=null)mp[k][o.status]++;});
  return Object.values(mp).sort((a,b)=>a.ym<b.ym?-1:1);
}
/* ---- helper: monthly slice respecting global filter ---- */
function monthly(){return gfMonthly(gfOrders());}

/* ---- current-period engine (current-first, lifetime-second) ----
   Trailing-30-day + prior-30-day totals, anchored to the newest order day in the export.
   Respects Market/Platform filters but ignores Range — used for headline KPIs when the
   user hasn't picked an explicit Range (GF.range==='all'). */
function cur30(){
  let r=ORD; const F=window.GF||{};
  if(F.market&&F.market!=='all') r=r.filter(o=>o.state===F.market);
  if(F.platform&&F.platform!=='all'&&F.platform!=='Request') r=r.filter(()=>false);
  // Anchor to the last COMPLETE day — the export's newest day is partial (Snapshot convention).
  const last=ORD.reduce((a,o)=>o.day>a?o.day:a,0)-1;
  return {cur:gfTotals(r.filter(o=>o.day>last-30&&o.day<=last)),prev:gfTotals(r.filter(o=>o.day>last-60&&o.day<=last-30))};
}
function d30(cur,prev){if(!prev)return '';return trendTag((cur-prev)/prev*100)+' vs prior 30d';}

/* ========== OVERVIEW ========== */
VIEWS.overview=()=>{
  const v=el('div');
  const fo=gfOrders(); const t=gfTotals(fo);
  const mm=gfMonthly(fo); const last=mm[mm.length-1]||{requests:0,completed:0}, prev=mm[mm.length-2]||{requests:0,completed:0};
  const reqTr=prev.requests?(last.requests-prev.requests)/prev.requests*100:0;
  const compTr=prev.completed?(last.completed-prev.completed)/prev.completed*100:0;

  const gn=gfNote();if(gn)v.appendChild(gn);

  // ---- finance-derived unit economics (from the Truist master file + any Financials uploads) ----
  let FINx={expenses:[]};try{FINx=JSON.parse(localStorage.getItem('gopher_financials')||'{"expenses":[]}');}catch(e){}
  const EXP=M._expenses;
  const baseRows=(EXP&&EXP.fin_rows)?EXP.fin_rows.map(r=>({month:r.month,bucket:r.bucket,amount:r.amount})):[];
  const allFinExp=baseRows.concat(FINx.expenses||[]);
  let cash=0;try{cash=+(localStorage.getItem('gopher_cash_on_hand')||0)||0;}catch(e){}
  const finMonths=[...new Set(allFinExp.map(e=>e.month).filter(Boolean))].sort();
  const finSet=new Set(finMonths);
  const sumB=b=>allFinExp.filter(e=>!b||e.bucket===b).reduce((a,e)=>a+(+e.amount||0),0);
  const smSpend=sumB('Sales & Marketing'),cogsSpend=sumB('Cost of revenue'),totalExp=sumB(null);
  let finRev=0;if(finMonths.length)ORD.forEach(o=>{if(o.status==='delivered'&&finSet.has(ymOf(o.day)))finRev+=o.net;});
  const newCust=finMonths.length?M.signups.filter(s=>finSet.has(s.ym)).reduce((a,s)=>a+s.Requester+s.Both,0):0;
  const cac=(smSpend>0&&newCust>0)?smSpend/newCust:null;
  const cm=(finRev>0&&allFinExp.length)?((finRev-cogsSpend)/finRev*100):null;
  let burn=null;
  if(EXP&&EXP.months&&EXP.months.length){const m3=EXP.months.slice(-3);const opex3=m3.reduce((a,m)=>a+(EXP.by_month[m]||0),0)/(m3.length||1);
    const revM={};ORD.forEach(o=>{if(o.status==='delivered'){const k=ymOf(o.day);revM[k]=(revM[k]||0)+o.net;}});
    const rev3=m3.reduce((a,m)=>a+(revM[m]||0),0)/(m3.length||1);burn=opex3-rev3;}
  else if(allFinExp.length){burn=(totalExp-finRev)/(finMonths.length||1);}
  const runway=(cash>0&&burn>0)?cash/burn:null;
  const O=M._ops||{};
  const macTr=O.mac_prev?(O.mac-O.mac_prev)/O.mac_prev*100:0;
  const wawTr=O.waw_prev?(O.waw-O.waw_prev)/O.waw_prev*100:0;
  const rc=(M._gamechanger||{}).repeat_rate||0;
  const kgrp=tt=>{const d=el('div');d.style.cssText='font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:800;margin:6px 2px 3px';d.textContent=tt;return d;};
  const finHint=(M._expenses?'From master file':'Add data in Financials');

  // Row 1 — Marketplace (current-first: last 30 days headline, lifetime as context)
  v.appendChild(kgrp('Marketplace'));
  const k1=el('div','row kpis');
  if(!gfActive()){
    const {cur,prev}=cur30();
    k1.appendChild(kpi('GMV · last 30 days',money(cur.gmv),`${d30(cur.gmv,prev.gmv)} · lifetime ${money(t.gmv)}`,{dot:C.green,spark:mm.slice(-12).map(d=>d.gmv)}));
    k1.appendChild(kpi('Revenue · last 30 days',money(cur.net_rev),`${d30(cur.net_rev,prev.net_rev)} · lifetime ${money(t.net_rev)}`,{dot:C.blue,spark:mm.slice(-12).map(d=>d.net)}));
    k1.appendChild(kpi('Completed · last 30 days',num(cur.completed),`of ${num(cur.orders)} placed · lifetime ${num(t.completed)}`,{dot:C.green,spark:mm.slice(-12).map(d=>d.completed)}));
    k1.appendChild(kpi('Completion · last 30 days',cur.completion_rate+'%',`prior 30d ${prev.completion_rate}% · lifetime ${t.completion_rate}%`,{dot:C.amber,spark:mm.slice(-12).map(d=>d.comp_rate)}));
  } else {
    k1.appendChild(kpi('GMV (filtered)',money(t.gmv),`${num(t.completed)} completed orders`,{dot:C.green,spark:mm.slice(-12).map(d=>d.gmv)}));
    k1.appendChild(kpi('Revenue',money(t.net_rev),`${t.take_rate}% take · ${money(t.avg_net)}/order`,{dot:C.blue,spark:mm.slice(-12).map(d=>d.net)}));
    k1.appendChild(kpi('Completed requests',num(t.completed),`of ${num(t.orders)} placed`,{dot:C.green,spark:mm.slice(-12).map(d=>d.completed)}));
    k1.appendChild(kpi('Completion rate',t.completion_rate+'%','delivered ÷ all requests',{dot:C.amber,spark:mm.slice(-12).map(d=>d.comp_rate)}));
  }
  v.appendChild(k1);

  // Row 2 — Customers & workers
  v.appendChild(kgrp('Customers & workers'));
  const k2=el('div','row kpis');
  k2.appendChild(kpi('Monthly active customers',num(O.mac||0),trendTag(macTr)+' · last 30 days',{dot:C.blue,spark:(O.mac_series||[]).map(d=>d.v)}));
  k2.appendChild(kpi('Weekly active workers',num(O.waw||0),trendTag(wawTr)+' · last 7 days',{dot:C.green,spark:(O.waw_series||[]).map(d=>d.v)}));
  k2.appendChild(kpi('Repeat customer rate',rc+'%','customers with ≥2 orders',{dot:C.violet}));
  k2.appendChild(kpi('Orders per active customer',String(O.orders_per_active_cust||0),'last 30 days',{dot:C.amber,spark:(O.opac_series||[]).map(d=>d.v)}));
  v.appendChild(k2);

  // Row 3 — Operations & unit economics
  v.appendChild(kgrp('Operations & unit economics'));
  const k3=el('div','row kpis');
  k3.appendChild(kpi('Time to match',(O.ttm_med||0)+' min','median accept time · '+(O.ttm_med90||0)+'m last 90d',{dot:C.blue,spark:(O.ttm_series||[]).map(d=>d.v)}));
  k3.appendChild(kpi('CAC',cac!=null?money(cac):'—',cac!=null?'S&M spend ÷ new customers':finHint,{dot:C.amber}));
  k3.appendChild(kpi('Contribution margin',cm!=null?Math.round(cm)+'%':'—',cm!=null?'net rev − cost of revenue':finHint,{dot:C.green}));
  const runwayKpi=kpi('Cash runway',runway!=null?runway.toFixed(1)+' mo':((cash>0&&burn!=null&&burn<=0)?'Positive':'—'),runway!=null?'at current monthly burn':((cash>0&&burn!=null&&burn<=0)?'cash-flow positive':'Set cash on hand →'),{dot:(runway!=null&&runway<6)?C.red:C.violet});
  runwayKpi.style.cursor='pointer';runwayKpi.id='kpi-runway';
  k3.appendChild(runwayKpi);
  v.appendChild(k3);

  // requests vs completed trend
  const m=monthly();
  const lc=lineChart([
    {name:'Requests',color:C.blue,data:m.map(d=>({x:monShort(d.ym),y:d.requests}))},
    {name:'Completed',color:C.green,data:m.map(d=>({x:monShort(d.ym),y:d.completed})),},
  ],{h:240,area:true});
  const trendCard=card('Requests vs. completed orders','The widening gap is the single most important chart at Gopher.',lc,{right:el('div',null,`<span class="tag t-blue">Req ${trendTag(reqTr).replace(/<[^>]+>/g,'')}</span>`)});
  trendCard.appendChild(legend([{label:'Requests placed',color:C.blue},{label:'Orders completed',color:C.green}]));

  // status mix donut
  const dn=donut([
    {label:'Completed',value:t.completed,color:C.green},
    {label:'Cancelled',value:t.cancelled,color:C.red},
    {label:'Expired',value:t.expired,color:C.amber},
  ],{center:t.completion_rate+'%',centerSub:'COMPLETED'});
  const dwrap=el('div',null);const dh=el('div');dh.style.cssText='display:flex;justify-content:center';dh.appendChild(dn);dwrap.appendChild(dh);
  dwrap.appendChild(legend([
    {label:`Completed · ${num(t.completed)}`,color:C.green},
    {label:`Cancelled · ${num(t.cancelled)}`,color:C.red},
    {label:`Expired (no gopher) · ${num(t.expired)}`,color:C.amber},
  ]));
  const g=el('div','row g23');g.appendChild(trendCard);g.appendChild(card('Where requests end up','Lifetime order outcomes.',dwrap));
  v.appendChild(g);

  // marketplace liquidity — demand vs supply activity
  const macS=(O.mac_series||[]),wawS=(O.waw_series||[]);
  if(macS.length){
    const macChart=lineChart([{name:'MAC',color:C.blue,data:macS.map(d=>({x:monShort(d.ym),y:d.v}))}],{h:200,area:true});
    const wawChart=lineChart([{name:'WAW',color:C.green,data:wawS.map(d=>({x:monShort(d.ym),y:d.v}))}],{h:200,area:true});
    const gl=el('div','row g2');
    gl.appendChild(card('Active customers · monthly','Distinct requesters placing an order each month — demand-side liquidity.',macChart));
    gl.appendChild(card('Active workers · monthly','Distinct gophers completing a job each month — supply-side liquidity.',wawChart));
    v.appendChild(gl);
  }

  // bottom: category + quick stats
  const cats=gfByCategory(fo).slice(0,6);
  const bl=el('div','barlist');const maxc=Math.max(1,...cats.map(c=>c.orders));
  cats.forEach(c=>{const it=el('div','it');it.innerHTML=`<span class="nm">${c.cat}</span><div class="track"><div class="fill" style="width:${c.orders/maxc*100}%;background:${c.comp_rate<25?C.amber:C.green}"></div></div><span class="v">${num(c.orders)}<span style="color:var(--muted);font-weight:600"> · ${c.comp_rate}%</span></span>`;bl.appendChild(it);});
  const catCard=card('Requests by category','Bar = volume · number after = completion rate.',bl);

  const sg=el('div',null);
  const stats=[
   ['Avg order value',moneyFull(t.aov),C.green],
   ['Age-restricted share',t.age_restricted_share+'%',C.red],
   ['Activated requesters',num(M.people.placed_request)+' ('+(M.people.placed_request/M.people.total*100).toFixed(0)+'%)',C.blue],
   ['Top market',M.geo_orders[0].state+' · '+M.geo_orders[0].comp_rate+'% done',C.violet],
   ['Referral conversion',M.referrals.rate+'% of '+fmt(M.referrals.invites)+' invites',C.amber],
   ['Avg rating (suspect)',M.ratings.avg+' ★ — 98% are 5★',C.grey],
  ];
  const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:0';
  stats.forEach((s,i)=>{const d=el('div');d.style.cssText='padding:13px 4px;border-bottom:1px solid var(--line-2)'+((i%2===0)?';border-right:1px solid var(--line-2);padding-right:14px':';padding-left:14px');d.innerHTML=`<div style="font-size:11.5px;color:var(--muted);font-weight:700">${s[0]}</div><div style="font-size:17px;font-weight:800;letter-spacing:-.02em;margin-top:3px;color:${s[2]}">${s[1]}</div>`;grid.appendChild(d);});
  sg.appendChild(grid);
  const g2=el('div','row g2');g2.appendChild(catCard);g2.appendChild(card('At a glance','Numbers worth a second look.',sg));
  v.appendChild(g2);
  setTimeout(()=>{ if(!v.isConnected)return;
    const rk=$('#kpi-runway');if(rk)rk.onclick=()=>{const val=prompt('Cash on hand (USD) — used with your Financials burn to compute runway:',cash||(M._expenses&&M._expenses.bank_cash)||'');if(val===null)return;const n=parseFloat((val||'').replace(/[$,]/g,''));try{localStorage.setItem('gopher_cash_on_hand',isNaN(n)?0:n);}catch(e){}gfRerender();};
  },0);
  return v;
};

/* ========== MARKETPLACE HEALTH ========== */
VIEWS.health=()=>{
  const v=el('div');
  const fo=gfOrders(); const t=gfTotals(fo);
  const gn=gfNote();if(gn)v.appendChild(gn);
  // gauge + supply funnel — headline = last 30 days (current health), lifetime = context
  const _h30=gfActive()?null:cur30();
  const _hRate=_h30?_h30.cur.completion_rate:t.completion_rate;
  const gw=el('div','gauge-wrap');const gauges=el('div');gauges.appendChild(gauge(_hRate));
  gw.appendChild(gauges);
  if(_h30){
    const _lost30=_h30.cur.orders-_h30.cur.completed;
    gw.appendChild(el('div',null,`<div class="gauge-num" style="color:${_hRate<40?C.red:C.amber}">${_hRate}%</div><div class="gauge-sub">of requests in the <b>last 30 days</b> completed (${num(_h30.cur.completed)} of ${num(_h30.cur.orders)}; <b>${num(_lost30)}</b> lost to cancellations/expirations). Prior 30d: <b>${_h30.prev.completion_rate}%</b>. Lifetime: <b>${t.completion_rate}%</b> (${num(t.cancelled+t.expired)} lost).</div>`));
  } else {
    gw.appendChild(el('div',null,`<div class="gauge-num" style="color:${t.completion_rate<40?C.red:C.amber}">${t.completion_rate}%</div><div class="gauge-sub">of requests complete. The remaining <b>${num(t.cancelled+t.expired)}</b> are lost to cancellations and expirations (no gopher accepted in time).</div>`));
  }
  // Top-3 cities by completion % (min sample to avoid tiny-N noise); 3 equal cards, highest on the right
  (()=>{
    const agg={};
    fo.forEach(o=>{const c=(o.dcity||'').trim();if(!c)return;const dst=(o.dstate||'').trim();
      const key=c.toLowerCase()+'|'+dst;const a=agg[key]||(agg[key]={city:c,st:dst,n:0,done:0});
      a.n++;if(o.status==='delivered')a.done++;});
    const minN=Math.max(25,Math.round(fo.length*0.005));
    const top=Object.values(agg).filter(a=>a.n>=minN).map(a=>({...a,rate:a.done/a.n*100}))
      .sort((x,y)=>y.rate-x.rate).slice(0,3);
    if(top.length){
      const tc=s=>s.replace(/\w\S*/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());
      // These aggregate over `fo` — lifetime when no Range filter is set, else the filter window.
      // Distinct period from the 30-day gauge above, so label it to avoid a units mismatch.
      const _cityScope=gfActive()?gfLabel():'lifetime';
      gw.appendChild(el('div',null,`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin-top:18px">Top cities by completion · ${_cityScope} <span style="font-weight:600;text-transform:none;letter-spacing:0">(min ${num(minN)} requests)</span></div>`));
      const row=el('div');row.style.cssText='display:flex;gap:8px;margin-top:8px';
      top.slice().reverse().forEach(a=>{
        const cc=el('div');cc.style.cssText='flex:1;text-align:center;border:1px solid var(--line,#e6eaee);border-radius:10px;padding:10px 6px;background:var(--card,#fff)';
        cc.innerHTML=`<div style="font-size:18px;font-weight:800;color:${C.green}">${a.rate.toFixed(1)}%</div>`+
          `<div style="font-size:11.5px;font-weight:700;margin-top:2px">${tc(a.city)}${a.st?', '+a.st:''}</div>`+
          `<div style="font-size:10.5px;color:var(--muted);margin-top:1px">${num(a.done)}/${num(a.n)} completed</div>`;
        row.appendChild(cc);
      });
      gw.appendChild(row);
    }
  })();
  const gCard=card(_h30?'Fulfillment rate · last 30 days':'Fulfillment rate',null,gw);
  gCard.style.minHeight='380px';

  // supply funnel
  const f=M.funnel_gopher;const fw=el('div','funnel');const maxf=f.values[0];
  const cols=[C.violet,C.blue,C.green];
  // sub-metrics: last-6-month gopher signups + % Stripe-verified; Elite/Elite+ (from Pro/Pro+)
  const _maxSU=(typeof USR!=='undefined'&&USR.length)?USR.reduce((m,u)=>u.signupDay>m?u.signupDay:m,0):0;
  const _cut=_maxSU-183; let _g6=0,_g6v=0;
  if(typeof USR!=='undefined')USR.forEach(u=>{if((u.role==='Gopher'||u.role==='Both')&&u.signupDay>=_cut){_g6++;if(u.stripeG)_g6v++;}});
  const _g6pct=_g6?(_g6v/_g6*100):0;
  const _elite=(M.gopher_type&&(M.gopher_type.Elite||M.gopher_type.Pro))||0;
  const _elitePlus=(M.gopher_type&&(M.gopher_type['Elite+']||M.gopher_type['Pro+']))||0;
  f.labels.forEach((l,i)=>{const st=el('div','step');const w=Math.max(10,f.values[i]/maxf*100);
    st.innerHTML=`<div class="fbar" style="width:${w}%;background:${cols[i]}">${num(f.values[i])}</div><div class="fmeta">${l}${i===1?` · <b>${(f.values[i]/maxf*100).toFixed(1)}%</b> of signups`:i>1?` · <b>${(f.values[i]/f.values[i-1]*100).toFixed(1)}%</b> of prior step · <b>${(f.values[i]/maxf*100).toFixed(1)}%</b> of signups`:''}</div>`;
    const ll=(''+l).toLowerCase();
    if(_g6&&ll.includes('stripe')){
      const sub=el('div');sub.style.cssText='font-size:11px;color:var(--muted);margin:3px 0 0 2px';
      sub.innerHTML=`Last 6 mo gopher signups: <b style="color:var(--ink,#1f2933)">${num(_g6)}</b> \u00b7 <b style="color:${C.green}">${_g6pct.toFixed(0)}%</b> Stripe-verified`;
      st.appendChild(sub);
    }
    fw.appendChild(st);});
  // Elite / Elite+ / Pro tiers below "Completed >=1 job". Elite<-Pro, Elite+<-Pro+ (DB gopher_type); Pro tier data at launch.
  const _completed=f.values[f.values.length-1]||0;
  [['Elite',_elite,C.amber],['Elite+',_elitePlus,C.violet]].forEach(pair=>{
    const lab=pair[0],val=pair[1],col=pair[2];const w=Math.max(10,val/maxf*100);
    const pct=_completed?(val/_completed*100).toFixed(1):'0.0';
    const st=el('div','step');
    st.innerHTML=`<div class="fbar" style="width:${w}%;background:${col}">${num(val)}</div><div class="fmeta">${lab} tier · <b>${pct}%</b> of gophers with ≥1 completed job (not a funnel step)</div>`;
    fw.appendChild(st);
  });
  // Pro tier — earmarked; wire when the tier launches (matches dashboard earmark convention)
  (()=>{const st=el('div','step');
    st.innerHTML=`<div class="fbar" style="width:12%;min-width:82px;background:#fff6e0;border:1.5px dashed #e3b341;color:#9a6b00;font-weight:800">Pro</div><div class="fmeta">Pro · <span style="color:#9a6b00;background:#fff6e0;border:1px dashed #e3b341;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;white-space:nowrap">data at launch</span></div>`;
    fw.appendChild(st);})();
  // Top-tier share — total % of top-tier workers among active gophers (standard = remainder)
  const _topTier=_elite+_elitePlus;   // + Pro tier when it launches
  const _topPct=_completed?(_topTier/_completed*100):0;
  (()=>{const s=el('div');s.style.cssText='margin:11px 2px 2px;padding-top:10px;border-top:1px dashed var(--line,#e6eaee);font-size:12px;max-width:360px';
    s.innerHTML=`<span style="font-weight:800;font-size:15px;color:${C.violet}">${_topPct.toFixed(1)}%</span> <span style="color:var(--muted)">of gophers who have ever completed a job are top-tier (Elite + Elite+)${_topTier?` \u2014 <b>${num(_topTier)}</b> of ${num(_completed)}`:''}. Standard gophers are the remainder.</span>`;
    fw.appendChild(s);})();
  const supCard=card('Supply activation','Most gophers sign up and never complete a job — the leak that starves demand.',fw);
  v.appendChild((()=>{const g=el('div','row g2');g.appendChild(gCard);g.appendChild(supCard);return g;})());

  // SUPPLY · DENSITY DRIVES GMV — total workers vs workers with >=1 completed job + completion rate by DMA (live)
  (()=>{
    const _dmaShort=s=>{let x=(''+s).split(/[-(]/)[0].trim();return x.replace(/\w\S*/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase());};
    const agg={};
    fo.forEach(o=>{const dm=(o.dma||'').trim();if(!dm)return;const a=agg[dm]||(agg[dm]={dma:dm,n:0,done:0,acc:new Set(),comp:new Set()});
      a.n++;if(o.gopherId)a.acc.add(o.gopherId);if(o.status==='delivered'){a.done++;if(o.gopherId)a.comp.add(o.gopherId);}});
    const rows=Object.values(agg).map(a=>({dma:a.dma,total:a.acc.size,comp:a.comp.size,rate:a.n?a.done/a.n*100:0}))
      .filter(a=>a.total>0).sort((x,y)=>y.total-x.total).slice(0,6);
    if(rows.length){
      const maxW=rows[0].total||1;
      const wrap=el('div');wrap.style.cssText='padding:6px 2px 2px';
      rows.forEach(a=>{
        const tw=Math.max(8,a.total/maxW*100), cw=Math.max(6,a.comp/maxW*100);
        const rateCol=a.rate>=40?C.green:a.rate>=30?C.amber:C.red;
        const r=el('div');r.style.cssText='display:flex;align-items:center;gap:10px;margin:10px 0';
        r.innerHTML=`<div style="width:104px;text-align:right;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_dmaShort(a.dma)}</div>`+
          `<div style="flex:1">`+
            `<div style="display:flex;align-items:center;gap:7px"><div style="width:${tw}%;min-width:50px;box-sizing:border-box;background:transparent;border:1.5px solid ${C.green};border-radius:6px;padding:2px 9px;color:${C.green};font-weight:800;font-size:11px">${num(a.total)}</div><span style="font-size:10.5px;color:var(--muted)">total</span></div>`+
            `<div style="display:flex;align-items:center;gap:7px;margin-top:3px"><div style="width:${cw}%;min-width:40px;box-sizing:border-box;background:${C.green};border-radius:6px;padding:2px 9px;color:#fff;font-weight:800;font-size:11px">${num(a.comp)}</div><span style="font-size:10.5px;color:var(--muted)">\u22651 job</span></div>`+
          `</div>`+
          `<div style="width:52px;text-align:right;font-size:13px;font-weight:800;color:${rateCol}">${a.rate.toFixed(1)}%</div>`;
        wrap.appendChild(r);
      });
      v.appendChild(card('Supply density drives GMV','Per DMA: total workers who took a job (outlined) vs workers with \u22651 completed job (filled), and completion rate (right). Denser, more-productive supply completes more.',wrap));
    }
  })();

  // status trend stacked
  const rows=gfStatusTrend(fo).map(d=>({label:monShort(d.ym),delivered:d.delivered,cancelled:d.cancelled,expired:d.expired}));
  const sc=stackChart(rows,['delivered','cancelled','expired'],[C.green,C.red,C.amber],{h:250});
  const scCard=card('Order outcomes over time','Stacked monthly volume — green should be growing, not shrinking.',sc);
  scCard.appendChild(legend([{label:'Delivered',color:C.green},{label:'Cancelled',color:C.red},{label:'Expired',color:C.amber}]));
  v.appendChild(scCard);

  // marketplace signals
  const mk=M.marketplace;
  const sig=el('div','row g3');
  sig.appendChild(kpi('Gopher offers',num(mk.offers),`${num(mk.offers_accepted)} accepted by the requester · ${(mk.offers_accepted/mk.offers*100).toFixed(0)}% of offers · lifetime`,{dot:C.green}));
  sig.appendChild(kpi('Order declines',num(mk.declines),'requests gophers explicitly declined · lifetime',{dot:C.red}));
  sig.appendChild(kpi('Counter-offers',num(mk.counters),`${num(mk.counters_accepted)} accepted by the requester · ${(mk.counters_accepted/mk.counters*100).toFixed(0)}% of counters · lifetime`,{dot:C.amber}));
  v.appendChild(sig);

  // geo health table — windowed from the filtered orders; baked lifetime when no filter set
  const geo=gfActive()
    ? (()=>{const m={};fo.forEach(o=>{const s=o.state;if(!s||s==='—')return;const a=m[s]||(m[s]={state:s,orders:0,completed:0,gmv:0});a.orders++;if(o.status==='delivered'){a.completed++;a.gmv+=o.total;}});
        return Object.values(m).map(a=>({...a,comp_rate:a.orders?+(a.completed/a.orders*100).toFixed(1):0})).sort((x,y)=>y.orders-x.orders).slice(0,12);})()
    : M.geo_orders;
  const tb=el('div','card pad0');
  tb.innerHTML=`<div class="card-h" style="padding:18px 18px 10px"><div><h3>Fulfillment by market</h3><div class="sub">Completion rate tells you where supply is thin${gfActive()?' · '+gfLabel():''}.</div></div></div>`;
  const wrap=el('div','tbl-wrap');wrap.style.maxHeight='340px';
  let html='<table><thead><tr><th>Market</th><th style="text-align:right">Requests</th><th style="text-align:right">Completed</th><th style="text-align:right">Completion</th><th style="text-align:right">GMV</th></tr></thead><tbody>';
  geo.forEach(g=>{const cls=g.comp_rate<25?'t-red':g.comp_rate<35?'t-amber':'t-green';
    html+=`<tr><td style="font-weight:700">${g.state}</td><td style="text-align:right" class="tnum">${num(g.orders)}</td><td style="text-align:right" class="tnum">${num(g.completed)}</td><td style="text-align:right"><span class="tag ${cls}">${g.comp_rate}%</span></td><td style="text-align:right" class="tnum">${money(g.gmv)}</td></tr>`;});
  html+='</tbody></table>';wrap.innerHTML=html;tb.appendChild(wrap);
  v.appendChild(tb);
  return v;
};

/* ========== ORDER ENGINE (decodes all 60k orders for exact filtering) ========== */
const OF = M.orders_full;
const OF_BASE = new Date(OF.base+'T00:00:00Z');
const dayToStr = d=>new Date(OF_BASE.getTime()+d*86400000).toISOString().slice(0,10);
const dayToYear = d=>new Date(OF_BASE.getTime()+d*86400000).getUTCFullYear();
const _MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function parseOrdDt(s){if(!s)return null;const m=(''+s).match(/(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i);if(!m)return null;let hh=+m[4];if(m[6]){const ap=m[6].toUpperCase();if(ap==='PM'&&hh<12)hh+=12;if(ap==='AM'&&hh===12)hh=0;}return new Date(+m[3],+m[1]-1,+m[2],hh,+m[5]);}
const _dInt=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const fmtSchedDT=d=>_MON[d.getMonth()]+' '+d.getDate()+', '+((d.getHours()%12)||12)+':'+(''+d.getMinutes()).padStart(2,'0')+(d.getHours()<12?' AM':' PM');
const fmtDateShort=d=>_MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();
function timingPref(o){
  if(!o.scheduled) return 'Need ASAP';
  const cr=parseOrdDt(o.created), sc=parseOrdDt(o.scheduled);
  if(cr&&sc){const h=(sc-cr)/3600000;
    if(Math.abs(h-24)<=2) return 'Flexible - 24 hours';
    if(Math.abs(h-168)<=6) return 'Flexible - 7 days';
    if(Math.abs(h-336)<=12) return 'Flexible - 2 weeks';
    return fmtSchedDT(sc);}
  return o.scheduled;
}
function expiringOn(o){
  if(!o.scheduled) return '';
  const sc=parseOrdDt(o.scheduled); if(!sc) return '';
  if(_dInt(sc) < TODAY_INT) return '';   // already passed
  return fmtDateShort(sc);
}
const ORD = (()=>{
  const L=OF.legend;
  const ZD=M._zipdma||{}, ZN=M._dmaNames||[];
  const zdma=z=>{const k=(''+(z||'')).trim().slice(0,5).padStart(5,'0');const i=ZD[k];return i==null?'':ZN[i];};
  return OF.rows.map(r=>({id:r[0],day:r[1],year:dayToYear(r[1]),status:L.status[r[2]],cat:L.cat[r[3]],h:r[4],w:r[5],
    state:L.state[r[6]]==='??'?'—':L.state[r[6]],dev:L.device[r[7]],ar:!!r[8],total:r[9],net:r[10]/100,
    title:r[11]||'',desc:r[12]||'',req:r[13]||'',gopher:r[14]||'',pay:(L.pay&&L.pay[r[15]])||'',
    itemCost:r[16]||0,offer:r[17]||0,gopherFee:(r[18]||0)/100,arf:(r[19]||0)/100,itf:(r[20]||0)/100,
    dcity:r[21]||'',dstate:r[22]||'',dzip:r[23]||'',reqId:r[24]||0,gopherId:r[25]||0,dma:zdma(r[23]),
    offerC:(r[26]||0)/100,itemCostC:(r[27]||0)/100,totalC:(r[28]||0)/100,tshield:(r[29]||0)/100,promoAmt:(r[30]||0)/100,
    promoCode:r[31]||'',gopherType:r[32]||'',pickupFull:r[33]||'',dropFull:r[34]||'',
    created:r[35]||'',inProg:r[36]||'',pickedUp:r[37]||'',completed:r[38]||'',scheduled:r[39]||''}));
})();
const ORD_YEARS=[...new Set(ORD.map(o=>o.year))].filter(y=>y>2000).sort((a,b)=>b-a);
const TODAY_INT=(()=>{const s=dayToStr(ORD.reduce((m,o)=>o.day>m?o.day:m,0));return +s.replace(/-/g,'');})();
const REPEAT_REQ=(()=>{const c=new Map();ORD.forEach(o=>{if(o.reqId)c.set(o.reqId,(c.get(o.reqId)||0)+1);});const s=new Set();c.forEach((n,id)=>{if(n>=2)s.add(id);});return s;})();
function matchKey(key,term){const nk=(''+(key||'')).toLowerCase().replace(/[^a-z0-9]/g,'');const nx=(''+(term||'')).toLowerCase().replace(/[^a-z0-9]/g,'');return nx.length>=2&&(nk.includes(nx)||nx.includes(nk));}
const DOWN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const hourLabel = h=>{const ap=h<12?'am':'pm';let hh=h%12;if(hh===0)hh=12;return hh+ap;};

/* ----- users sample (record-level detail for Users reports) ----- */
const US = M.users_sample;
const USR = (()=>{ if(!US) return [];
  const L=US.legend;
  return US.rows.map(r=>({id:r[0],name:r[1]||'',email:r[2]||'',role:L.role[r[3]],
    state:L.state[r[4]]==='??'?'—':L.state[r[4]],dev:L.device[r[5]],signupDay:r[6],logins:r[7],
    placed:r[8],completed:r[9],received:r[10],gopherType:r[11],
    emailV:!!(r[12]&1),trustshield:!!(r[12]&2),stripeG:!!(r[12]&4),stripeR:!!(r[12]&8),
    source:r[13],status:r[14],zip:r[15]||'',deactDay:r[16]||0,
    phone:r[17]||'',dob:r[18]||'',addr1:r[19]||'',addr2:r[20]||'',city:r[21]||''}));
})();

let _USER_STATUSES=null;
function userStatuses(){
  if(_USER_STATUSES) return _USER_STATUSES;
  const seen={}, out=[];
  for(const u of USR){ const s=(u.status||'').trim(); if(s){ const k=s.toLowerCase(); if(!seen[k]){ seen[k]=1; out.push(s); } } }
  out.sort((a,b)=>(''+a).localeCompare(''+b));
  _USER_STATUSES=out; return out;
}
function _statusLabel(s){ s=''+s; return s.charAt(0).toUpperCase()+s.slice(1); }

let _USER_TIERS=null;
function userTiers(){
  if(_USER_TIERS) return _USER_TIERS;
  const seen={}, out=[];
  for(const u of USR){ const s=(u.gopherType||'').trim(); if(s&&s!=='—'){ const k=s.toLowerCase(); if(!seen[k]){ seen[k]=1; out.push(s); } } }
  const order={'standard':0,'pro':1,'pro+':2,'elite':1,'elite+':2};
  out.sort((a,b)=>{ const oa=order[(''+a).toLowerCase()], ob=order[(''+b).toLowerCase()]; if(oa!=null&&ob!=null)return oa-ob; if(oa!=null)return -1; if(ob!=null)return 1; return (''+a).localeCompare(''+b); });
  _USER_TIERS=out; return out;
}
function _cityNorm(s){ return (''+s).toLowerCase().replace(/[.,]/g,' ').replace(/\bsaint\b/g,'st').replace(/\s+/g,' ').trim(); }
let _USER_CITIES=null;
function userCities(){
  if(_USER_CITIES) return _USER_CITIES;
  var seen={}, out=[];
  for(var i=0;i<USR.length;i++){ var c=(USR[i].city||'').trim(); if(c){ var n=_cityNorm(c); if(n&&!seen[n]){ seen[n]=1; out.push({raw:c,norm:n}); } } }
  _USER_CITIES=out; return out;
}

function applyFilters(F){
  const kw=F.kw?F.kw.toLowerCase():'';
  return ORD.filter(o=>{
    if(F.status!=='all' && o.status!==F.status) return false;
    if(F.cat!=='all' && o.cat!==F.cat) return false;
    if(F.catNot && F.catNot.length && F.catNot.includes(o.cat)) return false;
    if(F.catIn && F.catIn.length && !F.catIn.includes(o.cat)) return false;
    if(F.ar==='yes' && !o.ar) return false;
    if(F.ar==='no' && o.ar) return false;
    if(F.market!=='all' && o.state!==F.market) return false;
    if(F.device!=='all' && o.dev!==F.device) return false;
    if(F.year && F.year!=='all' && o.year!==+F.year) return false;
    if(F.dow!=='all'){
      const wd=o.w; const wknd=(wd===5||wd===6);
      if(F.dow==='weekend'){ if(!wknd) return false; }
      else if(F.dow==='weekday'){ if(wknd) return false; }
      else if(DOWN[wd]!==F.dow) return false;
    }
    if(F.uid!=null && o.reqId!==F.uid) return false;
    if(F.repeat===true && !REPEAT_REQ.has(o.reqId)) return false;
    if(F.repeat==='new' && REPEAT_REQ.has(o.reqId)) return false;
    if(F.gid!=null && o.gopherId!==F.gid) return false;
    if(F.min!=null && o.total<F.min) return false;
    if(F.max!=null && o.total>F.max) return false;
    if(F.h0!=null && F.h1!=null){
      const inWin = F.h0<F.h1 ? (o.h>=F.h0 && o.h<F.h1) : (o.h>=F.h0 || o.h<F.h1);
      if(!inWin) return false;
    }
    if(kw){
      if(!((''+o.id).includes(kw) || o.title.toLowerCase().includes(kw) || o.desc.toLowerCase().includes(kw) || o.req.toLowerCase().includes(kw))) return false;
    }
    return true;
  });
}

/* ---- iQ: plain-English -> filter object + interpretation ---- */
const STATE_NAMES={'north carolina':'NC','florida':'FL','texas':'TX','california':'CA','georgia':'GA','ohio':'OH','tennessee':'TN','new york':'NY','south carolina':'SC','pennsylvania':'PA','virginia':'VA','michigan':'MI','illinois':'IL','arizona':'AZ','washington':'WA','colorado':'CO','massachusetts':'MA','indiana':'IN','maryland':'MD'};
// The seven NAMED service categories. "Other" is the 8th — the catch-all for requests
// that don't fit a defined type. "Outside the standard 7" therefore resolves to Other.
const STD7_CATS=['Delivery / Errand','Junk Removal','Moving','Home / Office Services','Hourly / Day Labor','Yard / Outdoor Projects','Ride Sharing'];
function parseTime(str){
  // returns hour 0-23 from "10pm","10 pm","22","6am","noon","midnight"
  str=str.trim().toLowerCase();
  if(str==='noon')return 12; if(str==='midnight')return 0;
  let m=str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if(!m)return null;
  let h=parseInt(m[1]); const ap=m[3];
  if(ap==='pm'&&h<12)h+=12; if(ap==='am'&&h===12)h=0;
  if(h>23)return null; return h;
}
function iqParse(text){
  const t=' '+text.toLowerCase().replace(/[,]/g,' ')+' ';
  const F={status:'all',cat:'all',catNot:null,catIn:null,ar:'all',market:'all',device:'all',dow:'all',h0:null,h1:null,min:null,max:null,kw:'',year:'all',uid:null,gid:null};
  const chips=[];
  // user / requestor / gopher id (do this BEFORE state matching so "user ID 14" isn't read as Idaho)
  let um=t.match(/\b(?:gopher|driver|worker)\s*(?:id|#)?\s*(\d+)\b/);
  if(um){F.gid=+um[1];chips.push(['Gopher','#'+um[1]]);}
  um=t.match(/\b(?:requestor|requester|customer|user|account)\s*(?:id|#)?\s*(\d+)\b/);
  if(um){F.uid=+um[1];chips.push(['Requestor','user #'+um[1]]);}
  // keyword — quoted term wins, else known item/brand words
  let mk=text.match(/["'\u201c\u2018]([^"'\u201d\u2019]{2,40})["'\u201d\u2019]/);
  if(mk){F.kw=mk[1].trim();chips.push(['Contains','“'+F.kw+'”']);}
  else{const brands=['marlboro','newport','camel','juul','vuse','backwoods','swisher','black & mild','cigarette','cigarettes','vape','beer','wine','liquor','tequila','whiskey','vodka','redbull','grocery'];
    for(const bnd of brands){ if(t.includes(' '+bnd)){F.kw=bnd;chips.push(['Contains','“'+bnd+'”']);break;} }}
  // year / date
  let ym=t.match(/\b(20\d\d)\b/);
  if(ym){F.year=+ym[1];chips.push(['Year',ym[1]]);}
  else if(/\bthis year\b/.test(t)){F.year=ORD_YEARS[0]||2026;chips.push(['Year',''+F.year]);}
  else if(/\blast year\b/.test(t)){F.year=(ORD_YEARS[0]||2026)-1;chips.push(['Year',''+F.year]);}
  // status
  if(/\b(complete|completed|delivered|finished|fulfilled)\b/.test(t)){F.status='delivered';chips.push(['Status','Completed']);}
  else if(/\b(cancel|cancelled|canceled)\b/.test(t)){F.status='cancelled';chips.push(['Status','Cancelled']);}
  else if(/\b(expired|expire|timed out|no.?show)\b/.test(t)){F.status='expired';chips.push(['Status','Expired']);}
  // category
  const catmap=[['moving','Moving'],['move','Moving'],['junk','Junk Removal'],['yard','Yard / Outdoor Projects'],['landscap','Yard / Outdoor Projects'],['lawn','Yard / Outdoor Projects'],['outdoor','Yard / Outdoor Projects'],['home service','Home / Office Services'],['office service','Home / Office Services'],['cleaning','Home / Office Services'],['paint','Home / Office Services'],['handyman','Home / Office Services'],['hourly','Hourly / Day Labor'],['day labor','Hourly / Day Labor'],['labor','Hourly / Day Labor'],['ride','Ride Sharing'],['errand','Delivery / Errand'],['courier','Delivery / Errand'],['delivery','Delivery / Errand'],['other','Other']];
  // (a) explicit negated list, e.g. "not delivery, home services and rides" / "excluding moving" / "other than X"
  let negCats=null;
  const nm=t.match(/\b(?:not|aren.?t|isn.?t|other than|excluding|except|without|besides|no)\s+([a-z0-9 &\/'+-]+?)(?:\?|$)/);
  if(nm){ const seg=' '+nm[1]+' '; const ex=new Set(); for(const [k,v] of catmap){ if(seg.includes(k)) ex.add(v); } if(ex.size) negCats=[...ex]; }
  // (b) "doesn't fit / outside / none of the standard categories" / uncategorized / unique → the Other catch-all (not in the standard 7)
  const notFit=/\b(uncategor\w*|miscellaneous|catch.?all)\b/.test(t)
    || /\b(do(?:es)?n.?t|do not|don.?t|not|never|without|outside|none of|neither)\b[^?]{0,40}\b(fit|fits|belong|belongs|standard)\b/.test(t)
    || /\bnone of the (?:standard )?(?:categor|7|seven|buckets|types|boxes)/.test(t)
    || /\b(don.?t|doesn.?t|do not) (?:perfectly |cleanly |neatly |really )?fit\b/.test(t)
    || /\bunique\b[^?]{0,40}\b(categor|fit|standard|box|bucket)\b/.test(t);
  if(negCats){ F.catNot=negCats; chips.push(['Excluding',negCats.join(', ')]); }
  else if(notFit){ F.catNot=STD7_CATS.slice(); chips.push(['Category','Outside standard 7 → Other']); }
  else { for(const [k,v] of catmap){ if(t.includes(k)){F.cat=v;chips.push(['Category',v]);break;} } }
  // platform / source (all orders are Request submissions today)
  if(/\b(gopher request|request app|requester app|on request)\b/.test(t)||/\brequest\b/.test(t)){chips.push(['Source','Gopher Request']);}
  if(/\bconnect\b/.test(t)){chips.push(['Source','Connect (no orders yet)']);}
  if(/\bdeal\b/.test(t)){chips.push(['Source','Deal (no orders yet)']);}
  // device
  if(/\b(ios|iphone|apple)\b/.test(t)){F.device='iOS';chips.push(['Device','iOS']);}
  else if(/\bandroid\b/.test(t)){F.device='Android';chips.push(['Device','Android']);}
  else if(/\bweb\b/.test(t)){F.device='Web';chips.push(['Device','Web']);}
  // age restricted
  if(/\b(age.?restricted|21\+|alcohol|tobacco|vape|cigarette)\b/.test(t)){F.ar='yes';chips.push(['Age','21+ only']);}
  else if(/\b(non.?age|not age|no age)\b/.test(t)){F.ar='no';chips.push(['Age','Non-restricted']);}
  // day of week
  if(/\bweekend\b/.test(t)){F.dow='weekend';chips.push(['Day','Weekend']);}
  else if(/\bweekday\b/.test(t)){F.dow='weekday';chips.push(['Day','Weekday']);}
  else{const days={monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun'};for(const d in days){if(t.includes(d)){F.dow=days[d];chips.push(['Day',days[d]]);break;}}}
  // amount — but NOT when the number refers to a count of orders/requests/jobs (that's a cohort question, handled separately)
  const cntWords='(?!\\s*(?:completed|orders?|requests?|jobs?|deliveries))';
  let m=t.match(new RegExp('(?:over|more than|above|>)\\s*\\$?(\\d+)'+cntWords)); if(m){F.min=+m[1];chips.push(['Min','$'+m[1]]);}
  m=t.match(new RegExp('(?:under|less than|below|<)\\s*\\$?(\\d+)'+cntWords)); if(m){F.max=+m[1];chips.push(['Max','$'+m[1]]);}
  // time windows — keywords first
  const tw={'late night':[22,6],'overnight':[22,6],'middle of the night':[0,5],'early morning':[5,9],'morning':[6,12],'afternoon':[12,18],'midday':[11,15],'evening':[18,22],'night':[20,24],'business hours':[9,17],'rush hour':[16,19]};
  let setWin=false;
  for(const k in tw){ if(t.includes(k)){F.h0=tw[k][0];F.h1=tw[k][1]%24;setWin=true;break;} }
  // "between X and Y"
  m=t.match(/between\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:and|to|[-\u2013])\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
  if(m){const a=parseTime(m[1]),b=parseTime(m[2]); if(a!=null&&b!=null){F.h0=a;F.h1=b;setWin=true;}}
  // "after X" / "before Y"
  m=t.match(/after\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/); if(m){const a=parseTime(m[1]);if(a!=null){F.h0=a;F.h1=(F.h1!=null?F.h1:6);setWin=true;}}
  m=t.match(/before\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/); if(m){const b=parseTime(m[1]);if(b!=null){F.h1=b;if(F.h0==null)F.h0=0;setWin=true;}}
  if(setWin)chips.push(['Time',hourLabel(F.h0)+'–'+hourLabel(F.h1%24)]);
  // repeat vs first-time customers
  if(/\b(repeat|returning|repeat customer|repeat customers|reorder|reorders|loyal|came back|come back)\b/.test(t)){F.repeat=true;chips.push(['Customers','Repeat']);}
  else if(/\b(one.?time|first.?time|new customer|new customers)\b/.test(t)){F.repeat='new';chips.push(['Customers','First-time']);}
  // market / state
  // states named in an exclusion context ("outside of NC", "not in TX") must NOT become a market filter
  const _exStates=new Set();
  (t.match(/(?:outside(?:\s+of)?|not\s+in|aside\s+from|excluding|exclude|except|without|other\s+than|besides)\s+([a-z0-9 .&'-]+)/g)||[]).forEach(seg=>{
    const mm=seg.match(/(?:outside(?:\s+of)?|not\s+in|aside\s+from|excluding|exclude|except|without|other\s+than|besides)\s+(.+)/);
    if(mm)mm[1].split(/\s+(?:and|or)\s+|,/).forEach(tok=>{tok=tok.trim().toLowerCase();if(!tok)return;const c=STATE_NAMES[tok]||(/^[a-z]{2}$/.test(tok)?tok.toUpperCase():null);if(c)_exStates.add(c);});
  });
  for(const name in STATE_NAMES){ if(t.includes(name)&&!_exStates.has(STATE_NAMES[name])){F.market=STATE_NAMES[name];chips.push(['Market',F.market]);break;} }
  if(F.market==='all'){const clean=text.replace(/\b(?:user|requestor|requester|customer|account|gopher|driver|worker|id)\b\s*(?:id|#)?\s*\d*/gi,' ');const sm=clean.match(/\b([A-Z]{2})\b/g);if(sm){for(const s of sm){if(M.order_states_present.includes(s)&&!_exStates.has(s)){F.market=s;chips.push(['Market',s]);break;}}}}
  return {F,chips};
}

/* ---- iQ for Users: plain-English -> user filter object + chips ---- */
function iqParseUsers(text){
  const t=' '+text.toLowerCase().replace(/[,]/g,' ')+' ';
  const F={q:'',role:'all',state:'all',city:'',zip:null,ver:'all',act:'all',dev:'all',tier:'all',status:'all',missing:[],thresh:[],deactFrom:null,deactTo:null,joinFrom:null,joinTo:null};
  const chips=[];
  const warn=[];
  const neg=near=>new RegExp('(not|without|no|non|un|missing|lacking|isn\\W?t|haven\\W?t|hasn\\W?t)\\s+(\\w+\\s+){0,2}'+near).test(t)||new RegExp(near+'\\s+(not|isn\\W?t)').test(t);
  // id / user number -> search
  let um=t.match(/\b(?:user|account|id|#)\s*(?:id|#)?\s*(\d+)\b/);
  if(um){F.q=um[1];chips.push(['Search','#'+um[1]]);}
  // quoted term -> search (name / email)
  let mk=text.match(/["'\u201c\u2018]([^"'\u201d\u2019]{2,40})["'\u201d\u2019]/);
  if(mk){F.q=mk[1].trim();chips.push(['Search','“'+F.q+'”']);}
  // role
  if(/\b(both|do both|dual)\b/.test(t)){F.role='Both';chips.push(['Role','Both']);}
  else if(/\b(gopher|gophers|driver|drivers|worker|workers|courier|couriers|supply)\b/.test(t)){F.role='Gopher';chips.push(['Role','Gopher']);}
  else if(/\b(requester|requesters|requestor|requestors|customer|customers|consumer|consumers|buyer|buyers|demand)\b/.test(t)){F.role='Requester';chips.push(['Role','Requester']);}
  // verification (supports negation: "not email confirmed", "without trustshield", "unverified", etc.)
  if(/\b(trustshield|trust shield|background.?check)\b/.test(t)){
    if(neg('trust')||/\buntrust/.test(t)){F.ver='trustshield_no';chips.push(['Verified','No TrustShield']);}
    else{F.ver='trustshield';chips.push(['Verified','TrustShield']);}}
  else if(/\bstripe\b/.test(t)){
    if(neg('stripe')){F.ver='stripeG_no';chips.push(['Verified','No Stripe']);}
    else{F.ver='stripeG';chips.push(['Verified','Stripe · gopher']);}}
  else if(/\bemail\b/.test(t)&&/(confirm|verif|valid)/.test(t)){
    if(neg('email')||/\bunconfirmed\b/.test(t)||/\bunverified\b/.test(t)){F.ver='email_no';chips.push(['Verified','Email NOT confirmed']);}
    else{F.ver='email';chips.push(['Verified','Email confirmed']);}}
  // activity
  if(/\bnever (logged|signed) in\b/.test(t)||/\bnever logged\b/.test(t)||/\binactive\b/.test(t)||/\bdormant\b/.test(t)){F.act='never';chips.push(['Activity','Never logged in']);}
  else if(/\b(completed a job|completed jobs|finished a job|did a job|active gopher|fulfilled|delivered)\b/.test(t)){F.act='ag';chips.push(['Activity','Completed a job']);}
  else if(/\b(placed|ordered|submitted|requested)\b/.test(t)){F.act='ar';chips.push(['Activity','Placed a request']);}
  // device
  if(/\b(ios|iphone|apple)\b/.test(t)){F.dev='iOS';chips.push(['Device','iOS']);}
  else if(/\bandroid\b/.test(t)){F.dev='Android';chips.push(['Device','Android']);}
  else if(/\bweb\b/.test(t)){F.dev='Web';chips.push(['Device','Web']);}
  // gopher tier
  if(/\bpro\s*\+|\bpro plus\b|\belite\s*\+|\belite plus\b/.test(t)){F.tier='Elite+';chips.push(['Tier','Elite+']);}
  else if(/\bpro\b|\belite\b/.test(t)){F.tier='Elite';chips.push(['Tier','Elite']);}
  else if(/\bstandard\b|\bbasic\b/.test(t)){F.tier='Standard';chips.push(['Tier','Standard']);}
  else { const _tm=userTiers().find(s=>s && t.includes(' '+(''+s).toLowerCase()+' ')); if(_tm){F.tier=_tm;chips.push(['Tier',_tm]);} }
  // "no completed requests" / "no submitted requests" — count-zero shortcuts (feed the numeric threshold engine)
  if(/\bno completed (requests?|orders?)\b|\bwithout (any )?completed (requests?|orders?)\b|\bnever completed (a )?(request|order)\b|\bzero completed\b|\b0 completed (requests?|orders?)\b/.test(t)){F.thresh.push({field:'completed',op:'==',val:0});chips.push(['Filter','no completed requests']);}
  if(/\bno submitted (requests?|orders?)\b|\bnever submitted\b|\bnever placed\b|\bno requests? placed\b/.test(t)){F.thresh.push({field:'placed',op:'==',val:0});chips.push(['Filter','no submitted requests']);}
  // account status — deactivated / active / incomplete / any exact status value present in the data
  if(/\b(deactivat\w*|disabled|suspend\w*|banned|deleted|removed|terminated|closed account)\b/.test(t)){F.status='deactivated';}
  else if(/\bincomplete\b/.test(t)){ const m=userStatuses().find(s=>/incomplete/i.test(s)); F.status=m?m.toLowerCase():'incomplete'; }
  else if(/\bactive users?\b/.test(t)||/\bstill active\b/.test(t)){F.status='active';}
  else { const m=userStatuses().find(s=>s && t.includes(' '+(''+s).toLowerCase()+' ')); if(m)F.status=(''+m).toLowerCase(); }
  // missing-info filters — grade of profile completeness: "without a name", "no email", "missing phone"
  [['name',/\b(no|without|missing|blank|empty|lacking|has no|hasn'?t|haven'?t|didn'?t (enter|add|provide))\s+(a\s+|an\s+|their\s+|entered\s+)?names?\b|\bnameless\b|\bunnamed\b/],
   ['email',/\b(no|without|missing|blank|empty|lacking)\s+(an?\s+|their\s+)?e-?mails?\b/],
   ['phone',/\b(no|without|missing|blank|empty|lacking)\s+(a\s+|their\s+)?(phone|telephone)(\s+numbers?)?\b/],
   ['dob',/\b(no|without|missing|blank|empty|lacking)\s+(a\s+|their\s+)?(dob|date of birth|birth ?date|birthday)\b/],
   ['addr1',/\b(no|without|missing|blank|empty|lacking)\s+(an?\s+|their\s+)?(address|street)\b/],
   ['city',/\b(no|without|missing|blank|empty|lacking)\s+(a\s+|their\s+)?city\b/],
   ['zip',/\b(no|without|missing|blank|empty|lacking)\s+(a\s+|their\s+)?(zip|zipcode|zip code|postal code?)\b/]
  ].forEach(function(pair){ if(pair[1].test(t)) F.missing.push(pair[0]); });
  F.missing.forEach(function(f){ chips.push(['Missing', f==='addr1'?'address':f]); });
  // numeric activity thresholds — "more than 20 completed requests", "at least 5 jobs done", "10+ logins"
  (function(){
    var metric='(completed jobs?|jobs? (?:done|completed)|completed requests?|completed orders?|requests? placed|orders? placed|requests? completed|orders? completed|logins?|completed|received|placed)';
    function fieldOf(mp){ mp=mp.toLowerCase(); if(/job/.test(mp))return 'received'; if(/placed/.test(mp))return 'placed'; if(/login/.test(mp))return 'logins'; if(/received/.test(mp))return 'received'; if(/request|order|completed/.test(mp))return 'completed'; return 'completed'; }
    var opMap={'more than':'>','greater than':'>','over':'>','above':'>','at least':'>=','minimum of':'>=','no fewer than':'>=','fewer than':'<','less than':'<','under':'<','below':'<','at most':'<=','maximum of':'<=','no more than':'<=','exactly':'==','equal to':'=='};
    var reA=new RegExp('\\b(more than|greater than|over|above|at least|minimum of|no fewer than|fewer than|less than|under|below|at most|maximum of|no more than|exactly|equal to)\\s+(\\d+)\\s*\\+?\\s+'+metric,'g');
    var reB=new RegExp('\\b(\\d+)\\s*\\+\\s+'+metric,'g');
    var reC=new RegExp('([<>]=?|[\\u2264\\u2265])\\s*(\\d+)\\s+'+metric,'g');
    var symOp={'>':'>','>=':'>=','<':'<','<=':'<=','\u2265':'>=','\u2264':'<='};
    var mm;
    while((mm=reC.exec(t))!==null){ F.thresh.push({field:fieldOf(mm[3]),op:(symOp[mm[1]]||'>'),val:parseInt(mm[2],10)}); chips.push(['Filter',mm[1]+mm[2]+' '+mm[3].trim()]); }
    while((mm=reA.exec(t))!==null){ F.thresh.push({field:fieldOf(mm[3]),op:(opMap[mm[1]]||'>'),val:parseInt(mm[2],10)}); chips.push(['Filter',mm[1]+' '+mm[2]+' '+mm[3].trim()]); }
    while((mm=reB.exec(t))!==null){ F.thresh.push({field:fieldOf(mm[2]),op:'>=',val:parseInt(mm[1],10)}); chips.push(['Filter',mm[1]+'+ '+mm[2].trim()]); }
  })();
  // state — full names first, then 2-letter codes present in the sample
  const userStates=[...new Set(USR.map(u=>u.state))].filter(s=>s&&s!=='—');
  for(const name in STATE_NAMES){ if(t.includes(name)){F.state=STATE_NAMES[name];chips.push(['State',F.state]);break;} }
  if(F.state==='all'){const clean=text.replace(/\b(?:user|account|id|#)\b\s*(?:id|#)?\s*\d*/gi,' ');const sm=clean.match(/\b([A-Z]{2})\b/g);if(sm){for(const s of sm){if(userStates.includes(s)){F.state=s;chips.push(['State',s]);break;}}}}
  // city — data-driven, robust to St / Saint / St. and to "City, ST"
  (function(){
    var cm=t.match(/\b(?:in|from|near|around|based in|located in)\s+(.+)$/);
    if(!cm) return;
    var segN=' '+_cityNorm(cm[1])+' ', best=null, cities=userCities();
    for(var i=0;i<cities.length;i++){ var n=cities[i].norm; if(n&&n.length>=3&&segN.indexOf(' '+n+' ')>=0){ if(!best||n.length>best.norm.length) best=cities[i]; } }
    if(best){ F.city=best.norm; F._cityDisp=best.raw; chips.push(['City',best.raw]); }
  })();
  // zip code — "zip code 46229", "zip 46229", "in 46229"
  {let zm=t.match(/\bzip(?:\s*code)?\s*[:#]?\s*(\d{5})\b/)||t.match(/\bin\s+(\d{5})\b/);if(zm){F.zip=zm[1];chips.push(['Zip',zm[1]]);}}
  // join date / signup cohort — "from 2018 to 2021", "between 2019 and 2022", "since 2023", "before 2021", "joined in 2020"
  {
    const maxY=dayToYear(USR.reduce((m,u)=>u.signupDay>m?u.signupDay:m,0));
    const minY=dayToYear(USR.reduce((m,u)=>(u.signupDay&&u.signupDay<m)?u.signupDay:m,1e9));
    // only treat 4-digit numbers as years when a date cue is present, OR they form a YYYY-YYYY / YYYY to YYYY range
    const hasCue=/\b(join|joined|signed up|sign up|signup|cohort|since|before|after|between|from|until|til|till|through|thru|by|in)\b/.test(t);
    const rangePat=/\b(20\d{2})\s*(?:-|\u2013|\u2014|to|through|thru|and|\u2192)\s*(20\d{2})\b/;
    const rm=t.match(rangePat);
    let yrs=(t.match(/\b(20\d{2})\b/g)||[]).map(Number).filter(y=>y>=2000&&y<=maxY+1);
    if(rm||(hasCue&&yrs.length)){
      let lo=null,hi=null;
      if(rm){lo=Math.min(+rm[1],+rm[2]);hi=Math.max(+rm[1],+rm[2]);}
      else if(/\bbetween\b/.test(t)&&yrs.length>=2){lo=Math.min(yrs[0],yrs[1]);hi=Math.max(yrs[0],yrs[1]);}
      else if(/\bbefore\b/.test(t)){hi=yrs[0]-1;}
      else if(/\b(until|til|till|through|thru|by|up to)\b/.test(t)){hi=yrs[0];}
      else if(/\bafter\b/.test(t)){lo=yrs[0]+1;}
      else if(/\b(since|from)\b/.test(t)){lo=yrs[0];}
      else {lo=hi=yrs[0];} // "in 2020" / "joined 2020"
      // clamp to data range so an out-of-range ask is still honest
      if(lo!=null)lo=Math.max(lo,minY);
      if(hi!=null)hi=Math.min(hi,maxY);
      if(lo!=null||hi!=null){
        const lbl=(lo!=null&&hi!=null)?(lo===hi?(''+lo):(lo+'\u2013'+hi)):(lo!=null?('since '+lo):('through '+hi));
        if(F.status==='deactivated'){F.deactFrom=lo;F.deactTo=hi;F._deactLbl=lbl;}
        else{F.joinFrom=lo;F.joinTo=hi;chips.push(['Joined',lbl]);}
      }
    }
  }
  if(F.status==='deactivated')chips.push(['Status','Deactivated'+(F._deactLbl?' '+F._deactLbl:'')]);
  else if(F.status==='active')chips.push(['Status','Active']);
  else if(F.status&&F.status!=='all')chips.push(['Status',_statusLabel(F.status)]);
  // honesty: flag conditions we can't actually filter on (not silently dropped)
  if(/\bphone\b|\bmobile number\b|\btelephone\b|\bsms\b/.test(t)) warn.push('phone number — not tracked in this dataset');
  if(/\bage\b|\bgender\b|\bbirth\b/.test(t)) warn.push('demographic detail (age/gender/birth) — not available here');
  if(/\bspend|\brevenue|\bltv|\blifetime value/.test(t)) warn.push('per-user spend/LTV — not in the user records (see Financials)');
  return {F,chips,warn};
}

/* ---- iQ analytical intent: "rank/top N ... by <dimension>" -> aggregation spec ---- */
function iqAnalysis(text){
  const t=(text||'').toLowerCase();
  let dim=null,dimLabel='',pl='';
  if(/\bdmas?\b|media market|\bmetros?\b/.test(t)){dim='dma';dimLabel='DMA';pl='DMAs';}
  else if(/\bcit(?:y|ies)\b/.test(t)){dim='city';dimLabel='city';pl='cities';}
  else if(/\bcategor(y|ies)\b/.test(t)){dim='cat';dimLabel='category';pl='categories';}
  else if(/\bmarkets?\b|\bstates?\b|\bregions?\b/.test(t)){dim='state';dimLabel='market';pl='markets';}
  else if(/\bdevices?\b|by platform/.test(t)){dim='dev';dimLabel='device';pl='devices';}
  else if(/by day|days? of (?:the )?week|by weekday|\bweekdays?\b|\b(?:which|what|each|per|every|busiest|slowest)\s+days?\b|\b(?:top\s+\d+|rank(?:ing)?)\s+days?\b/.test(t)){dim='dow';dimLabel='day';pl='days';}
  else if(/by hour|\bhours?\b|time of day/.test(t)){dim='hour';dimLabel='hour';pl='hours';}
  if(!dim) return null;
  if(!/\b(top|rank|ranking|breakdown|break down|most|least|fewest|leading|highest|lowest|busiest|slowest|by)\b/.test(t)) return null;
  let metric='orders',metricLabel='orders';
  if(/conversion|completion rate|success rate|fulfillment rate/.test(t)){metric='rate';metricLabel='completion rate';}
  else if(/complet|deliver|fulfil/.test(t)){metric='completed';metricLabel='completed orders';}
  else if(/cancel/.test(t)){metric='cancelled';metricLabel='cancelled orders';}
  else if(/gmv|revenue|spend|sales|grand total/.test(t)){metric='gmv';metricLabel='GMV';}
  let n=5;const nm=t.match(/top\s+(\d+)/)||t.match(/(\d+)\s+(?:most|highest|top)/);if(nm)n=Math.min(24,Math.max(3,+nm[1]));
  const allReq=!nm && /\b(all|every)\b/.test(t);   // "show all hours", "every category" -> show all groups
  if(dim==='dow'){n=nm?Math.min(7,Math.max(1,+nm[1])):7;}                                    // only 7 weekdays — show them all unless a specific top-K
  else if(dim==='hour'){n=nm?Math.min(24,Math.max(1,+nm[1])):((allReq||/\b24\b/.test(t))?24:n);}  // 24 hours — "all 24 hours" shows every hour
  else if(allReq){n=40;}                                                                     // other dims: show all (capped)
  const asc=/\b(least|lowest|worst|bottom|slowest|fewest|quietest)\b/.test(t);
  // single-winner intent ("busiest day", "what day has the most …") -> chart shows all groups, table scopes to the one winner.
  // A superlative with no explicit multi-group ask (top N / rank / breakdown / by-dim / each-every) means the user wants one answer.
  const superl=/\b(most|highest|least|lowest|fewest|busiest|slowest|quietest)\b/.test(t);
  const ranking=/\btop\s+\d+\b|\b(rank|ranking|breakdown|break down|compare|list|each|every)\b/.test(t)||/\bby\s+(day|hour|dma|categor|market|state|device|platform)/.test(t);
  const singleWinner=superl&&!ranking;
  const scopeN=singleWinner?1:n;
  const scopeCompleted=singleWinner&&metric==='completed';
  let exclude=[];
  const em=t.match(/(?:exclude|excluding|except|without|other than|besides|excl\.?|outside of|outside|not in|aside from)\s+([a-z0-9 .&'\/-]+?)(?:\)|,|\?|\s+by\b|\s+with\b|\s+for\b|\s+in\b|\s+ranked\b|\s+rank\b|\s+what\b|\s+which\b|\s+show\b|\s+that\b|\s+highest\b|\s+lowest\b|\s+top\b|$)/);
  if(em&&em[1]) exclude=em[1].split(/\s+(?:and|&|or)\s+|,/).map(s=>s.trim()).filter(s=>s.length>=2&&!/^(the|a|an|all|any|dma|dmas|market|markets|state|states)$/.test(s));
  return {dim,dimLabel,pl,metric,metricLabel,n,asc,exclude,scopeN,scopeCompleted,singleWinner};
}
/* ---- iQ cohort intent: "how many users have more than N completed orders" -> per-user threshold count ---- */
function cap(s){return (s||'').charAt(0).toUpperCase()+(s||'').slice(1);}
function cohortMatch(v,op,n){return op==='gt'?v>n:op==='gte'?v>=n:op==='lt'?v<n:op==='lte'?v<=n:v===n;}
function iqCohort(text){
  const t=(text||'').toLowerCase();
  if(!/\b(users?|requesters?|customers?|people|gophers?|accounts?|members?)\b/.test(t)) return null;
  if(!/\b(orders?|requests?|jobs?|deliveries|completed|placed)\b/.test(t)) return null;
  if(!/\bhow many\b|\bnumber of\b|\bcount of\b|\bhave\b|\bwith\b|\bplaced\b|\bcompleted\b/.test(t)) return null;
  let op=null,n=null,m;
  if((m=t.match(/\b(more than|over|above|greater than|at least|fewer than|less than|under|below|at most|no more than|exactly|equal to)\s+(\d+)\b/))){
    const w=m[1];n=+m[2];
    if(/more than|over|above|greater than/.test(w))op='gt';
    else if(/at least/.test(w))op='gte';
    else if(/fewer than|less than|under|below/.test(w))op='lt';
    else if(/at most|no more than/.test(w))op='lte';
    else op='eq';
  } else if((m=t.match(/\b(\d+)\s*\+/))){op='gte';n=+m[1];}
  else if((m=t.match(/(>=|>|<=|<|=)\s*(\d+)\b/))){const s=m[1];n=+m[2];op=s==='>'?'gt':s==='>='?'gte':s==='<'?'lt':s==='<='?'lte':'eq';}
  if(op==null||n==null) return null;
  let field='completed',fieldLabel='completed orders';
  if(/\bplaced\b|requests? placed|placed requests?/.test(t)){field='placed';fieldLabel='placed orders';}
  else if(/\bjobs?\b|jobs done|as a gopher|completed jobs|received|fulfilled/.test(t)){field='received';fieldLabel='completed jobs';}
  const subject=(field==='received')?'gophers':'users';
  const opLabels={gt:'more than',gte:'at least',lt:'fewer than',lte:'at most',eq:'exactly'};
  // optional time window on the count itself ("… completed orders in 2025", "between 2023 and 2024")
  let year=null,yearLabel='',ym;
  if((ym=t.match(/\b(20\d\d)\s*(?:-|\u2013|\u2014|to|through|thru|and)\s*(20\d\d)\b/))){year={from:Math.min(+ym[1],+ym[2]),to:Math.max(+ym[1],+ym[2])};}
  else if((ym=t.match(/\b(?:in|during|for|within|of)\s+(20\d\d)\b/))){year={from:+ym[1],to:+ym[1]};}
  else if((ym=t.match(/\b(20\d\d)\b/))){year={from:+ym[1],to:+ym[1]};}
  if(year)yearLabel=(year.from===year.to)?('in '+year.from):('in '+year.from+'\u2013'+year.to);
  return {field,fieldLabel,op,opLabel:opLabels[op],n,subject,year,yearLabel};
}
const DOW_A=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function hourLab(h){const x=((h%24)+24)%24;const ap=x<12?'am':'pm';let hh=x%12;if(hh===0)hh=12;return hh+ap;}
function dimKey(o,dim){return dim==='dma'?(o.dma||'Unmapped (no DMA)'):dim==='city'?(o.dcity?(o.dcity+(o.dstate?', '+o.dstate:'')):''):dim==='cat'?o.cat:dim==='state'?(o.state||'—'):dim==='dev'?o.dev:dim==='dow'?DOW_A[o.w]:dim==='hour'?hourLab(o.h):'';}
function iqAggregate(rows,spec){
  const m=new Map();
  rows.forEach(o=>{
    const k=dimKey(o,spec.dim);if(k==null||k==='')return;
    let e=m.get(k);if(!e){e={k,total:0,completed:0,cancelled:0,gmv:0};m.set(k,e);}
    e.total++;
    if(o.status==='delivered'){e.completed++;e.gmv+=o.total;}
    else if(o.status==='cancelled')e.cancelled++;
  });
  let arr=[...m.values()];
  if(spec.metric==='rate') arr=arr.filter(e=>e.total>=20); // ignore tiny-volume groups so rate ranking is meaningful
  const val=e=> spec.metric==='gmv'?e.gmv : spec.metric==='completed'?e.completed : spec.metric==='cancelled'?e.cancelled : spec.metric==='rate'?(e.total?e.completed/e.total:0) : e.total;
  arr.sort((a,b)=>spec.asc?val(a)-val(b):val(b)-val(a));
  return {arr,val};
}
VIEWS.orders=()=>{
  const v=el('div');
  let F={status:'all',cat:'all',ar:'all',market:'all',device:'all',dow:'all',h0:null,h1:null,min:null,max:null,kw:'',year:'all',uid:null,gid:null};

  // iQ bar — dark card, official wordmark on a white plate, brand AI pill
  const iq=el('div','card');iq.style.cssText='background:linear-gradient(120deg,#0B1A2B,#13283E);border:none;color:#fff';
  iq.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:13px">
      <div style="display:flex;align-items:center;gap:9px"><div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,${C.greenB},${C.green});display:grid;place-items:center"><svg viewBox="0 0 24 24" width="15" fill="#04230f"><path d="m12 3 1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3Z"/></svg></div><span style="font-weight:800;font-size:14.5px;color:#fff">gopher iQ</span></div>
      <div style="font-size:12.5px;color:#9fb3c4;font-weight:600">Ask for any slice of the ${num(ORD.length)} orders in plain English</div></div>
    <div class="iqpill">
      <div class="iqpill-plus">+</div>
      <input id="iq-q" placeholder="e.g. completed moving orders submitted between 10pm and 6am">
      <button class="iqpill-go" id="iq-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>Ask iQ</button>
    </div>
    <div style="margin-top:10px;font-size:11.5px;color:#8aa0b3">Try: <span class="iq-eg">how many users have more than 5 completed orders</span> · <span class="iq-eg">rank top 5 DMAs by completed orders</span> · <span class="iq-eg">requests that don't fit a standard category</span></div>
    <div id="iq-chips" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"></div>`;
  v.appendChild(iq);

  // KPI summary
  const sum=el('div','row kpis');sum.id='ord-kpis';v.appendChild(sum);
  // iQ analytical answer panel (rendered for "rank/top N by X" questions)
  const ana=el('div');ana.id='ord-analysis';v.appendChild(ana);

  // structured filters
  const c=el('div','card pad0');
  const tools=el('div','tbl-tools');
  tools.innerHTML=`
   <div class="search" style="min-width:220px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg><input id="ord-q" placeholder="Search item / description (e.g. Marlboro) or order #…"></div>
   <div class="fl"><label>Status</label><select id="f-status"><option value="all">All</option><option value="pending">Pending</option><option value="delivered">Completed</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></div>
   <div class="fl"><label>Category</label><select id="f-cat"><option value="all">All</option>${OF.legend.cat.map(x=>`<option>${x}</option>`).join('')}</select></div>
   <div class="fl"><label>Year</label><select id="f-year"><option value="all">All</option>${ORD_YEARS.map(y=>`<option>${y}</option>`).join('')}</select></div>
   <div class="fl"><label>Time</label><select id="f-time">
      <option value="all">All hours</option>
      <option value="22-6">Late night · 10p–6a</option>
      <option value="6-12">Morning · 6a–12p</option>
      <option value="12-16">Midday · 12p–4p</option>
      <option value="16-22">Evening · 4p–10p</option>
      <option value="9-17">Business hrs · 9a–5p</option>
      <option value="custom">Custom…</option></select></div>
   <span id="f-time-custom" class="hide" style="display:flex;gap:4px;align-items:center;font-size:12px;color:var(--muted)"><input id="f-h0" class="pin" style="width:54px" placeholder="22"> to <input id="f-h1" class="pin" style="width:54px" placeholder="6"> hr</span>
   <button class="btn" id="ord-more"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>More filters</button>
   <button class="btn primary" id="ord-export"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>Export CSV</button>`;
  c.appendChild(tools);
  const more=el('div','tbl-tools hide');more.id='ord-adv';more.style.borderTop='none';more.style.paddingTop='0';
  more.innerHTML=`
   <div class="fl"><label>Market</label><select id="f-market"><option value="all">All</option>${M.order_states_present.map(x=>`<option>${x}</option>`).join('')}</select></div>
   <div class="fl"><label>Device</label><select id="f-device"><option value="all">All</option><option>iOS</option><option>Android</option><option>Web</option><option>Unknown</option></select></div>
   <div class="fl"><label>Age-restricted</label><select id="f-ar"><option value="all">All</option><option value="yes">21+ only</option><option value="no">Non-restricted</option></select></div>
   <div class="fl"><label>Day</label><select id="f-dow"><option value="all">All</option><option>weekday</option><option>weekend</option>${DOWN.map(d=>`<option>${d}</option>`).join('')}</select></div>
   <div class="fl"><label>Min $</label><input id="f-min" class="pin" style="width:64px" placeholder="0"></div>
   <div class="fl"><label>Max $</label><input id="f-max" class="pin" style="width:64px" placeholder="∞"></div>
   <div class="fl"><label>Requestor ID</label><input id="f-uid" class="pin" style="width:74px" placeholder="any"></div>
   <div class="fl"><label>Gopher ID</label><input id="f-gid" class="pin" style="width:74px" placeholder="any"></div>`;
  c.appendChild(more);
  const wrap=el('div','tbl-wrap');c.appendChild(wrap);
  v.appendChild(c);
  const noteEl=el('div','note',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>Counts, GMV and completion run across <b>all ${num(ORD.length)} orders</b>. Every consumer order is a Gopher Request submission today — Connect & Deal will appear as a Source filter once they transact.`);
  v.appendChild(noteEl);

  let lastRows=[];
  let anaSpec=null;
  let cohortSpec=null;
  const ANAC=[C.green,C.blue,C.violet,C.amber,C.red,'#14b8a6','#0ea5e9','#f97316','#ec4899','#84cc16'];
  // shared table renderer (used by normal, analytical, and cohort modes)
  function buildOrdersTable(scoped){
    const show=scoped.slice(0,300);
    const sm={delivered:'t-green',cancelled:'t-red',expired:'t-amber'};
    let h='<table><thead><tr><th>#</th><th>Status</th><th>Date</th><th>Time</th><th>Timing preference</th><th>Expiring on</th><th>Category</th><th>Item / detail</th><th>Market</th><th>City</th><th>Type</th><th style="text-align:right">Offer</th></tr></thead><tbody>';
    show.forEach(o=>{const det=(o.desc||o.title||'').slice(0,40);const isBid=o.offerC===0;const offerTxt=isBid?'':('$'+(Number.isInteger(o.offerC)?o.offerC.toLocaleString():o.offerC.toFixed(2)));const tp=timingPref(o);const tpAsap=tp==='Need ASAP';const exp=expiringOn(o);const cityCell=[o.dcity,o.dstate].filter(Boolean).join(', ')||'—';h+=`<tr><td class="tnum"><span class="dd-link" data-dd="order" data-id="${o.id}" style="font-weight:700">${o.id}</span></td><td><span class="tag ${sm[o.status]||'t-grey'}">${o.status==='delivered'?'completed':o.status}</span></td><td class="tnum">${dayToStr(o.day)}</td><td class="tnum">${hourLabel(o.h)}</td><td${tpAsap?' style="color:var(--terracotta);font-weight:600"':''}>${iaEsc(tp)}</td><td class="tnum"${exp?'':' style="color:var(--line-2)"'}>${exp||'—'}</td><td>${o.cat}${o.ar?' <span class="ar">21+</span>':''}</td><td style="color:var(--muted);max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${det.replace(/</g,'&lt;')||'—'}</td><td>${iaEsc(o.dma||o.state||'—')}</td><td>${iaEsc(cityCell)}</td><td><span class="tag ${isBid?'t-violet':'t-grey'}">${isBid?'Bids':'Fixed'}</span></td><td style="text-align:right" class="tnum">${offerTxt}</td></tr>`;});
    h+='</tbody></table>';
    wrap.innerHTML=scoped.length?h:'<div style="padding:50px;text-align:center;color:var(--muted)">No orders match these filters.</div>';
    if(scoped.length>show.length) wrap.insertAdjacentHTML('beforeend',`<div style="padding:12px 16px;color:var(--muted);font-size:12px;border-top:1px solid var(--line-2)">Showing first ${show.length} of ${num(scoped.length)} matches. Export for the full set.</div>`);
    wrap.querySelectorAll('.dd-link').forEach(b=>b.onclick=()=>{b.dataset.dd==='order'?openOrderDetail(b.dataset.id):openUserDetail(b.dataset.id);});
  }
  // cohort mode — "how many users have more than N completed orders": user-level answer + distribution chart
  function renderCohortMode(){
    const sp=cohortSpec, field=sp.field;
    const all=USR;
    // year-scoped: recount each user's orders within the window from ORD; else use the baked lifetime field
    let valOf;
    if(sp.year){
      const idField=(field==='received')?'gopherId':'reqId';
      const needDelivered=(field!=='placed');
      const cnt=new Map();
      ORD.forEach(o=>{const y=dayToYear(o.day);if(y<sp.year.from||y>sp.year.to)return;if(needDelivered&&o.status!=='delivered')return;const uid=o[idField];if(!uid)return;cnt.set(uid,(cnt.get(uid)||0)+1);});
      valOf=u=>cnt.get(u.id)||0;
    } else { valOf=u=>+u[field]||0; }
    const cohort=all.filter(u=>cohortMatch(valOf(u),sp.op,sp.n));
    const count=cohort.length,total=all.length;
    const cohSum=cohort.reduce((a,u)=>a+valOf(u),0);
    const cohMax=cohort.reduce((mx,u)=>Math.max(mx,valOf(u)),0);
    // KPI cards pivot to the user-cohort answer
    sum.innerHTML='';
    sum.appendChild(kpi(cap(sp.subject)+' '+sp.opLabel+' '+sp.n,num(count),(total?(count/total*100).toFixed(1):'0')+'% of all users · '+sp.fieldLabel+(sp.yearLabel?' '+sp.yearLabel:''),{dot:C.violet}));
    sum.appendChild(kpi('Total '+sp.fieldLabel,num(cohSum),'across these '+sp.subject,{dot:C.green}));
    sum.appendChild(kpi('Avg per user',count?(cohSum/count).toFixed(1):'0','within the cohort',{dot:C.blue}));
    sum.appendChild(kpi('Most by one '+sp.subject.replace(/s$/,''),num(cohMax),'cohort max',{dot:C.amber}));
    // distribution chart in the analysis slot
    renderCohortChart(all,cohort,sp,valOf);
    // table → the orders these users placed (embedded set), scoped to the window if one was given
    const cohortIds=new Set(cohort.map(u=>u.id));
    const yOK=sp.year?(o=>{const y=dayToYear(o.day);return y>=sp.year.from&&y<=sp.year.to;}):null;
    let scoped=ORD.filter(o=>cohortIds.has(o.reqId)&&(!yOK||yOK(o)));
    lastRows=scoped;
    scoped.sort((a,b)=>(b.day-a.day)||((b.id||0)-(a.id||0)));
    if(noteEl)noteEl.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>The cards and chart answer your question at the <b>user</b> level. The table below shows the ${num(scoped.length)} orders in the embedded set placed by these ${num(count)} ${sp.subject}. Clear the question to return to all orders.`;
    buildOrdersTable(scoped);
  }
  function renderCohortChart(all,cohort,sp,valOf){
    const box=$('#ord-analysis');if(!box)return;
    const field=sp.field;
    valOf=valOf||(u=>+u[field]||0);
    const buckets=[{lo:0,hi:0,lab:'0'},{lo:1,hi:1,lab:'1'},{lo:2,hi:2,lab:'2'},{lo:3,hi:3,lab:'3'},{lo:4,hi:4,lab:'4'},{lo:5,hi:5,lab:'5'},{lo:6,hi:10,lab:'6–10'},{lo:11,hi:20,lab:'11–20'},{lo:21,hi:50,lab:'21–50'},{lo:51,hi:1e9,lab:'51+'}];
    const counts=buckets.map(b=>all.reduce((a,u)=>{const v=valOf(u);return a+((v>=b.lo&&v<=b.hi)?1:0);},0));
    const maxc=Math.max(1,...counts);
    const hot=b=>cohortMatch(b.lo,sp.op,sp.n)&&cohortMatch(b.hi,sp.op,sp.n); // bucket fully inside the asked range
    const count=cohort.length,total=all.length;
    const cardEl=el('div','card');
    cardEl.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span style="width:7px;height:7px;border-radius:50%;background:${C.green};display:inline-block"></span><span style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:800">iQ answer</span></div>
      <h3 style="margin:0 0 2px;font-size:18px"><span style="color:${C.green}">${num(count)}</span> ${sp.subject} have ${sp.opLabel} ${sp.n} ${sp.fieldLabel}${sp.yearLabel?' '+sp.yearLabel:''}</h3>
      <div class="sub" style="margin-bottom:15px">That's ${(total?(count/total*100):0).toFixed(1)}% of all ${num(total)} users. Distribution of every user by ${sp.fieldLabel}${sp.yearLabel?' '+sp.yearLabel:''} — the bars in the asked range are highlighted.</div>
      <div class="coh-bars"></div>`;
    const bars=cardEl.querySelector('.coh-bars');
    buckets.forEach((b,i)=>{
      const on=hot(b);const c=counts[i];
      const row=el('div');row.style.cssText='display:flex;align-items:center;gap:11px;margin-bottom:9px';
      row.innerHTML=`<div style="width:46px;text-align:right;font-size:12px;font-weight:700;color:${on?C.green:'var(--muted)'}">${b.lab}</div>
        <div style="flex:1;height:18px;background:var(--line-2);border-radius:5px;overflow:hidden"><div style="height:100%;width:${c/maxc*100}%;background:${on?C.green:'#c2cdd6'};border-radius:5px"></div></div>
        <div class="tnum" style="width:62px;text-align:right;font-size:12.5px;font-weight:${on?'800':'600'};color:${on?'var(--ink)':'var(--muted)'}">${num(c)}</div>`;
      bars.appendChild(row);
    });
    const foot=el('div');foot.style.cssText='margin-top:8px;font-size:11.5px;color:var(--muted-2);line-height:1.5';
    foot.innerHTML=`Buckets count users by their lifetime ${sp.fieldLabel} (from the user records), not just orders in the embedded set. Highlighted bars sum to the ${num(count)} ${sp.subject} above.`;
    cardEl.appendChild(foot);
    box.innerHTML='';box.appendChild(cardEl);
  }
  function renderAnalysis(rows,pre){
    const box=$('#ord-analysis');if(!box)return;
    if(!anaSpec){box.innerHTML='';return;}
    const {arr,val}=pre||iqAggregate(rows,anaSpec);
    const topN=arr.slice(0,anaSpec.n);
    const _allShown=topN.length>1&&topN.length>=arr.length;
    if(!topN.length){box.innerHTML=`<div class="card"><div style="font-size:13px;color:var(--muted)">No data to rank by ${anaSpec.dimLabel} for this question.</div></div>`;return;}
    const isRate=anaSpec.metric==='rate';
    const fmtV=e=>isRate?(val(e)*100).toFixed(1)+'%':anaSpec.metric==='gmv'?money(val(e)):num(val(e));
    const max=val(topN[0])||1;
    // pie sized by order volume (completed for rate/completed, total otherwise) so segments stay additive
    const pieVal=e=>isRate?e.completed:anaSpec.metric==='gmv'?e.gmv:anaSpec.metric==='completed'?e.completed:anaSpec.metric==='cancelled'?e.cancelled:e.total;
    const totalAll=arr.reduce((a,e)=>a+pieVal(e),0),topSum=topN.reduce((a,e)=>a+pieVal(e),0);
    const dd=topN.map((e,i)=>({label:e.k,value:pieVal(e),color:ANAC[i%ANAC.length]}));
    if(totalAll>topSum)dd.push({label:'Other',value:totalAll-topSum,color:'#cbd5e1'});
    const card=el('div','card');
    card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><span style="width:7px;height:7px;border-radius:50%;background:${C.green};display:inline-block"></span><span style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:800">iQ answer</span><button class="btn" id="ana-x" style="margin-left:auto;padding:4px 10px;font-size:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>Export</button></div>
      <h3 style="margin:0 0 2px;font-size:17px">${anaSpec.asc?'Bottom':_allShown?'All':'Top'} ${topN.length} ${topN.length>1?anaSpec.pl:anaSpec.dimLabel} by ${anaSpec.metricLabel}</h3>
      <div class="sub" style="margin-bottom:15px">Across the ${num(rows.length)} orders matching your question${anaSpec.exclude&&anaSpec.exclude.length?` · excluding ${anaSpec.exclude.join(', ')}`:''}${isRate?` · among ${anaSpec.pl} with 20+ orders`:''}.</div>
      ${anaSpec._missed&&anaSpec._missed.length?`<div class="note" style="margin:0 0 14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>No ${anaSpec.dimLabel} matched “${anaSpec._missed.join(', ')}” to exclude — nothing was removed for that term.</div>`:''}
      <div class="ana-grid"><div class="ana-list"></div><div class="ana-pie"></div></div>`;
    const list=card.querySelector('.ana-list');
    topN.forEach((e,i)=>{const row=el('div');row.style.cssText='display:flex;align-items:center;gap:11px;margin-bottom:12px';
      row.innerHTML=`<div style="width:23px;height:23px;border-radius:6px;background:${ANAC[i%ANAC.length]}22;color:${ANAC[i%ANAC.length]};font-weight:800;font-size:12px;display:grid;place-items:center;flex:none">${i+1}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${e.k}">${e.k}</div><div style="height:6px;background:var(--line-2);border-radius:4px;margin-top:5px;overflow:hidden"><div style="height:100%;width:${val(e)/max*100}%;background:${ANAC[i%ANAC.length]}"></div></div></div>
        <div class="tnum" style="font-weight:800;font-size:14px;white-space:nowrap">${fmtV(e)}${isRate?` <span style="color:var(--muted);font-weight:600;font-size:11px">(${num(e.completed)}/${num(e.total)})</span>`:''}</div>`;
      list.appendChild(row);});
    const pie=card.querySelector('.ana-pie');
    pie.appendChild(donut(dd,{size:184,thick:30,center:anaSpec.metric==='gmv'?money(topSum):num(topSum),centerSub:isRate?'completed':'top '+topN.length}));
    const lg=el('div');lg.style.cssText='display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;margin-top:10px';
    lg.innerHTML=dd.map(d=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:9px;height:9px;border-radius:2px;background:${d.color};flex:none"></span>${d.label.length>18?d.label.slice(0,18)+'…':d.label}</span>`).join('');
    pie.appendChild(lg);
    box.innerHTML='';box.appendChild(card);
    const x=$('#ana-x');if(x)x.onclick=()=>exportCSV(arr.map((e,i)=>({rank:i+1,[anaSpec.dimLabel]:e.k,orders:e.total,completed:e.completed,completion_pct:e.total?+(e.completed/e.total*100).toFixed(1):0,completed_gmv:Math.round(e.gmv)})),'gopher_'+(anaSpec.asc?'bottom':'top')+'_'+anaSpec.dim+'_by_'+anaSpec.metric);
  }
  function syncControls(){
    $('#ord-q').value=F.kw||'';$('#f-year').value=F.year;
    $('#f-status').value=F.status;$('#f-cat').value=F.cat;$('#f-market').value=F.market;
    $('#f-device').value=F.device;$('#f-ar').value=F.ar;$('#f-dow').value=F.dow;
    $('#f-min').value=F.min??'';$('#f-max').value=F.max??'';
    $('#f-uid').value=F.uid??'';$('#f-gid').value=F.gid??'';
    // auto-open advanced filters if a user/gopher id is active so it's visible
    if((F.uid!=null||F.gid!=null) && $('#ord-adv')) $('#ord-adv').classList.remove('hide');
    // time select
    const key=(F.h0!=null&&F.h1!=null)?F.h0+'-'+F.h1:'all';
    const presets=['22-6','6-12','12-16','16-22','9-17'];
    if(key==='all'){$('#f-time').value='all';$('#f-time-custom').classList.add('hide');}
    else if(presets.includes(key)){$('#f-time').value=key;$('#f-time-custom').classList.add('hide');}
    else{$('#f-time').value='custom';$('#f-time-custom').classList.remove('hide');$('#f-h0').value=F.h0;$('#f-h1').value=F.h1;}
  }
  function renderChips(chips){
    const box=$('#iq-chips');if(!chips||!chips.length){box.innerHTML='';return;}
    box.innerHTML=chips.map(c=>`<span class="iqchip">${c[0]}: ${c[1]}</span>`).join('')+`<span class="iqchip clear" id="iq-clear">Clear all ✕</span>`;
    const cl=$('#iq-clear');if(cl)cl.onclick=()=>{F={status:'all',cat:'all',ar:'all',market:'all',device:'all',dow:'all',h0:null,h1:null,min:null,max:null,kw:'',year:'all',uid:null,gid:null};anaSpec=null;cohortSpec=null;$('#iq-q').value='';renderChips([]);syncControls();render();};
  }
  function render(){
    if(cohortSpec){renderCohortMode();return;}
    let rows=applyFilters(F);
    // when an analytical question is active, scope the cards + table to the orders in the top-N answer
    let scoped=rows, anaData=null, scopedLabel='';
    if(anaSpec){
      // geographic excludes ("outside of NC") filter orders by state; other excludes match the dimension key
      const _stCode=x=>{x=(''+x).trim().toLowerCase();return STATE_NAMES[x]||(/^[a-z]{2}$/.test(x)&&(M.order_states_present||[]).includes(x.toUpperCase())?x.toUpperCase():null);};
      let stateEx=[], otherEx=[];
      (anaSpec.exclude||[]).forEach(x=>{const sc=_stCode(x);if(sc)stateEx.push(sc);else otherEx.push(x);});
      const exRows=stateEx.length?rows.filter(o=>{const ds=(o.dstate||'').toUpperCase(),ms=(o.state||'').toUpperCase();return !stateEx.includes(ds)&&!stateEx.includes(ms);}):rows;
      anaData=iqAggregate(exRows,anaSpec);
      let arr=anaData.arr, missed=[];
      if(otherEx.length){
        otherEx.forEach(x=>{if(!arr.some(e=>matchKey(e.k,x)))missed.push(x);});
        arr=arr.filter(e=>!otherEx.some(x=>matchKey(e.k,x)));
      }
      anaData={arr,val:anaData.val};
      anaSpec._missed=missed;
      // chart shows anaSpec.n groups; the table/cards scope to scopeN groups (1 for "what/which … most")
      const scopeGroups=arr.slice(0,anaSpec.scopeN||anaSpec.n);
      const keys=new Set(scopeGroups.map(e=>e.k));
      scoped=exRows.filter(o=>keys.has(dimKey(o,anaSpec.dim)));
      if(anaSpec.scopeCompleted) scoped=scoped.filter(o=>o.status==='delivered');
      const oneLab = anaSpec.dim==='dow' ? `on ${(scopeGroups[0]||{}).k}` : `for ${anaSpec.dimLabel} ${(scopeGroups[0]||{}).k}`;
      scopedLabel=(anaSpec.scopeCompleted?'completed ':'')+(scopeGroups.length===1?oneLab:(scopeGroups.length>=arr.length?`across all ${scopeGroups.length} ${anaSpec.pl}`:`in top ${scopeGroups.length} ${anaSpec.pl}`));
    }
    lastRows=scoped;
    // newest first — merged/appended orders would otherwise never appear in the first 300
    scoped.sort((a,b)=>(b.day-a.day)||((b.id||0)-(a.id||0)));
    const dlv=scoped.filter(o=>o.status==='delivered');
    const gmv=dlv.reduce((a,o)=>a+o.total,0);
    sum.innerHTML='';
    sum.appendChild(kpi('Matching orders',num(scoped.length),anaSpec?scopedLabel:`of ${num(ORD.length)} total`,{dot:C.blue}));
    sum.appendChild(kpi('Completed',num(dlv.length),scoped.length?(dlv.length/scoped.length*100).toFixed(0)+'% completion':'—',{dot:C.green}));
    sum.appendChild(kpi('GMV (completed)',money(gmv),dlv.length?money(gmv/dlv.length)+' avg':'—',{dot:C.green}));
    sum.appendChild(kpi('Age-restricted',num(scoped.filter(o=>o.ar).length),anaSpec?scopedLabel:'of matches',{dot:C.red}));
    if(noteEl)noteEl.innerHTML=anaSpec
      ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>These four cards and the table are scoped to your iQ answer — only orders ${scopedLabel}. Clear the question to see all ${num(ORD.length)} orders.`
      :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>Counts, GMV and completion run across <b>all ${num(ORD.length)} orders</b>. Every consumer order is a Gopher Request submission today — Connect & Deal will appear as a Source filter once they transact.`;
    // table (cap display at 300 for speed)
    buildOrdersTable(scoped);
    renderAnalysis(rows,anaData);
  }
  function runIQ(text){
    const cs=iqCohort(text);
    if(cs){
      F={status:'all',cat:'all',catNot:null,catIn:null,ar:'all',market:'all',device:'all',dow:'all',h0:null,h1:null,min:null,max:null,kw:'',year:'all',uid:null,gid:null,repeat:false};
      cohortSpec=cs;anaSpec=null;
      renderChips([[cap(cs.subject),cs.opLabel+' '+cs.n+' '+cs.fieldLabel+(cs.yearLabel?' '+cs.yearLabel:'')]]);
      syncControls();render();return;
    }
    F={status:'all',cat:'all',catNot:null,catIn:null,ar:'all',market:'all',device:'all',dow:'all',h0:null,h1:null,min:null,max:null,kw:'',year:'all',uid:null,gid:null,repeat:false};
    const {F:nf,chips}=iqParse(text);F=Object.assign(F,nf);cohortSpec=null;anaSpec=iqAnalysis(text);if(anaSpec&&anaSpec.exclude&&anaSpec.exclude.length)chips.push(['Excluding',anaSpec.exclude.join(', ')]);renderChips(chips);syncControls();render();}

  setTimeout(()=>{ if(!v.isConnected)return;
    $('#iq-go').onclick=()=>runIQ($('#iq-q').value);
    $('#iq-q').onkeydown=e=>{if(e.key==='Enter')runIQ($('#iq-q').value);};
    v.querySelectorAll('.iq-eg').forEach(s=>s.onclick=()=>{$('#iq-q').value=s.textContent;runIQ(s.textContent);});
    $('#ord-q').oninput=e=>{F.kw=e.target.value.trim();render();};
    $('#f-status').onchange=e=>{F.status=e.target.value;render();};
    $('#f-cat').onchange=e=>{F.cat=e.target.value;F.catNot=null;F.catIn=null;render();};
    $('#f-year').onchange=e=>{F.year=e.target.value;render();};
    $('#f-market').onchange=e=>{F.market=e.target.value;render();};
    $('#f-device').onchange=e=>{F.device=e.target.value;render();};
    $('#f-ar').onchange=e=>{F.ar=e.target.value;render();};
    $('#f-dow').onchange=e=>{F.dow=e.target.value;render();};
    $('#f-min').onchange=e=>{F.min=e.target.value?+e.target.value:null;render();};
    $('#f-max').onchange=e=>{F.max=e.target.value?+e.target.value:null;render();};
    $('#f-uid').onchange=e=>{F.uid=e.target.value?+e.target.value:null;render();};
    $('#f-gid').onchange=e=>{F.gid=e.target.value?+e.target.value:null;render();};
    $('#f-time').onchange=e=>{const val=e.target.value;
      if(val==='all'){F.h0=F.h1=null;$('#f-time-custom').classList.add('hide');}
      else if(val==='custom'){$('#f-time-custom').classList.remove('hide');}
      else{const[a,b]=val.split('-').map(Number);F.h0=a;F.h1=b;$('#f-time-custom').classList.add('hide');}
      render();};
    const setCustom=()=>{const a=parseInt($('#f-h0').value),b=parseInt($('#f-h1').value);if(!isNaN(a)&&!isNaN(b)){F.h0=((a%24)+24)%24;F.h1=((b%24)+24)%24;render();}};
    $('#f-h0').onchange=setCustom;$('#f-h1').onchange=setCustom;
    $('#ord-more').onclick=()=>$('#ord-adv').classList.toggle('hide');
    $('#ord-export').onclick=()=>exportCSV(lastRows.map(o=>({
      order_id:o.id, created_date:dayToStr(o.day), created_hour:o.h, day_of_week:DOWN[o.w], year:o.year,
      category:o.cat, title:o.title, description:o.desc, status:o.status, payment_status:o.pay,
      age_restricted:o.ar?'yes':'no', requestor:o.req, requestor_id:o.reqId, gopher:o.gopher, gopher_id:o.gopherId, market:o.state,
      dropoff_city:o.dcity, dropoff_state:o.dstate, dropoff_zip:o.dzip, device:o.dev,
      order_type:o.offerC===0?'Bids':'Fixed', offer:o.offerC===0?'':o.offerC.toFixed(2),
      item_cost:o.itemCostC.toFixed(2), gopher_offer:o.offerC.toFixed(2), gopher_fee:o.gopherFee.toFixed(2),
      age_fee:o.arf.toFixed(2), instant_transfer_fee:o.itf.toFixed(2),
      grand_total:o.totalC.toFixed(2), net_to_gopher_inc:o.net.toFixed(2)
    })),'gopher_orders_full');
    render();
  },0);
  return v;
};
