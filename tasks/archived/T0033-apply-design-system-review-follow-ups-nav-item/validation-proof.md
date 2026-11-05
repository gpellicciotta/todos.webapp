## Walkthrough & Validation

### Summary
- The current nav item draws its edge with a logical `::before` and keeps hover and active grounds.
- New tokens replace bare-number math in app-chrome.css: `--icon-size-lg`, `--icon-stroke-thin`, `--focus-ring-offset-inset`.
- The sync dot ring takes `--sync-indicator-ground`, or the indicator's own hover and active ground.
- The gallery gained current item, pressed bottom bar, and hovered dot specimens.
- Live regions use `.visually-hidden`; toasts wait for modals; `undoShortcut` binds Ctrl or Cmd+Z.

Each run used a scratch tree: `git archive HEAD` extracted, the stage files overlaid, and `node_modules` linked.
End-to-end runs set a free `E2E_PORT` per run.

### Red Phase
The changed tests ran against stage 1 (HEAD plus T0032), before the design system changes.

Command: `npx vitest run tests/unit/toast.test.js tests/unit/live-region.test.js tests/unit/tokens.test.js` (exit code 1)

```text
 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0033-red
[... 1 lines omitted ...]
 ❯ tests/unit/tokens.test.js (114 tests | 1 failed) 110ms
[... 1 lines omitted ...]
     × scale no token by a bare number in app-chrome.css, using size tokens instead 15ms
 ❯ tests/unit/live-region.test.js (5 tests | 1 failed) 34ms
[... 1 lines omitted ...]
     × adds a polite and an assertive region that stay visually hidden 21ms
 ❯ tests/unit/toast.test.js (15 tests | 3 failed) 60ms
[... 1 lines omitted ...]
     × holds toasts while a modal dialog is open and shows them once it closes 11ms
     × runs the newest Undo on undoLatest and reports whether one was there 1ms
     × runs the newest Undo on Ctrl+Z or Cmd+Z outside text fields with the shortcut on 2ms
[... 1 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/live-region.test.js > createLiveRegion > adds a polite and an assertive region that stay visually hidden
AssertionError: expected false to be true // Object.is equality
[... 1 lines omitted ...]
- Expected
+ Received
[... 4 lines omitted ...]
 ❯ tests/unit/live-region.test.js:24:58
[... 9 lines omitted ...]
 FAIL  tests/unit/toast.test.js > createToaster > holds toasts while a modal dialog is open and shows them once it closes
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
[... 1 lines omitted ...]
Received:
[... 10 lines omitted ...]
 ❯ tests/unit/toast.test.js:138:37
[... 9 lines omitted ...]
[... 12 more kept lines omitted ...]
+ Received
[... 10 lines omitted ...]
 ❯ tests/unit/tokens.test.js:322:50
[... 10 lines omitted ...]
 Test Files  3 failed (3)
      Tests  5 failed | 129 passed (134)
   Start at  17:13:52
   Duration  1.10s (environment 83%, tests 11%, import 4%, transform 1%, worker 1%)
```

Command: `npx playwright test tests/e2e/gallery-chrome.spec.js` (exit code 1)

```text
[... 3 lines omitted ...]
Running 14 tests using 4 workers
[... 25 lines omitted ...]
  x   9 [chromium] › tests\e2e\gallery-chrome.spec.js:148:1 › the sync dot ring matches the ground under the indicator (1.0s)
[... 8 lines omitted ...]
  x   8 [chromium] › tests\e2e\gallery-chrome.spec.js:126:1 › the current nav item keeps hover and active feedback and its edge on the inline start (30.2s)
[... 6 lines omitted ...]
    Error: locator.evaluate: Test timeout of 30000ms exceeded.
[... 14 lines omitted ...]
    Error Context: test-results\gallery-chrome-the-current-2e594-ts-edge-on-the-inline-start-chromium\error-context.md
[... 11 lines omitted ...]
    Error: expect(received).toBeGreaterThanOrEqual(expected)
[... 1 lines omitted ...]
    Expected: >= 3
    Received:    2
[... 10 lines omitted ...]
    Error Context: test-results\gallery-chrome-the-sync-do-28646--ground-under-the-indicator-chromium\error-context.md
[... 9 lines omitted ...]
  2 failed
    [chromium] › tests\e2e\gallery-chrome.spec.js:126:1 › the current nav item keeps hover and active feedback and its edge on the inline start
    [chromium] › tests\e2e\gallery-chrome.spec.js:148:1 › the sync dot ring matches the ground under the indicator
  12 passed (34.4s)
```

### Green Phase
The completion check ran at this task's own stage.

Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0033-green


 Test Files  16 passed (16)
      Tests  443 passed (443)
   Start at  17:14:30
   Duration  2.85s (environment 54%, tests 24%, import 18%, transform 3%, worker 2%)

    Isolate  16 workers spawned · ~645ms startup each (spawn + environment, per file)
             at least ~829ms faster with isolate: false — reuses workers across files instead of one per file
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
Running 57 tests using 4 workers
[... 72 lines omitted ...]
  ok 43 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (12.3s)
  ok 47 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (12.5s)
[... 1 lines omitted ...]
  57 passed (37.3s)
```

### Visual Check
Gallery sections at 1440 px, captured from HEAD and from this stage, with reduced motion.
The pressed bottom bar specimen sits in the Navigation section of the stage gallery.

| Section        | Theme | Before                                                                                                   | After                                                                                                  |
| :------------- | :---- | :------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| Navigation     | light | [before](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-navigation-1440-light-before.png)     | [after](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-navigation-1440-light-after.png)     |
| Navigation     | dark  | [before](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-navigation-1440-dark-before.png)      | [after](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-navigation-1440-dark-after.png)      |
| Sync indicator | light | [before](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-sync-indicator-1440-light-before.png) | [after](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-sync-indicator-1440-light-after.png) |
| Sync indicator | dark  | [before](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-sync-indicator-1440-dark-before.png)  | [after](../T0015-build-the-app-shell-service-worker-manifest-hash/screenshots/gallery-sync-indicator-1440-dark-after.png)  |
