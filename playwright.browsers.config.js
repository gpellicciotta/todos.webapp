import { devices } from '@playwright/test';
import base from './playwright.config.js';

// Cross-browser run of the real-notification spec: `npx playwright test --config playwright.browsers.config.js`.
export default {
  ...base,
  testIgnore: undefined,
  testMatch: 'reminders-real.spec.js',
  projects: [
    // The headless shell always denies notifications, so Chrome itself runs here.
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    // The host resolver rule is a Chromium switch, so Firefox keeps only the closed-port proxy.
    { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { proxy: base.use.launchOptions.proxy } } },
  ],
};
