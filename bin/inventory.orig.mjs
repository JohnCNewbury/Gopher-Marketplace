#!/usr/bin/env node
/**
 * Legacy inline-HTML inventory.
 *
 *   node inventory.mjs <repo-dir> [--out inventory.json]
 *
 * Produces a machine-readable index of every HTML file in the repo:
 * functions, call graph, DOM access, fragment-injection sites, endpoints,
 * duplicate groups, and orphaned (likely dead) code.
 *
 * This is deliberately a *mechanical* pass. No LLM involved. Run it, commit
 * the output, re-run it whenever the legacy app changes and diff the result.
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

/** A stable-ish handle for a DOM element, for tracing UI -> code edges. */
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

// ----------------------------------------------------------------- JS parse

function parseJs(src) {
  for (const opts of [
    { ecmaVersion: 'latest', sourceType: 'script', locations: true },
    { ecmaVersion: 'latest', sourceType: 'module', locations: true },
    { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true },
  ]) {
    try {
      return { ast: acorn.parse(src, opts), error: null };
    } catch (e) {
      var last = e;
    }
  }
  return { ast: null, error: `${last.message}` };
}

/** Structural hash. `withNames` distinguishes near-identical copies. */
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

/** Best-effort name for a function node, using its ancestor chain. */
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

/** Flatten a callee expression to a comparable name. */
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

const DOM_LOOKUPS = new Set([
  'document.getElementById', 'document.querySelector', 'document.querySelectorAll',
  'document.getElementsByClassName', 'document.getElementsByName', 'document.getElementsByTagName',
]);

const STORAGE = /^(localStorage|sessionStorage)\.(getItem|setItem|removeItem)$/;

// ------------------------------------------------------------- per-file scan

