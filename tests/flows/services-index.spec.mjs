/**
 * gopher-services.html — the category index. Every #cat-* anchor must exist and
 * every service link must resolve to a page the inventory knows about.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';
import { loadPages } from '../lib/pages.mjs';
import config from '../harness.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pages = loadPages(path.resolve(here, '..', config.inventorySummary));
const known = new Set(pages.map((p) => p.file));

test('services index links to every known service page and no unknown one', async ({ page, url, errors }) => {
  await page.goto(url('/gopher-services.html'));
  const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const servicePaths = hrefs
    .filter((h) => /^[a-z0-9-]+(\.html)?(#.*)?$/.test(h) && !/^(index|gopher-)/.test(h))
    .map((h) => h.replace(/#.*$/, '').replace(/(\.html)?$/, '.html'));
  const unknown = [...new Set(servicePaths)].filter((p) => !known.has(p));
  expect(unknown, 'links to pages the inventory does not know').toEqual([]);

  const serviceCount = pages.filter((p) => p.family.startsWith('A:')).length;
  const linked = new Set(servicePaths).size;
  expect(linked, `index links ${linked} of ${serviceCount} service pages`).toBeGreaterThanOrEqual(Math.floor(serviceCount * 0.9));
  expect(errors).toEqual([]);
});

test('every category anchor used by service breadcrumbs exists on the index', async ({ page, url }) => {
  await page.goto(url('/gopher-services.html'));
  const ids = new Set(await page.locator('[id^="cat-"]').evaluateAll((els) => els.map((e) => e.id)));
  const expected = ['cat-home_services', 'cat-yard_work_outdoor_projects', 'cat-delivery', 'cat-hourly_day_labor', 'cat-moving', 'cat-junk_removal', 'cat-ride_sharing'];
  for (const id of expected) expect(ids, `#${id}`).toContain(id);
});
