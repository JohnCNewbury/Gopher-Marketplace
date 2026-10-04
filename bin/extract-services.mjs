#!/usr/bin/env node
/**
 * Family A extractor: the 107 templated service pages → structured content.
 *
 *   node extract-services.mjs <site-dir> [--out out/services.json] [--strict]
 *
 * Writes:
 *   <out>                      services.json   — one record per page (the seeder input)
 *   <out dir>/categories.json  categories.json — the 7 categories with labels + members
 *   <out dir>/extract-report.md — coverage per page
 *
 * Self-verification (the important part): for every page, the visible text of
 * the whole <body> is compared with the text of everything the schema captured.
 * Any line of copy the schema does not carry is reported as UNCAPTURED, and with
 * --strict the run exits 1. So a schema gap cannot silently drop copy on the
 * floor — it fails the extraction instead.
 *
 * Content policy: fields that carry inline markup (<b>, <span class="caveat">,
 * entities) are stored as HTML strings and marked `_html` in the schema notes.
 * They are trusted authored content; the Blade view renders them with {!! !!}.
 * Everything else is plain text.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize, serializeOuter } from 'parse5';
import fg from 'fast-glob';

const [, , dirArg, ...rest] = process.argv;
if (!dirArg) { console.error('usage: node extract-services.mjs <site-dir> [--out out/services.json] [--strict]'); process.exit(1); }
const root = path.resolve(dirArg);
const oi = rest.indexOf('--out');
const outFile = path.resolve(oi >= 0 ? rest[oi + 1] : 'out/services.json');
const outDir = path.dirname(outFile);
const strict = rest.includes('--strict');
fs.mkdirSync(outDir, { recursive: true });

// ------------------------------------------------------------- DOM helpers

function* walk(n) { yield n; for (const c of n.childNodes ?? []) yield* walk(c); }
const attr = (n, k) => n.attrs?.find((a) => a.name === k)?.value ?? null;
const classes = (n) => (attr(n, 'class') ?? '').split(/\s+/).filter(Boolean);
const hasClass = (n, c) => classes(n).includes(c);
const isEl = (n) => !!n.tagName;

function find(scope, pred) { for (const n of walk(scope)) if (n !== scope && isEl(n) && pred(n)) return n; return null; }
function findAll(scope, pred) { const out = []; for (const n of walk(scope)) if (n !== scope && isEl(n) && pred(n)) out.push(n); return out; }
const byClass = (c) => (n) => hasClass(n, c);
const byTag = (t) => (n) => n.tagName === t;
const byTagClass = (t, c) => (n) => n.tagName === t && hasClass(n, c);

/** innerHTML, whitespace-normalized. */
function html(n) {
  if (!n) return null;
  return serialize(n).replace(/\s+/g, ' ').trim();
}
/** textContent, whitespace-normalized, entities decoded by parse5. */
function text(n) {
  if (!n) return null;
  const parts = [];
  for (const x of walk(n)) if (x.nodeName === '#text' && !/^(script|style)$/.test(x.parentNode?.tagName ?? '')) parts.push(x.value);
  return parts.join(' ').replace(/\s+/g, ' ').trim();   // element boundaries count as whitespace
}
/** Direct children elements. */
const kids = (n) => (n.childNodes ?? []).filter(isEl);
/** Text of the element with the given child removed (e.g. "Order now <svg…>" → "Order now"). */
function ownText(n) { let s = ''; for (const c of n.childNodes ?? []) if (c.nodeName === '#text') s += c.value; return s.replace(/\s+/g, ' ').trim(); }

// ------------------------------------------------------------- extraction

function secHead(section) {
  const sh = find(section, byClass('sec-head'));
  if (!sh) return null;
  return {
    eyebrow: text(find(sh, byClass('eyebrow'))),
    h2_html: html(find(sh, byTag('h2'))),
    p_html: html(find(sh, byTag('p'))),
  };
}