function scanFile(file, repoRoot) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(repoRoot, file);
  const doc = parseHtml(source, { sourceCodeLocationInfo: true });

  const out = {
    file: rel,
    bytes: source.length,
    lines: source.split('\n').length,
    parseErrors: [],
    functions: [],
    calls: [],          // { from, to, file }
    domAccess: [],      // { fn, method, selector }
    injections: [],     // { fn, target, kind }  <- fragment injection sites
    endpoints: [],      // { fn, kind, method, url }
    storage: [],        // { fn, op, key }
    globals: [],        // top-level var/let/const/function names
    inlineHandlers: [], // { element, event, calls[] }
    forms: [],          // { element, action, method }
    externalScripts: [],
    stylesheets: [],
  };

  // --- static HTML facts
  for (const node of eachNode(doc)) {
    if (!node.attrs) continue;

    if (node.nodeName === 'script') {
      const src = attr(node, 'src');
      if (src) out.externalScripts.push(src);
    }
    if (node.nodeName === 'link' && (attr(node, 'rel') ?? '').includes('stylesheet')) {
      out.stylesheets.push(attr(node, 'href'));
    }
    if (node.nodeName === 'form') {
      out.forms.push({
        element: describeElement(node),
        action: attr(node, 'action'),
        method: (attr(node, 'method') ?? 'get').toLowerCase(),
      });
    }
    for (const a of node.attrs) {
      if (!/^on[a-z]+$/i.test(a.name) || !a.value.trim()) continue;
      const { ast } = parseJs(a.value);
      const called = [];
      if (ast) {
        walk.simple(ast, {
          CallExpression(n) {
            const name = calleeName(n.callee);
            if (name) called.push(name);
          },
        });
      }
      out.inlineHandlers.push({
        element: describeElement(node),
        event: a.name.slice(2),
        source: a.value.trim().slice(0, 200),
        calls: called,
      });
    }
  }

  // --- inline <script> blocks
  for (const node of eachNode(doc)) {
    if (node.nodeName !== 'script' || attr(node, 'src')) continue;
    const text = node.childNodes?.[0]?.value;
    if (!text || !text.trim()) continue;

    const startLine = node.sourceCodeLocation?.startTag?.endLine ?? 1;
    const { ast, error } = parseJs(text);
    if (!ast) {
      out.parseErrors.push({ line: startLine, error });
      continue;
    }
    const lineOf = (n) => startLine + (n.loc?.start.line ?? 1) - 1;

    // top-level declarations = de-facto globals
    for (const n of ast.body) {
      if (n.type === 'VariableDeclaration') {
        for (const d of n.declarations) if (d.id?.name) out.globals.push(d.id.name);
      } else if (n.type === 'FunctionDeclaration' && n.id) {
        out.globals.push(n.id.name);
      }
    }

    // functions
    const fnByNode = new Map();
    walk.ancestor(ast, {
      FunctionDeclaration(n, _s, anc) { record(n, anc); },
      FunctionExpression(n, _s, anc) { record(n, anc); },
      ArrowFunctionExpression(n, _s, anc) { record(n, anc); },
    });
    function record(n, ancestors) {
      const name = functionName(n, ancestors) ?? `«anon@${lineOf(n)}»`;
      const body = text.slice(n.start, n.end);
      const rec = {
        name,
        file: rel,
        startLine: lineOf(n),
        endLine: startLine + (n.loc?.end.line ?? 1) - 1,
        loc: (n.loc?.end.line ?? 0) - (n.loc?.start.line ?? 0) + 1,
        params: n.params.map((p) => p.name ?? p.type),
        exactHash: hashNode(n.body, true),
        shapeHash: hashNode(n.body, false),
        bytes: body.length,
      };
      fnByNode.set(n, rec);
      out.functions.push(rec);
    }

    // everything else, attributed to its enclosing function
    const enclosing = (anc) => {
      for (let i = anc.length - 2; i >= 0; i--) {
        if (isFn(anc[i])) return fnByNode.get(anc[i])?.name ?? '«unknown»';
      }
      return '«toplevel»';
    };
    // outermost named function: a fragment written inside xhr.onload still
    // belongs to the loadOrders() feature
    const outermost = (anc) => {
      for (let i = 0; i < anc.length; i++) {
        if (isFn(anc[i])) return fnByNode.get(anc[i])?.name ?? '«unknown»';
      }
      return '«toplevel»';
    };

    walk.ancestor(ast, {
      CallExpression(n, _s, anc) {
        const fn = enclosing(anc);
        const root = outermost(anc);
        const name = calleeName(n.callee);
        if (!name) return;
        out.calls.push({ from: fn, to: name, line: lineOf(n) });

        if (DOM_LOOKUPS.has(name)) {
          out.domAccess.push({ fn, method: name, selector: literal(n.arguments[0]) });
        }
        if (name === 'fetch') {
          const opts = n.arguments[1];
          let method = 'GET';
          if (opts?.type === 'ObjectExpression') {
            const m = opts.properties.find((p) => (p.key?.name ?? p.key?.value) === 'method');
            method = literal(m?.value) ?? 'GET';
          }
          out.endpoints.push({ fn, root, kind: 'fetch', method, url: literal(n.arguments[0]), line: lineOf(n) });
        }
        if (/\.open$/.test(name) && n.arguments.length >= 2) {
          out.endpoints.push({
            fn, root, kind: 'xhr',
            method: literal(n.arguments[0]) ?? '?',
            url: literal(n.arguments[1]),
            line: lineOf(n),
          });
        }
        if (name === '$.ajax' || name === 'jQuery.ajax' || /^\$\.(get|post)$/.test(name)) {
          out.endpoints.push({ fn, root, kind: 'jquery', method: name.split('.').pop(), url: literal(n.arguments[0]), line: lineOf(n) });
        }
        if (/insertAdjacentHTML$/.test(name)) {
          out.injections.push({ fn, root, target: calleeName(n.callee.object), kind: 'insertAdjacentHTML', line: lineOf(n) });
        }
        if (STORAGE.test(name)) {
          const [obj, op] = name.split('.');
          out.storage.push({ fn, store: obj, op, key: literal(n.arguments[0]) });
        }
      },

      AssignmentExpression(n, _s, anc) {
        const target = calleeName(n.left);
        if (!target) return;
        // THE pattern: element.innerHTML = <fragment from server>
        if (/(^|\.)(innerHTML|outerHTML)$/.test(target)) {
          out.injections.push({
            fn: enclosing(anc),
            root: outermost(anc),
            target: target.replace(/(^|\.)(inner|outer)HTML$/, '') || '«unresolved»',
            kind: target.endsWith('innerHTML') ? 'innerHTML' : 'outerHTML',
            line: lineOf(n),
          });
        }
      },

      MemberExpression(n, _s, anc) {
        const name = calleeName(n);
        if (name && STORAGE.test(name.replace(/\.(getItem|setItem|removeItem)$/, '.getItem'))) return;
      },
    });
  }

  return out;
}

