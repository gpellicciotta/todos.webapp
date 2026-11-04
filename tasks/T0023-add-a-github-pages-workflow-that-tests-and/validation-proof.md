## Walkthrough & Validation
The Pages workflow tests the app, then deploys `src/`.
`scripts/check-sw-version.mjs` fails when a precached file changes without a `VERSION` bump.

### Red Phase
The new unit test ran before the script existed.

Command: `npx vitest run tests/unit/check-sw-version.test.js` (exit code 1)

```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp



⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/check-sw-version.test.js [ tests/unit/check-sw-version.test.js ]
Error: Cannot find module '../../scripts/check-sw-version.mjs' imported from C:/Dev-Projects/todos.webapp/tests/unit/check-sw-version.test.js
 ❯ tests/unit/check-sw-version.test.js:5:1
      3| import { join } from 'node:path';
      4| import { afterEach, beforeEach, describe, expect, it } from 'vitest';
      5| import { checkVersion, hashPrecache, parseWorker, run } from '../../sc…
       | ^
      6|
      7| const WORKER = (version) => `const VERSION = '${version}';

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  18:15:05
   Duration  349ms (worker 96%, environment 4%)
```

The finished check then failed on a scratch copy of `src/` with one edited, precached file.

Command: `node scripts/check-sw-version.mjs --root src-copy --manifest red-hashes.json --update` (exit code 0)

```text
OK: wrote 34 hashes for VERSION 2026-11-04.2 to red-hashes.json
```

Then `echo '/* changed */' >> src-copy/css/style.css`, without a `VERSION` bump:

Command: `node scripts/check-sw-version.mjs --root src-copy --manifest red-hashes.json` (exit code 1)

```text
ERROR: precached files changed but VERSION is still 2026-11-04.2:
  css/style.css
Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update
```

Command: `node scripts/check-sw-version.mjs --root src-copy --manifest red-hashes.json --update` (exit code 1)

```text
ERROR: precached files changed but VERSION is still 2026-11-04.2: css/style.css
Bump VERSION in service-worker.js first, then run --update again.
```

### Green Phase
Command: `npx vitest run tests/unit/check-sw-version.test.js --reporter=verbose` (exit code 0)

```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ✓ tests/unit/check-sw-version.test.js > parseWorker > reads VERSION and the PRECACHE entries 9ms
 ✓ tests/unit/check-sw-version.test.js > parseWorker > throws when VERSION or PRECACHE is missing 6ms
 ✓ tests/unit/check-sw-version.test.js > hashPrecache > hashes every precached file except the start URL 7ms
 ✓ tests/unit/check-sw-version.test.js > hashPrecache > ignores CRLF line endings in text files, so Windows and CI checkouts agree 5ms
 ✓ tests/unit/check-sw-version.test.js > hashPrecache > keeps binary files byte exact 7ms
 ✓ tests/unit/check-sw-version.test.js > checkVersion > passes when the manifest matches the worker and its files 6ms
 ✓ tests/unit/check-sw-version.test.js > checkVersion > fails when a precached file changed but VERSION did not 6ms
 ✓ tests/unit/check-sw-version.test.js > checkVersion > counts added and removed precache entries as changes 9ms
 ✓ tests/unit/check-sw-version.test.js > checkVersion > fails when VERSION was bumped but the manifest was not updated 8ms
 ✓ tests/unit/check-sw-version.test.js > run > writes the manifest with --update, then passes the check 16ms
 ✓ tests/unit/check-sw-version.test.js > run > exits 1 when a precached file changed without a VERSION bump, and refuses --update 16ms
 ✓ tests/unit/check-sw-version.test.js > run > accepts the change after VERSION is bumped and the manifest is updated 19ms
 ✓ tests/unit/check-sw-version.test.js > run > exits 1 with a hint when the manifest does not exist 7ms
 ✓ tests/unit/check-sw-version.test.js > run > exits 2 on an unknown option 5ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  18:18:43
   Duration  337ms (tests 76%, import 15%, transform 6%, worker 4%)
```

Command: `npm run check:sw` (exit code 0)

```text
> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 34 precached files match VERSION 2026-11-04.2.
```

Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  19 passed (19)
      Tests  487 passed (487)
   Start at  18:16:27
   Duration  2.74s (environment 49%, tests 26%, import 19%, transform 3%, worker 2%)

    Isolate  19 workers spawned · ~508ms startup each (spawn + environment, per file)
             at least ~872ms faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text
> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `E2E_PORT=8771 npm run test:e2e` (exit code 0)

```text
> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 69 tests using 4 workers

  ok  4 [chromium] › tests\e2e\behaviors-dialog.spec.js:65:3 › dialog behavior › the modal fills the viewport height as a sheet at 390 px (1.2s)
  ok  3 [chromium] › tests\e2e\behaviors-dialog.spec.js:99:3 › toast behavior › Escape inside a toast dismisses it and returns focus (1.3s)
... [truncated: 66 lines omitted] ...
  ok 47 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (14.2s)

  69 passed (39.1s)
```

actionlint 1.7.12 is the Windows release binary, checked against its published SHA-256 checksum.

Command: `actionlint -no-color -verbose .github/workflows/pages.yml` (exit code 0)

```text
verbose: Linting .github/workflows/pages.yml
verbose: Using project at C:\Dev-Projects\todos.webapp
verbose: Found 0 parse errors in 0 ms for .github/workflows/pages.yml
verbose: Rule "shellcheck" was disabled: exec: "shellcheck": executable file not found in %PATH%
verbose: Rule "pyflakes" was disabled: exec: "pyflakes": executable file not found in %PATH%
verbose: Found total 0 errors in 48 ms for .github/workflows/pages.yml
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 7 markdown files passed linting.
Finished lint-markdown check in 0.2s with status: succeeded
```
