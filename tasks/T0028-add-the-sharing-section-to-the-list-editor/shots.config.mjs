import { defineConfig } from '@playwright/test';

const WORKTREE = 'C:/Dev-Projects/todos.webapp/.plan/work/T0028-add-the-sharing-section-to-the-list-editor';
const BASE = 'C:/Dev-Projects/todos.webapp';

export default defineConfig({
  testDir: '.',
  testMatch: 'shots.spec.mjs',
  workers: 1,
  reporter: [['list']],
  webServer: [
    { command: 'node scripts/serve.mjs --port 8801', cwd: BASE, url: 'http://127.0.0.1:8801/', reuseExistingServer: false },
    { command: 'node scripts/serve.mjs --port 8802', cwd: WORKTREE, url: 'http://127.0.0.1:8802/', reuseExistingServer: false },
  ],
});
