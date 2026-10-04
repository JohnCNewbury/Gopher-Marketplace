// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Behavioural flows. The SAME specs run against golden and candidate:
 *
 *   BASE_URL=http://127.0.0.1:8140 npx playwright test          # golden (static Final/)
 *   BASE_URL=http://127.0.0.1:8000 URL_MAP=cleanUrls npx playwright test   # candidate (Laravel)
 *
 * Parity = both runs green. A flow that only passes on golden is a port
 * regression; one that only passes on candidate is a golden bug the port fixed
 * (record it in docs/port-notes and keep the test).
 */
export default defineConfig({
  testDir: './flows',
  testMatch: /.*\.spec\.mjs/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'out/flows-report' }]],
  outputDir: 'out/flows-artifacts',
  timeout: 45_000,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8140',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // CHROMIUM_PATH: pre-installed browser when the Playwright download is blocked.
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
