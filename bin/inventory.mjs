#!/usr/bin/env node
/**
 * Legacy inline-HTML inventory — Gopher `Final/` edition.
 *
 *   node inventory.mjs <site-dir> [--out inventory.json]
 *
 * Produces a machine-readable index of every HTML file in the tree:
 * page family, sections, functions, call graph, DOM access, injection sites,
 * endpoints (wrapper-aware), storage keys, duplicate groups, orphaned code,
 * vendor blocks, hardcoded keys, duplicate ids, and the header changelog.
 *
 * Deliberately mechanical — no LLM. Run it, commit the output, re-run when the
 * legacy tree changes, diff the result.
 *
 * 2026-09-05 revisions over the original:
 *   - skip non-JS <script type> (JSON-LD was being parsed as JS: 113 false errors)
 *   - detect inlined vendor bundles (Leaflet was 722 "orphans" on one page)
 *   - resolve `CONST + '/path'` URLs and calls through fetch wrappers (apiCall)
 *   - ignore window.open() (was reported as an XHR endpoint "? _blank")
 *   KNOWN LIMIT: calls through a wrapper report the method the *call site* states;
 *   apiCall('/otp/get', {body}) is really a POST decided inside apiCall.
 *   - normalize `window.foo` ⇄ `foo` so entry points aren't orphans
 *   - count Identifier arguments (addEventListener('x', fn)) as references
 *   - per-page family classification + section banners + changelog + dup ids
 *     + hardcoded API keys + inline style attrs + external hosts
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse as parseHtml } from 'parse5';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import fg from 'fast-glob';

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// ---------------------------------------------------------------- HTML walk

function* eachNode(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* eachNode(child);
  if (node.content) yield* eachNode(node.content); // <template>
}

const attr = (node, name) =>
  node.attrs?.find((a) => a.name === name)?.value ?? null;

function describeElement(node) {
  const id = attr(node, 'id');
  const cls = attr(node, 'class');
  const name = attr(node, 'name');
  let sel = node.nodeName;
  if (id) sel += `#${id}`;
  else if (name) sel += `[name="${name}"]`;
  else if (cls) sel += `.${cls.trim().split(/\s+/).slice(0, 2).join('.')}`;
  return sel;
}

const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module', 'text/ecmascript']);
const isJsScript = (node) => {
  const t = (attr(node, 'type') ?? '').trim().toLowerCase();
  return JS_TYPES.has(t);
};

// ----------------------------------------------------------------- JS parse

function parseJs(src) {
  let last;
  for (const opts of [
    { ecmaVersion: 'latest', sourceType: 'script', locations: true },
    { ecmaVersion: 'latest', sourceType: 'module', locations: true },
    { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true },
  ]) {
    try {
      return { ast: acorn.parse(src, opts), error: null };
    } catch (e) {
      last = e;
    }
  }
  return { ast: null, error: `${last.message}` };
}

function hashNode(node, withNames) {
  const parts = [];
  (function rec(n) {
    if (!n || typeof n.type !== 'string') return;
    parts.push(n.type);
    if (withNames) {
      if (n.type === 'Identifier') parts.push(n.name);
      if (n.type === 'Literal') parts.push(String(n.raw));
    } else if (n.type === 'Literal') {
      parts.push(typeof n.value);
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(rec);
      else if (v && typeof v === 'object') rec(v);
    }
  })(node);
  return sha(parts.join('|'));
}

const isFn = (n) =>
  n.type === 'FunctionDeclaration' ||
  n.type === 'FunctionExpression' ||
  n.type === 'ArrowFunctionExpression';

/** `window.foo` and `foo` are the same global; `self.x`/`globalThis.x` too. */
const normName = (s) => (s ? s.replace(/^(window|self|globalThis)\./, '') : s);

