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

## Review round 1 rework: clean run after the rebase onto main (6235efd)

The rebase conflicts in CHANGELOG.md, src/service-worker.js, and scripts/sw-precache-hashes.json are resolved.
VERSION is 2026-11-07.4 and the hashes were regenerated with `node scripts/check-sw-version.mjs --update`.

`npx eslint .`:

```text
exit 0
```

`npm test`:

```text
 Test Files  38 passed (38)
      Tests  804 passed (804)
exit 0
```

`npm run check:sw`:

```text

> todos-webapp@0.2.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 56 precached files match VERSION 2026-11-07.4.
exit 0
```

`npx playwright test --workers=3` (every spec):

```text
  153 passed (1.5m)
exit 0
```

`npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`:

```text
  22 passed (27.6s)
exit 0
```

## 5000-task performance (TEC-16, `npm run test:perf`), two runs after the rework

```text
4x CPU throttling: view open 217, 171, 165 ms (median 171 ms), warm-up 230 ms; cold start to first rows 1090, 1199, 1191 ms (median 1191 ms); one-task update 205, 238, 169 ms (median 205 ms); scroll f
  ✓  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (34.2s)
  1 passed (35.5s)
exit 0
4x CPU throttling: view open 166, 206, 164 ms (median 166 ms), warm-up 203 ms; cold start to first rows 1063, 911, 1204 ms (median 1063 ms); one-task update 222, 260, 183 ms (median 222 ms); scroll fr
  ✓  1 [performance] › tests\e2e\performance.spec.js:204:1 › All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16) (37.2s)
  1 passed (38.8s)
exit 0
```

Earlier runs on a loaded machine failed the budget, and so did unmodified main at 358 and 384 ms; these quiet-machine runs pass.

## Compact Show button (review defect 2)

The options now scroll in `.view-options__content`, and the Show button sits below that area instead of floating over it.
The compact end-to-end test scrolls the direction control into view and asserts it ends above the Show button.

- [Compact, top of the options](after-all-tasks-view-options-compact.png)
- [Compact, scrolled to the end, direction control clear of the button](after-all-tasks-view-options-scrolled-compact.png)

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
- [after-all-tasks-view-options-scrolled-compact](after-all-tasks-view-options-scrolled-compact.png)
- [after-all-tasks-view-options-wide](after-all-tasks-view-options-wide.png)
- [after-all-tasks-narrowed-compact](after-all-tasks-narrowed-compact.png)
- [after-all-tasks-narrowed-wide](after-all-tasks-narrowed-wide.png)
- [after-list-compact](after-list-compact.png)
- [after-list-wide](after-list-wide.png)
- [after-list-view-options-compact](after-list-view-options-compact.png)
- [after-list-view-options-wide](after-list-view-options-wide.png)
