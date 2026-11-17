## Walkthrough & Validation

Cause: All tasks read all six stores per opening; the time sat in IndexedDB reads, not rendering.
Fix: read four stores, and share one read between openings until the next write (`core/list-snapshot.js`).
The unit tests were written after the fix, so no red run exists for them; the perf run below failed before the fix.

### Before: `npx playwright test --config playwright.perf.config.js -g "All tasks opens with 5000"` (exit 1)
```text
    Expected: < 200
    Received:   289.2999999821186
  1 failed
```

### After: `npx playwright test --config playwright.perf.config.js` (exit 0)
```text
4x CPU throttling: view open 148, 116, 108 ms (median 116 ms), warm-up 502 ms
grouped by due date, 4x CPU throttling: view open 127, 127, 143 ms (median 127 ms)
4x CPU throttling, 150 lists: Lists open 158, 120, 158 ms (median 158 ms)
4x CPU throttling, 500 lists: Lists open 478, 353, 368 ms (median 368 ms)
  5 passed (1.4m)
```

### After: `npx vitest run` (exit 0), `npx eslint .` (exit 0), `npm run check:sw` (exit 0)
```text
 Test Files  65 passed (65)
      Tests  1684 passed (1684)
OK: 131 precached files match VERSION 2026-11-17.20.
```

### After: `npx playwright test` (exit 1 before the test fix below)
```text
  3 failed
  241 passed (2.9m)
```
- `all-tasks.spec.js:663` deleted a list through a store without broadcast, which the app's cache cannot hear.
  The test now opens that store with `broadcast: true`, as another tab does; it passes (37 passed with the next two specs).
- `lists-many-rows.spec.js:71` is the known Back scroll flake of T0271, unrelated.
- `behaviors.spec.js:109` runs on the gallery page, which imports no changed file; it failed in 3 of 3 runs here.
  I did not run it on the base commit, so I cannot say it fails there too.
