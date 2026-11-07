## Walkthrough & Validation

### Summary
- `groupTasks` in `query.js` groups by list, due date, or status, with fixed bucket order and hidden empty groups.
- `task-list.js` renders 32 px group headers inside the virtualized list, with per-group row keys.
- View options gain a Group by control (All tasks only); the grouping persists in `todos.view.tasks`.
- Screenshots (before is ungrouped, after is grouped by List and Status, plus the panel): wide light and compact dark.
  - [wide before](wide-light-before-ungrouped.png), [wide by list](wide-light-after-grouped-by-list.png),
    [wide by status](wide-light-after-grouped-by-status.png), [wide panel](wide-light-after-view-options.png)
  - [compact before](compact-dark-before-ungrouped.png), [compact by list](compact-dark-after-grouped-by-list.png),
    [compact by status](compact-dark-after-grouped-by-status.png), [compact panel](compact-dark-after-view-options.png)
- The screenshot run watched console errors, page errors, and HTTP 400+ responses; it found none.

### Red phase (before implementation)
Unit run of the new tests: 26 failed, 73 passed. Playwright: the 2 new Group by tests failed on the missing radios.

### Green phase
### `npm test`
Exit code: 0

```text
[... 4 lines omitted ...]

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0048-let-the-all-tasks-dashboard-group-tasks-by


 Test Files  38 passed (38)
      Tests  848 passed (848)
   Start at  15:38:26
   Duration  10.32s (environment 64%, tests 24%, import 8%, transform 2%, worker 1%)

    Isolate  38 workers spawned · ~1.23s startup each (spawn + environment, per file)
             at least ~5.46s faster with isolate: false — reuses workers across files instead of one per file

```

### `npm run lint`
Exit code: 0

```text

> todos-webapp@0.2.0-pre lint
> eslint .

```

### `npx playwright test tests/e2e/all-tasks.spec.js`
Exit code: 0

```text

Running 18 tests using 4 workers

  ✓   3 [chromium] › tests\e2e\all-tasks.spec.js:105:3 › a first visit shows the empty state without any sign-in at 390 px (LOC-1) (1.6s)
  ✓   2 [chromium] › tests\e2e\all-tasks.spec.js:105:3 › a first visit shows the empty state without any sign-in at 1440 px (LOC-1) (1.8s)
  ✓   4 [chromium] › tests\e2e\all-tasks.spec.js:157:1 › the status menu changes a status by mouse and by keyboard (TSK-4) (1.8s)
  ✓   1 [chromium] › tests\e2e\all-tasks.spec.js:124:1 › Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5) (2.3s)
  ✓   7 [chromium] › tests\e2e\all-tasks.spec.js:271:1 › the All tasks More menu holds only Edit view options (VO-4) (1.2s)
  ✓   8 [chromium] › tests\e2e\all-tasks.spec.js:281:1 › the view options open beside the rows on a wide layout, with Reset at the top and no Show button (VO-5, VO-6) (2.0s)
  ✓   9 [chromium] › tests\e2e\all-tasks.spec.js:299:1 › the view options fill the screen on a compact layout, end with Show N tasks, and work by keyboard (VO-5, VO-13) (1.7s)
  ✓  10 [chromium] › tests\e2e\all-tasks.spec.js:330:1 › the view options open from their route after a reload, and Reset in the panel restores the defaults (VO-8) (1.5s)
  ✓  11 [chromium] › tests\e2e\all-tasks.spec.js:349:1 › Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11) (1.1s)
  ✓  12 [chromium] › tests\e2e\all-tasks.spec.js:369:1 › a row opens the task editor route, and the selected row is marked (842ms)
  ✓  13 [chromium] › tests\e2e\all-tasks.spec.js:381:1 › a store change while the status menu is open keeps the menu open and focused (1.0s)
  ✓   6 [chromium] › tests\e2e\all-tasks.spec.js:194:3 › the view options, search, and the info line change the rows at 1440 px (TV-1 to TV-12, VO-1 to VO-8) (6.5s)
  ✓  15 [chromium] › tests\e2e\all-tasks.spec.js:423:1 › typing in the add field searches, Enter never adds, and Add creates the task and clears the filter (VO-3, TSK-1) (1.6s)
  ✓  14 [chromium] › tests\e2e\all-tasks.spec.js:405:1 › Reset in an empty result focuses search, and deleting the last shown row focuses the add bar (2.1s)
  ✓   5 [chromium] › tests\e2e\all-tasks.spec.js:194:3 › the view options, search, and the info line change the rows at 390 px (TV-1 to TV-12, VO-1 to VO-8) (7.1s)
  ✓  16 [chromium] › tests\e2e\all-tasks.spec.js:452:1 › adding a task that the view options hide shows a toast whose Show resets those options (VO-3) (1.8s)
  ✓  18 [chromium] › tests\e2e\all-tasks.spec.js:532:1 › search and sort apply inside each group, and a task of two lists shows in both (VO-10, VO-11) (1.9s)
  ✓  17 [chromium] › tests\e2e\all-tasks.spec.js:493:1 › Group by shows headers with counts for each option, and the choice survives a reload (VO-9 to VO-12, TV-12) (2.1s)

  18 passed (13.4s)
```

