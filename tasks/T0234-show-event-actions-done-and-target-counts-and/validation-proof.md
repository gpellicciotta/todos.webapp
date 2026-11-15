## Walkthrough & Validation

### Summary of Key Changes
- The row's status button ticks: `complete` below target, `uncomplete` once completed, and `reopen` once cancelled.
- The row's status menu offers Start, Undo start, Cancel task, and Reopen while their preconditions hold.
- Rows show a `2/3` count chip, and the editor names the counts, above target 1.
- The editor replaces the status segmented control with event action buttons and adds a Target count field.
- Target count, deadline, and overdue behavior save through `store.updateRules`; recurring tasks hide the deadline.
- The Last activity sort is now Last update.
- The query layer already read status, due time, and close time from the current occurrence after T0224.
  New query tests pin that behavior; they passed before the implementation.
- The contract server is a read-only clone of todos.server `9564bec`, built in the ignored `node_modules/.cache/t0234/`.

### Red phase: unit tests before the implementation
Command: `npx vitest run`
Exit code: 1

```text
⎯⎯⎯⎯⎯⎯ Failed Tests 29 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  3 failed | 54 passed (57)
      Tests  29 failed | 1288 passed (1317)
     11  FAIL  tests/unit/task-editor.test.js
     16  FAIL  tests/unit/task-list.test.js
      2  FAIL  tests/unit/view-controls.test.js
```

### Red phase: affected e2e specs before the implementation
Command: `npx playwright test tests/e2e/task-editor.spec.js tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`
Exit code: 1

```text
  ✘   5 [chromium] › tests\e2e\all-tasks.spec.js:189:1 › the status menu posts start and cancel by right-click and by keyboard (TSK-4) (8.0s)
  ✘  14 [chromium] › tests\e2e\all-tasks.spec.js:412:1 › a store change while the status menu is open keeps the menu open and focused (8.4s)
  ✘  45 [chromium] › tests\e2e\task-editor.spec.js:131:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (6.2s)
  ✘  36 [chromium] › tests\e2e\list.spec.js:254:3 › List screen › one click completes a task with an Undo toast, and the status menu cancels a task (TSK-4) (30.1s)
  ✘  44 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (30.2s)
    Error: expect(locator).toHaveText(expected) failed
    Error: expect(locator).toBeFocused() failed
    Error: expect(locator).toHaveValue(expected) failed
  5 failed
  44 passed (1.0m)
```

### Green phase: unit suite
Command: `npm test`
Exit code: 0

```text
 Test Files  57 passed (57)
      Tests  1317 passed (1317)
```

### Lint
Command: `npm run lint`
Exit code: 0

```text
> todos-webapp@0.4.1-pre lint
> eslint .
```

### Service worker version check
Command: `npm run check:sw` (after `node scripts/check-sw-version.mjs --update` for VERSION `2026-11-15.9`)
Exit code: 0

```text
> todos-webapp@0.4.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 126 precached files match VERSION 2026-11-15.9.
```

### Contract suite against a local todos.server
Command: `TODOS_SERVER_DIR=node_modules/.cache/t0234/todos-server npm run test:contract`
Exit code: 0

```text
> todos-webapp@0.4.1-pre test:contract
> vitest run --config vitest.contract.config.js
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0234-show-event-actions-done-and-target-counts-and
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:03:50
   Duration  3.42s (tests 89%, transform 7%, import 4%)
```

### End-to-end suite
The first full run failed one test from T0228, unrelated to this task.
`connect.spec.js:174` matched both the new row and the add bar's live region "Added “Water the plants”.".
The locator now targets the row link.

Command: `npx playwright test` (first run)
Exit code: 1

```text
  ✘   62 [chromium] › tests\e2e\connect.spec.js:165:1 › an expired session asks to sign in again and keeps local work going (2.0s)
    Error: expect(locator).toBeVisible() failed
    Error: strict mode violation: getByText('Water the plants') resolved to 2 elements:
  1 failed
  207 passed (2.2m)
```

Command: `npx playwright test` (after the locator fix)
Exit code: 0

```text
  ✓    1 [chromium] › tests\e2e\all-tasks.spec.js:157:1 › one click completes a task, x toggles the focused row, and Undo or Ctrl+Z sets it back (TSK-4) (3.1s)
  ✓    5 [chromium] › tests\e2e\all-tasks.spec.js:189:1 › the status menu posts start and cancel by right-click and by keyboard (TSK-4) (2.0s)
  ✓   14 [chromium] › tests\e2e\all-tasks.spec.js:412:1 › a store change while the status menu is open keeps the menu open and focused (1.8s)
  ✓   62 [chromium] › tests\e2e\connect.spec.js:165:1 › an expired session asks to sign in again and keeps local work going (1.8s)
  ✓  140 [chromium] › tests\e2e\list.spec.js:254:3 › List screen › one click completes a task with an Undo toast, and the status menu cancels a task (TSK-4) (3.8s)
  ✓  203 [chromium] › tests\e2e\task-editor.spec.js:131:1 › ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode (3.7s)
  ✓  204 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.3s)
[... 201 passing lines omitted ...]
  208 passed (2.2m)
```

### Visual verification
Command: `node capture.mjs {{worktree}} {{main-checkout}}/src {{worktree}}/src {{companion-dir}}` (a temporary Playwright script)
Exit code: 0

The "before" server served the main checkout at `1ad2dd8`; the "after" server served this worktree.
Both seeded "Buy paint for the hallway", "Call the plumber" (started), and "French exercises" (target 3, two completions).

```text
started: node scripts/serve.mjs --port 8761 --root C:/Dev-Projects/todos.webapp/src (PID 46540)
HTTP 200 from http://127.0.0.1:8761/
started: node scripts/serve.mjs --port 8762 --root C:/Dev-Projects/todos.webapp/.plan/work/T0234-show-event-actions-done-and-target-counts-and/src (PID 42044)
HTTP 200 from http://127.0.0.1:8762/
stopping: processes kill --yes --force 46540
Killed PID 46540
stopping: processes kill --yes --force 42044
Killed PID 42044
no console errors, page errors, failed requests, or HTTP errors
```

| View                       | Before                                                         | After                                                        |
| :------------------------- | :------------------------------------------------------------- | :----------------------------------------------------------- |
| Rows, wide, light          | [before](before-row-wide-light.png)                            | [after](after-row-wide-light.png)                            |
| Status menu, wide, light   | [before](before-status-menu-wide-light.png)                    | [after](after-status-menu-wide-light.png)                    |
| Editor, wide, light        | [before](before-editor-wide-light.png)                         | [after](after-editor-wide-light.png)                         |
| Rows, compact, dark        | [before](before-row-compact-dark.png)                          | [after](after-row-compact-dark.png)                          |
| Status menu, compact, dark | [before](before-status-menu-compact-dark.png)                  | [after](after-status-menu-compact-dark.png)                  |
| Editor, compact, dark      | [before](before-editor-compact-dark.png)                       | [after](after-editor-compact-dark.png)                       |
