import { defineConfig, devices } from '@playwright/test';

const PORT = 8794;

// Capture config for T0283: the app's static server and Chromium, with the same network guard as the e2e config.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  workers: 2,
  reporter: [['list']],
  outputDir: '../../test-results/t0283',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost' },
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
