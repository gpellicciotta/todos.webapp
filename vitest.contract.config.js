import { defineConfig } from 'vitest/config';
import { serverDir } from './tests/contract/server.js';

// Contract tests run the sync client against a real todos server; see docs/devops.md, Contract Tests.
if (!serverDir()) {
  console.info('Contract tests skipped: set TODOS_SERVER_DIR to a todos checkout, such as TODOS_SERVER_DIR=../todos');
}

export default defineConfig({
  test: {
    include: ['tests/contract/**/*.contract.test.js'],
    environment: 'node',
    hookTimeout: 180_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
