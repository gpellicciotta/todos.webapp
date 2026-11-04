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

### Review Rework
Command: `npx vitest run tests/unit/backup.test.js tests/unit/fractional-index.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/fractional-index.test.js (58 tests | 14 failed) 69ms
   ❯ validateKey and isValidKey (14)
     × accept a0 6ms
     × accept a0V 1ms
     × accept Zz 0ms
     × accept b00 0ms
     × accept c000 0ms
     × accept a1zzzV 0ms
     × accept A00000000000000000000000001 0ms
     × reject a key with a digit head 0ms
     × reject a key ending with a zero fraction digit 0ms
     × reject a key shorter than its integer part 0ms
     × reject an empty key 0ms
     × reject the smallest integer 0ms
     × reject a key with an invalid character 0ms
     × reject a non-string 0ms
 ❯ tests/unit/backup.test.js (44 tests | 12 failed) 110ms
   ❯ parseBackup (26)
     × reads a version 1 file 16ms
     × keeps list descriptions exactly, and trims names, task descriptions, and note texts like the store 2ms
     × rejects a position with a digit head 2ms
     × rejects a position ending with a zero fraction digit 1ms
     × rejects a position shorter than its integer part 1ms
     × rejects an impossible date 1ms
     × rejects an impossible hour 1ms
   ❯ merge import (5)
     × adds missing items, keeps the newer version, and appends missing memberships 5ms
   ❯ overwrite import (6)
     × replaces own data and moves missing own items to the recycle bin 4ms
     × lets an imported list keep a name that a local list binned by the same import used 4ms
     × matches the connected user by identifier, whether a number or a string 2ms
   ❯ round trip (1)
     × reproduces the same data when an export is imported into an empty store in overwrite mode 7ms
[... 247 lines omitted ...]
      Tests  26 failed | 76 passed (102)
   Start at  15:55:28
   Duration  638ms (transform 41%, tests 31%, import 24%, worker 4%)
```

Command: `npx vitest run tests/unit/backup.test.js tests/unit/fractional-index.test.js tests/unit/store-*.test.js tests/unit/bin.test.js && npx eslint src/js tests/unit && python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  6 passed (6)
      Tests  199 passed (199)
   Start at  15:56:51
   Duration  818ms (tests 48%, import 41%, transform 8%, worker 3%)

Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 7 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```
