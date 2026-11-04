## Walkthrough & Validation

### Red Phase
Command: `npx vitest run tests/unit/backup.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/backup.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/backup.test.js [ tests/unit/backup.test.js ]
Error: Cannot find module '../../src/js/core/backup.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/backup.test.js
 ❯ tests/unit/backup.test.js:3:1
      1| import { readFileSync } from 'node:fs';
      2| import { afterEach, beforeEach, describe, expect, it } from 'vitest';
      3| import {
       | ^
      4|   BackupError, backupFileName, exportBackup, importBackup, parseBackup…
      5| } from '../../src/js/core/backup.js';

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  15:47:55
   Duration  247ms (worker 97%, environment 3%)
```

### Green Phase
Command: `npx vitest run tests/unit/backup.test.js tests/unit/store-lists.test.js tests/unit/store-tasks.test.js tests/unit/store-notes.test.js tests/unit/bin.test.js tests/unit/overdue.test.js tests/unit/fractional-index.test.js && npx eslint src/js tests/unit && python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  7 passed (7)
      Tests  188 passed (188)
   Start at  15:50:56
   Duration  1.36s (import 48%, tests 32%, transform 18%, worker 2%)

Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 7 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```
