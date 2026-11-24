## Walkthrough & Validation

### Summary
- Added `src/js/ui/dom.js`: one `make` over the `h` builder of `createDomBuilders(doc)`, cached per document.
- **[Decided]** `make` re-applies an empty class, since `h` skips it and the old helpers wrote `class=""`.
- **[Decided]** Empty, `null`, and missing text add no child; other values render as `String(text)`, as `textContent` did.
- Removed the eight local helpers; task-list.js re-exports the shared `make`.
- Added `dom.js`, `dom-builders.js`, and `inline-confirm.js` to the precache and modulepreload lists; bumped VERSION to `2026-11-24.4`.

### Failing test before the module existed

Command: `npx vitest run tests/unit/dom.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0295-replace-the-eight-local-make-helpers-with-the

 ❯ tests/unit/dom.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/dom.test.js [ tests/unit/dom.test.js ]
Error: Failed to resolve import "../../src/js/ui/dom.js" from "tests/unit/dom.test.js". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Dev-Projects/todos.webapp/.plan/work/T0295-replace-the-eight-local-make-helpers-with-the/tests/unit/dom.test.js:3:22
  1  |  // @vitest-environment happy-dom
  2  |  import { describe, expect, it } from 'vitest';
  3  |  import { make } from '../../src/js/ui/dom.js';
     |                        ^
```

### Mechanical manifest update

Command: `node scripts/check-sw-version.mjs --update` (exit code 0)

```text
OK: wrote 154 hashes for VERSION 2026-11-24.4 to scripts/sw-precache-hashes.json
```

### Completion check

Command: `python scripts/devops.py check` (exit code 0)

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
Process ID: 16240
OK: 154 precached files match VERSION 2026-11-24.4.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
Process ID: 24000
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
Process ID: 36756
> todos-webapp@0.5.1-pre test
> vitest run
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0295-replace-the-eight-local-make-helpers-with-the
 Test Files  68 passed (68)
      Tests  1801 passed (1801)
   Start at  13:46:44
   Duration  18.67s (tests 46%, environment 39%, import 9%, transform 5%, worker 1%, setup 1%)
    Isolate  68 workers spawned · ~859ms startup each (spawn + environment, per file)
             at least ~7.49s faster with isolate: false — reuses workers across files instead of one per file
Command: "C:\Program Files\nodejs\npm.CMD" run lint
Process ID: 19120
> todos-webapp@0.5.1-pre lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
[... 280 e2e progress lines omitted ...]
  276 passed (3.6m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
Process ID: 38008
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
Process ID: 7012
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
Process ID: 6048
........................................................................ [ 33%]
........................................................................ [ 66%]
.......................................................................  [100%]
215 passed in 102.74s (0:01:42)
```
