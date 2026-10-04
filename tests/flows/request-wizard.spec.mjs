/**
 * gopher-request.html — marketing page + request wizard.
 *
 * Smoke runs today. The wizard flow is a skeleton behind test.fixme until
 * `data-testid`s exist. The steps mirror gopher-step-gates.js / gopher-flow-rules.js
 * (already unit-tested in docs/handoff/request-app-parity/test-*.js) and the
 * v122 rule from the changelog ledger: Request hires exactly ONE worker.
 */
import { test, expect } from './fixtures.mjs';

test('request page boots with Maps stubbed; the Maps callback fires; no console errors', async ({ page, url, stubs, errors }) => {
  const res = await page.goto(url('/gopher-request.html'));
  expect(res.status()).toBe(200);
  await page.waitForTimeout(1200);
  expect(stubs.maps).toBe(1);
  expect(await page.evaluate(() => window.__gmStubLoaded === true)).toBe(true);
  expect(errors).toEqual([]);
});

test('the changelog comment is NOT shipped to visitors (candidate only)', async ({ page, url }) => {
  test.skip(!process.env.URL_MAP || process.env.URL_MAP === 'identity', 'golden ships it; this asserts the port stopped');
  const res = await page.goto(url('/gopher-request.html'));
  const html = await res.text();
  expect(html).not.toMatch(/CHANGELOG \(newest first\)/);
  expect(html.length, 'page weight').toBeLessThan(600_000);
});

test.describe('request wizard', () => {
  test.fixme(true, 'needs data-testid on: req-start, req-category-<slug>, req-address, req-address-suggestion, req-next, req-workers-needed, req-offer, req-review, req-submit');

  test('happy path reaches the review step with one lead worker', async ({ page, url, stubs }) => {
    await page.goto(url('/gopher-request.html#login'));
    await page.getByTestId('req-start').click();
    await page.getByTestId('req-category-junk_removal').click();
    await page.getByTestId('req-next').click();
    await page.evaluate(() => { window.__gmStubPlace = { formatted_address: '1 Main St, Raleigh, NC 27601', geometry: { location: { lat: () => 35.78, lng: () => -78.64 } } }; });
    await page.getByTestId('req-address').fill('1 Main St');
    await page.getByTestId('req-address-suggestion').first().click();
    await page.getByTestId('req-next').click();
    await page.getByTestId('req-workers-needed').fill('3');
    await page.getByTestId('req-next').click();
    await page.getByTestId('req-offer').fill('120');
    await page.getByTestId('req-next').click();
    await expect(page.getByTestId('req-review')).toBeVisible();
    // v122: crew size drives pricing, but exactly one worker is hired
    await expect(page.getByTestId('req-review')).toContainText(/one lead worker|1 worker/i);
    expect(stubs.api.filter((c) => c.method === 'POST'), 'nothing is written before submit').toEqual([]);
  });

  test('draft survives a reload (resume banner)', async ({ page, url }) => {
    await page.goto(url('/gopher-request.html#login'));
    await page.getByTestId('req-start').click();
    await page.getByTestId('req-category-junk_removal').click();
    await page.reload();
    await expect(page.getByTestId('req-resume-banner')).toBeVisible();
  });
});