function functionName(node, ancestors) {
  if (node.id?.name) return node.id.name;
  const parent = ancestors[ancestors.length - 2];
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name;
  if (parent.type === 'Property') return parent.key?.name ?? parent.key?.value ?? null;
  if (parent.type === 'AssignmentExpression') return calleeName(parent.left);
  if (parent.type === 'MethodDefinition') return parent.key?.name ?? null;
  return null;
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const obj = calleeName(node.object);
    const prop = node.computed
      ? node.property.type === 'Literal' ? String(node.property.value) : '?'
      : node.property.name;
    return obj ? `${obj}.${prop}` : prop;
  }
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'CallExpression') {
    const c = calleeName(node.callee);
    const arg = literal(node.arguments?.[0]);
    return c ? `${c}(${arg ? `'${arg}'` : ''})` : null;
  }
  return null;
}

const literal = (n) =>
  n && n.type === 'Literal' ? String(n.value)
  : n && n.type === 'TemplateLiteral'
    ? n.quasis.map((q) => q.value.cooked).join('${…}')
    : null;

/** Resolve a URL-ish expression: literal, template, or CONST + 'literal'. */
function resolveUrl(n, consts) {
  if (!n) return null;
  const lit = literal(n);
  if (lit != null) return lit;
  if (n.type === 'Identifier') return consts.get(n.name) ?? `«${n.name}»`;
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const l = resolveUrl(n.left, consts);
    const r = resolveUrl(n.right, consts);
    if (l == null || r == null) return null;
    return l + r;
  }
  if (n.type === 'TemplateLiteral') {
    return n.quasis.map((q, i) => q.value.cooked + (n.expressions[i] ? (resolveUrl(n.expressions[i], consts) ?? '${…}') : '')).join('');
  }
  return null;
}

const DOM_LOOKUPS = new Set([
  'document.getElementById', 'document.querySelector', 'document.querySelectorAll',
  'document.getElementsByClassName', 'document.getElementsByName', 'document.getElementsByTagName',
]);

const STORAGE = /^(localStorage|sessionStorage)\.(getItem|setItem|removeItem)$/;
const API_KEY_RE = /(AIza[0-9A-Za-z_-]{30,}|sk_(live|test)_[0-9A-Za-z]{10,}|pk_(live|test)_[0-9A-Za-z]{10,}|(?<![A-Za-z0-9])[A-Fa-f0-9]{40}(?![A-Za-z0-9]))/g;

/** Inlined third-party bundle? (minified or license-headed) */
function vendorInfo(text) {
  const head = text.slice(0, 600);
  const lic = /\/\*!|@preserve|@license|Copyright \(c\)|\(c\) 20\d\d/.test(head);
  const maxLine = text.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  const minified = maxLine > 2000;
  if (!lic && !minified) return null;
  const m = head.match(/\b([A-Z][A-Za-z.]+)\s+v?(\d+\.\d+(?:\.\d+)?)/);
  const idm = head.match(/^\s*\/\*\s*=*\s*\n?\s*([a-z0-9-]+\.js)/im);
  const firstParty = /gopher/i.test(head);
  return {
    name: idm ? idm[1] : m ? `${m[1]} ${m[2]}` : (minified ? 'minified bundle' : 'licensed block'),
    firstParty, bytes: text.length, minified, hash: sha(text),
  };
}

// ------------------------------------------------------------ changelog

function parseChangelog(source) {
  const m = source.match(/^\s*<!DOCTYPE[^>]*>\s*<!--([\s\S]*?)-->/i);
  if (!m) return null;
  const block = m[1];
  const lines = block.split('\n');
  const entries = [];
  let cur = null;
  for (const raw of lines) {
    const em = raw.match(/^\s*(v\d+)\s+(\d{4}-\d{2}-\d{2})\s+(.*)$/);
    if (em) {
      cur = { version: em[1], date: em[2], text: em[3].trim() };
      entries.push(cur);
    } else if (cur && raw.trim()) {
      cur.text += ' ' + raw.trim();
    }
  }
  if (!entries.length) return null;
  for (const e of entries) {
    e.removed = /\b(removed|deleted|retired|dropped)\b/i.test(e.text);
    e.ownerRuling = /\bowner\b/i.test(e.text);
    e.mirrorsPrototype = /_prototypes|mirror/i.test(e.text);
    e.sectionRefs = [...new Set((e.text.match(/§\d+[a-z]?(?:\.\d+)?/g) ?? []))];
  }
  return { lines: lines.length, bytes: block.length, entries };
}

