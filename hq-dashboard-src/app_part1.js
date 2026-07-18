/* ============ Gopher HQ — app.js ============ */
const M = JSON.parse(document.getElementById('metrics').textContent);
let ROLE = 'admin';            // 'admin' | 'owner' — gates Pricing Control
let PRICING = null;            // single source of truth, seeded in init()
let PRICING_AUDIT = [];        // change log

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const fmt = n => { const s=n<0?'-':''; n=Math.abs(+n||0); return s+(n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+'k':(''+Math.round(n))); };
const money = n => '$'+fmt(n);
const moneyFull = n => '$'+Math.round(n).toLocaleString();
const num = n => Math.round(n).toLocaleString();
const pct = n => (n).toFixed(1)+'%';
const monShort = ym => {const[y,m]=ym.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+" '"+y.slice(2);};
const C = {green:'#13C26B',greenB:'#34E27A',blue:'#3E7BFA',violet:'#7C5CFC',amber:'#E8920C',red:'#E5484D',grey:'#B7C4D0',ink:'#0B1A2B'};

/* ---------- SVG chart helpers (dependency-free) ---------- */
function svgEl(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;}

function lineChart(series, opts={}){
  // series: [{name,color,data:[{x,y}],dashed?}]  x is label, y number
  const W=opts.w||640,H=opts.h||230,pad={l:46,r:14,t:14,b:30};
  const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:'100%',height:H,preserveAspectRatio:'none'});
  if(!series.length || !series[0].data.length){const t=svgEl('text',{x:W/2,y:H/2,'text-anchor':'middle','font-size':12,fill:'#90A2B3'});t.textContent='No data for this filter';svg.appendChild(t);return svg;}
  const xs=series[0].data.map(d=>d.x);
  const allY=series.flatMap(s=>s.data.map(d=>d.y));
  let max=Math.max(...allY,1), min=Math.min(0,...allY);
  max=max*1.12;
  const ix=i=>pad.l+(W-pad.l-pad.r)*(xs.length<2?.5:i/(xs.length-1));
  const iy=v=>H-pad.b-(H-pad.t-pad.b)*((v-min)/(max-min||1));
  // gridlines
  for(let g=0;g<=4;g++){const v=min+(max-min)*g/4;const y=iy(v);
    svg.appendChild(svgEl('line',{x1:pad.l,x2:W-pad.r,y1:y,y2:y,stroke:'#EDF1F4','stroke-width':1}));
    const t=svgEl('text',{x:pad.l-8,y:y+3,'text-anchor':'end','font-size':10,fill:'#90A2B3','font-weight':600});t.textContent=opts.money?money(v):fmt(v);svg.appendChild(t);
  }
  // x labels (sparse)
  const step=Math.ceil(xs.length/7);
  xs.forEach((x,i)=>{const isLast=i===xs.length-1;if(!isLast && (i%step!==0 || i>xs.length-1-Math.ceil(step/1.5)))return;const anchor=i===0?'start':isLast?'end':'middle';const t=svgEl('text',{x:ix(i),y:H-10,'text-anchor':anchor,'font-size':10,fill:'#90A2B3','font-weight':600});t.textContent=x;svg.appendChild(t);});
  series.forEach(s=>{
    let d='';s.data.forEach((p,i)=>{d+=(i?'L':'M')+ix(i)+' '+iy(p.y)+' ';});
    if(opts.area && !s.dashed){
      const a=d+`L${ix(s.data.length-1)} ${H-pad.b} L${ix(0)} ${H-pad.b} Z`;
      const gid='g'+Math.random().toString(36).slice(2,7);
      const grad=svgEl('linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1});
      grad.appendChild(svgEl('stop',{offset:'0%','stop-color':s.color,'stop-opacity':.18}));
      grad.appendChild(svgEl('stop',{offset:'100%','stop-color':s.color,'stop-opacity':0}));
      svg.appendChild(grad);
      svg.appendChild(svgEl('path',{d:a,fill:`url(#${gid})`}));
    }
    svg.appendChild(svgEl('path',{d,fill:'none',stroke:s.color,'stroke-width':opts.thin?2:2.6,'stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':s.dashed?'5 4':'0'}));
    if(opts.dots!==false) s.data.forEach((p,i)=>{ if(i===s.data.length-1) svg.appendChild(svgEl('circle',{cx:ix(i),cy:iy(p.y),r:3.4,fill:'#fff',stroke:s.color,'stroke-width':2.4})); });
  });
  return svg;
}