### `npm run check:sw`
Exit code: 0

```text

> todos-webapp@0.2.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 56 precached files match VERSION 2026-11-07.7.
```

### Performance (`npm run test:perf`)
The machine ran other agent processes, so timings swung widely.
Unmodified `main` failed the original ungrouped test on the same machine in 3 of 3 runs (446, 276, 524 ms).
The branch's ungrouped test read 189 ms in one run and 193 to 506 ms in others.
The `grouped by list` test compares grouped with ungrouped on identical data and passed in each full run.
The grouped by due date test passed at 177 ms and 193 ms, and failed at 202 ms and 376 ms, in four runs.
The 200 ms budget is therefore not reliably met on this machine, grouped or not.

### `npm run test:perf (final full run)`
Exit code: 1

```text
desktop: view open 83, 86, 86 ms (median 86 ms), warm-up 90 ms; cold start to first rows 374, 389, 352 ms (median 374 ms); one-task update 128, 120, 110 ms (median 120 ms); scroll frames median 17 ms, p95 17 ms, 1 of 300
4x CPU throttling: view open 495, 506, 840 ms (median 506 ms), warm-up 485 ms; cold start to first rows 2484, 2634, 3433 ms (median 2634 ms); one-task update 465, 388, 440 ms (median 440 ms); scroll frames median 67 ms, 
  ✘  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (1.0m)
grouped by due date, 4x CPU throttling: view open 404, 343, 376 ms (median 376 ms); scroll frames median 17 ms, p95 17 ms, at most 55 rows
  ✘  2 [performance] › tests\e2e\performance.spec.js:245:1 › All tasks grouped by due date opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16, VO-9) (10.1s)
4x CPU throttling, 12 lists: ungrouped median 301 ms (337, 318, 260, 329, 230, 357, 228, 230, 301); grouped by list median 254 ms (339, 243, 269, 325, 227, 254, 261, 224, 229)
  ✓  3 [performance] › tests\e2e\performance.spec.js:264:1 › grouping 5000 tasks by list in 12 lists opens as fast as showing them ungrouped (TEC-16, VO-9) (21.6s)
    Received:   506
    Received:   375.7000000178814
  2 failed
  1 passed (1.6m)
```

### `npx playwright test --config playwright.perf.config.js -g "within 200 ms" (retry 1)`
Exit code: 1

```text
desktop: view open 64, 64, 65 ms (median 64 ms), warm-up 58 ms; cold start to first rows 258, 279, 243 ms (median 258 ms); one-task update 93, 83, 83 ms (median 83 ms); scroll frames median 17 ms, p95 17 ms, 0 of 300 ove
4x CPU throttling: view open 212, 187, 214 ms (median 212 ms), warm-up 245 ms; cold start to first rows 1134, 1124, 1331 ms (median 1134 ms); one-task update 245, 288, 209 ms (median 245 ms); scroll frames median 67 ms, 
  ✘  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (35.6s)
grouped by due date, 4x CPU throttling: view open 193, 218, 189 ms (median 193 ms); scroll frames median 17 ms, p95 17 ms, at most 55 rows
  ✓  2 [performance] › tests\e2e\performance.spec.js:245:1 › All tasks grouped by due date opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16, VO-9) (8.2s)
    Received:   211.7999999821186
  1 failed
  1 passed (46.5s)
```

### `npx playwright test --config playwright.perf.config.js -g "within 200 ms" (retry 2)`
Exit code: 1

```text
desktop: view open 64, 61, 57 ms (median 61 ms), warm-up 62 ms; cold start to first rows 262, 257, 256 ms (median 257 ms); one-task update 90, 77, 81 ms (median 81 ms); scroll frames median 17 ms, p95 17 ms, 1 of 300 ove
4x CPU throttling: view open 213, 208, 174 ms (median 208 ms), warm-up 226 ms; cold start to first rows 997, 1025, 1412 ms (median 1025 ms); one-task update 185, 218, 229 ms (median 218 ms); scroll frames median 50 ms, p
  ✘  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (35.3s)
grouped by due date, 4x CPU throttling: view open 202, 216, 198 ms (median 202 ms); scroll frames median 17 ms, p95 17 ms, at most 55 rows
  ✘  2 [performance] › tests\e2e\performance.spec.js:245:1 › All tasks grouped by due date opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16, VO-9) (8.5s)
    Received:   208
    Received:   201.89999997615814
  2 failed
```

