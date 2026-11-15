## Walkthrough & Validation

### Summary
- `groupTasks` takes the view tasks before filters and gives each group a `total`; both views pass it.
- `task-list.js` renders each header as `h3 > button[aria-expanded]` with a chevron, name, and "n of m" count.
- Collapsed groups leave their rows out of the virtual list; headers update in place, so focus stays.
- `views.css` moves the inline padding to the toggle at `--space-3` (12 px).

### Red phase (tests written before the implementation)

Command: `npx vitest run tests/unit/task-list.test.js tests/unit/query.test.js` (exit code 1)

```text
     × counts each group among all tasks as its total, or among its own tasks without them 16ms
       × drops the rows of a collapsed group from the virtual window and the height, and keeps its header focused 79ms
       × shows the count as n of m while a filter hides tasks of a group, else the plain total 5ms
       × collapses and expands a group from its header, hiding only its rows 3ms
       × keeps a group collapsed across renders, filter changes, and a group that leaves and comes back 3ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/query.test.js > groupTasks (VO-9 to VO-12) > counts each group among all tasks as its total, or among its own tasks without them
AssertionError: expected [ [ …(3) ], [ …(3) ], …(1) ] to deeply equal [ [ …(3) ], [ …(3) ], …(1) ]
 FAIL  tests/unit/task-list.test.js > createTaskList > with a long grouped list > drops the rows of a collapsed group from the virtual window and the height, and keeps its header focused
TypeError: Cannot read properties of null (reading 'focus')
 FAIL  tests/unit/task-list.test.js > createTaskList > with groups > shows the count as n of m while a filter hides tasks of a group, else the plain total
TypeError: Cannot read properties of null (reading 'getAttribute')
 FAIL  tests/unit/task-list.test.js > createTaskList > with groups > collapses and expands a group from its header, hiding only its rows
TypeError: Cannot read properties of null (reading 'type')
 FAIL  tests/unit/task-list.test.js > createTaskList > with groups > keeps a group collapsed across renders, filter changes, and a group that leaves and comes back
TypeError: Cannot read properties of null (reading 'focus')
 Test Files  2 failed (2)
      Tests  5 failed | 107 passed (112)
[... 91 lines omitted ...]
```

Command: `npx playwright test tests/e2e/list.spec.js -g "group headers"` (exit code 1; the title gained "VO-15" later)

```text
Running 1 test using 1 worker
  ✘  1 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › group headers pad their text, count n of m while search hides tasks, and collapse by mouse and keyboard (VO-10) (6.2s)
  1) [chromium] › tests\e2e\list.spec.js:140:3 › List screen › group headers pad their text, count n of m while search hides tasks, and collapse by mouse and keyboard (VO-10) 
    Error: expect(locator).toHaveAttribute(expected) failed
    Locator: locator('.list-view .group-header').first().getByRole('button', { name: 'To do, 2 tasks', exact: true })
    Expected: "true"
    Timeout: 5000ms
    Error: element(s) not found
    Call log:
      - Expect "toHaveAttribute" locator('.list-view .group-header').first().getByRole('button', { name: 'To do, 2 tasks', exact: true }) with timeout 5000ms
      - waiting for locator('.list-view .group-header').first().getByRole('button', { name: 'To do, 2 tasks', exact: true })
[... 27 lines omitted ...]

  1 failed
    [chromium] › tests\e2e\list.spec.js:140:3 › List screen › group headers pad their text, count n of m while search hides tasks, and collapse by mouse and keyboard (VO-10) 
```

### Green phase (after the final code change)

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.4.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0223-improve-task-group-headers-with-more-padding-an
[... 3 lines omitted ...]
 Test Files  56 passed (56)
      Tests  1233 passed (1233)
```

Command: `npx playwright test tests/e2e/list.spec.js tests/e2e/all-tasks.spec.js tests/e2e/long-list.spec.js tests/e2e/gallery-app.spec.js` (exit code 0)

```text

Running 64 tests using 4 workers
[... 22 lines omitted ...]
  ✓  24 [chromium] › tests\e2e\all-tasks.spec.js:666:1 › search and sort apply inside each group, and a task of two lists shows in both (VO-10, VO-11) (2.7s)
  ✓  23 [chromium] › tests\e2e\all-tasks.spec.js:627:1 › Group by shows headers with counts for each option, and the choice survives a reload (VO-9 to VO-12, TV-12) (3.6s)
[... 27 lines omitted ...]
  ✓  51 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › group headers pad their text, count n of m while search hides tasks, and collapse by mouse and keyboard (VO-10, VO-15) (2.8s)
[... 13 lines omitted ...]
  64 passed (58.0s)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.4.1-pre lint
> eslint .

```

Command: `python -m pytest -q tests/test_draw_wireframes.py` (exit code 0)

```text
........................................................................ [ 85%]
............                                                             [100%]
84 passed in 14.02s
```

Command: `node scripts/check-sw-version.mjs` and `node src/vendor/design/bin/check.mjs` (exit code 0 each)

```text
OK: 124 precached files match VERSION 2026-11-15.3.
integrity: PASS
conformance: PASS
```

Blocker: `python -m ruff check scripts tests` could not run (exit code 1); the local Ruff package lacks its binary.
The one changed script keeps lines under the 120-column limit of `ruff.toml`.

```text
    raise RuffNotFound(
```

### Visual verification
All tasks grouped by List, at 1440 px and 390 px, light and dark; console and network clean in each run.
After shots show the chevron, 12 px padding, "2 of 3" for Home (a completed task is hidden), and ellipsis at 390 px.
Collapsed shots show Home collapsed and the inset focus ring on the next toggle.

- light wide: [before](before-light-wide.png), [after](after-light-wide.png), [after collapsed](after-light-wide-collapsed.png)
- light narrow: [before](before-light-narrow.png), [after](after-light-narrow.png), [after collapsed](after-light-narrow-collapsed.png)
- dark wide: [before](before-dark-wide.png), [after](after-dark-wide.png), [after collapsed](after-dark-wide-collapsed.png)
- dark narrow: [before](before-dark-narrow.png), [after](after-dark-narrow.png), [after collapsed](after-dark-narrow-collapsed.png)
