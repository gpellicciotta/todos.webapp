import { defineConfig } from '@playwright/test';
import perf from 'file:///C:/Dev-Projects/todos.webapp/.plan/work/T0054-build-the-view-options-panel-the-more-menu/playwright.perf.config.js';

const WORKTREE = 'C:/Dev-Projects/todos.webapp/.plan/work/T0054-build-the-view-options-panel-the-more-menu';
const PORT = Number(process.env.E2E_PORT ?? 8754);

// Same performance spec, served from the main-branch copy in BEFORE_ROOT, to compare against the task branch.
export default defineConfig({
  ...perf,
  testDir: `${WORKTREE}/tests/e2e`,
  webServer: { ...perf.webServer, command: `node ${WORKTREE}/scripts/serve.mjs --port ${PORT} --root ${process.env.BEFORE_ROOT}`, cwd: WORKTREE },
});
