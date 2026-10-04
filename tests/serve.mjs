#!/usr/bin/env node
/**
 * Golden static server for Final/.
 *
 *   node serve.mjs <dir> [--port 8140]
 *
 * Why not `python3 -m http.server`? Two reasons that matter for parity:
 *   1. CASE-SENSITIVE lookups, even on macOS. The live hosts are Linux; a page
 *      that references `junk-removal.mp4` when the file is `Junk-Removal.mp4`
 *      works on a Mac and 404s in production (AGENTS.md documents this bug
 *      class). This server 404s it locally too, so the harness's link check
 *      catches it before Linux does.
 *   2. Correct MIME types for .webp/.woff2/.mp4 and HTTP Range for video, so
 *      the golden pages render the way they do on the real hosts.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [, , dirArg, ...rest] = process.argv;
if (!dirArg) { console.error('usage: node serve.mjs <dir> [--port 8140]'); process.exit(1); }
const root = path.resolve(dirArg);
const port = Number(rest[rest.indexOf('--port') + 1] || 8140);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};

/** Resolve a URL path to a file, rejecting any segment whose case doesn't match the disk. */
function resolveCaseSensitive(urlPath) {
  const segments = decodeURIComponent(urlPath.split('?')[0]).split('/').filter(Boolean);
  if (segments.some((s) => s === '..')) return { error: 403 };
  let cur = root;
  for (const seg of segments) {
    let entries;
    try { entries = fs.readdirSync(cur); } catch { return { error: 404 }; }
    if (!entries.includes(seg)) {
      const ci = entries.find((e) => e.toLowerCase() === seg.toLowerCase());
      return { error: 404, hint: ci ? `case mismatch: requested "${seg}", on disk "${ci}"` : undefined };
    }
    cur = path.join(cur, seg);
  }
  if (fs.existsSync(cur) && fs.statSync(cur).isDirectory()) cur = path.join(cur, 'index.html');
  if (!fs.existsSync(cur)) return { error: 404 };
  return { file: cur };
}

const server = http.createServer((req, res) => {
  const r = resolveCaseSensitive(req.url ?? '/');
  if (r.error) {
    res.writeHead(r.error, { 'content-type': 'text/plain' });
    res.end(r.hint ? `${r.error} ${r.hint}` : String(r.error));
    if (r.hint) console.warn(`  ! ${req.url} → ${r.hint}`);
    return;
  }
  const ext = path.extname(r.file).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';
  const stat = fs.statSync(r.file);
  const range = req.headers.range;
  if (range && ext === '.mp4') {
    const [s, e] = range.replace('bytes=', '').split('-').map(Number);
    const start = s || 0, end = e || stat.size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${stat.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
    fs.createReadStream(r.file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': stat.size, 'cache-control': 'no-store' });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(r.file).pipe(res);
});

server.listen(port, '127.0.0.1', () => console.log(`golden: serving ${root} at http://127.0.0.1:${port}/ (case-sensitive)`));
