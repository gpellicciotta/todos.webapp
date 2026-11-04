## Walkthrough & Validation

### Summary
- router.js parses and formats the routes, restores scroll per view, and keeps a memory per view.
- layout.js renders both layouts in one DOM; app-shell.css switches them at 64rem.
- app.js opens the store, runs overdue handling, then the purge, then keeps the overdue timer.
- Each route renders an empty `[data-view]`; the sidebar lists the stored lists with open counts.
- This stage registers no service worker and links no manifest; T0034 adds both.

Each run used a scratch tree: `git archive HEAD` extracted, the stage files overlaid, and `node_modules` linked.
End-to-end runs set a free `E2E_PORT` per run.

### Red Phase
The shell tests ran against stage 2 (T0032 and T0033), before the shell existed.

Command: `npx vitest run tests/unit/router.test.js tests/unit/tokens.test.js` (exit code 1)

```text
 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0015-red
[... 1 lines omitted ...]
 ❯ tests/unit/router.test.js (0 test)
 ❯ tests/unit/tokens.test.js (114 tests | 1 failed) 87ms
[... 1 lines omitted ...]
     × are imported by style.css in order: fonts, tokens, controls, app components, app chrome, then app shell 12ms
[... 3 lines omitted ...]
 FAIL  tests/unit/router.test.js [ tests/unit/router.test.js ]
Error: Cannot find module '../../src/js/ui/router.js' imported from C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0015-red/tests/unit/router.test.js
 ❯ tests/unit/router.test.js:2:1
[... 9 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/tokens.test.js > stylesheets outside tokens.css > are imported by style.css in order: fonts, tokens, controls, app components, app chrome, then app shell
AssertionError: expected [ 'fonts.css', 'tokens.css', …(3) ] to deeply equal [ 'fonts.css', 'tokens.css', …(4) ]
[... 1 lines omitted ...]
- Expected
+ Received
[... 10 lines omitted ...]
 ❯ tests/unit/tokens.test.js:316:21
[... 10 lines omitted ...]
 Test Files  2 failed (2)
      Tests  1 failed | 113 passed (114)
   Start at  17:15:16
   Duration  358ms (tests 61%, import 20%, worker 10%, transform 8%)
```

Command: `npx playwright test tests/e2e/shell.spec.js tests/e2e/index.spec.js` (exit code 1)

```text
[... 3 lines omitted ...]
Running 12 tests using 4 workers
[... 17 lines omitted ...]
  x   4 [chromium] › tests\e2e\shell.spec.js:54:3 › the compact layout shows at 390 px (5.6s)
  x   1 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (5.8s)
  x   2 [chromium] › tests\e2e\shell.spec.js:54:3 › the compact layout shows at 1023 px (5.6s)
  x   3 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (5.7s)
[... 16 lines omitted ...]
  x   5 [chromium] › tests\e2e\shell.spec.js:54:3 › the wide layout shows at 1024 px (5.3s)
  x   6 [chromium] › tests\e2e\shell.spec.js:54:3 › the wide layout shows at 1440 px (5.4s)
  x   7 [chromium] › tests\e2e\shell.spec.js:71:1 › navigation marks the current route, and back and forward move between routes (5.3s)
  x   8 [chromium] › tests\e2e\shell.spec.js:93:1 › every route renders its title and an empty view, and the sidebar follows the lists (5.3s)
[... 16 lines omitted ...]
  x   9 [chromium] › tests\e2e\shell.spec.js:130:1 › an unknown route or list opens All tasks with a toast naming it (5.3s)
  x  10 [chromium] › tests\e2e\shell.spec.js:145:1 › the n and / shortcuts focus the add bar and search once a view has them (5.3s)
  x  11 [chromium] › tests\e2e\shell.spec.js:166:1 › Escape closes an open editor route (5.3s)
  x  12 [chromium] › tests\e2e\shell.spec.js:173:1 › the theme follows the system by default and a stored preference pins it (5.3s)
[... 4 lines omitted ...]
    Error: expect(page).toHaveTitle(expected) failed
[... 1 lines omitted ...]
    Expected: "All tasks · ToDo's"
    Received: "ToDo's"
[... 4 lines omitted ...]
        14 × locator resolved to <html lang="en">…</html>
           - unexpected value "ToDo's"
[... 11 lines omitted ...]
    Error Context: test-results\index-index-page-loads-cleanly-at-390-px-chromium\error-context.md
[... 11 lines omitted ...]
    Error: expect(page).toHaveTitle(expected) failed
[... 1 lines omitted ...]
    Expected: "All tasks · ToDo's"
[... 105 more kept lines omitted ...]
    Error Context: test-results\shell-the-theme-follows-th-eba62-a-stored-preference-pins-it-chromium\error-context.md
[... 9 lines omitted ...]
  12 failed
[... 8 lines omitted ...]
    [chromium] › tests\e2e\shell.spec.js:130:1 › an unknown route or list opens All tasks with a toast naming it
    [chromium] › tests\e2e\shell.spec.js:145:1 › the n and / shortcuts focus the add bar and search once a view has them
    [chromium] › tests\e2e\shell.spec.js:166:1 › Escape closes an open editor route ────────────────
    [chromium] › tests\e2e\shell.spec.js:173:1 › the theme follows the system by default and a stored preference pins it
```

### Green Phase
The completion check ran at this task's own stage.

Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0015-green


 Test Files  17 passed (17)
      Tests  469 passed (469)
   Start at  17:15:42
   Duration  5.76s (environment 40%, tests 26%, import 23%, transform 8%, worker 2%)

    Isolate  17 workers spawned · ~1.31s startup each (spawn + environment, per file)
             at least ~1.87s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text
> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run test:e2e` (exit code 0)

```text
> todos-webapp@0.1.0-pre test:e2e
> playwright test
[... 4 lines omitted ...]
Running 67 tests using 4 workers
[... 82 lines omitted ...]
  ok 67 [chromium] › tests\e2e\shell.spec.js:173:1 › the theme follows the system by default and a stored preference pins it (523ms)
  ok 47 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (14.1s)
[... 1 lines omitted ...]
  67 passed (40.9s)
```

### Visual Check
Before shows the placeholder page; after shows the shell on All tasks with no lists yet.
The captures returned HTTP 200, logged no console errors or failed requests, and had no horizontal scroll.

| Width   | Theme | Before                                                             | After                                                            |
| :------ | :---- | :----------------------------------------------------------------- | :--------------------------------------------------------------- |
| 390 px  | light | [shell-390-light-before.png](screenshots/shell-390-light-before.png)   | [shell-390-light-after.png](screenshots/shell-390-light-after.png)   |
| 390 px  | dark  | [shell-390-dark-before.png](screenshots/shell-390-dark-before.png)     | [shell-390-dark-after.png](screenshots/shell-390-dark-after.png)     |
| 1440 px | light | [shell-1440-light-before.png](screenshots/shell-1440-light-before.png) | [shell-1440-light-after.png](screenshots/shell-1440-light-after.png) |
| 1440 px | dark  | [shell-1440-dark-before.png](screenshots/shell-1440-dark-before.png)   | [shell-1440-dark-after.png](screenshots/shell-1440-dark-after.png)   |
