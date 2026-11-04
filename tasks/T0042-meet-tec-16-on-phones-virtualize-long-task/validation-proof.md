## Walkthrough & Validation

### Summary
- Lists of up to 200 tasks render every row; longer lists render the rows in view.
- The first render leaves out the 20-row buffer; it follows once the first rows painted.
- Scroll and resize events render the rows that enter and drop the rows that leave.
- Padding on the list and a margin after each gap keep the scroll height exact.
- The focused, menu, dragged, and selected rows stay rendered with their neighbors.
- Rows carry `aria-setsize` and `aria-posinset` for the whole list.
- Move up, Move down, Alt+Up, Alt+Down, and drag use every shown task, rendered or not.
- A row that moved scrolls into view, and focus stays on its control.
- The progressive 60-row fill is gone, so a render that changes many rows drops none.
- The Pages workflow runs `npm run test:perf` after the end-to-end tests.
- `VERSION` is `2026-11-04.20`; the manifest was reset to `main` and rewritten with `--update`.

### Measurements
- Setup: Desktop Chrome project, 5000 open tasks, one in three with a due time.
- Throttling: CDP `Emulation.setCPUThrottlingRate` with rate 4.
- View open: route change from Lists to All tasks until the first rows painted.
- One warm-up opening after the cold starts is recorded and left out of the median.
- Baseline: the final tests with `main`'s task-list.js, reorder.js, and list.js.

| Metric (median of 3)         | Before 4x | After 4x | Before desktop | After desktop |
| :--------------------------- | --------: | -------: | -------------: | ------------: |
| View open, first rows        | 267 ms    | 177 ms   | 70 ms          | 54 ms         |
| Cold start to first rows     | 936 ms    | 902 ms   | 271 ms         | 233 ms        |
| One-task update              | 411 ms    | 195 ms   | 116 ms         | 82 ms         |
| Scroll frame, 400 px a frame | 100 ms    | 50 ms    | 17 ms          | 17 ms         |
| Most rows in the DOM         | 5000      | 55       | 5000           | 55            |

- Three more runs after the change gave throttled view-open medians of 172, 177, and 176 ms.
- **[Decided]** `TEC-16` counts the route change, so the 200 ms assertion covers view opening.
  The cold start stays near 900 ms under throttling, which this task does not change.
- **[Decided]** The one-task update keeps its 200 ms guard unthrottled; throttled it is recorded only.
- Row heights are 48 px at 390 px and 1440 px, before and after.
- Scroll heights match before and after: 240160 px at 390 px, 240204 px at 1440 px.
- Returning to All tasks opens at the top before and after; the router restores before the rows render.

Paths under the session scratchpad are shown as `{{scratchpad}}`.
The work copy `t42work` is an extract of `main` at 46ff7c1.
Output blocks drop some blank lines; other omitted lines are marked.

### Red Phase: Unit Tests
Command: `npx vitest run tests/unit/task-list.test.js` with `main`'s view files (exit code 1)
```text
 RUN  v5.1.0 {{scratchpad}}/t42work

 ❯ tests/unit/task-list.test.js (24 tests | 8 failed) 419ms
   ❯ createTaskList (23)
     × renders every row of a list up to 200 tasks at once, with its place in the set 34ms
     × keeps every row of a render that changes more than 60 rows, replacing each in place 37ms
     ❯ with a long list (6)
       × renders only the visible rows plus a buffer, with spacers that keep the full height (TEC-16) 25ms
       × renders the rows that scroll into view and keeps the rows that stay 26ms
       × keeps the focused row, its neighbors, and an open menu rendered while they scroll away 24ms
       × offers Move down on the last rendered row, and scrolls a moved row into view with focus kept 28ms
       × moves the focused last rendered row with Alt+Down past the rendered rows 19ms
       × drops a dragged row on a slot that was not rendered when the drag started, keeping the row rendered 27ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

AssertionError: expected [ …(60) ] to have a length of 200 but got 60
AssertionError: expected [ …(60) ] to have a length of 150 but got 60
AssertionError: expected [ …(60) ] to have a length of 10 but got 60
[... 63 lines omitted: FAIL headers, diffs, and stack traces; the six long-list tests share one beforeEach failure ...]
 Test Files  1 failed (1)
      Tests  8 failed | 16 passed (24)
   Start at  23:48:28
```

