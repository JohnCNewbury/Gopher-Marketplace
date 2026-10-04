/**
 * Capture one page into a comparable record: visible text, SEO head, links (and
 * whether same-origin ones resolve), console errors, duplicate ids, and a
 * full-page screenshot per viewport with motion frozen.
 */

import config from '../harness.config.mjs';

/** CSS injected before screenshots: no transitions, reveal everything, freeze video. */
const FREEZE_CSS = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  .reveal { opacity: 1 !important; transform: none !important; }
  video { visibility: hidden !important; }
  video::-webkit-media-controls { display: none !important; }
  [class*="marquee"], [class*="ticker"] { animation: none !important; transform: none !important; }
`;

export function normalizeText(t) {
  let s = t.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  for (const re of config.textIgnore) s = s.replace(re, '');
  return s;
}

/**
 * Determinism shim, installed before any page script runs. gopher-services picks
 * its montage clips with Math.random(), so even golden-vs-golden differed until
 * this existed. Date is frozen so "today"/countdowns render identically.
 */
export const DETERMINISM_SCRIPT = `
  (function(){
    let seed = 0x2F6E2B1;
    Math.random = function(){ seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
    const FIXED = new Date('2026-09-01T12:00:00-04:00').getTime();
    const RealDate = Date;
    function FakeDate(...a){ return a.length ? new RealDate(...a) : new RealDate(FIXED); }
    FakeDate.prototype = RealDate.prototype; FakeDate.now = () => FIXED; FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
    window.Date = FakeDate;
    window.__harnessDeterministic = true;
  })();`;

export async function installDeterminism(page) { await page.addInitScript(DETERMINISM_SCRIPT); }

export async function capturePage(page, url, { screenshots = true, outDir, tag, viewports = config.viewports } = {}) {
  const consoleErrors = [];
  const resourceErrors = [];
  const pageErrors = [];
  const onConsole = (m) => {
    if (m.type() !== 'error') return;
    const t = m.text().slice(0, 300);
    (/Failed to load resource|net::ERR_|status of \d{3}/.test(t) ? resourceErrors : consoleErrors).push(t);
  };
  const onError = (e) => pageErrors.push(String(e.message ?? e).slice(0, 300));
  page.on('console', onConsole);
  page.on('pageerror', onError);

  const resp = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
  const status = resp?.status() ?? 0;
  await page.addStyleTag({ content: FREEZE_CSS });
  // let deferred scripts (header/footer injection) settle
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in')));

  const dom = await page.evaluate((seoKeys) => {
    const q = (s) => document.querySelector(s);
    const seo = {};
    seo.title = document.title;
    for (const k of seoKeys) {
      if (k === 'title') continue;
      if (k === 'canonical') { seo.canonical = q('link[rel="canonical"]')?.getAttribute('href') ?? null; continue; }
      const el = q(`meta[name="${k}"]`) ?? q(`meta[property="${k}"]`);
      seo[k] = el?.getAttribute('content') ?? null;
    }
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch { return { __invalid: true }; } });

    const idCount = {};
    document.querySelectorAll('[id]').forEach((n) => { idCount[n.id] = (idCount[n.id] ?? 0) + 1; });
    const duplicateIds = Object.entries(idCount).filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);

    const links = new Set();
    document.querySelectorAll('a[href], link[href], img[src], script[src], source[src], video[src], video[poster], iframe[src]').forEach((n) => {
      const v = n.getAttribute('href') ?? n.getAttribute('src') ?? n.getAttribute('poster');
      if (v) links.add(v);
    });

    return {
      seo, ld, duplicateIds,
      text: document.body?.innerText ?? '',
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
      links: [...links],
      lang: document.documentElement.lang,
    };
  }, config.seoKeys);

  // Resolve same-origin links with HEAD (dedupe, cap to keep runs fast).
  const origin = new URL(url).origin;
  const broken = [];
  const external = [];
  const seen = new Set();
  for (const raw of dom.links) {
    if (config.linkCheck.ignore.some((re) => re.test(raw))) continue;
    let abs;
    try { abs = new URL(raw, url); } catch { broken.push(`${raw} (unparseable)`); continue; }
    if (abs.origin !== origin) { external.push(abs.host); continue; }
    const key = abs.pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const r = await page.request.head(abs.href, { timeout: 10_000, maxRedirects: 3 });
      if (r.status() >= 400) broken.push(`${key} → ${r.status()}`);
    } catch (e) { broken.push(`${key} → ${String(e.message).slice(0, 60)}`); }
  }

  const shots = {};
  if (screenshots && outDir) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(150);
      const file = `${outDir}/${tag}.${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
      shots[vp.name] = file;
    }
  }

  page.off('console', onConsole);
  page.off('pageerror', onError);

  return {
    url, status,
    seo: dom.seo, ld: dom.ld, h1: dom.h1, lang: dom.lang,
    text: normalizeText(dom.text),
    duplicateIds: dom.duplicateIds,
    brokenLinks: broken.sort(),
    externalHosts: [...new Set(external)].sort(),
    consoleErrors, resourceErrors, pageErrors,
    screenshots: shots,
  };
}
