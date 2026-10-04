/**
 * gopher-deals.html — the LIVE merchant-intake path. First app to be rewritten.
 *
 * ⚠️ REWRITTEN 2026-09-30, when the data-testids were added and the flow was driven for the
 * first time. The previous version of this file was a skeleton written from assumption, and it
 * described a flow the page does not have. What it got wrong, recorded because the same
 * assumptions will be tempting during the Livewire rewrite:
 *
 *   - It submitted in ONE click. The real path is two stages: `.modal-submit` ("Review my deal")
 *     opens a preview, and the submit happens from `#dp-next` in that preview via dpSubmit().
 *   - It never accepted the Merchant Agreement. dpSubmit() hard-refuses without
 *     `#dp-accept-check`; that backstop is deliberate and must survive the port.
 *   - It expected the logo to reach the API immediately on choose. It does not when there is no
 *     token yet: the file is HELD as _pendingLogoFile and uploaded by flushPendingLogo() once
 *     phone verification mints one. So the logo assertion belongs AFTER verification.
 *   - It treated OTP as inert. sendOtp() POSTs a real /otp/get; checkOtp() POSTs /users/sign_in,
 *     which CREATES an account on an unrecognised number.
 *
 * The two assertions that carry the 2026-08-06 defects are kept, and both now pass on golden:
 * exactly ONE POST /users/deals per submit (the "one click → four leads" bug), and the logo
 * bytes actually reaching /users/deals/logo (the "required then discarded" bug).
 */
import { test, expect } from './fixtures.mjs';

const PHONE = '5555550100';   // 555 number: never a real person's, per the standing rule.