### Red Phase: Performance Test
Command: `npm run test:perf` with `main`'s view files (exit code 1)
```text
> todos-webapp@0.1.0-pre test:perf
> playwright test --config playwright.perf.config.js

Running 1 test using 1 worker

desktop: view open 70, 74, 65 ms (median 70 ms), warm-up 63 ms; cold start to first rows 239, 278, 271 ms (median 271 ms); one-task update 580, 116, 103 ms (median 116 ms); scroll frames median 17 ms, p95 33 ms, 0 of 300 over 50 ms, at most 5000 rows
4x CPU throttling: view open 267, 278, 262 ms (median 267 ms), warm-up 263 ms; cold start to first rows 936, 948, 865 ms (median 936 ms); one-task update 3227, 408, 411 ms (median 411 ms); scroll frames median 100 ms, p95 117 ms, 150 of 300 over 50 ms, at most 5000 rows
  x  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (1.2m)

    Error: expect(received).toBeLessThan(expected)

    Expected: < 200
    Received:   267.40000009536743

[... 2 source lines omitted ...]
    > 219 |   expect(median(phone.opens)).toBeLessThan(OPEN_BUDGET_MS);
[... caret, stack, and trace attachment lines omitted ...]
  1 failed
```

### Red Phase: End-to-End Test
Command: `E2E_PORT=8883 npx playwright test tests/e2e/list.spec.js -g "300 tasks"` with `main`'s view files (exit code 1)
```text
Running 1 test using 1 worker

  x  1 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (9.9s)

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator:  locator('.list-view .task-row').first()
    Expected: "299"
    Received: ""
    Timeout:  5000ms

[... call log and 2 source lines omitted ...]
    > 153 |     await expect(shown.first()).toHaveAttribute('aria-setsize', '299');
[... caret, stack, and trace attachment lines omitted ...]
  1 failed
```

### Green Phase: Unit Tests
Command: `npm test` (exit code 0)
```text
> todos-webapp@0.1.0-pre test
> vitest run

 RUN  v5.1.0 {{scratchpad}}/t42work

 Test Files  34 passed (34)
      Tests  619 passed (619)
```

### Green Phase: Lint and Service Worker Check
Command: `npm run lint && npm run check:sw` (exit code 0)
```text
> todos-webapp@0.1.0-pre lint
> eslint .

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 54 precached files match VERSION 2026-11-04.20.
```

### Green Phase: End-to-End Tests
Command: `E2E_PORT=8883 npx playwright test` (exit code 0)
```text
Running 114 tests using 4 workers

[... 113 passing test lines omitted ...]
  ok  89 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (17.9s)

  114 passed (59.4s)
```

### Green Phase: Performance Test
Command: `npm run test:perf` (exit code 0)
```text
> todos-webapp@0.1.0-pre test:perf
> playwright test --config playwright.perf.config.js

Running 1 test using 1 worker

desktop: view open 54, 62, 52 ms (median 54 ms), warm-up 49 ms; cold start to first rows 221, 245, 233 ms (median 233 ms); one-task update 82, 82, 74 ms (median 82 ms); scroll frames median 17 ms, p95 17 ms, 0 of 300 over 50 ms, at most 55 rows
4x CPU throttling: view open 169, 177, 180 ms (median 177 ms), warm-up 202 ms; cold start to first rows 902, 881, 1139 ms (median 902 ms); one-task update 195, 243, 171 ms (median 195 ms); scroll frames median 50 ms, p95 83 ms, 105 of 300 over 50 ms, at most 55 rows
  ok 1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (31.5s)

  1 passed (32.7s)
```

### Visual
All tasks with 5000 tasks, light theme, after a reload; no visible change.

| Width   | Before                                                     | After                                                    |
| :------ | :--------------------------------------------------------- | :------------------------------------------------------- |
| 390 px  | [all-tasks-5000-390-before.png](all-tasks-5000-390-before.png)   | [all-tasks-5000-390-after.png](all-tasks-5000-390-after.png)   |
| 1440 px | [all-tasks-5000-1440-before.png](all-tasks-5000-1440-before.png) | [all-tasks-5000-1440-after.png](all-tasks-5000-1440-after.png) |

- Scrolled to row 2500 after the change, rows fill the view without gaps:
  [390 px](all-tasks-5000-390-scrolled-after.png) and [1440 px](all-tasks-5000-1440-scrolled-after.png).

### Known Limitations
- Find in page sees only the rendered rows of lists over 200 tasks; search finds every task.
- CDP throttling scales the host CPU, so a slower CI runner measures slower than this machine.