// ------------------------------------------------------------- sections

// Human-authored banners: block-comment "NAME ──", HTML-comment "═══ NAME ═══", line-comment "── NAME ──".
function parseSections(source) {
  const out = [];
  const lines = source.split('\n');
  const re = /^\s*(?:\/\*|<!--|\/\/)\s*[═─=]*\s*([A-Z][A-Za-z0-9 &'’“”"()\/—–:+.,-]{3,80}?)\s*[═─=]{2,}/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) out.push({ line: i + 1, title: m[1].trim() });
  }
  return out;
}

/** Shared JS analysis for inline <script> blocks and standalone modules. */
function scanJsBlocks(out, rel, rawBlocks) {
  // --- first pass: parse blocks, collect top-level string consts (for URL resolution)
  const consts = new Map();
  const blocks = [];
  for (const { text, startLine } of rawBlocks) {
    out.inlineJsLines += text.split('\n').length;
    const vendor = vendorInfo(text);
    if (vendor) { out.vendorBlocks.push({ line: startLine, ...vendor }); if (!vendor.firstParty) continue; } // first-party: hash for drift, still analyse
    const { ast, error } = parseJs(text);
    if (!ast) { out.parseErrors.push({ line: startLine, error }); continue; }
    blocks.push({ text, ast, startLine });
    walk.simple(ast, {
      VariableDeclarator(n) {
        if (n.id?.type === 'Identifier') {
          const v = literal(n.init);
          if (v != null && /^(https?:\/\/|\/)/.test(v)) consts.set(n.id.name, v);
          else if (v != null && n.id.name === n.id.name.toUpperCase()) consts.set(n.id.name, v);
        }
      },
    });
  }

  // --- second pass: functions, calls, endpoints
  const fnByNode = new Map();
  const wrapperNames = new Set();

  for (const { text, ast, startLine } of blocks) {
    const lineOf = (n) => startLine + (n.loc?.start.line ?? 1) - 1;

    for (const n of ast.body) {
      if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id?.name) out.globals.push(d.id.name);
      else if (n.type === 'FunctionDeclaration' && n.id) out.globals.push(n.id.name);
    }

    walk.ancestor(ast, {
      FunctionDeclaration(n, _s, anc) { record(n, anc); },
      FunctionExpression(n, _s, anc) { record(n, anc); },
      ArrowFunctionExpression(n, _s, anc) { record(n, anc); },
    });
    function record(n, ancestors) {
      const raw = functionName(n, ancestors);
      const name = normName(raw) ?? `«anon@${lineOf(n)}»`;
      const rec = {
        name, file: rel, startLine: lineOf(n), endLine: startLine + (n.loc?.end.line ?? 1) - 1,
        loc: (n.loc?.end.line ?? 0) - (n.loc?.start.line ?? 0) + 1,
        params: n.params.map((p) => p.name ?? p.type),
        exactHash: hashNode(n.body, true), shapeHash: hashNode(n.body, false),
        bytes: n.end - n.start,
      };
      fnByNode.set(n, rec);
      out.functions.push(rec);
      // fetch wrapper? a named function whose body fetches with a param-derived URL
      if (!name.startsWith('«') && n.params.length) {
        let usesFetch = false;
        walk.simple(n.body, { CallExpression(c) { const cn = calleeName(c.callee); if (cn === 'fetch' || /\.open$/.test(cn ?? '')) usesFetch = true; } });
        if (usesFetch) wrapperNames.add(name);
      }
    }

    const embeddedHandlerCalls = (str, fn, line) => {
      if (!str || str.length < 8 || !/<[a-z]/i.test(str) || !/\son[a-z]+\s*=/i.test(str)) return;
      for (const m of str.matchAll(/\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)'|&quot;([^&]*)&quot;)/gi)) {
        const code = m[1] ?? m[2] ?? m[3] ?? '';
        for (const c of code.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)) out.calls.push({ from: fn, to: normName(c[1]), line, embedded: true });
      }
    };
    const enclosing = (anc) => { for (let i = anc.length - 2; i >= 0; i--) if (isFn(anc[i])) return fnByNode.get(anc[i])?.name ?? '«unknown»'; return '«toplevel»'; };
    const outermost = (anc) => { for (let i = 0; i < anc.length; i++) if (isFn(anc[i])) return fnByNode.get(anc[i])?.name ?? '«unknown»'; return '«toplevel»'; };

    walk.ancestor(ast, {
      CallExpression(n, _s, anc) {
        const fn = enclosing(anc);
        const root = outermost(anc);
        const rawName = calleeName(n.callee);
        if (!rawName) return;
        const name = normName(rawName);
        out.calls.push({ from: fn, to: name, line: lineOf(n) });
        // identifier arguments are references too: addEventListener('click', fn), setTimeout(fn)
        for (const a of n.arguments) if (a.type === 'Identifier') out.calls.push({ from: fn, to: a.name, line: lineOf(n), ref: true });

        if (DOM_LOOKUPS.has(name)) out.domAccess.push({ fn, method: name, selector: literal(n.arguments[0]) });
        if (name === 'fetch') {
          const opts = n.arguments[1];
          let method = 'GET';
          if (opts?.type === 'ObjectExpression') {
            const m = opts.properties.find((p) => (p.key?.name ?? p.key?.value) === 'method');
            method = literal(m?.value) ?? 'GET';
          }
          out.endpoints.push({ fn, root, kind: 'fetch', method, url: resolveUrl(n.arguments[0], consts), line: lineOf(n) });
        }
        if (/\.open$/.test(name) && !/^(window|self|globalThis)?\.?open$/.test(name) && name !== 'open' && n.arguments.length >= 2) {
          out.endpoints.push({ fn, root, kind: 'xhr', method: literal(n.arguments[0]) ?? '?', url: resolveUrl(n.arguments[1], consts), line: lineOf(n) });
        }
        if (name === '$.ajax' || name === 'jQuery.ajax' || /^\$\.(get|post)$/.test(name)) {
          out.endpoints.push({ fn, root, kind: 'jquery', method: name.split('.').pop(), url: resolveUrl(n.arguments[0], consts), line: lineOf(n) });
        }
        if (/insertAdjacentHTML$/.test(name)) out.injections.push({ fn, root, target: calleeName(n.callee.object), kind: 'insertAdjacentHTML', line: lineOf(n) });
        if (STORAGE.test(name)) {
          const [obj, op] = name.split('.');
          const k = n.arguments[0];
          out.storage.push({ fn, store: obj, op, key: literal(k) ?? (k?.type === 'Identifier' ? consts.get(k.name) ?? `«${k.name}»` : null) });
        }
      },
      // markup-in-strings: onclick="foo()" inside a template literal that gets innerHTML'd
      Literal(n, _s, anc) { if (typeof n.value === 'string') embeddedHandlerCalls(n.value, enclosing(anc), lineOf(n)); },
      TemplateLiteral(n, _s, anc) { embeddedHandlerCalls(n.quasis.map((q) => q.value.cooked ?? '').join(' '), enclosing(anc), lineOf(n)); },
      AssignmentExpression(n, _s, anc) {
        const target = calleeName(n.left);
        if (!target) return;
        if (/(^|\.)(innerHTML|outerHTML)$/.test(target)) {
          out.injections.push({ fn: enclosing(anc), root: outermost(anc), target: target.replace(/(^|\.)(inner|outer)HTML$/, '') || '«unresolved»', kind: target.endsWith('innerHTML') ? 'innerHTML' : 'outerHTML', line: lineOf(n) });
        }
      },
    });
  }

  // --- third pass: calls through fetch wrappers are endpoints too
  out.wrappers = [...wrapperNames];
  if (wrapperNames.size) {
    // base URL: the first http const in this file, if any
    const base = [...consts.values()].find((v) => /^https?:\/\//.test(v)) ?? '';
    for (const { text, ast, startLine } of blocks) {
      const lineOf = (n) => startLine + (n.loc?.start.line ?? 1) - 1;
      walk.ancestor(ast, {
        CallExpression(n, _s, anc) {
          const name = normName(calleeName(n.callee));
          if (!wrapperNames.has(name) || !n.arguments.length) return;
          const p = resolveUrl(n.arguments[0], consts);
          if (p == null) return;
          let method = 'GET';
          const opts = n.arguments[1];
          if (opts?.type === 'ObjectExpression') {
            const m = opts.properties.find((q) => (q.key?.name ?? q.key?.value) === 'method');
            method = literal(m?.value) ?? 'GET';
          }
          let fnName = '«toplevel»';
          for (let i = anc.length - 2; i >= 0; i--) if (isFn(anc[i])) { fnName = fnByNode.get(anc[i])?.name ?? '«unknown»'; break; }
          out.endpoints.push({ fn: fnName, root: fnName, kind: `via:${name}`, method, url: /^https?:\/\//.test(p) ? p : base + p, line: lineOf(n) });
        },
      });
    }
  }

}

// ------------------------------------------------------------- JS modules

const emptyRecord = (rel, kind) => ({
  file: rel, kind, family: null, bytes: 0, lines: 0, inlineJsLines: 0, inlineCssLines: 0,
  vendorBlocks: [], changelog: null, sections: [], seo: {}, structuredData: [],
  ids: { total: 0, duplicates: [] }, inlineStyleAttrs: 0, externalHosts: [], hardcodedKeys: [],
  parseErrors: [], functions: [], calls: [], domAccess: [], injections: [], endpoints: [],
  wrappers: [], storage: [], globals: [], inlineHandlers: [], forms: [], externalScripts: [], stylesheets: [],
});

/** A standalone .js file under the site (assets/js/*.js): same analysis, one block. */
function scanModule(file, repoRoot) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(repoRoot, file);
  const out = emptyRecord(rel, 'module');
  if (/(qrcode|leaflet|jquery|lodash|moment|bootstrap|swiper)/i.test(path.basename(file))) {
    out.vendorBlocks.push({ line: 1, name: path.basename(file), firstParty: false, bytes: source.length, minified: false, hash: sha(source) });
    out.bytes = source.length; out.lines = source.split('\n').length; out.family = 'V:vendor';
    return out;
  }
  out.bytes = source.length;
  out.lines = source.split('\n').length;
  out.hardcodedKeys = [...new Set((source.match(API_KEY_RE) ?? []))].map((k) => `${k.slice(0, 8)}…${k.slice(-4)}`);
  out.sections = parseSections(source);
  scanJsBlocks(out, rel, [{ text: source, startLine: 1 }]);
  out.family = 'M:module';
  return out;
}

// ------------------------------------------------------------- per-file scan

function scanFile(file, repoRoot) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(repoRoot, file);
  const doc = parseHtml(source, { sourceCodeLocationInfo: true });

  const out = emptyRecord(rel, 'page');
  out.bytes = source.length;
  out.lines = source.split('\n').length;

  // --- static HTML facts
  const idCount = new Map();
  const hosts = new Set();
  const hostOf = (u) => { try { return new URL(u).host; } catch { return null; } };

  for (const node of eachNode(doc)) {
    if (node.nodeName === 'title' && node.childNodes?.[0]?.value) out.seo.title = node.childNodes[0].value.trim();
    if (!node.attrs) continue;

    const id = attr(node, 'id');
    if (id) idCount.set(id, (idCount.get(id) ?? 0) + 1);
    if (attr(node, 'style')) out.inlineStyleAttrs++;

    if (node.nodeName === 'meta') {
      const n = attr(node, 'name') ?? attr(node, 'property');
      if (n && /^(description|og:|twitter:)/.test(n)) out.seo[n] = attr(node, 'content');
    }
    if (node.nodeName === 'link') {
      const relv = attr(node, 'rel') ?? '';
      if (relv === 'canonical') out.seo.canonical = attr(node, 'href');
      if (relv.includes('stylesheet')) {
        out.stylesheets.push(attr(node, 'href'));
        const h = hostOf(attr(node, 'href')); if (h) hosts.add(h);
      }
    }
    if (node.nodeName === 'script') {
      const src = attr(node, 'src');
      if (src) { out.externalScripts.push(src); const h = hostOf(src); if (h) hosts.add(h); }
      const t = (attr(node, 'type') ?? '').toLowerCase();
      if (t === 'application/ld+json') {
        const txt = node.childNodes?.[0]?.value ?? '';
        try { const j = JSON.parse(txt); out.structuredData.push({ type: j['@type'] ?? '?', name: j.name ?? null }); }
        catch { out.structuredData.push({ type: 'INVALID-JSON' }); }
      }
    }
    if (node.nodeName === 'style') {
      out.inlineCssLines += (node.childNodes?.[0]?.value ?? '').split('\n').length;
    }
    if (node.nodeName === 'form') {
      out.forms.push({ element: describeElement(node), action: attr(node, 'action'), method: (attr(node, 'method') ?? 'get').toLowerCase() });
    }
    for (const a of node.attrs) {
      if (!/^on[a-z]+$/i.test(a.name) || !a.value.trim()) continue;
      const { ast } = parseJs(a.value);
      const called = [];
      if (ast) walk.simple(ast, { CallExpression(n) { const nm = calleeName(n.callee); if (nm) called.push(normName(nm)); } });
      out.inlineHandlers.push({ element: describeElement(node), event: a.name.slice(2), source: a.value.trim().slice(0, 200), calls: called });
    }
  }
  out.ids.total = idCount.size;
  out.ids.duplicates = [...idCount.entries()].filter(([, c]) => c > 1).map(([id, c]) => ({ id, count: c }));
  out.externalHosts = [...hosts].sort();
  out.hardcodedKeys = [...new Set((source.match(API_KEY_RE) ?? []))].map((k) => `${k.slice(0, 8)}…${k.slice(-4)}`);
  out.changelog = parseChangelog(source);
  out.sections = parseSections(source);

  // --- inline <script> blocks
  const rawBlocks = [];
  for (const node of eachNode(doc)) {
    if (node.nodeName !== 'script' || attr(node, 'src') || !isJsScript(node)) continue;
    const text = node.childNodes?.[0]?.value;
    if (!text || !text.trim()) continue;
    rawBlocks.push({ text, startLine: node.sourceCodeLocation?.startTag?.endLine ?? 1 });
  }
  scanJsBlocks(out, rel, rawBlocks);

  // --- family classification (mirrors docs/port-notes/laravel-migration-plan.md §1)
  const usesServiceCss = out.stylesheets.some((s) => /gopher-fd\.css$/.test(s ?? ''));
  if (usesServiceCss && out.lines < 400) out.family = 'A:service-template';
  else if (out.lines < 60) out.family = 'E:stub';
  else if (out.inlineJsLines > 3000) out.family = 'D:app';
  else if (out.inlineJsLines > 300) out.family = 'C:rich';
  else out.family = 'B:content';

  return out;
}

