import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.js';

// The performance spec (TEC-16) in its own project: one worker, one test at a time, nothing else running.
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: 'performance.spec.js',
  fullyParallel: false,
  workers: 1,
  projects: [{ name: 'performance', use: { ...devices['Desktop Chrome'] } }],
});