function stackChart(rows, keys, colors, opts={}){
  // rows:[{label,k1,k2..}]
  const W=opts.w||640,H=opts.h||230,pad={l:42,r:12,t:12,b:30};
  const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:'100%',height:H});
  const totals=rows.map(r=>keys.reduce((a,k)=>a+(r[k]||0),0));
  let max=Math.max(...totals,1)*1.08;
  const n=rows.length;const bw=(W-pad.l-pad.r)/n*0.62; const gap=(W-pad.l-pad.r)/n;
  for(let g=0;g<=4;g++){const v=max*g/4;const y=H-pad.b-(H-pad.t-pad.b)*(v/max);
    svg.appendChild(svgEl('line',{x1:pad.l,x2:W-pad.r,y1:y,y2:y,stroke:'#EDF1F4'}));
    const t=svgEl('text',{x:pad.l-7,y:y+3,'text-anchor':'end','font-size':10,fill:'#90A2B3','font-weight':600});t.textContent=fmt(v);svg.appendChild(t);}
  const step=Math.ceil(n/8);
  rows.forEach((r,i)=>{
    const x=pad.l+gap*i+(gap-bw)/2; let yacc=H-pad.b;
    keys.forEach((k,ki)=>{const h=(H-pad.t-pad.b)*((r[k]||0)/max); yacc-=h;
      const rc=svgEl('rect',{x,y:yacc,width:bw,height:Math.max(0,h),fill:colors[ki],rx:ki===keys.length-1?3:0});svg.appendChild(rc);});
    if(i%step===0||i===n-1){const t=svgEl('text',{x:x+bw/2,y:H-9,'text-anchor':'middle','font-size':10,fill:'#90A2B3','font-weight':600});t.textContent=r.label;svg.appendChild(t);}
  });
  return svg;
}

function donut(data, opts={}){ // data:[{label,value,color}]
  const sz=opts.size||168, r=sz/2-6, cx=sz/2, cy=sz/2, thick=opts.thick||26;
  const svg=svgEl('svg',{viewBox:`0 0 ${sz} ${sz}`,width:sz,height:sz});
  const tot=data.reduce((a,d)=>a+d.value,0)||1; let a0=-Math.PI/2;
  data.forEach(d=>{const a1=a0+d.value/tot*Math.PI*2;
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const large=(a1-a0)>Math.PI?1:0;
    svg.appendChild(svgEl('path',{d:`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`,fill:'none',stroke:d.color,'stroke-width':thick,'stroke-linecap':'butt'}));
    a0=a1;});
  if(opts.center){const t=svgEl('text',{x:cx,y:cy-2,'text-anchor':'middle','font-size':22,'font-weight':800,fill:'#0E2233'});t.textContent=opts.center;svg.appendChild(t);
    const s=svgEl('text',{x:cx,y:cy+15,'text-anchor':'middle','font-size':10,fill:'#90A2B3','font-weight':700});s.textContent=opts.centerSub||'';svg.appendChild(s);}
  return svg;
}

