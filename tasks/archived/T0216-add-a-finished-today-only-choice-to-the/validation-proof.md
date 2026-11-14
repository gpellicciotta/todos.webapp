## Walkthrough & Validation

### Key Changes
- `filterTasks` narrows completed and cancelled tasks to a `last-update-time` within today, when `finishedToday` is true.
- `clearFilters` drops `finishedToday` with the statuses.
- The Status row offers a "Finished today only" checkbox; storage, Reset, and the info line follow it.
- All tasks and the list view render again on the minute tick while it is on.

### Red Phase

Command: `npx vitest run tests/unit/query.test.js tests/unit/view-controls.test.js tests/unit/all-tasks.test.js tests/unit/list.test.js` (exit code 1)

```text

 RUN  v5.1.0 {{worktree}}

 ❯ tests/unit/query.test.js (52 tests | 4 failed) 198ms
   ❯ the Finished today only choice (TV-14) (5)
     × keeps open tasks and the tasks finished today, and drops the tasks finished earlier 21ms
     × narrows the checked finished statuses, and applies to an empty status filter too 2ms
     × bounds today by local midnight on both sides 2ms
     × never hides a new task, and Show clears it with the statuses 7ms
 ❯ tests/unit/all-tasks.test.js (24 tests | 1 failed) 754ms
   ❯ mountAllTasks (24)
     × renders again on the minute tick while Finished today only is on, so a task finished yesterday leaves (TV-14) 48ms
 ❯ tests/unit/list.test.js (14 tests | 1 failed) 1075ms
   ❯ mountList (14)
     × renders again on the minute tick while Finished today only is on, so a task finished yesterday leaves (TV-14) 55ms
 ❯ tests/unit/view-controls.test.js (52 tests | 5 failed) 2121ms
   ❯ the Finished today only choice (TV-14) (3)
     × names the choice after the status value, in the info line and in empty results 32ms
     × keeps the choice in the device storage only when it is true 6ms
     × counts as a change from the defaults, so Reset shows (VO-8) 3ms
   ❯ mountViewOptions (VO-5, VO-6, VO-13) (20)
     × offers Finished today only after the four statuses, and sets and clears it (TV-14) 76ms
     × shows a stored Finished today only choice, offers it in a list view, and Reset clears it (TV-14, VO-8) 58ms

[... 247 lines omitted ...]
 Test Files  4 failed (4)
      Tests  11 failed | 131 passed (142)
```

Command: `E2E_PORT=8816 npx playwright test tests/e2e/all-tasks.spec.js -g "Finished today only"` (exit code 1)

```text

Running 1 test using 1 worker

  x  1 [chromium] › tests\e2e\all-tasks.spec.js:575:1 › Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14) (30.7s)


  1) [chromium] › tests\e2e\all-tasks.spec.js:575:1 › Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14) 

    Test timeout of 30000ms exceeded.

    Error: locator.check: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for locator('[data-editor-slot] .view-options').locator('#view-options-1-statuses').getByLabel('Finished today only')


      592 |   await status.getByLabel('Cancelled').check();
      593 |   await expect(page.locator('.task-row')).toHaveCount(8);
[... 17 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\all-tasks.spec.js:575:1 › Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14) 
```

- The two clock tests first failed on a fixed store clock in the list test and on a tie order; both were test fixes.
- With the clock change reverted, both still failed: rows from yesterday stayed after midnight.

### Green Phase

Command: `npx vitest run` (exit code 0)

```text

 RUN  v5.1.0 {{worktree}}


 Test Files  59 passed (59)
      Tests  1226 passed (1226)
   Start at  00:13:22
   Duration  27.14s (environment 62%, tests 23%, import 9%, worker 3%, transform 2%)

    Isolate  59 workers spawned · ~2.29s startup each (spawn + environment, per file)
             at least ~16.99s faster with isolate: false — reuses workers across files instead of one per file

```

- Two earlier full runs each hit one unrelated timing flake, under load from other sessions:
  - `serve.test.js` pid file check, which passed 3 of 3 alone.
  - `groupTasks` 5000-task timing: "took 62.2 ms: expected 62.21060000000011 to be less than 50".

Command: `E2E_PORT=8816 npx playwright test` (exit code 0)

```text

[... 188 lines omitted ...]
  ok 187 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.6s)
  ok 188 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.8s)
  ok 190 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (2.3s)
  ok 189 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.8s)
  ok 191 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.5s)
  ok 192 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.5s)

  192 passed (2.4m)
```

Command: `npx eslint .` (exit code 0, no output)

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.3.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 75 precached files match VERSION 2026-11-10.1.
```

### Visual Verification
- Captured with a Playwright harness in light and dark mode, at 1440 x 900 and 390 x 844.
- Before: the base commit `a607f2f` served from an extracted copy; after: this branch.
- Each capture checked HTTP 200 and failed on console errors, page errors, failed requests, and HTTP 400+; none occurred.
- Before: all four statuses show 6 tasks, including "Mow the lawn" and "Return the drill" finished two days ago.
- After: with Finished today only, 4 of 6 tasks show; the info line reads "Status: 4 statuses, finished today".

- wide, light: [before](before-status-filter-wide-light.png), [after](after-status-filter-wide-light.png)
- wide, dark: [before](before-status-filter-wide-dark.png), [after](after-status-filter-wide-dark.png)
- compact, light: [before](before-status-filter-compact-light.png), [after](after-status-filter-compact-light.png)
- compact, dark: [before](before-status-filter-compact-dark.png), [after](after-status-filter-compact-dark.png)

### After Rebase onto main (85fae11)

- Resolved conflicts in `CHANGELOG.md` and `src/service-worker.js`; VERSION is now `2026-11-10.4`.
- Regenerated `scripts/sw-precache-hashes.json` with `node scripts/check-sw-version.mjs --update`.

Command: `npx vitest run` (exit code 0)

```text

 RUN  v5.1.0 {{worktree}}


 Test Files  59 passed (59)
      Tests  1232 passed (1232)
   Start at  00:19:47
   Duration  15.61s (environment 60%, tests 26%, import 9%, transform 3%, worker 2%)

    Isolate  59 workers spawned · ~1.25s startup each (spawn + environment, per file)
             at least ~9.28s faster with isolate: false — reuses workers across files instead of one per file

```

Command: `E2E_PORT=8816 npx playwright test` (exit code 1, one unrelated flake)

```text
  1) [chromium] › tests\e2e\backup.spec.js:139:1 › on a compact layout Import backup imports a file, with the bars in view 

    Error: download.path: canceled

[... lines omitted ...]
  1 failed
    [chromium] › tests\e2e\backup.spec.js:139:1 › on a compact layout Import backup imports a file, with the bars in view 
  194 passed (2.2m)
```

- The failing backup export test is unrelated: its download was canceled under load.
- `E2E_PORT=8816 npx playwright test tests/e2e/backup.spec.js` then passed 3 of 3: "10 passed".
- `npx eslint .` exit code 0; `npm run check:sw` exit code 0: "OK: 75 precached files match VERSION 2026-11-10.4."
