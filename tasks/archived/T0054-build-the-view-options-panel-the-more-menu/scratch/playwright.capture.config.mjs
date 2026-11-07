import { defineConfig, devices } from '@playwright/test';

const WORKTREE = 'C:/Dev-Projects/todos.webapp/.plan/work/T0054-build-the-view-options-panel-the-more-menu';
const BEFORE_ROOT = process.env.BEFORE_ROOT;

export default defineConfig({
  testDir: '.',
  testMatch: 'capture.spec.mjs',
  workers: 1,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'] },
  webServer: [
    { command: `node ${WORKTREE}/scripts/serve.mjs --port 8761 --root ${BEFORE_ROOT}`, url: 'http://127.0.0.1:8761/', reuseExistingServer: false },
    { command: `node ${WORKTREE}/scripts/serve.mjs --port 8762`, cwd: WORKTREE, url: 'http://127.0.0.1:8762/', reuseExistingServer: false },
  ],
});
