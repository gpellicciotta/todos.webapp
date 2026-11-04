import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8754);

// The browser reaches only the local server, whatever a test does (network-guard.spec.js proves it).
// Every other host name resolves to "not found", and every other address goes to a proxy on a closed port.
// Requests that a test fulfills with page.route never reach the network, so mocks keep working.
const NETWORK_GUARD = {
  args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
  proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost' },
};

// End-to-end tests run against the static server, which Playwright starts and stops itself.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: NETWORK_GUARD,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
