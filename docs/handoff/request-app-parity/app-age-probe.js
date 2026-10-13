#!/usr/bin/env node
/* Web vs the LIVE Request app: the age-restricted keyword detector.

   node app-age-probe.js <web assets/js dir> <dir holding the app's ageKeywords.js + ageKeywordsData.json>

   Called by run_parity_harness.py §8, which extracts the app's two files from
   gopher-mobile-request `origin/production` (never the clone's checkout — that
   checkout has sat a month stale) into a temp dir.

   The app's ageKeywords.js says it is the web's findAgeRestrictedKeyword COPIED,
   with lists re-extracted from the web's files. This proves that is still true by
   BEHAVIOUR, not by reading the comment: same four lists, and the same verdict —
   the same matched term, character for character — on every keyword in four
   shapes plus the hand-picked cases below. Prints one JSON line. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const [webJs, appDir] = process.argv.slice(2);

const win = {};
const ctx = vm.createContext({ window: win, console });
for (const f of ['gopher-age-keywords.js', 'gopher-age-supplement.js', 'gopher-request-logic.js'])
  vm.runInContext(fs.readFileSync(path.join(webJs, f), 'utf8'), ctx, { filename: f });
const webFind = win.GopherRequestLogic.findAgeRestrictedKeyword;

// The app file is ESM. Rewrite ONLY its one import and one export to CommonJS;
// if either line has moved, refuse rather than run a half-converted file.
let src = fs.readFileSync(path.join(appDir, 'ageKeywords.js'), 'utf8');
const IMP = /^import DATA from "\.\/ageKeywordsData\.json";$/m;
const EXP = /^export function findAgeRestrictedKeyword\(/m;
if (!IMP.test(src) || !EXP.test(src)) {
  console.log(JSON.stringify({ error: "the app's ageKeywords.js no longer has the import/export shape this probe rewrites" }));
  process.exit(0);
}
src = src.replace(IMP, 'const DATA = require(' + JSON.stringify(path.join(appDir, 'ageKeywordsData.json')) + ');')
         .replace(EXP, 'function findAgeRestrictedKeyword(') + '\nmodule.exports = { findAgeRestrictedKeyword };';
const m = { exports: {} };
new Function('module', 'require', src)(m, require);
const appFind = m.exports.findAgeRestrictedKeyword;
const DATA = JSON.parse(fs.readFileSync(path.join(appDir, 'ageKeywordsData.json'), 'utf8'));

const webLists = { keywords: win.GopherAgeKeywords, supplement: win.GopherAgeSupplement,
                   flavors: win.GopherAgeFlavors, forms: win.GopherAgeForms };
const lists = {};
for (const k of Object.keys(webLists))
  lists[k] = { web: (webLists[k] || []).length, app: (DATA[k] || []).length,
               same: JSON.stringify(webLists[k]) === JSON.stringify(DATA[k]) };

// Every keyword, four ways: bare, in a sentence, curly-apostrophe + plural, shouted.
const corpus = [];
for (const k of [...(win.GopherAgeKeywords || []), ...(win.GopherAgeSupplement || [])])
  corpus.push(k, 'please pick up ' + k + ' for me', k.replace(/'/g, '’') + 's', 'two ' + k.toUpperCase() + '!');
corpus.push(...JSON.parse(process.argv[4] || '[]'));
const diffs = [];
for (const t of corpus) {
  const a = webFind(t) || null, b = appFind(t) || null;
  if (a !== b) diffs.push({ text: t, web: a, app: b });
}
console.log(JSON.stringify({ lists, inputs: corpus.length, diffs: diffs.slice(0, 10), ndiff: diffs.length }));
