// Parse-check every INLINE <script> block in an HTML file. Parse only — nothing runs.
const fs = require('fs');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, n = 0, bad = 0;
while ((m = re.exec(src)) !== null) {
  const attrs = m[1] || '';
  if (/\ssrc\s*=/i.test(attrs)) continue;                 // external — nothing inline to parse
  if (/type\s*=\s*["'](?!text\/javascript|module)/i.test(attrs)) continue;  // json/template blocks
  const body = m[2];
  if (!body.trim()) continue;
  n++;
  const line = src.slice(0, m.index).split('\n').length;
  try { new Function(body); }
  catch (e) { bad++; console.log(`FAIL  block #${n} starting line ${line}: ${e.message}`); }
}
console.log(`${bad ? 'SYNTAX ERRORS' : 'ALL CLEAN'} — ${n} inline blocks parsed, ${bad} failed  (${file})`);
process.exit(bad ? 1 : 0);
