const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=path.join(__dirname,'..','..','Final','assets','js','gopher-web-pt-bridge.js');
function loadBridge(){
  const win={ location:{hostname:'localhost', pathname:'/x.html', search:'?pt=1'}, URLSearchParams };
  win.window=win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(SRC,'utf8'), win);
  return win;
}
function mk(rec){
  const win=loadBridge();
  const D={ activeRequests:[rec], previousRequests:[], cancelledRequests:[], expiredRequests:[],
            myGophers:[], goTos:[], referrals:[], interested:[] };
  const host={ surface:'request', DASH_DATA:D, dashState:{}, startJob:function(){}, render:function(){} };
  const g=win.GopherWebPT.install(host);
  if(!g) throw new Error('install() returned null — PT gate did not open');
  return {g, rec};
}
let bad=0;
const ok=(c,m)=>{ console.log(`  ${c?'✓':'✗ FAIL'} ${m}`); if(!c) bad++; };

console.log('\nSINGLE-WORKER record (what the PT flow actually creates)');
console.log('  the app writes the requester\'s message to rec.thread — see');
console.log('  gopher-request.html sendInboxMessage(): crewName null -> r.thread\n');
{
  const rec={ id:'GR-1', __ptOwn:true, title:'t', userStarted:true,
              thread:[{from:'me', text:'are you close?', time:'2:05 PM'}] };
  const {g}=mk(rec);
  const got=g.messagesFrom('GR-1','Marcus Hale');
  ok(got.length===1, `requester message is relayed to the Gopher (got ${got.length}, want 1)`);
  ok(got.length===1 && got[0].text==='are you close?', 'the relayed text is the text that was typed');
}
console.log('\n  ...and a flagged requester message keeps its flag (app writes f:1)');
{
  const rec={ id:'GR-2', __ptOwn:true, thread:[{from:'me', text:'oi', time:'2:06 PM', f:1}] };
  const {g}=mk(rec);
  const got=g.messagesFrom('GR-2','Marcus Hale');
  ok(got.length===1 && got[0].flagged===true, 'flagged survives the relay');
}
console.log('\nGOPHER -> REQUESTER lands where the Inbox renders it');
{
  const rec={ id:'GR-3', __ptOwn:true };
  const {g}=mk(rec);
  g.message('GR-3','Marcus Hale','on my way',{from:'worker'});
  const single=(rec.thread||[]);
  ok(single.length===1, `written to rec.thread, the single-worker store (got ${single.length}, want 1)`);
  const m=single[0]||{};
  ok(!!m.time, `carries a time — the Inbox renders \${m.time} raw (got ${JSON.stringify(m.time)})`);
  ok(m.from!=='me', 'from is not "me" (renders as theirs)');
}
console.log('\n  a flagged worker message uses the app\'s own flag field');
{
  const rec={ id:'GR-4', __ptOwn:true };
  const {g}=mk(rec);
  g.message('GR-4','Marcus Hale','bad words',{from:'worker', flagged:true});
  const m=(rec.thread||[])[0]||{};
  ok(m.f===1||m.f===true, `uses m.f — the Inbox reads (m.f && m.from!=='me') (got ${JSON.stringify(m.f)})`);
}
console.log('\nCREW record is untouched — an existing per-worker thread still wins');
{
  const rec={ id:'GR-5', __ptOwn:true,
              threads:{ 'Marcus Hale':[{from:'me', text:'crew msg', time:'3:00 PM'}] },
              thread:[{from:'me', text:'legacy msg', time:'2:00 PM'}] };
  const {g}=mk(rec);
  const got=g.messagesFrom('GR-5','Marcus Hale');
  ok(got.length===1 && got[0].text==='crew msg',
     'reads the crew thread, not the legacy one, when a crew thread exists');
  g.message('GR-5','Marcus Hale','reply',{from:'worker'});
  ok(rec.threads['Marcus Hale'].length===2 && rec.thread.length===1,
     'and writes back into that same crew thread');
}

console.log('\nDISCRIMINATION — the OLD implementation must fail these');
{
  // The exact pre-fix body, run against the single-worker record. If this
  // returns anything, the test above proves nothing.
  const rec={ id:'GR-6', __ptOwn:true,
              thread:[{from:'me', text:'are you close?', time:'2:05 PM'}] };
  const oldMessagesFrom = (r, workerName) => {
    if (!r || !r.threads || !r.threads[workerName]) return [];
    return r.threads[workerName].filter(m => m.from === 'me');
  };
  ok(oldMessagesFrom(rec,'Marcus Hale').length===0,
     'old code returned 0 for the single-worker record — so this suite can go red');
}

// ── The DELIVERY half, which the bridge unit tests above cannot see ──────────
// Relaying a message is only half the job: the Go app still has to accept it.
// It used to `return` silently when the Gopher had not yet opened the chat --
// no conversation existed to put the message in -- while the harness marked it
// delivered, so the message was lost permanently. Both halves are asserted
// structurally because the Go prototype is a 2.8 MB single-file app.
console.log('\nDELIVERY — the Go app must not silently drop, and the harness must not lie');
{
  const go = fs.readFileSync(path.join(__dirname,'..','..','_prototypes','Go','gopher-go-prototype.html'),'utf8');
  const i = go.indexOf('window.__ptInboxDeliver=');
  const body = i>-1 ? go.slice(i, i+1800) : '';
  ok(i>-1, '__ptInboxDeliver is present');
  ok(/goConvoForJob\(/.test(body),
     'it CREATES the conversation when none exists (instead of dropping the message)');
  ok(/return false/.test(body) && /return true/.test(body),
     'it reports success or failure to the caller');

  const h = fs.readFileSync(path.join(__dirname,'..','..','_prototypes','web-split-screen.html'),'utf8');
  const j = h.indexOf('function watchMessages');
  const wm = j>-1 ? h.slice(j, j+2600) : '';
  ok(/if\(!landed\) break;/.test(wm),
     'the harness stops at the first failed delivery');
  ok(!/reqMsgSeen\[id\]=reqMsgs\.length;/.test(wm),
     'and never jumps the seen-marker to the end regardless of what landed');
}

console.log(bad?`\nFAIL — ${bad} check(s)`:'\nPASS');
process.exit(bad?1:0);
