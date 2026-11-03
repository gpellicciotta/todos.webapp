import { defineConfig } from 'vitest/config';

// Unit tests live in tests/unit; Playwright owns tests/e2e.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