// ------------------------------------------------------------------ rollup

function rollup(files) {
  const byExact = new Map();
  const byShape = new Map();
  const incoming = new Map();

  for (const f of files) {
    for (const fn of f.functions) {
      (byExact.get(fn.exactHash) ?? byExact.set(fn.exactHash, []).get(fn.exactHash)).push(`${f.file}:${fn.name}`);
      (byShape.get(fn.shapeHash) ?? byShape.set(fn.shapeHash, []).get(fn.shapeHash)).push(`${f.file}:${fn.name}`);
    }
  }
  for (const f of files) {
    for (const c of f.calls) incoming.set(c.to, (incoming.get(c.to) ?? 0) + 1);
    for (const h of f.inlineHandlers) for (const c of h.calls) incoming.set(c, (incoming.get(c) ?? 0) + 1);
  }

  const dupGroups = (m) => [...m.entries()].filter(([, v]) => v.length > 1)
    .map(([hash, members]) => ({ hash, count: members.length, files: new Set(members.map((x) => x.split(':')[0])).size, members }))
    .sort((a, b) => b.count - a.count);
  const duplicates = dupGroups(byExact);
  const nearDuplicates = dupGroups(byShape);

  const orphans = [];
  for (const f of files) {
    for (const fn of f.functions) {
      if (fn.name.startsWith('«')) continue;
      if (/(^|\.)on[a-z]+$/.test(fn.name)) continue;
      const bare = fn.name.split('.').pop();
      if (!incoming.has(fn.name) && !incoming.has(bare)) orphans.push(`${f.file}:${fn.name}:${fn.startLine}`);
    }
  }

  const endpointMap = new Map();
  for (const f of files) {
    for (const e of f.endpoints) {
      const key = `${e.method} ${e.url ?? '«dynamic»'}`;
      const entry = endpointMap.get(key) ?? { endpoint: key, files: new Set(), functions: new Set(), injectsInto: new Set() };
      entry.files.add(f.file);
      entry.functions.add(e.fn);
      for (const inj of f.injections) if (inj.fn === e.fn || inj.root === e.root) entry.injectsInto.add(inj.target);
      endpointMap.set(key, entry);
    }
  }
  const endpoints = [...endpointMap.values()]
    .map((e) => ({ endpoint: e.endpoint, fileCount: e.files.size, files: [...e.files], functions: [...e.functions], injectsInto: [...e.injectsInto] }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const families = {};
  for (const f of files) families[f.family] = (families[f.family] ?? 0) + 1;

  const totalFns = files.reduce((n, f) => n + f.functions.length, 0);
  return {
    summary: {
      files: files.filter((f) => f.kind === 'page').length,
      modules: files.filter((f) => f.kind === 'module').length,
      families,
      totalLines: files.reduce((n, f) => n + f.lines, 0),
      inlineJsLines: files.reduce((n, f) => n + f.inlineJsLines, 0),
      inlineCssLines: files.reduce((n, f) => n + f.inlineCssLines, 0),
      totalFunctions: totalFns,
      uniqueFunctionBodies: byExact.size,
      duplicationRatio: totalFns ? +(1 - byExact.size / totalFns).toFixed(3) : 0,
      distinctEndpoints: endpoints.length,
      injectionSites: files.reduce((n, f) => n + f.injections.length, 0),
      orphanFunctions: orphans.length,
      vendorBlocks: files.reduce((n, f) => n + f.vendorBlocks.filter((v) => !v.firstParty).length, 0),
      firstPartyOpaqueBlocks: files.reduce((n, f) => n + f.vendorBlocks.filter((v) => v.firstParty).length, 0),
      firstPartyOpaqueVariants: new Set(files.flatMap((f) => f.vendorBlocks.filter((v) => v.firstParty).map((v) => v.hash))).size,
      filesWithHardcodedKeys: files.filter((f) => f.hardcodedKeys.length).length,
      filesWithDuplicateIds: files.filter((f) => f.ids.duplicates.length).length,
      changelogEntries: files.reduce((n, f) => n + (f.changelog?.entries.length ?? 0), 0),
      parseErrors: files.reduce((n, f) => n + f.parseErrors.length, 0),
    },
    endpoints,
    duplicates: duplicates.slice(0, 200),
    nearDuplicates: nearDuplicates.slice(0, 200),
    orphans,
    files,
  };
}

// -------------------------------------------------------------------- main

const [, , dir, ...rest] = process.argv;
if (!dir) { console.error('usage: node inventory.mjs <site-dir> [--out inventory.json]'); process.exit(1); }
const outIdx = rest.indexOf('--out');
const outFile = outIdx >= 0 ? rest[outIdx + 1] : 'inventory.json';

const root = path.resolve(dir);
const htmlFiles = await fg(['**/*.html', '**/*.htm'], { cwd: root, absolute: true, ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.git/**'] });

const jsFiles = await fg(['**/*.js', '**/*.mjs'], { cwd: root, absolute: true, ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.git/**', '**/*.min.js'] });

const scanned = [];
for (const f of htmlFiles) {
  try { scanned.push(scanFile(f, root)); } catch (e) { console.error(`! ${path.relative(root, f)}: ${e.message}`); }
}
for (const f of jsFiles) {
  try { scanned.push(scanModule(f, root)); } catch (e) { console.error(`! ${path.relative(root, f)}: ${e.message}`); }
}

const report = rollup(scanned);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

// Small, diffable, commit-friendly companion: everything except per-function detail.
const summaryFile = outFile.replace(/\.json$/, '') + '.summary.json';
fs.writeFileSync(summaryFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary: report.summary,
  endpoints: report.endpoints,
  crossFileDuplicates: report.duplicates.filter((d) => d.files > 1).slice(0, 50).map(({ count, files, members }) => ({ count, files, example: members[0] })),
  orphans: report.orphans,
  files: report.files.map((f) => ({
    file: f.file, kind: f.kind, family: f.family, bytes: f.bytes, lines: f.lines,
    inlineJsLines: f.inlineJsLines, inlineCssLines: f.inlineCssLines,
    functions: f.functions.length, namedFunctions: f.functions.filter((x) => !x.name.startsWith('«')).length,
    sections: f.sections.length, injections: f.injections.length, domAccess: f.domAccess.length,
    endpoints: f.endpoints.map((e) => `${e.method} ${e.url ?? '«dynamic»'}`),
    wrappers: f.wrappers, storageKeys: [...new Set(f.storage.map((x) => `${x.store}:${x.key ?? '«dynamic»'}`))],
    vendorBlocks: f.vendorBlocks, hardcodedKeys: f.hardcodedKeys, duplicateIds: f.ids.duplicates,
    inlineStyleAttrs: f.inlineStyleAttrs, externalHosts: f.externalHosts, externalScripts: f.externalScripts,
    stylesheets: f.stylesheets, structuredData: f.structuredData, seo: f.seo,
    changelog: f.changelog ? { entries: f.changelog.entries.length, lines: f.changelog.lines, bytes: f.changelog.bytes } : null,
    parseErrors: f.parseErrors,
  })),
}, null, 2));

const s = report.summary;
console.log(`
  files                  ${s.files} pages + ${s.modules} js modules   ${Object.entries(s.families).map(([k, v]) => `${k}=${v}`).join('  ')}
  lines                  ${s.totalLines.toLocaleString()}  (inline JS ${s.inlineJsLines.toLocaleString()}, inline CSS ${s.inlineCssLines.toLocaleString()})
  functions              ${s.totalFunctions}
  unique bodies          ${s.uniqueFunctionBodies}
  duplication            ${(s.duplicationRatio * 100).toFixed(1)}%
  distinct endpoints     ${s.distinctEndpoints}
  injection sites        ${s.injectionSites}
  orphan functions       ${s.orphanFunctions}  <- dead-code candidates
  vendor blocks inlined  ${s.vendorBlocks}
  1st-party opaque blocks ${s.firstPartyOpaqueBlocks} (${s.firstPartyOpaqueVariants} distinct versions)
  files w/ hardcoded key ${s.filesWithHardcodedKeys}
  files w/ duplicate ids ${s.filesWithDuplicateIds}
  changelog entries      ${s.changelogEntries}
  parse errors           ${s.parseErrors}

  written to ${outFile}
  summary    ${summaryFile}
`);
