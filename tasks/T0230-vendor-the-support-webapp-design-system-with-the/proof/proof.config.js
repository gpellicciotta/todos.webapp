// Playwright config for the lossless switch proof; run from the todos.webapp root.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PROOF_PORT ?? 8797);

export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)),
  testMatch: 'capture.spec.js',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: process.env.PROOF_OUT ? `${process.env.PROOF_OUT}/.results` : undefined,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}${process.env.PROOF_ROOT ? ` --root "${process.env.PROOF_ROOT}"` : ''}`,
    cwd: process.cwd(),
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
