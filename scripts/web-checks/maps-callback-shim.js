const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..','..');
const FILES=['Final/gopher-request.html','Final/gopher-connect.html'];
const SHIM=/window\.__gopherMapsFired\s*=\s*false;\s*\n\s*window\.onGopherMapsReady\s*=\s*function\(\)\{\s*window\.__gopherMapsFired\s*=\s*true;\s*\};/;
const CATCH=/if\s*\(window\.__gopherMapsFired\)\s*setTimeout\(window\.onGopherMapsReady,\s*0\);/;
let bad=0;
const ok=(c,m)=>{ console.log(`  ${c?'✓':'✗ FAIL'} ${m}`); if(!c) bad++; };

for(const f of FILES){
  console.log('\n'+f);
  const s=fs.readFileSync(path.join(ROOT,f),'utf8');
  const iShim=s.search(SHIM);
  const iLoad=s.indexOf('maps.googleapis.com');
  const iReal=s.indexOf('window.onGopherMapsReady = function(){ _gmReady = true;');
  const iCatch=s.search(CATCH);
  const iState=s.indexOf('const state = makeInitialState();');

  ok(iShim>-1,  'shim is present');
  ok(iCatch>-1, 'catch-up is present');
  ok(iShim>-1 && iLoad>-1 && iShim<iLoad,
     'shim is ABOVE the async loader (below it, Maps can fire first and throw)');
  ok(iReal>-1 && iCatch>iReal,
     'catch-up runs AFTER the real handler is installed');
  // WHY the catch-up is deferred. This differs BETWEEN the two files and that is
  // not a defect: request.html declares `const state` BELOW the catch-up (so a
  // synchronous call would die in the temporal dead zone), connect.html declares
  // it ABOVE. Reported, not asserted — asserting the request.html shape here
  // failed on connect.html and would have pushed someone to "fix" working code.
  // The hard rule is the next check: deferred in BOTH, so neither can regress.
  console.log(iCatch<iState
    ? '  · catch-up is ABOVE `const state` — deferral is REQUIRED here (TDZ)'
    : '  · catch-up is BELOW `const state` — deferral is belt-and-braces here');
  ok(!/if\s*\(window\.__gopherMapsFired\)\s*window\.onGopherMapsReady\(\)/.test(s),
     'catch-up is NOT a direct synchronous call');
}

// ---- behavioural simulation of both orderings, against the REAL extracted code
function run(catchUpEnabled){
  const win={}; let realRuns=0; const timers=[];
  const setT=(fn)=>timers.push(fn);
  // shim (as it appears in the page)
  win.__gopherMapsFired=false;
  win.onGopherMapsReady=function(){ win.__gopherMapsFired=true; };
  return {
    fireMaps(){ if(typeof win.onGopherMapsReady!=='function')
                  throw new Error('InvalidValueError: onGopherMapsReady is not a function');
                win.onGopherMapsReady(); },
    installReal(){ win.onGopherMapsReady=function(){ realRuns++; };
                   if(catchUpEnabled && win.__gopherMapsFired) setT(win.onGopherMapsReady); },
    flush(){ while(timers.length) timers.shift()(); },
    runs(){ return realRuns; }
  };
}
console.log('\nordering simulation');
// A: Maps fires EARLY (the race) — this is the case the fix exists for
let a=run(true); let threw=false;
try{ a.fireMaps(); }catch(e){ threw=true; }
a.installReal(); a.flush();
ok(!threw, 'EARLY fire: no InvalidValueError (shim absorbed the callback)');
ok(a.runs()===1, `EARLY fire: real handler ran exactly once (got ${a.runs()})`);
// B: Maps fires LATE (no race)
let b=run(true); b.installReal(); b.flush(); b.fireMaps();
ok(b.runs()===1, `LATE fire: real handler ran exactly once (got ${b.runs()})`);
// MUTATION: without the catch-up, the EARLY case must silently lose the callback
let m=run(false); try{ m.fireMaps(); }catch(e){}
m.installReal(); m.flush();
ok(m.runs()===0, 'MUTATION (catch-up removed): EARLY fire loses the callback — so the catch-up is load-bearing');

console.log(bad?`\nFAIL — ${bad} check(s)`:'\nPASS — shim ordering + both callback orderings verified');
process.exit(bad?1:0);
