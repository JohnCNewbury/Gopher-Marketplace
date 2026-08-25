#!/usr/bin/env node
/* Behavioural equivalence: the PROTOTYPE's real stepGate() vs the shared module's
   model of it (SURFACE_GATES.prototype).
   Run: node docs/handoff/request-app-parity/test-prototype-stepgate-equivalence.js

   WHY THIS EXISTS. run_parity_harness.py compares this surface by SOURCE TEXT —
   it reads labels out of stepGate() with a regex. That is structurally blind to a
   gate that is simply ABSENT: with no `state.step === 4` clause in the prototype
   there is no label to compare, so the harness was green for months while the
   prototype let a requester walk past "Locations" with BOTH address fields blank
   and reach Review with the destination rendering as an em-dash. The harness even
   says so in a comment: "EXECUTING stepGate() is the honest fix." This is that fix.

   It found the address gap on 2026-08-25 (owner: align the prototype with Request
   web + Connect) and now guards against it returning.

   ⚠️ isVisible() is built from the file's OWN FIELD_HIDDEN_FOR table, not stubbed
   to true. A stub hides exactly the category-dependent divergences this looks for —
   and that table is a HIDE list, so isVisible(f) = !FIELD_HIDDEN_FOR[f].includes(cat).

   ⚠️ Mutation-tested before being accepted, per the standing rule that a green test
   which cannot fail proves nothing: removing both address gates yields 288
   disagreements, and dropping only the noSpecificPickup guard (which over-blocks
   rather than under-blocks) yields 216.
*/
const fs=require('fs'),path=require('path');
const ROOT="/Users/johnnewbury/Desktop/All New Gopher/Documentation/Claude Code Review:Cleanup/Code";
const src=fs.readFileSync(path.join(ROOT,'_prototypes/Request/gopher-request-flow.html'),'utf8');
const G=require(path.join(ROOT,'Final/assets/js/gopher-step-gates.js'));

function brace(from){let j=src.indexOf('{',from),d=0,k=j;
  for(;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)break;}}return src.slice(from,k+1);}
const stepGateSrc=brace(src.indexOf('function stepGate('));

/* Real FIELD_HIDDEN_FOR straight out of the file. */
const fhStart=src.indexOf('const FIELD_HIDDEN_FOR = {');
const FH=eval('('+brace(fhStart+'const FIELD_HIDDEN_FOR = '.length-1).replace(/\/\*[\s\S]*?\*\//g,'')+')');
const CATS=Object.keys(eval('('+brace(src.indexOf('const CATEGORIES = {')+'const CATEGORIES = '.length-1)+')'));
if(!FH.pickupSection||CATS.length<6) throw new Error('extraction failed');

const firstEmptyStop=a=>{if(!Array.isArray(a))return -1;
  for(let i=0;i<a.length;i++){if(!String(a[i]==null?'':a[i]).trim())return i;}return -1;};

/* ⚠️ TWO DIFFERENT implementations on purpose, and the difference IS the test.
   • protoIdentity — the REAL identitySatisfied() lifted verbatim out of the file, so
     the prototype side runs its own logic. An earlier version injected the mirror
     below into BOTH sides; that is mocking the unit under test, and it showed:
     narrowing the file's version to `trustShield` only — which would make TrustShield
     mandatory instead of persistent, inverting the owner's ruling — produced ZERO
     disagreements. The check could not see the thing it existed to check.
   • CANON — the contract the module's host is required to honour, mirroring web's
     identityVerified(): hasTS || submittedAt || onFile. If the file drifts off this,
     the two sides now disagree and the sweep says so. */
const protoIdentitySrc = (function(){
  const m = src.match(/function identitySatisfied\(\)\{[^}]*\}/);
  if(!m) throw new Error('identitySatisfied() not found — extraction failed');
  return m[0];
})();
const protoIdentity = st => new Function('state', protoIdentitySrc + '; return identitySatisfied();')(st);
/* Same rule for normAddr: LIFTED, not re-implemented. It decides whether two addresses
   are "the same", so a hand-written copy here would let the file's real normaliser drift
   (e.g. stop stripping punctuation) while this sweep kept agreeing with itself. */
const protoNormAddrSrc = (function(){
  const m = src.match(/function normAddr\([^)]*\)\{[^}]*\}/);
  if(!m) throw new Error('normAddr() not found — extraction failed');
  return m[0];
})();
const CANON = st => !!(st.trustShield || st.idSubmittedAt || st.savedOnFile);
function runProto(st){
  const isVisible=f=>!(FH[f]||[]).includes(st.category);
  const f=new Function('state','isVisible','toNum','findAgeRestrictedKeyword','firstEmptyStop',
    'bidsAllowed','perWorkerPay','identitySatisfied','normAddr',
    protoNormAddrSrc+'\n'+stepGateSrc+'; return stepGate();');
  return f(st,isVisible,v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.]/g,''));return isNaN(n)?0:n;},
    ()=>null,firstEmptyStop,()=>false,()=>st.payAmount?parseFloat(st.payAmount)||0:0,
    ()=>protoIdentity(st), null);
}
function runModule(st){
  const host={isVisible:f=>!(FH[f]||[]).includes(st.category),bidsAllowed:()=>false,
    /* Was hardcoded TRUE, which made the identity gate unreachable on the module side
       just as ageRestricted:false made it unreachable on the prototype's — the sweep
       reported "0 disagreements" while blind to the whole gate. Both now read state. */
    identityVerified:()=>CANON(st),
    findAgeRestrictedKeyword:()=>null,customerAge:()=>40,
    perWorkerPay:()=>st.payAmount?parseFloat(st.payAmount)||0:0};
  return G.evaluate(st,host,'prototype');
}
const B=o=>Object.assign({step:1,category:'delivery',description:'x',itemsPurchased:false,
  costOfItems:'',ageRestricted:false,ageKeywordAck:false,noSpecificPickup:false,
  pickupStops:['1 A St'],dropoffStops:['2 B St'],payMode:'set',payAmount:'40',
  scheduleType:'now',timeSlot:'',waiverChecked:true,
  trustShield:false,idSubmittedAt:null,savedOnFile:false},o);