function extract(file) {
  const src = fs.readFileSync(file, 'utf8');
  const doc = parse(src);
  const head = find(doc, byTag('head'));
  const body = find(doc, byTag('body'));
  const slug = path.basename(file, '.html');
  const notes = [];

  // --- head / SEO
  const meta = (k) => attr(findAll(head, (n) => n.tagName === 'meta' && (attr(n, 'name') === k || attr(n, 'property') === k))[0] ?? {}, 'content');
  const ldNode = find(head, (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json');
  let ld = null; try { ld = JSON.parse((ldNode?.childNodes ?? []).map((c) => c.value ?? '').join('')); } catch { notes.push('invalid JSON-LD'); }
  const seo = {
    title: text(find(head, byTag('title'))),
    description: meta('description'),
    canonical: attr(find(head, (n) => n.tagName === 'link' && attr(n, 'rel') === 'canonical') ?? {}, 'href'),
    og_image: meta('og:image'),
    name: null, // filled below from JSON-LD; the eyebrow is NOT always the schema.org name
  };
  seo.name = ld?.name ?? null;
  if (meta('og:title') !== seo.title) notes.push('og:title ≠ title');
  if (meta('og:description') !== seo.description) notes.push('og:description ≠ description');
  if (ld && ld.name !== undefined && ld.description !== seo.description) notes.push('JSON-LD description ≠ meta description');

  // --- sections, in document order
  const sections = findAll(body, byTag('section'));
  const secByHeadEyebrow = {};
  for (const s of sections) { const sh = secHead(s); if (sh?.eyebrow) secByHeadEyebrow[sh.eyebrow] = s; }
  const hero = sections.find(byClass('hero'));
  const pillarsSec = sections.find((s) => find(s, byClass('pillars')));
  const edgeSec = sections.find((s) => find(s, (n) => n.tagName === 'ul' && find(n, (li) => li.tagName === 'li' && /display:flex/.test(attr(li, 'style') ?? ''))));
  const compareSec = sections.find((s) => find(s, byClass('ctable')));
  const priceSec = sections.find((s) => find(s, byClass('price-card')));
  const howSec = sections.find((s) => find(s, byClass('steps')));
  const orderSec = sections.find((s) => find(s, byClass('order')));
  for (const [k, v] of Object.entries({ hero, pillarsSec, compareSec, priceSec, howSec, orderSec })) if (!v) notes.push(`missing section: ${k}`);

  // --- hero
  const crumbs = hero ? findAll(find(hero, byClass('crumbs')) ?? hero, (n) => n.tagName === 'a' || hasClass(n, 'cur')) : [];
  const catLink = crumbs.find((n) => n.tagName === 'a' && /#cat-/.test(attr(n, 'href') ?? ''));
  const heroVisual = hero && find(hero, byClass('hero-visual'));
  const heroImg = heroVisual && find(heroVisual, byTag('img'));
  const heroNote = heroVisual && find(heroVisual, byClass('hero-note'));
  const heroCtas = hero ? findAll(find(hero, byClass('hero-cta')) ?? hero, byTag('a')) : [];
  const primary = heroCtas.find((a) => hasClass(a, 'btn-primary'));
  const secondary = heroCtas.find((a) => hasClass(a, 'btn-ghost'));
  const heroRec = hero && {
    breadcrumb_root: text(crumbs[0]),
    category_anchor: (attr(catLink ?? {}, 'href') ?? '').replace(/^.*#/, '') || null,
    category_label: text(catLink),
    breadcrumb_current: text(crumbs.find(byClass('cur'))),
    eyebrow: text(find(hero, byClass('eyebrow'))),
    h1_html: html(find(hero, byTag('h1'))),
    accent_html: html(find(hero, byClass('hero-accent'))),
    sub_html: html(find(hero, byClass('hero-sub'))),
    cta_label: ownText(primary),
    cta_href: attr(primary ?? {}, 'href'),
    cta_secondary_label: text(secondary),
    cta_secondary_href: attr(secondary ?? {}, 'href'),
    chips_html: findAll(hero, byClass('chip')).map(html),
    visual_mode: heroVisual && hasClass(heroVisual, 'card-mode') ? 'card' : 'photo',
    image: heroImg ? { src: attr(heroImg, 'src'), alt: attr(heroImg, 'alt') } : null,
    note: heroNote ? { caveat: text(find(heroNote, byClass('caveat'))), text: text(kids(heroNote).find((k) => !hasClass(k, 'caveat'))) } : null,
    // card-mode (age-restricted): the visual is bespoke SVG — carried verbatim, rendered as-is
    visual_raw_html: heroVisual && hasClass(heroVisual, 'card-mode') ? serializeOuter(heroVisual).trim() : undefined,   // OUTER html: the wrapper is the positioning context
  };
  if (heroRec && heroRec.visual_mode === 'card') notes.push('card-mode hero: visual carried as raw HTML');

  // --- pillars
  const pillarsRec = pillarsSec && {
    head: secHead(pillarsSec),
    items: findAll(pillarsSec, byClass('pillar')).map((p) => ({ icon: text(find(p, byClass('pic'))), h4_html: html(find(p, byTag('h4'))), p_html: html(find(p, byTag('p'))) })),
  };
  if (pillarsRec && pillarsRec.items.length !== 3) notes.push(`pillars: ${pillarsRec.items.length} (expected 3)`);

  // --- marketplace edge (optional, 12 pages)
  const edgeRec = edgeSec && {
    head: secHead(edgeSec),
    items: findAll(edgeSec, byTag('li')).map((li) => { const spans = kids(li); return { icon: text(spans[0]), text_html: html(spans[1]) }; }),
  };

  // --- comparison
  let compareRec = null;
  if (compareSec) {
    const rows = findAll(compareSec, byClass('crow'));
    const headRow = rows.find(byClass('head'));
    const cells = (r) => ({ label: find(r, byClass('label')), giants: find(r, byClass('giants')), gopher: find(r, byClass('gopher')) });
    const h = headRow && cells(headRow);
    compareRec = {
      head: secHead(compareSec),
      columns: h ? { label: text(h.label), giants: text(h.giants), gopher: text(h.gopher) } : null,
      rows: rows.filter((r) => !hasClass(r, 'head')).map((r) => {
        const c = cells(r);
        const bodyText = (cell) => html(kids(cell).find((k) => !hasClass(k, 'x') && !hasClass(k, 'ck')));
        return { icon: text(find(c.label, byClass('ic'))), label: text(find(c.label, byClass('lt'))), giants_html: bodyText(c.giants), gopher_html: bodyText(c.gopher) };
      }),
    };
    if (compareRec.rows.length < 4) notes.push(`comparison: ${compareRec.rows.length} rows`);
  }

  // --- price
  let priceRec = null;
  if (priceSec) {
    priceRec = {
      head: secHead(priceSec),
      lines: findAll(priceSec, byClass('price-line')).map((l) => {
        const nm = find(l, byClass('nm'));
        const small = nm && find(nm, byTag('small'));
        return { icon: text(find(l, byClass('pic'))), name: ownText(nm), small_html: html(small), amount: text(find(l, byClass('amt'))) };
      }),
      foot_html: html(find(priceSec, byClass('price-foot'))),
    };
    if (priceRec.lines.length < 3) notes.push(`price lines: ${priceRec.lines.length} (expected ≥3)`);
  }

  // --- how it works
  const howRec = howSec && {
    head: secHead(howSec),
    steps: findAll(howSec, byClass('step')).map((s) => ({ n: text(find(s, byClass('n'))), h4_html: html(find(s, byTag('h4'))), p_html: html(find(s, byTag('p'))) })),
  };
  if (howRec && howRec.steps.length !== 4) notes.push(`steps: ${howRec.steps.length} (expected 4)`);

  // --- direct order CTA
  let orderRec = null;
  if (orderSec) {
    const btns = findAll(find(orderSec, byClass('btn-row')) ?? orderSec, byTag('a'));
    const p = btns.find(byClass('btn-primary')); const b = btns.find(byClass('btn-light'));
    const badges = findAll(find(orderSec, byClass('badges')) ?? { childNodes: [] }, byTag('a')).map((a) => ({ href: attr(a, 'href'), img: attr(find(a, byTag('img')) ?? {}, 'src'), alt: attr(find(a, byTag('img')) ?? {}, 'alt') }));
    const video = find(orderSec, byClass('refer-video'));
    const videoUrl = video ? (src.match(/VIDEO_URL\s*=\s*"([^"]+)"/)?.[1] ?? null) : null;
    orderRec = {
      section_id: attr(orderSec, 'id'),   // age-restricted: "find-my-gopher" (Gopher iQ deep-link target)
      h3_html: html(find(orderSec, byTag('h3'))),
      p_html: html(find(orderSec, byTag('p'))),
      cta_label: ownText(p), cta_href: attr(p ?? {}, 'href'),
      back_label: text(b), back_href: attr(b ?? {}, 'href'),
      badges,
      // age-restricted only: a "See Gopher Go in action" video button instead of store badges
      video: video ? { caption: text(find(video, byClass('rv-cap'))), aria_label: attr(find(video, byTag('button')) ?? {}, 'aria-label'), url: videoUrl } : null,
    };
    if (badges.length !== 2 && !video) notes.push(`badges: ${badges.length} (expected 2)`);
    if (video) notes.push('order CTA variant: refer-video + Go CTA, no badges');
  }

  // --- everything else in <body> that isn't one of the sections above (chrome mounts, scripts) → must be boilerplate
  const bodyKids = kids(body);
  const known = new Set([hero, pillarsSec, edgeSec, compareSec, priceSec, howSec, orderSec].filter(Boolean));
  const extras = bodyKids.filter((k) => !known.has(k)).map((k) => `${k.tagName}${attr(k, 'id') ? '#' + attr(k, 'id') : ''}${attr(k, 'src') ? '[' + attr(k, 'src') + ']' : ''}`);
  const expectedExtras = ['div#gopher-header', 'div#gopher-footer', 'script[assets/js/gopher-footer.js]', 'script[assets/js/gopher-header.js]', 'script'];
  const unexpected = extras.filter((e) => !expectedExtras.includes(e));
  if (unexpected.length) notes.push(`unexpected body children: ${unexpected.join(', ')}`);

  // page-specific extras: <style> blocks (carried verbatim as page_css) and any inline
  // <script> that is not the shared reveal snippet (recorded so the port can decide)
  const styles = findAll(doc, byTag('style')).map((n) => (n.childNodes ?? []).map((c) => c.value ?? '').join('').trim()).filter(Boolean);
  const scripts = findAll(doc, (n) => n.tagName === 'script' && !attr(n, 'src') && !attr(n, 'type'))
    .map((n) => (n.childNodes ?? []).map((c) => c.value ?? '').join('').trim())
    .filter((t) => t && !/IntersectionObserver/.test(t));
  if (styles.length) notes.push(`page-specific CSS: ${styles.length} block(s), ${styles.join('').length} chars`);
  for (const t of scripts) notes.push(`page-specific inline script (${t.split('\n').length} lines)${/VIDEO_URL/.test(t) ? ' — refer-video, ported as data-video-url' : ' — NEEDS PORTING'}`);

  const rec = {
    slug, source: path.relative(root, file), seo, ld_type: ld?.['@type'] ?? null,
    page_css: styles.length ? styles.join('\n') : null,
    page_scripts: scripts.length ? scripts : null,
    hero: heroRec, pillars: pillarsRec, edge: edgeRec ?? null, comparison: compareRec, price: priceRec, how: howRec, order: orderRec,
    _notes: notes,
  };

  // --- coverage: body text vs captured text
  const bodyText = text(body);
  const captured = collectText(rec).join(' ');
  const missing = wordsMissing(bodyText, captured);
  rec._coverage = { body_chars: bodyText.length, captured_chars: captured.length, uncaptured_words: missing.length, uncaptured_sample: missing.slice(0, 12) };
  return rec;
}

/** All text the record carries (HTML fields are text-ified for the comparison). */
function collectText(o, acc = []) {
  if (o == null) return acc;
  if (typeof o === 'string') { acc.push(/<[a-z]/i.test(o) ? text(parse(`<div>${o}</div>`)) : o); return acc; }
  if (Array.isArray(o)) { for (const x of o) collectText(x, acc); return acc; }
  if (typeof o === 'object') { for (const [k, v] of Object.entries(o)) if (!k.startsWith('_') && !['src', 'href', 'img', 'canonical', 'og_image', 'source', 'slug', 'ld_type', 'category_anchor', 'cta_href', 'cta_secondary_href', 'back_href', 'page_css', 'page_scripts', 'url', 'aria_label'].includes(k)) collectText(v, acc); return acc; }
  return acc;
}
/** Word-multiset difference: words in `a` that `b` does not account for. */
function wordsMissing(a, b) {
  const tok = (s) => s.toLowerCase().replace(/[“”"'’‘×✓]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/.test(w)).map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''));
  const have = new Map();
  for (const w of tok(b)) have.set(w, (have.get(w) ?? 0) + 1);
  const missing = [];
  for (const w of tok(a)) { const n = have.get(w) ?? 0; if (n > 0) have.set(w, n - 1); else missing.push(w); }
  return missing;
}

// ------------------------------------------------------------- categories

/**
 * docs/handoff/canonical-service-categories.md numbers the categories 1–8 and
 * says each surface renders its own label (Request says "Delivery / Errand",
 * the web pages say "Delivery & Errands", Go says "Delivery"). So the web
 * anchors map to canonical ids explicitly; the label on the page is the web
 * surface's presentation and is kept as-is.
 */
const CANONICAL = {
  'cat-delivery':                  { id: 1, name: 'Delivery / Errand' },
  'cat-junk_removal':              { id: 2, name: 'Junk Removal' },
  'cat-moving':                    { id: 3, name: 'Moving' },
  'cat-home_services':             { id: 4, name: 'Home / Office Services' },
  'cat-hourly_day_labor':          { id: 5, name: 'Hourly / Day Labor' },
  'cat-yard_work_outdoor_projects':{ id: 6, name: 'Yard / Outdoor Projects' },
  'cat-ride_sharing':              { id: 7, name: 'Ride Sharing' },
  // 8 "Other" has no service pages
};
function verifyCanonicalDoc(siteDir) {
  const f = path.join(siteDir, '..', 'docs', 'handoff', 'canonical-service-categories.md');
  if (!fs.existsSync(f)) return 'canonical-service-categories.md not found; CANONICAL map unverified';
  const md = fs.readFileSync(f, 'utf8');
  const missing = Object.values(CANONICAL).filter((c) => !md.includes(`| ${c.id} | ${c.name} |`)).map((c) => `${c.id} ${c.name}`);
  return missing.length ? `CANONICAL map disagrees with canonical-service-categories.md for: ${missing.join('; ')}` : null;
}

// ------------------------------------------------------------- main

const files = (await fg(['*.html'], { cwd: root, absolute: true })).filter((f) => fs.readFileSync(f, 'utf8').includes('assets/css/gopher-fd.css')).sort();
const records = files.map(extract);

const cats = {};
for (const r of records) {
  const a = r.hero?.category_anchor; if (!a) continue;
  const c = cats[a] ??= { anchor: a, label: r.hero.category_label, back_label: r.order?.back_label, services: [] };
  if (c.label !== r.hero.category_label) r._notes.push(`category label mismatch: "${r.hero.category_label}" vs "${c.label}"`);
  c.services.push(r.slug);
}
const canonicalProblem = verifyCanonicalDoc(root);
if (canonicalProblem) console.warn(`  ! ${canonicalProblem}`);
for (const a of Object.keys(cats)) {
  const c = CANONICAL[a];
  if (!c) { for (const s of cats[a].services) records.find((r) => r.slug === s)._notes.push(`category ${a} has no canonical mapping`); continue; }
  cats[a].canonical_id = c.id; cats[a].canonical_name = c.name;
}
for (const r of records) { const c = CANONICAL[r.hero?.category_anchor]; r.category = c ? { anchor: r.hero.category_anchor, canonical_id: c.id, canonical_name: c.name, web_label: r.hero.category_label } : null; }

fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), source: path.relative(process.cwd(), root), count: records.length, schema_notes: {
  _html_fields: 'stored as HTML strings (inline <b>, <span class="caveat">, entities); trusted authored content; render with {!! !!}',
  hero_visual_mode: 'photo (106 pages: image+alt+note) | card (age-restricted: visual_raw_html carried verbatim)',
  edge: 'optional section (12 pages); null when absent',
  cta_label: 'per-page copy; 40 distinct values',
  order_video: 'age-restricted only: order.video {caption, aria_label, url} replaces badges; order.section_id = find-my-gopher',
  page_css: 'verbatim <style> blocks from the page (age-restricted only); rendered in the head after gopher-fd.css',
  page_scripts: 'inline scripts other than the shared reveal snippet, for reference — the port carries behaviour in resources/js, never inline',
  og_tags: 'NOT extracted on purpose — 20 golden pages have double-encoded &amp;amp; in og:title and 7 have a drifted og:description (see _notes); the port regenerates OG from seo.title/description',
}, services: records }, null, 2));
fs.writeFileSync(path.join(outDir, 'categories.json'), JSON.stringify({ generatedAt: new Date().toISOString(), categories: Object.values(cats) }, null, 2));

const withGaps = records.filter((r) => r._coverage.uncaptured_words > 0);
const withNotes = records.filter((r) => r._notes.length);
let md = `# Service-page extraction report — ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `${records.length} pages · ${withGaps.length} with uncaptured copy · ${withNotes.length} with notes · ${Object.keys(cats).length} categories\n\n`;
md += `| slug | category | edge | mode | body chars | uncaptured words | notes |\n|---|---|---|---|---|---|---|\n`;
for (const r of records) md += `| ${r.slug} | ${r.hero?.category_anchor ?? '—'} | ${r.edge ? '✓' : ''} | ${r.hero?.visual_mode ?? '—'} | ${r._coverage.body_chars} | ${r._coverage.uncaptured_words}${r._coverage.uncaptured_words ? ' (' + r._coverage.uncaptured_sample.join(' ') + ')' : ''} | ${r._notes.join('; ')} |\n`;
md += `\n## Categories\n\n| canonical | web anchor | web label | pages |\n|---|---|---|---|\n`;
for (const c of Object.values(cats).sort((a, b) => (a.canonical_id ?? 99) - (b.canonical_id ?? 99))) md += `| ${c.canonical_id ?? '?'} · ${c.canonical_name ?? '—'} | ${c.anchor} | ${c.label} | ${c.services.length} |\n`;
md += `\n## CTA label variants (${new Set(records.map((r) => r.hero?.cta_label)).size})\n\n`;
const ctaCount = {}; for (const r of records) ctaCount[r.hero?.cta_label] = (ctaCount[r.hero?.cta_label] ?? 0) + 1;
for (const [k, v] of Object.entries(ctaCount).sort((a, b) => b[1] - a[1])) md += `- ${v} × "${k}"\n`;
fs.writeFileSync(path.join(outDir, 'extract-report.md'), md);

console.log(`\n  pages              ${records.length}\n  categories         ${Object.keys(cats).length}\n  with edge section  ${records.filter((r) => r.edge).length}\n  card-mode hero     ${records.filter((r) => r.hero?.visual_mode === 'card').length}\n  cta label variants ${Object.keys(ctaCount).length}\n  uncaptured copy    ${withGaps.length} page(s)${withGaps.length ? '  <- schema gap, see extract-report.md' : ''}\n  notes              ${withNotes.length} page(s)\n\n  written to ${outFile}, categories.json, extract-report.md\n`);
if (strict && withGaps.length) process.exit(1);
