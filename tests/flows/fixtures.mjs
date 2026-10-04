/**
 * Shared fixtures for flow specs.
 *
 *   test('…', async ({ page, stubs, url }) => {
 *     await page.goto(url('/gopher-deals.html'));   // url() applies URL_MAP for the candidate
 *     …
 *     expect(stubs.api.filter(c => c.method === 'POST')).toHaveLength(1);
 *   });
 *
 * `stubs` is the network log from lib/stubs.mjs — every call that would have
 * reached api.gophergo.io, and how many times the Maps loader was requested.
 * `errors` collects console errors + uncaught exceptions for the page.
 */

import { test as base, expect } from '@playwright/test';
import config from '../harness.config.mjs';
import { installStubs } from '../lib/stubs.mjs';
import { installDeterminism } from '../lib/capture.mjs';

const mapUrl = config.urlMap[process.env.URL_MAP ?? config.urlMapMode];

export const test = base.extend({
  stubs: async ({ page }, use) => {
    await installDeterminism(page);
    const log = await installStubs(page);
    await use(log);
  },
  errors: async ({ page }, use) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await use(errors);
  },
  url: async ({}, use) => {
    await use((goldenPath) => mapUrl(goldenPath));
  },
});

export { expect };

/** Selector policy: testids first, roles second, never classes/ids from today's markup. */
export const byTestId = (page, id) => page.getByTestId(id);
