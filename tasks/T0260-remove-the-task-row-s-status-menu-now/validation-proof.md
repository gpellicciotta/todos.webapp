## Walkthrough & Validation

### Key Changes
- Removed the row status menu from `task-list.js`: `STATUS_ACTIONS`, `statusActions`, the menu element, `openStatus`, its keys, the context menu handler, and the long press.
- The status button tooltip names only the status and counts, such as "In progress, 2 of 3 done".
- Removed the status menu styles, the touch callout rule, and the gallery specimen.
- Tests now expect no menu on right-click, long press, Down, Up, Shift+F10, or the Menu key.
- E2E specs cancel and start tasks from the task editor's state buttons instead.

### Red Phase: Changed Unit Tests Before the Removal
Command (exit code 1):
`npx vitest run tests/unit/task-list.test.js tests/unit/all-tasks.test.js tests/unit/recurrence-review.test.js 2>&1 | Select-String -Pattern '✗|×|FAIL|Tests |Test Files' | Select-Object -First 40`

```text
 ❯ tests/unit/all-tasks.test.js (33 tests | 1 failed) 1245ms
     × updates the due chip on the minute tick and keeps the row and an open More menu (OVD-2) 105ms
 ❯ tests/unit/task-list.test.js (69 tests | 7 failed) 3766ms
     × builds only the More menu, and no status menu, next to the list 99ms
     × shows done and target counts on a row whose target is above 1, and none at target 1 47ms
       × names the action of the click and the current status, without a menu popup 12ms
       × opens no menu on a right-click of the status button, and leaves the browser its own menu 17ms
       × opens no menu on Down, Up, Shift+F10, or the Menu key, and leaves those keys to the browser 11ms
       × opens no menu on a long press by touch, so its release ticks like any tap 22ms
       × leaves grace completion of the previous period to the task editor, with no row menu offering it 16ms
[... 14 lines omitted ...]
 Test Files  2 failed | 1 passed (3)
      Tests  8 failed | 104 passed (112)
   Duration  7.05s (environment 46%, tests 37%, transform 13%, import 4%)
[... 2 lines omitted ...]
```

### Red Phase: Changed E2E Specs Before the Removal
Command (exit code 1):
`$env:E2E_PORT='8871'; npx playwright test tests/e2e/list.spec.js tests/e2e/gallery-app.spec.js tests/e2e/all-tasks.spec.js 2>&1 | Select-String -Pattern '✘|passed|failed|flaky|skipped' | Select-Object -First 40`

```text
    Error: expect(locator).toHaveCount(expected) failed
    Error: expect(locator).toHaveCount(expected) failed
    Error: expect(locator).toHaveCount(expected) failed
    Error: expect(locator).toHaveCount(expected) failed
    Error: expect(locator).toHaveCount(expected) failed
  5 failed
  63 passed (1.9m)
```

Failing tests, from the same specs with `--reporter=line` (exit code 1):

```text
  1) [chromium] › tests\e2e\all-tasks.spec.js:239:1 › the status button opens no menu, and the task editor posts start 
and cancel (TSK-4) 
  2) [chromium] › tests\e2e\gallery-app.spec.js:324:3 › status icons take the status colors, and To do keeps the muted 
text color, in the light theme 
  3) [chromium] › tests\e2e\gallery-app.spec.js:324:3 › status icons take the status colors, and To do keeps the muted 
text color, in the dark theme 
  4) [chromium] › tests\e2e\list.spec.js:262:3 › List screen › one click completes a task with an Undo toast, the row 
opens no status menu, and the editor cancels a task (TSK-4) 
  5) [chromium] › tests\e2e\list.spec.js:308:3 › List screen › a completed target-1 row is inert to a click, to x, and 
to a right-click (TSK-4)
```

### Green Phase: Unit Suite
Command (exit code 0): `npm test 2>&1 | Select-Object -Last 8`

```text
 Test Files  65 passed (65)
      Tests  1727 passed (1727)
   Start at  14:40:22
   Duration  33.26s (environment 48%, tests 38%, import 6%, transform 5%, worker 1%, setup 1%)

    Isolate  65 workers spawned · ~2.08s startup each (spawn + environment, per file)
             at least ~17.22s faster with isolate: false — reuses workers across files instead of one per file
```

### Green Phase: List, Gallery, All Tasks, and Task Editor E2E Specs
Command (exit code 0):
`$env:E2E_PORT='8871'; npx playwright test tests/e2e/list.spec.js tests/e2e/gallery-app.spec.js tests/e2e/all-tasks.spec.js tests/e2e/task-editor.spec.js 2>&1 | Select-String -Pattern '✘|passed|failed|flaky|skipped|Error' | Select-Object -First 30`

```text
  80 passed (1.7m)
```

### Lint
Command (exit code 0): `npm run lint 2>&1 | Select-Object -Last 4`

```text

> todos-webapp@0.5.1-pre lint
> eslint .

```

### Visual Verification
A temporary Playwright capture spec ran against `node scripts/serve.mjs --port 8872`, which Playwright started and stopped.
It asserted HTTP 200 for the pages and zero console errors, page errors, and HTTP 400+ responses on the app page.
Headless Chromium paints no native tooltips, so each row capture shows the `title` text in a visible caption.

Capture output, before (exit code 0):

```text
TITLE light: In progress. Right-click or press Down for more actions.
  ok 1 [chromium] › .capture\capture.spec.js:8:3 › row status button and tooltip, light (1.1s)
  ok 2 [chromium] › .capture\capture.spec.js:44:3 › gallery status button section, light (836ms)
TITLE dark: In progress. Right-click or press Down for more actions.
  ok 3 [chromium] › .capture\capture.spec.js:8:3 › row status button and tooltip, dark (747ms)
  ok 4 [chromium] › .capture\capture.spec.js:44:3 › gallery status button section, dark (1.2s)

  4 passed (7.0s)
```

Capture output, after (exit code 0):

```text
TITLE light: In progress
  ok 1 [chromium] › .capture\capture.spec.js:8:3 › row status button and tooltip, light (912ms)
  ok 2 [chromium] › .capture\capture.spec.js:44:3 › gallery status button section, light (1.2s)
TITLE dark: In progress
  ok 3 [chromium] › .capture\capture.spec.js:8:3 › row status button and tooltip, dark (701ms)
  ok 4 [chromium] › .capture\capture.spec.js:44:3 › gallery status button section, dark (938ms)
  4 passed (6.4s)
```

| View                    | Before                                                                        | After                                                                       |
| :---------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Row status, light       | [row-status-before-light.png](row-status-before-light.png)                    | [row-status-after-light.png](row-status-after-light.png)                    |
| Row status, dark        | [row-status-before-dark.png](row-status-before-dark.png)                      | [row-status-after-dark.png](row-status-after-dark.png)                      |
| Gallery section, light  | [gallery-status-button-before-light.png](gallery-status-button-before-light.png) | [gallery-status-button-after-light.png](gallery-status-button-after-light.png) |
| Gallery section, dark   | [gallery-status-button-before-dark.png](gallery-status-button-before-dark.png)   | [gallery-status-button-after-dark.png](gallery-status-button-after-dark.png)   |
