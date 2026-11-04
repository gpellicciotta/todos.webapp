## Walkthrough & Validation

### Summary
- Task rows are kept by task id; a render builds only rows whose content changed.
- Rows move with as few DOM moves as a longest-increasing-run plan allows.
- An empty list shows 60 rows at once and adds 250 more after each paint.
- Search reports its text after a 150 ms pause, so a word runs one query.
- The minute tick redraws only due chips in All tasks and the List screen.
- All tasks still renders on the tick while a Due filter is active.
- The bin redraws on the tick only when the local date changed.
- The app reads the sidebar data and the first view side by side.
- Due formats are cached instead of built per chip.
- No CSS or markup changed, so no screenshots were taken.

### Measurements
- Setup: desktop Chromium, 5000 open tasks, one in three with a due time.
- Open: navigate from a blank page to All tasks; median of three after a warm-up.
- A reload adds about 240 ms of teardown of the old 5000-row page.
- That teardown happens in the browser before the new document starts.
- Before: first rows 1226 ms, all rows 1226 ms, one-task update 1097 ms.
- After: first rows 246 ms, all rows 1355 ms, one-task update 102 ms.
- **[Decided]** The assertion covers first rows painted, the view opening, within 400 ms.
- **[Decided]** The one-task update asserts 200 ms, a guard against full rebuilds.
- **[Decided]** `content-visibility: auto` on rows was tried and dropped.
  It clipped focus rings and slowed the Playwright wait polling to about 15 s.
- Start-up maintenance still reads all tasks twice before the first view.
  Those reads cost about 90 ms; a follow-up can merge them.

Paths under the session scratchpad are shown as `{{scratchpad}}`.
The baseline `t38base` is an extract of `main` at 47fe378 with the new tests.
The final copy `t38final` is that extract with this task's changes.

### Red Phase
Command: `npx vitest run tests/unit/task-list.test.js tests/unit/view-controls.test.js tests/unit/recycle-bin.test.js tests/unit/all-tasks.test.js` in `t38base` (exit code 1)
```text
 RUN  v5.1.0 {{scratchpad}}/t38base

 ❯ tests/unit/all-tasks.test.js (2 tests | 1 failed) 110ms
   ❯ mountAllTasks (2)
     × updates the due chip on the minute tick and keeps the row and an open status menu (OVD-2) 57ms
 ❯ tests/unit/recycle-bin.test.js (5 tests | 1 failed) 172ms
   ❯ mountRecycleBin (4)
     × renders the rows again on the minute tick only once the local date changed 36ms
 ❯ tests/unit/view-controls.test.js (12 tests | 1 failed) 161ms
   ❯ createViewControls (7)
     × filters by search text once typing pauses, with one query for the whole word (TEC-16) 28ms
 ❯ tests/unit/task-list.test.js (16 tests | 4 failed) 365ms
   ❯ createTaskList (15)
     × keeps the other row elements when one task changes (TEC-16) 20ms
     × moves the existing row elements when the order changes, and drops the rows that left 10ms
     × updates only the due chips on the clock tick, keeping rows, an open menu, and focus 7ms
     × shows the first rows of an empty list at once and adds the rest in later frames 121ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 7 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > updates the due chip on the minute tick and keeps the row and an open status menu (OVD-2)
[... 169 lines omitted: assertion diffs and stack traces ...]
 Test Files  4 failed (4)
      Tests  7 failed | 28 passed (35)
   Start at  22:38:28
   Duration  1.71s (environment 70%, tests 15%, transform 10%, import 4%, worker 1%)

exit 1
```

Command: `E2E_PORT=8869 npx playwright test tests/e2e/performance.spec.js` in `t38base` (exit code 1)
```text
Running 1 test using 1 worker

first rows painted: 1187, 1226, 1396 ms (median 1226 ms); all 5000 rows painted: 1187, 1226, 1400 ms (median 1226 ms); one-task update: 1097, 1075, 1143 ms (median 1097 ms)
  x  1 [chromium] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) (16.3s)


  1) [chromium] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) 

    Error: expect(received).toBeLessThan(expected)

    Expected: < 400
    Received:   1226.2000000476837

      130 |   console.log(numbers);
      131 |   info.annotations.push({ type: 'performance', description: numbers });
[... 17 lines omitted: code frame, stack, and trace attachment notice ...]
  1 failed
    [chromium] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) 
exit 1
```

### Green Phase
Command: `npm test` in `t38final` (exit code 0)
```text
> todos-webapp@0.1.0-pre test
> vitest run
 RUN  v5.1.0 {{scratchpad}}/t38final
 Test Files  31 passed (31)
      Tests  591 passed (591)
   Start at  22:41:59
   Duration  5.72s (environment 67%, tests 20%, import 9%, transform 2%, worker 2%)
    Isolate  31 workers spawned · ~864ms startup each (spawn + environment, per file)
             at least ~2.96s faster with isolate: false — reuses workers across files instead of one per file
exit 0
```

Command: `npx eslint .` in `t38final` (exit code 0)
```text
(no output)
```

Command: `npm run check:sw` in `t38final` (exit code 0)
```text
> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs
OK: 54 precached files match VERSION 2026-11-04.18.
exit 0
```

Command: `E2E_PORT=8867 npx playwright test` in `t38final` (exit code 0)
```text
Running 114 tests using 4 workers

  ok   2 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (1.3s)
  ok   3 [chromium] › tests\e2e\all-tasks.spec.js:95:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (1.3s)
  ok   1 [chromium] › tests\e2e\all-tasks.spec.js:144:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (1.9s)
[... 110 lines omitted: ok lines of the other tests; the two performance lines follow ...]
first rows painted: 576, 239, 280 ms (median 280 ms); all 5000 rows painted: 2615, 1369, 1509 ms (median 1509 ms); one-task update: 103, 105, 98 ms (median 103 ms)
  ok  93 [chromium] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) (16.7s)

  114 passed (1.0m)
exit 0
```

Command: `E2E_PORT=8867 npx playwright test tests/e2e/performance.spec.js` in `t38final` (exit code 0)
```text
Running 1 test using 1 worker

first rows painted: 243, 269, 246 ms (median 246 ms); all 5000 rows painted: 1355, 1417, 1351 ms (median 1355 ms); one-task update: 104, 102, 99 ms (median 102 ms)
  ok 1 [chromium] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) (10.0s)

  1 passed (11.2s)
exit 0
```
