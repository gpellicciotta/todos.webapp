# T0054 validation proof

## Failing tests before implementation (TDD)

`npx vitest run tests/unit` (summary, exit 1):

```text
      1       Tests  44 failed | 736 passed (780)
      1  Test Files  4 failed | 33 passed (37)
      2 TypeError: createInfoLine is not a function
      1 TypeError: createSearchField is not a function
     11 TypeError: createViewModel is not a function
      5 TypeError: describeInfoLine is not a function
      1 TypeError: isDefaultViewState is not a function
```

`npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js --timeout=8000` (summary, exit 1):

```text
12 failed
10 passed (43.6s)
```

The 12 failures are the new view options, More menu, and info line tests; the failure reason is the missing controls and routes.

## Passing run after implementation

`npx eslint .` (exit 0):

```text
exit 0
```

`npm test` (exit 0):

```text
 Test Files  37 passed (37)
      Tests  780 passed (780)
exit 0
```

`npx playwright test --workers=2`, every spec including all-tasks, list, and gallery-app (exit 0):

```text
  151 passed (1.9m)
exit 0
```

`npm run check:sw` after bumping VERSION to 2026-11-07.4 and running `node scripts/check-sw-version.mjs --update`:

```text

> todos-webapp@0.2.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-07.4.
exit 0
```

## 5000-task performance (TEC-16, `npm run test:perf`)

Passing run, 4x CPU throttling, before the machine became loaded:

```text
4x CPU throttling: view open 207, 163, 190 ms (median 190 ms), warm-up 198 ms
  1 passed (35.2s)
```

Passes: 3 of 3 at 13:00, 1 of 1 at 13:05. Later runs failed the 200 ms budget with very noisy medians (220 to 624 ms).
The unmodified main branch, served from a copy with the same spec, also failed in that window at 358 and 384 ms.
The branch measured 250 and 292 ms in the same window, so it is no slower than main. The failures are machine load, not a regression.
The budget still needs a re-run on a quiet machine, such as the Pages workflow.

## Screenshots

Before (main) and after, compact 390 px and wide 1440 px:
- [before-all-tasks-compact](before-all-tasks-compact.png)
- [before-all-tasks-wide](before-all-tasks-wide.png)
- [before-all-tasks-status-popover-wide](before-all-tasks-status-popover-wide.png)
- [before-list-compact](before-list-compact.png)
- [before-list-wide](before-list-wide.png)
- [after-all-tasks-compact](after-all-tasks-compact.png)
- [after-all-tasks-wide](after-all-tasks-wide.png)
- [after-all-tasks-view-options-compact](after-all-tasks-view-options-compact.png)
- [after-all-tasks-view-options-wide](after-all-tasks-view-options-wide.png)
- [after-all-tasks-narrowed-compact](after-all-tasks-narrowed-compact.png)
- [after-all-tasks-narrowed-wide](after-all-tasks-narrowed-wide.png)
- [after-list-compact](after-list-compact.png)
- [after-list-wide](after-list-wide.png)
- [after-list-view-options-compact](after-list-view-options-compact.png)
- [after-list-view-options-wide](after-list-view-options-wide.png)
