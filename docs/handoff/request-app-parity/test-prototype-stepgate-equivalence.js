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

function runProto(st){
  const isVisible=f=>!(FH[f]||[]).includes(st.category);
  const f=new Function('state','isVisible','toNum','findAgeRestrictedKeyword','firstEmptyStop',
    'bidsAllowed','perWorkerPay',stepGateSrc+'; return stepGate();');
  return f(st,isVisible,v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.]/g,''));return isNaN(n)?0:n;},
    ()=>null,firstEmptyStop,()=>false,()=>st.payAmount?parseFloat(st.payAmount)||0:0);
}
function runModule(st){
  const host={isVisible:f=>!(FH[f]||[]).includes(st.category),bidsAllowed:()=>false,
    identityVerified:()=>true,findAgeRestrictedKeyword:()=>null,customerAge:()=>40,
    perWorkerPay:()=>st.payAmount?parseFloat(st.payAmount)||0:0};
  return G.evaluate(st,host,'prototype');
}
const B=o=>Object.assign({step:1,category:'delivery',description:'x',itemsPurchased:false,
  costOfItems:'',ageRestricted:false,ageKeywordAck:false,noSpecificPickup:false,
  pickupStops:['1 A St'],dropoffStops:['2 B St'],payMode:'set',payAmount:'40',
  scheduleType:'now',timeSlot:'',waiverChecked:true},o);

let n=0,diff=0;const seen=new Set();
for(const category of CATS)
 for(const step of [1,2,3,4,5,6])
  for(const pu of [['1 A St'],[''],['1 A St','']])
   for(const dp of [['2 B St'],[''],['2 B St','']])
    for(const nsp of [false,true])
     for(const pay of ['40','','0'])
      for(const waiver of [true,false])
       for(const purchased of [false,true]){
        const st=B({category,step,pickupStops:pu,dropoffStops:dp,noSpecificPickup:nsp,
                    payAmount:pay,waiverChecked:waiver,itemsPurchased:purchased,
                    costOfItems:purchased?'':''});
        n++;
        const p=runProto(st),m=runModule(st);
        if(p.ok!==m.ok){diff++;
          const k=[category,step,p.ok,m.ok,m.id].join('|');
          if(!seen.has(k)){seen.add(k);
            console.log(`⚠ ${category} step${step} pu=${JSON.stringify(pu)} dp=${JSON.stringify(dp)} nsp=${nsp} → proto ${p.ok?'passes':'blocks'} / module ${m.ok?'passes':'blocks '+m.id}`);}}
       }
console.log('\ncases: '+n+'   disagreements: '+diff);
if (diff) {
  console.log('\nFAIL — the prototype and the shared module disagree. Either the');
  console.log('prototype drifted, or SURFACE_GATES.prototype no longer describes it.');
  process.exit(1);
}
console.log('PASS — prototype stepGate() matches SURFACE_GATES.prototype exactly.');