function gauge(value, opts={}){ // value 0-100
  const W=200,H=120,cx=100,cy=108,r=80;
  const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H});
  const pol=(ang)=>[cx+r*Math.cos(Math.PI*(1-ang/100)),cy-r*Math.sin(Math.PI*(1-ang/100))];
  const arc=(a,b,col,w)=>{const[x0,y0]=pol(a),[x1,y1]=pol(b);const large=(b-a)>50?1:0;return svgEl('path',{d:`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`,fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round'});};
  svg.appendChild(arc(0,100,'#EDF1F4',16));
  const col=value<40?C.red:value<60?C.amber:C.green;
  svg.appendChild(arc(0,Math.max(2,value),col,16));
  const[nx,ny]=pol(value);
  svg.appendChild(svgEl('circle',{cx:nx,cy:ny,r:6,fill:'#fff',stroke:col,'stroke-width':3}));
  return svg;
}

function spark(data,color){
  const W=88,H=30;const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H});
  const max=Math.max(...data),min=Math.min(...data);let d='';
  data.forEach((v,i)=>{const x=W*i/(data.length-1);const y=H-2-(H-4)*((v-min)/(max-min||1));d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';});
  svg.appendChild(svgEl('path',{d,fill:'none',stroke:color,'stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'}));
  return svg;
}

/* card builder */
function card(title, sub, bodyNode, opts={}){
  const c=el('div','card'+(opts.pad0?' pad0':''));
  if(title){const h=el('div','card-h');
    const left=el('div',null,`<h3>${title}</h3>${sub?`<div class="sub">${sub}</div>`:''}`);
    h.appendChild(left); if(opts.right)h.appendChild(opts.right);
    if(opts.pad0){h.style.padding='18px 18px 0';} c.appendChild(h);}
  if(bodyNode)c.appendChild(bodyNode);
  return c;
}
function legend(items){const l=el('div','legend');items.forEach(it=>l.appendChild(el('span',null,`<i style="background:${it.color}"></i>${it.label}`)));return l;}

/* ============ NAV ============ */
const NAV=[
 {grp:'Operate',items:[
   {id:'snapshot',name:'Daily Snapshot',icon:'calendar',pill:{t:'NEW',c:'new'}},
   {id:'overview',name:'Overview',icon:'grid'},
   {id:'health',name:'Marketplace Health',icon:'pulse',pill:{t:'',c:''}},
   {id:'orders',name:'Orders',icon:'box'},
 ]},
 {grp:'Grow',items:[
   {id:'growth',name:'Growth & Acquisition',icon:'trend'},
   {id:'people',name:'Users',icon:'users'},
   {id:'messaging',name:'Messaging',icon:'alert',pill:{t:'NEW',c:'new'}},
   {id:'revenue',name:'Revenue',icon:'dollar'},
 ]},
 {grp:'Platforms',items:[
   {id:'p-request',name:'Request (web + mobile)',icon:'phone'},
   {id:'p-go',name:'Go (gopher app)',icon:'run'},
   {id:'p-connect',name:'Connect (B2B)',icon:'building',pill:{t:'NEW',c:'new'}},
   {id:'p-deal',name:'Deals',icon:'tag',pill:{t:'NEW',c:'new'}},
   {id:'p-rewards',name:'Rewards',icon:'star',pill:{t:'2027',c:'soon'}},
 ]},
 {grp:'Reports',collapsible:true,collapsed:true,items:[
   {id:'dma',name:'Marketing · DMA',icon:'pin'},
   {id:'referrals',name:'Referrals',icon:'users'},
   {id:'invites',name:'Invites',icon:'users'},
   {id:'otps',name:'SMS OTP',icon:'shield'},
   {id:'email_otp',name:'Email OTP',icon:'shield'},
   {id:'bids',name:'Bids',icon:'doc'},
   {id:'gopher_offers',name:'Gopher Offers',icon:'doc'},
   {id:'counter_offers',name:'Counter Offers',icon:'doc'},
   {id:'order_declines',name:'Order Declines',icon:'doc'},
   {id:'cost_adjustments',name:'Cost Adjustments',icon:'doc'},
   {id:'ooa',name:'Out-of-Area Demand',icon:'pin'},
   {id:'addresses',name:'Addresses',icon:'pin'},
 ]},
 {grp:'Listen',items:[
   {id:'quality',name:'Quality & Safety',icon:'shield'},
   {id:'cancellations',name:'Cancellation Alerts',icon:'tag'},
   {id:'inapp',name:'Message Alerts',icon:'alert'},
   {id:'reviews',name:'Ratings/Reviews',icon:'reviews'},
   {id:'support',name:'Support',icon:'chat',pill:{t:'ex-Reports',c:''}},
 ]},
 {grp:'Tools',items:[
   {id:'greenboard',name:'Green Board',icon:'board',pill:{t:'iQ',c:'new'}},
   {id:'gamechanger',name:'Game Changer',icon:'bolt',pill:{t:'KEY',c:'new'}},
   {id:'builder',name:'Report Builder',icon:'sliders'},
   {id:'financials',name:'Financials',icon:'bank'},
   {id:'pricing',name:'Pricing Control',icon:'price',pill:{t:'OWNER',c:'soon'}},
 ]},
];
const ICONS={
 calendar:'<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>',
 doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
 pin:'<path d="M12 21s7-6.7 7-12a7 7 0 1 0-14 0c0 5.3 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
 reviews:'<path d="M12 3l2.5 5.1 5.6.8-4 3.9 1 5.6L12 16l-5 2.6 1-5.6-4-3.9 5.6-.8L12 3Z"/>',
 alert:'<path d="M12 3 2 20h20L12 3Zm0 6v5m0 3h.01"/>',
 board:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8.5 21h7M12 18v3"/><path d="m12 8 .9 2.4 2.5.2-1.9 1.6.6 2.4-2.1-1.3-2.1 1.3.6-2.4-1.9-1.6 2.5-.2L12 8Z"/>',
 bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
 bank:'<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 21h18"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
 box:'<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
 trend:'<path d="M3 17 9 11l4 4 8-8"/><path d="M21 7v5h-5"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M17 8.5a3 3 0 1 0-1-5.8"/><path d="M16.5 14c2.5.3 4.5 2 4.5 4.5"/>',
 dollar:'<path d="M12 2v20"/><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.8 7 6.8 9 9.5 12 10s5 1.4 5 3.6-2.2 3.4-5 3.4-5-1.2-5-3"/>',
 phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
 run:'<circle cx="13" cy="4.5" r="2"/><path d="m5 12 3-2 3 1 1 4 3 2"/><path d="m11 11-1 5-3 4"/><path d="m14 8 3 1 3-1"/>',
 building:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
 tag:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
 star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
 shield:'<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.2A8 8 0 1 1 21 12Z"/>',
 sliders:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M16 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
 price:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.4"/><path d="M12 8v8M14.5 10.2c0-1-1.1-1.6-2.5-1.6s-2.5.6-2.5 1.5 1 1.3 2.5 1.6 2.5.7 2.5 1.7-1.1 1.5-2.5 1.5-2.5-.5-2.5-1.4"/>',
};
function buildNav(){
  const nav=$('#nav');nav.innerHTML='';
  NAV.forEach(g=>{
    const items=el('div','grp-items');
    if(g.collapsible){
      const h=el('div','grp grp-toggle'+(g.collapsed?' collapsed':''));
      h.innerHTML=`<span>${g.grp}</span><svg class="chev" viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>`;
      h.onclick=()=>{h.classList.toggle('collapsed');items.classList.toggle('hide');};
      nav.appendChild(h);
      if(g.collapsed)items.classList.add('hide');
    } else {
      nav.appendChild(el('div','grp',g.grp));
    }
    g.items.forEach(it=>{
      const a=el('a');a.href='#'+it.id;a.dataset.id=it.id;
      a.innerHTML=`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[it.icon]||''}</svg><span>${it.name}</span>`;
      if(it.pill)a.innerHTML+=`<span class="pill ${it.pill.c}">${it.pill.t}</span>`;
      a.onclick=e=>{e.preventDefault();go(it.id);};
      items.appendChild(a);
    });
    nav.appendChild(items);
  });
}

const TITLES={
 snapshot:['Operate','Daily Snapshot','New users and orders at a glance — yesterday, last 7/30 days, lifetime, against prior periods.'],
 overview:['Operate','Overview','The one screen that answers “how is Gopher doing right now?”'],
 health:['Operate','Marketplace Health','Supply, demand, and the fulfillment gap that decides everything.'],
 orders:['Operate','Orders','Every request in one place — filter, search, and export in seconds.'],
 growth:['Grow','Growth & Acquisition','Where new users come from, and whether they ever come back.'],
 people:['Grow','Users','Requesters, gophers, and how verified your two-sided base really is.'],
 revenue:['Grow','Revenue','GMV, take rate, and exactly which fees pay the bills.'],
 'p-request':['Platforms','Gopher Request','The demand side — adoption, devices, markets, and requester cohorts.'],
 'p-go':['Platforms','Gopher Go','The supply side — worker adoption, coverage by market, and cohorts.'],
 'p-connect':['Platforms','Gopher Connect','On-demand workforce for businesses (web).'],
 'p-deal':['Platforms','Gopher Deals','Sponsored, pre-filled jobs that seed demand.'],
 'p-rewards':['Platforms','Gopher Rewards','Loyalty & retention — planned for early 2027.'],
 quality:['Listen','Quality & Safety','Ratings, flags, and the trust signals worth watching.'],
 inapp:['Listen','Message Alerts','Flagged in-app messages — language, threats, and off-platform attempts.'],
 support:['Listen','Support inbox','User-reported issues. (This is what the old panel mislabeled “Reports.”)'],
 gamechanger:['Tools','Game Changer','The single highest-leverage move, backed by your data.'],
 greenboard:['Tools','Green Board','Your always-on strategy desk — ask iQ anything about the business.'],
 builder:['Tools','Report Builder','Build any cut of the data without pooling four exports together.'],
 financials:['Tools','Financials','Upload monthly expenses; see them organized into C-corp statements.'],
 pricing:['Tools','Pricing Control','The dashboard is the source of truth — set fees here, then push to the apps and backend.'],
};

function go(id){
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.id===id));
  const act=document.querySelector('.nav a.active');
  if(act){const gi=act.closest('.grp-items');if(gi&&gi.classList.contains('hide')){gi.classList.remove('hide');const tg=gi.previousElementSibling;if(tg&&tg.classList.contains('grp-toggle'))tg.classList.remove('collapsed');}}
  const[grp,title,sub]=TITLES[id]||['','',''];
  $('#crumb').innerHTML=`${grp} / <b>${title}</b>`;$('#ptitle').textContent=title;$('#psub').textContent=sub;
  if(typeof renderTopFilters==='function') renderTopFilters(id);
  const c=$('#content');c.innerHTML='';c.appendChild(VIEWS[id]?VIEWS[id]():el('div','placeholder','Coming soon'));
  // platform filter contextual hint
  if(window.__closeNav) window.__closeNav();   // close the mobile drawer on navigation
  window.scrollTo(0,0);
}

function setupMobileNav(){
  const sb=document.querySelector('.sidebar'), scrim=$('#navScrim'), btn=$('#menuBtn');
  if(!sb||!btn) return;
  const open=()=>{sb.classList.add('open'); if(scrim)scrim.classList.add('show');};
  const close=()=>{sb.classList.remove('open'); if(scrim)scrim.classList.remove('show');};
  btn.onclick=()=>{ sb.classList.contains('open')?close():open(); };
  if(scrim) scrim.onclick=close;
  window.__closeNav=close;
  window.addEventListener('resize',()=>{ if(window.innerWidth>992) close(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
}
