## Walkthrough & Validation
The store catches subscriber errors after commit, and a test pins that every facade write notifies.
Ctrl or Cmd+Z runs only Undo actions, never Reload, and not while a modal dialog is open.
The shell shows a newer version as a lasting banner, purges before the overdue timer, and catches start-up failures.
A view change moves focus to main; a stored theme sets every `theme-color` meta.
Task rows get a logical selected edge, press feedback, a flat disabled status button, and token-only math.
The gallery task list pattern shows only open rows under "Status: open".
The code was written during T0016 and split out on 2026-11-04; this is stage 1 of the split.

### Red Phase
The stage 1 tests ran against HEAD. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.
The notify-on-every-write test passed at once: it pins behavior the T0032 review asked to cover.
The focus ring test at 1440 px timed out only under the shortened `--timeout 10000`; its code is unchanged at HEAD.

Command: `npx vitest run tests/unit/store-db.test.js tests/unit/toast.test.js tests/unit/tokens.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × scale no token by a bare number in app-components.css, using size tokens instead 17ms
[... 2 lines omitted ...]
     × keeps a committed write and the other subscribers when one subscriber throws 9ms
[... 2 lines omitted ...]
     × runs only Undo actions on Ctrl+Z, never another action such as Reload 9ms
     × ignores Ctrl+Z while a modal dialog is open 2ms
[... 3 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > store change notification coverage > keeps a committed write and the other subscribers when one subscriber throws
Error: subscriber failed
[... 14 lines omitted ...]
 FAIL  tests/unit/toast.test.js > createToaster > runs only Undo actions on Ctrl+Z, never another action such as Reload
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 20 lines omitted ...]
 FAIL  tests/unit/toast.test.js > createToaster > ignores Ctrl+Z while a modal dialog is open
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 20 lines omitted ...]
 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > scale no token by a bare number in app-components.css, using size tokens instead
AssertionError: expected [ …(3) ] to deeply equal []
[... 22 lines omitted ...]
 Test Files  3 failed (3)
      Tests  4 failed | 134 passed (138)
[... 2 lines omitted ...]
```

Command: `E2E_PORT=8821 npx playwright test tests/e2e/gallery-app.spec.js tests/e2e/shell.spec.js --timeout 10000` (exit code 1)

```text
[... 16 lines omitted ...]
  x  16 [chromium] › tests\e2e\gallery-app.spec.js:286:1 › a read-only row keeps its disabled status button flat on hover, and a selected row shows press feedback (1.7s)
  x  17 [chromium] › tests\e2e\gallery-app.spec.js:309:1 › the task list pattern shows only open rows under its Status: open filter (1.4s)
[... 9 lines omitted ...]
  x  13 [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (10.6s)
  x  22 [chromium] › tests\e2e\shell.spec.js:71:1 › navigation marks the current route, and back and forward move between routes (5.8s)
  x  27 [chromium] › tests\e2e\shell.spec.js:174:1 › the theme follows the system by default and a stored preference pins it (5.8s)
  x  28 [chromium] › tests\e2e\shell.spec.js:190:1 › a newer app version in another tab shows a lasting banner with Reload (5.5s)
  x  29 [chromium] › tests\e2e\shell.spec.js:214:1 › a start-up failure shows an error banner instead of a broken page (5.3s)
[... 4 lines omitted ...]
    Test timeout of 10000ms exceeded.
[... 15 lines omitted ...]
    Expected: "rgba(0, 0, 0, 0)"
    Received: "rgba(226, 226, 232, 1)"
[... 187 lines omitted ...]
  7 failed
[... 7 lines omitted ...]
  22 passed (22.3s)
```

### Green Phase
Stage 1 is HEAD plus this task's files, with VERSION 2026-11-04.3 and regenerated hashes. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  19 passed (19)
      Tests  492 passed (492)
   Start at  18:40:22
   Duration  2.98s (environment 47%, tests 23%, import 16%, transform 12%, worker 2%)

    Isolate  19 workers spawned · ~553ms startup each (spawn + environment, per file)
             at least ~948ms faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 34 precached files match VERSION 2026-11-04.3.
```

Command: `E2E_PORT=8821 npm run test:e2e` (exit code 0)

```text
[... 30 lines omitted ...]
  ok 26 [chromium] › tests\e2e\gallery-app.spec.js:286:1 › a read-only row keeps its disabled status button flat on hover, and a selected row shows press feedback (1.5s)
  ok 27 [chromium] › tests\e2e\gallery-app.spec.js:309:1 › the task list pattern shows only open rows under its Status: open filter (924ms)
[... 39 lines omitted ...]
  ok 65 [chromium] › tests\e2e\shell.spec.js:71:1 › navigation marks the current route, and back and forward move between routes (774ms)
[... 4 lines omitted ...]
  ok 72 [chromium] › tests\e2e\shell.spec.js:190:1 › a newer app version in another tab shows a lasting banner with Reload (829ms)
  ok 71 [chromium] › tests\e2e\shell.spec.js:174:1 › the theme follows the system by default and a stored preference pins it (906ms)
  ok 73 [chromium] › tests\e2e\shell.spec.js:214:1 › a start-up failure shows an error banner instead of a broken page (646ms)
[... 2 lines omitted ...]
  73 passed (40.1s)
```

