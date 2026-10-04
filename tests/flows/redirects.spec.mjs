/**
 * Candidate-only: the URL contract that protects 107 indexed pages.
 *   /<slug>.html  → 301 → /<slug>        (canonical points at the clean URL)
 *   /index.html   → 301 → /
 *   /deals, /register, /audience → the deals page (from Final/_redirects)
 *   /sitemap.xml, /robots.txt exist; sitemap lists only 200 pages
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';
import { loadPages } from '../lib/pages.mjs';
import config from '../harness.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const candidateOnly = !process.env.URL_MAP || process.env.URL_MAP === 'identity';

test.describe('legacy .html URLs', () => {
  test.skip(candidateOnly, 'candidate only');
  const pages = loadPages(path.resolve(here, '..', config.inventorySummary)).filter((p) => p.family.startsWith('A:')).slice(0, 10);

  for (const p of pages) {
    test(`/${p.file} → 301 → clean URL`, async ({ request }) => {
      const res = await request.get('/' + p.file, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(res.headers()['location']).toMatch(new RegExp(`/${p.file.replace(/\\.html$/, '')}$`));
    });
  }
});

test('sitemap.xml lists only URLs that return 200', async ({ request }) => {
  test.skip(candidateOnly, 'candidate only');
  const xml = await (await request.get('/sitemap.xml')).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(locs.length).toBeGreaterThan(100);
  for (const loc of locs.slice(0, 25)) {
    const res = await request.get(loc, { maxRedirects: 0 });
    expect(res.status(), loc).toBe(200);
  }
});