test('deals page boots with Maps and API stubbed, no console errors', async ({ page, url, stubs, errors }) => {
  const res = await page.goto(url('/gopher-deals.html'));
  expect(res.status()).toBe(200);
  await expect(page.locator('header').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(stubs.maps, 'Maps loader requested once').toBeLessThanOrEqual(1);
  expect(stubs.api.filter((c) => c.method !== 'GET' && c.method !== 'OPTIONS'), 'no writes on page load').toEqual([]);
  expect(errors).toEqual([]);
});

test('short paths from _redirects land on the deals page', async ({ page, url }) => {
  test.skip(!process.env.URL_MAP || process.env.URL_MAP === 'identity', 'redirect routes exist only on the candidate');
  for (const p of ['/deals', '/register', '/audience']) {
    const res = await page.goto(p);
    expect(res.status()).toBe(200);
    await expect(page).toHaveURL(/gopher-deals|\/deals/);
  }
});

test.describe('merchant registration', () => {
  /** Every field dcValidateAll() requires, short of the logo and the phone.
   *  This list is not guesswork — it is what the form reported as invalid when driven with a
   *  partial fill. Keep it in step with the `need(...)` calls in dcValidateAll(). */
  async function fillRequiredFields(page) {
    await page.getByTestId('deals-reg-start').click();
    await expect(page.getByTestId('deals-reg-business-name')).toBeVisible();
    await page.getByTestId('deals-reg-business-name').fill('Harness Test Bakery');
    const modal = page.locator('#modal-merchant');
    await modal.locator('input[name="tagline"]').fill('Fresh every morning');
    await modal.locator('input[name="address"]').fill('1 Main St, Raleigh, NC 27601');
    await modal.locator('textarea[name="deal"]').fill('10% off your online order');
    await modal.locator('select[name="category"]').selectOption({ index: 1 });
    await modal.locator('select[name="discovery_source"]').selectOption({ index: 1 });
    await modal.locator('input[name="owner_first_name"]').fill('Jamie');
    await modal.locator('input[name="owner_last_name"]').fill('Lopez');
    await modal.locator('input[name="owner_dob"]').fill('01011990');        // dcFormatDob() masks it
    await modal.locator('input[name="owner_email"]').fill('harness@example.com');
    await modal.locator('input[name="owner_address"]').fill('2 Oak Ave, Raleigh, NC 27601');
    // At least one searchable keyword, added through the real control rather than the store.
    await modal.locator('#kw-input').fill('bakery');
    await modal.locator('#kw-add-btn').click();
  }

  /** "Review my deal" opens a FOUR-step preview carousel; acceptance and the real submit
   *  button only exist on the last step, where dpRenderStep relabels #dp-next to
   *  "Submit My Deal" and disables it until the clickwrap is checked. */
  async function openPreviewAndReachAcceptStep(page) {
    await page.getByTestId('deals-reg-review').click();
    const next = page.getByTestId('deals-reg-submit');
    for (let i = 0; i < 3; i++) {
      await expect(next).toHaveText(/Next/);
      await next.click();
    }
    await expect(next).toHaveText(/Submit My Deal/);
    await expect(page.getByTestId('deals-reg-accept')).toBeVisible();
  }

  /** Phone OTP, which is what mints the token the logo upload needs. */
  async function verifyPhone(page) {
    await page.getByTestId('deals-reg-phone').fill(PHONE);
    await page.getByTestId('deals-reg-send-otp').click();
    await expect(page.getByTestId('deals-reg-otp')).toBeVisible();
    await page.getByTestId('deals-reg-otp').fill('123456');
    await page.getByTestId('deals-reg-verify-otp').click();
  }

  /** Email OTP. A SECOND, separate verification — openPreview() refuses without it, because
   *  POST /users/deals sits behind require_email_verified and failing at the preview is the
   *  kinder order. Both factors are required before a deal can be reviewed at all. */
  async function verifyEmail(page) {
    await page.getByTestId('deals-reg-email').fill('harness@example.com');
    await page.getByTestId('deals-reg-send-email-otp').click();
    await expect(page.getByTestId('deals-reg-email-otp')).toBeVisible();
    await page.getByTestId('deals-reg-email-otp').fill('123456');
    await page.getByTestId('deals-reg-verify-email-otp').click();
  }

  test('a burst of taps on Verify sends one code, not one per tap', async ({ page, url, stubs }) => {
    await page.goto(url('/gopher-deals.html'));
    await fillRequiredFields(page);
    await page.getByTestId('deals-reg-phone').fill(PHONE);

    /* CONCURRENT taps, dispatched without waiting for the response — this is what a real
       double-tap is, and what sendOtp's busy flag exists to collapse. Do NOT assert on
       sequential awaited clicks: once the response lands the button relabels to "Resend", so a
       later tap is a deliberate second code and one call per tap is correct. Asserting the
       sequential case is how you file a bug against working software. */
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="deals-reg-send-otp"]');
      b.click(); b.click(); b.click();
    });
    await expect(page.getByTestId('deals-reg-otp')).toBeVisible();
    expect(stubs.api.filter((c) => /\/otp\/get$/.test(c.url)), 'one text message, not three').toHaveLength(1);
  });

  test('a required logo is uploaded, not silently discarded', async ({ page, url, stubs }) => {
    await page.goto(url('/gopher-deals.html'));
    await fillRequiredFields(page);

    // A 1x1 PNG. Chosen BEFORE verification, so it must be held and flushed afterwards.
    await page.getByTestId('deals-reg-logo').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001', 'hex'),
    });
    expect(stubs.api.filter((c) => /\/users\/deals\/logo$/.test(c.url)), 'nothing uploads before there is an account to own it').toHaveLength(0);

    await verifyPhone(page);
    await expect.poll(
      () => stubs.api.filter((c) => /\/users\/deals\/logo$/.test(c.url)).length,
      { message: 'the held logo is flushed once verification mints a token' },
    ).toBe(1);
  });

  test('one submit produces exactly one POST /users/deals', async ({ page, url, stubs }) => {
    await page.goto(url('/gopher-deals.html'));
    await fillRequiredFields(page);
    await page.getByTestId('deals-reg-logo').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001', 'hex'),
    });
    await verifyPhone(page);

    await openPreviewAndReachAcceptStep(page);
    await page.getByTestId('deals-reg-accept').check();

    /* Three taps dispatched synchronously — this is the "one click → four leads" bug of
       2026-08-06 in test form. Do not use three awaited locator clicks: submitForm() disables
       the button on the first one (deliberately), so Playwright would just wait out the test
       on a control that is correctly unavailable. */
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="deals-reg-submit"]');
      b.click(); b.click(); b.click();
    });

    // submitForm waits on a geocode (up to 1.6s) before the request even leaves.
    await expect(page.getByTestId('deals-reg-success')).toBeVisible({ timeout: 15000 });
    const posts = stubs.api.filter((c) => c.method === 'POST' && /\/users\/deals$/.test(c.url));
    expect(posts, 'exactly one lead per submit').toHaveLength(1);
    expect(posts[0].body).toMatchObject({ business_name: 'Harness Test Bakery' });
  });

  test('the Merchant Agreement backstop refuses a submit that has not accepted it', async ({ page, url, stubs }) => {
    await page.goto(url('/gopher-deals.html'));
    await fillRequiredFields(page);
    await page.getByTestId('deals-reg-logo').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001', 'hex'),
    });
    await verifyPhone(page);
    await openPreviewAndReachAcceptStep(page);
    // Deliberately do NOT check acceptance. The submit button is disabled by dpRenderStep, and
    // dpSubmit() refuses as a backstop even if it is reached some other way.
    await page.getByTestId('deals-reg-submit').click({ force: true, timeout: 5000 }).catch(() => {});
    expect(stubs.api.filter((c) => c.method === 'POST' && /\/users\/deals$/.test(c.url)), 'no lead without recorded acceptance').toHaveLength(0);
  });
});