let n=0,diff=0;const seen=new Set();
for(const category of CATS)
 for(const step of [1,2,3,4,5,6])
  for(const pu of [['1 A St'],[''],['1 A St','']])
   /* ⚠️ '1 A St' is here ON PURPOSE — it MATCHES a pickup option, and without an
      identical pair the addressesDiffer gate never fires and this sweep is blind to
      it. That has now happened three times in this file (ageRestricted fixed false,
      identitySatisfied injected, addresses never equal): a dimension that is never
      varied is a gate that is never tested, and the suite still reports PASS.
      '1 a st.' also differs from '1 A St' only in case and punctuation, so it proves
      the normaliser is actually applied rather than a raw string compare. */
   for(const dp of [['2 B St'],[''],['2 B St',''],['1 A St'],['1 a st.']])
    for(const nsp of [false,true])
     for(const pay of ['40','','0'])
      for(const waiver of [true,false])
      /* scheduleType/timeSlot — previously fixed at now/'' so scheduleTime never ran. */
      for(const [schedType,slot] of [['now',''],['scheduled','2:00 PM'],['scheduled','']])
       /* The identity dimension. ageRestricted was previously FIXED false, so the
          identity gate never once executed and the sweep's green was meaningless.
          The four identity states are: nothing, a one-off submission, the badge, and
          ID kept on file — the last three must all SATISFY the gate, because the
          ruling is that submission and TrustShield differ in PERSISTENCE, not in
          whether they count. */
       for(const [ar,ident] of [[false,{}],[true,{}],
                                [true,{idSubmittedAt:1}],
                                [true,{trustShield:true}],
                                [true,{savedOnFile:true}]])
        for(const purchased of [false,true]){
        const st=B(Object.assign({category,step,pickupStops:pu,dropoffStops:dp,noSpecificPickup:nsp,
                    payAmount:pay,waiverChecked:waiver,itemsPurchased:purchased,
                    costOfItems:purchased?'':'',ageRestricted:ar,
                    scheduleType:schedType,timeSlot:slot},ident));
        n++;
        const p=runProto(st),m=runModule(st);
        if(p.ok!==m.ok){diff++;
          const k=[category,step,p.ok,m.ok,m.id].join('|');
          if(!seen.has(k)){seen.add(k);
            console.log(`⚠ ${category} step${step} ar=${st.ageRestricted} sched=${st.scheduleType}/${st.timeSlot||'-'} ts=${st.trustShield} sub=${!!st.idSubmittedAt} file=${st.savedOnFile} pu=${JSON.stringify(pu)} dp=${JSON.stringify(dp)} nsp=${nsp} → proto ${p.ok?'passes':'blocks'} / module ${m.ok?'passes':'blocks '+m.id}`);}}
       }
console.log('\ncases: '+n+'   disagreements: '+diff);
if (diff) {
  console.log('\nFAIL — the prototype and the shared module disagree. Either the');
  console.log('prototype drifted, or SURFACE_GATES.prototype no longer describes it.');
  process.exit(1);
}
console.log('PASS — prototype stepGate() matches SURFACE_GATES.prototype exactly.');