// ------------------------------------------------------------------ rollup

function rollup(files) {
  const byExact = new Map();
  const byShape = new Map();
  const incoming = new Map();   // function name -> count of inbound edges
  const allNames = new Set();

  for (const f of files) {
    for (const fn of f.functions) {
      allNames.add(fn.name);
      (byExact.get(fn.exactHash) ?? byExact.set(fn.exactHash, []).get(fn.exactHash)).push(`${f.file}:${fn.name}`);
      (byShape.get(fn.shapeHash) ?? byShape.set(fn.shapeHash, []).get(fn.shapeHash)).push(`${f.file}:${fn.name}`);
    }
  }
  for (const f of files) {
    for (const c of f.calls) incoming.set(c.to, (incoming.get(c.to) ?? 0) + 1);
    for (const h of f.inlineHandlers) {
      for (const c of h.calls) incoming.set(c, (incoming.get(c) ?? 0) + 1);
    }
  }

  const duplicates = [...byExact.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([hash, members]) => ({ hash, count: members.length, members }))
    .sort((a, b) => b.count - a.count);

  const nearDuplicates = [...byShape.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([hash, members]) => ({ hash, count: members.length, members }))
    .sort((a, b) => b.count - a.count);

  const orphans = [];
  for (const f of files) {
    for (const fn of f.functions) {
      if (fn.name.startsWith('«')) continue;
      // callbacks assigned to handler properties (xhr.onload, el.onclick) are
      // entry points, not dead code
      if (/(^|\.)on[a-z]+$/.test(fn.name)) continue;
      if (!incoming.has(fn.name)) orphans.push(`${f.file}:${fn.name}:${fn.startLine}`);
    }
  }

  // endpoint -> injection target: your feature unit
  const endpointMap = new Map();
  for (const f of files) {
    for (const e of f.endpoints) {
      const key = `${e.method} ${e.url ?? '«dynamic»'}`;
      const entry = endpointMap.get(key) ?? { endpoint: key, files: new Set(), functions: new Set(), injectsInto: new Set() };
      entry.files.add(f.file);
      entry.functions.add(e.fn);
      for (const inj of f.injections) {
        if (inj.fn === e.fn || inj.root === e.root) entry.injectsInto.add(inj.target);
      }
      endpointMap.set(key, entry);
    }
  }
  const endpoints = [...endpointMap.values()]
    .map((e) => ({
      endpoint: e.endpoint,
      fileCount: e.files.size,
      files: [...e.files],
      functions: [...e.functions],
      injectsInto: [...e.injectsInto],
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const totalFns = files.reduce((n, f) => n + f.functions.length, 0);
  const uniqueFns = byExact.size;

  return {
    summary: {
      files: files.length,
      totalLines: files.reduce((n, f) => n + f.lines, 0),
      totalFunctions: totalFns,
      uniqueFunctionBodies: uniqueFns,
      duplicationRatio: totalFns ? +(1 - uniqueFns / totalFns).toFixed(3) : 0,
      distinctEndpoints: endpoints.length,
      injectionSites: files.reduce((n, f) => n + f.injections.length, 0),
      orphanFunctions: orphans.length,
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
if (!dir) {
  console.error('usage: node inventory.mjs <repo-dir> [--out inventory.json]');
  process.exit(1);
}
const outIdx = rest.indexOf('--out');
const outFile = outIdx >= 0 ? rest[outIdx + 1] : 'inventory.json';

const root = path.resolve(dir);
const htmlFiles = await fg(['**/*.html', '**/*.htm'], {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.git/**'],
});

const scanned = [];
for (const f of htmlFiles) {
  try {
    scanned.push(scanFile(f, root));
  } catch (e) {
    console.error(`! ${path.relative(root, f)}: ${e.message}`);
  }
}

const report = rollup(scanned);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

const s = report.summary;
console.log(`
  files                  ${s.files}
  lines                  ${s.totalLines.toLocaleString()}
  functions              ${s.totalFunctions}
  unique bodies          ${s.uniqueFunctionBodies}
  duplication            ${(s.duplicationRatio * 100).toFixed(1)}%
  distinct endpoints     ${s.distinctEndpoints}
  injection sites        ${s.injectionSites}
  orphan functions       ${s.orphanFunctions}  <- dead-code candidates
  parse errors           ${s.parseErrors}

  written to ${outFile}
`);
