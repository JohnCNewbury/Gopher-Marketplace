#!/usr/bin/env node
/**
 * Render parity: golden (static Final/) vs candidate (Laravel), page by page.
 *
 *   node parity.mjs [--golden URL] [--candidate URL] [--family A] [--pages a.html,b.html]
 *                   [--limit N] [--no-screenshots] [--out out/parity] [--noise-floor]
 *
 * --noise-floor captures golden twice and compares it with itself. Run it first:
 * whatever it reports is the harness's own jitter, not a port defect.
 *
 * A page PASSES when: same HTTP status, no text diff, no SEO diff, no h1 diff,
 * JSON-LD equal, no new broken links, no new console/page errors, no new
 * duplicate ids, and every viewport's pixel diff ≤ threshold.
 *
 * Output: <out>/report.json (machine), <out>/report.md (human), <out>/*.png
 * (screenshots + diff images for failures).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import config from './harness.config.mjs';
import { installStubs } from './lib/stubs.mjs';
import { capturePage, installDeterminism } from './lib/capture.mjs';
import { loadPages } from './lib/pages.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const flag = (name) => args.includes(`--${name}`);

const golden = opt('golden', config.golden);
const noiseFloor = flag('noise-floor');
const candidate = noiseFloor ? golden : opt('candidate', config.candidate);
const outDir = path.resolve(here, opt('out', 'out/parity'));
const screenshots = !flag('no-screenshots');
const mapUrl = config.urlMap[opt('url-map', config.urlMapMode)];
fs.mkdirSync(outDir, { recursive: true });

let pages = loadPages(path.resolve(here, config.inventorySummary));
if (opt('family')) pages = pages.filter((p) => p.family.startsWith(opt('family')));
if (opt('pages')) { const want = new Set(opt('pages').split(',')); pages = pages.filter((p) => want.has(p.file)); }
if (opt('limit')) pages = pages.slice(0, Number(opt('limit')));

console.log(`parity: ${pages.length} pages  golden=${golden}  candidate=${candidate}${noiseFloor ? '  (noise floor)' : ''}  out=${outDir}`);

// ------------------------------------------------------------------ diffs

const lineDiff = (a, b) => {
  const A = a.split('\n'), B = b.split('\n');
  const sa = new Set(A), sb = new Set(B);
  return { removed: A.filter((l) => !sb.has(l)), added: B.filter((l) => !sa.has(l)) };
};
const setDelta = (a, b) => b.filter((x) => !a.includes(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function pixelDiff(fileA, fileB, outFile) {
  const a = PNG.sync.read(fs.readFileSync(fileA));
  const b = PNG.sync.read(fs.readFileSync(fileB));
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const pad = (img) => {
    if (img.width === w && img.height === h) return img;
    const p = new PNG({ width: w, height: h });
    p.data.fill(255);
    PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
    return p;
  };
  const A = pad(a), B = pad(b);
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1, includeAA: true });
  const ratio = n / (w * h);
  if (ratio > config.pixelThreshold) fs.writeFileSync(outFile, PNG.sync.write(diff));
  return { changedPixels: n, ratio: +ratio.toFixed(5), heightA: a.height, heightB: b.height };
}

// ------------------------------------------------------------------ run

// CHROMIUM_PATH: use a system/pre-installed Chromium when `npx playwright install` is blocked by a network allowlist.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const mkContext = () => browser.newContext({ reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'America/New_York', deviceScaleFactor: 1 });
const results = [];
const t0 = Date.now();

for (const [i, p] of pages.entries()) {
  const tag = p.file.replace(/\.html$/, '');
  const gPath = '/' + p.file;
  const cPath = mapUrl(gPath);
  const ctxG = await mkContext(); const pgG = await ctxG.newPage(); await installDeterminism(pgG); await installStubs(pgG);
  const ctxC = await mkContext(); const pgC = await ctxC.newPage(); await installDeterminism(pgC); await installStubs(pgC);
  let g, c;
  try {
    g = await capturePage(pgG, golden + gPath, { screenshots, outDir, tag: `${tag}.golden` });
    c = await capturePage(pgC, candidate + cPath, { screenshots, outDir, tag: `${tag}.candidate` });
  } catch (e) {
    results.push({ file: p.file, family: p.family, status: 'ERROR', error: String(e.message).slice(0, 200) });
    console.log(`  [${i + 1}/${pages.length}] ${p.file}  ERROR ${e.message}`);
    await ctxG.close(); await ctxC.close();
    continue;
  }
  await ctxG.close(); await ctxC.close();

  const text = lineDiff(g.text, c.text);
  // SEO diffs, minus the class the port fixes on purpose: a golden og:/twitter: tag that
  // disagreed with its own <title>/description (20 pages had &amp;amp; in og:title, 7 a drifted
  // og:description). If the candidate's tag equals the candidate's title/description, that is
  // a golden defect corrected, reported separately and not a failure.
  const selfConsistent = (k) => (/title$/.test(k) && c.seo[k] === c.seo.title) || (/description$/.test(k) && c.seo[k] === c.seo.description);
  const seoAll = Object.keys(g.seo).filter((k) => g.seo[k] !== c.seo[k]);
  const fixedGoldenDefects = seoAll.filter((k) => /^(og|twitter):/.test(k) && selfConsistent(k) && !(g.seo[k.replace(/^(og|twitter):/, '')] === undefined));
  const seo = Object.fromEntries(seoAll.filter((k) => !fixedGoldenDefects.includes(k)).map((k) => [k, [g.seo[k], c.seo[k]]]));
  const pixels = {};
  if (screenshots) for (const vp of config.viewports) pixels[vp.name] = pixelDiff(g.screenshots[vp.name], c.screenshots[vp.name], `${outDir}/${tag}.${vp.name}.diff.png`);

  const r = {
    file: p.file, family: p.family,
    golden: golden + gPath, candidate: candidate + cPath,
    httpStatus: [g.status, c.status],
    textDiff: { removed: text.removed.length, added: text.added.length, sampleRemoved: text.removed.slice(0, 5), sampleAdded: text.added.slice(0, 5) },
    seoDiff: seo,
    fixedGoldenDefects,
    h1Diff: same(g.h1, c.h1) ? null : [g.h1, c.h1],
    ldDiff: same(g.ld, c.ld) ? null : { golden: g.ld, candidate: c.ld },
    newBrokenLinks: setDelta(g.brokenLinks, c.brokenLinks),
    goldenBrokenLinks: g.brokenLinks,
    newConsoleErrors: setDelta(g.consoleErrors.concat(g.pageErrors), c.consoleErrors.concat(c.pageErrors)),
    goldenConsoleErrors: g.consoleErrors.concat(g.pageErrors),
    resourceErrors: { golden: g.resourceErrors.length, candidate: c.resourceErrors.length },
    newDuplicateIds: setDelta(g.duplicateIds, c.duplicateIds),
    pixels,
  };
  const pixelFail = Object.values(pixels).some((x) => x.ratio > config.pixelThreshold);
  r.status = (g.status === c.status && !text.removed.length && !text.added.length && !Object.keys(seo).length && !r.h1Diff && !r.ldDiff
    && !r.newBrokenLinks.length && !r.newConsoleErrors.length && !r.newDuplicateIds.length && !pixelFail) ? 'PASS' : 'FAIL';
  results.push(r);
  const px = Object.entries(pixels).map(([k, v]) => `${k[0]}=${(v.ratio * 100).toFixed(2)}%`).join(' ');
  console.log(`  [${i + 1}/${pages.length}] ${r.status}  ${p.file}  text±${text.removed.length}/${text.added.length}  seo=${Object.keys(seo).length}  links+${r.newBrokenLinks.length}  errs+${r.newConsoleErrors.length}  ${px}`);
}
await browser.close();

// ------------------------------------------------------------------ report

const pass = results.filter((r) => r.status === 'PASS').length;
const report = {
  generatedAt: new Date().toISOString(), golden, candidate, noiseFloor, urlMap: opt('url-map', config.urlMapMode),
  pixelThreshold: config.pixelThreshold, seconds: Math.round((Date.now() - t0) / 1000),
  summary: { pages: results.length, pass, fail: results.filter((r) => r.status === 'FAIL').length, error: results.filter((r) => r.status === 'ERROR').length },
  results,
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

let md = `# Parity report — ${report.generatedAt.slice(0, 16)}\n\n`;
md += `golden \`${golden}\` vs candidate \`${candidate}\`${noiseFloor ? ' **(noise floor: golden vs itself)**' : ''} · url-map \`${report.urlMap}\` · pixel threshold ${config.pixelThreshold * 100}% · ${report.seconds}s\n\n`;
md += `**${pass}/${results.length} PASS**, ${report.summary.fail} FAIL, ${report.summary.error} ERROR\n\n`;
md += `| page | fam | status | text −/+ | seo | h1 | ld | links+ | errs+ | ids+ | ${config.viewports.map((v) => v.name).join(' | ')} |\n|---|---|---|---|---|---|---|---|---|---|${config.viewports.map(() => '---').join('|')}|\n`;
for (const r of results) {
  if (r.status === 'ERROR') { md += `| ${r.file} | ${r.family[0]} | ERROR | ${r.error} |\n`; continue; }
  const px = config.viewports.map((v) => r.pixels[v.name] ? `${(r.pixels[v.name].ratio * 100).toFixed(2)}%` : '–').join(' | ');
  md += `| ${r.file} | ${r.family[0]} | ${r.status} | ${r.textDiff.removed}/${r.textDiff.added} | ${Object.keys(r.seoDiff).length} | ${r.h1Diff ? '≠' : ''} | ${r.ldDiff ? '≠' : ''} | ${r.newBrokenLinks.length} | ${r.newConsoleErrors.length} | ${r.newDuplicateIds.length} | ${px} |\n`;
}
const fixed = results.filter((r) => r.fixedGoldenDefects?.length);
if (fixed.length) {
  md += `\n## Golden defects corrected by the candidate (not failures)\n\n`;
  for (const r of fixed) md += `- **${r.file}**: ${r.fixedGoldenDefects.join(', ')} now match the page's own title/description\n`;
}
const goldenIssues = results.filter((r) => r.goldenBrokenLinks?.length || r.goldenConsoleErrors?.length);
if (goldenIssues.length) {
  md += `\n## Pre-existing issues in golden (not port defects, but the port should not carry them)\n\n`;
  for (const r of goldenIssues) md += `- **${r.file}**: ${r.goldenBrokenLinks.map((l) => `broken \`${l}\``).concat(r.goldenConsoleErrors.map((e) => `console \`${e.slice(0, 80)}\``)).join('; ')}\n`;
}
fs.writeFileSync(path.join(outDir, 'report.md'), md);
console.log(`\n${pass}/${results.length} PASS in ${report.seconds}s → ${path.join(outDir, 'report.md')}`);
process.exit(report.summary.fail + report.summary.error ? 1 : 0);
