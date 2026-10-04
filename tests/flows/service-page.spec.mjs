/**
 * Family A — the 107 templated service pages.
 * Runs against a representative sample by default; ALL=1 runs every page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';
import { loadPages } from '../lib/pages.mjs';
import config from '../harness.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const all = loadPages(path.resolve(here, '..', config.inventorySummary)).filter((p) => p.family.startsWith('A:'));
const sample = process.env.ALL ? all : ['junk-removal.html', 'mattress-disposal.html', 'age-restricted.html', 'airport-rides.html', 'lawn-mowing.html']
  .map((f) => all.find((p) => p.file === f)).filter(Boolean);

for (const p of sample) {
  test.describe(p.file, () => {
    test('renders the service template with chrome, SEO head and valid JSON-LD', async ({ page, url, errors }) => {
      const res = await page.goto(url('/' + p.file));
      expect(res.status()).toBe(200);

      // chrome: header + footer are injected (golden) or server-rendered (candidate) — either way they exist
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('footer').first()).toBeAttached();

      // template sections
      await expect(page.locator('h1')).toHaveCount(1);
      // primary CTA: label is per-page copy ("Order now", "Book an airport ride", …40 variants) — the href is the contract
      const cta = page.locator('a[href*="gopher-request"][href$="#login"]');
      await expect(cta.first()).toBeVisible();
      expect(await cta.count(), 'hero + closing CTA').toBeGreaterThanOrEqual(2);
      expect((await cta.first().textContent()).trim().length).toBeGreaterThan(3);
      await expect(page.locator('.pillar, [data-testid="pillar"]')).toHaveCount(3);
      await expect(page.locator('.step, [data-testid="step"]')).toHaveCount(4);

      // SEO head is intact and self-consistent
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toMatch(/^https:\/\/gophergo\.io\//);
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(await page.title()).toBe(ogTitle);
      const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
      expect(ld['@type']).toBe('Service');
      expect(ld.provider?.name).toBe('Gopher');

      expect(errors, 'no console/page errors').toEqual([]);
    });

    test('reveal sections become visible on scroll', async ({ page, url }) => {
      await page.goto(url('/' + p.file));
      const reveals = page.locator('.reveal, [data-reveal]');
      const n = await reveals.count();
      test.skip(n === 0, 'page has no reveal sections');
      // IntersectionObserver only fires for elements that actually enter the viewport,
      // so scroll to each one rather than jumping to the bottom.
      for (let i = 0; i < Math.min(n, 8); i++) {
        await reveals.nth(i).scrollIntoViewIfNeeded();
        await expect(reveals.nth(i)).toHaveCSS('opacity', '1');
      }
    });
  });
}
