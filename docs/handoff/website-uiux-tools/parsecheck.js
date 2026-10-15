const fs=require('fs'), vm=require('vm');
for (const f of process.argv.slice(2)) {
  const src=fs.readFileSync(f,'utf8'); const re=/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi; let m,n=0,bad=0;
  while((m=re.exec(src))){ if(/type=["'](?!text\/javascript|module)/i.test(m[1])) continue; n++;
    try{ new vm.Script(m[2]); }catch(e){ if(/module/.test(m[1])) continue; bad++; console.log('  FAIL',f,'block',n,e.message); } }
  console.log(f.split('/').slice(-2).join('/'), 'blocks', n, 'failed', bad);
}
