## Walkthrough & Validation

### Failing tests before implementation
Command: `npx vitest run` (before any production change). Exit code 1.

```text
Test Files  4 failed | 34 passed (38)
      Tests  22 failed | 804 passed (826)
AssertionError: expected 'Add a task' to be 'Search or add a task'
AssertionError: expected [ 'add' ] to deeply equal [ 'add', 'search' ]
TypeError: hidingFilters is not a function
```

### Unit tests after implementation
Command: `npm test`. Exit code 0.

```text
 Test Files  38 passed (38)
      Tests  822 passed (822)
```

### Lint and service worker check
Commands: `npm run lint`, `npm run check:sw`. Exit code 0 for both.

```text
OK: 56 precached files match VERSION 2026-11-07.6.
```

### End-to-end tests
Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`. Exit code 0.

```text
  25 passed (29.3s)
```

Command: `npx playwright test` (all specs except performance, before the last CSS tweak). Exit code 0.

```text
  156 passed (1.6m)
```

### 5000-task performance (TEC-16)
Command: `npm run test:perf`. Exit code 1, on both the baseline commit 25279d5 and this branch.
The 4x CPU throttled view-open budget of 200 ms fails on this machine in both runs, so the failure is not caused by this task.

```text
baseline 25279d5, 4x CPU throttling: view open 342, 544, 394 ms (median 394 ms)
this branch,      4x CPU throttling: view open 626, 509, 440 ms (median 509 ms)
this branch, desktop:              view open 82, 91, 91 ms (median 91 ms); one-task update median 130 ms
baseline,    desktop:              view open 99, 84, 86 ms (median 86 ms); one-task update median 132 ms
```

The view-open path is unchanged except one extra `filterTasks` pass and a `Set` of descriptions per render.
The 5000-task `filter+sort` unit test in `tests/unit/query.test.js` still passes under its 50 ms budget.

### Screenshots
- Before: [compact](before-compact-search.png), [wide](before-wide-search.png)
- After, search: [compact](after-compact-search.png), [wide](after-wide-search.png)
- After, Add anyway: [compact](after-compact-add-anyway.png), [wide](after-wide-add-anyway.png)
- After, no match: [compact](after-compact-no-match.png), [wide](after-wide-no-match.png)
