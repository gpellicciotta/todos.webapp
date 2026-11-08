# T0043 validation proof

## Tests failed before the implementation
Observed output of `npx vitest run tests/unit/task-list.test.js` before the change:

```
 ❯ tests/unit/task-list.test.js (37 tests | 4 failed) 2581ms
       × adds up the measured heights of the rendered rows and estimates the others at the row height (TEC-16) 94ms
       × lays the rows out by the heights it measured when it returns to rows it saw before 129ms
       × measures the rows again after the window resized 79ms
       × gives the positions of the rows from the top, for a drag to a row that is not rendered 89ms
      Tests  4 failed | 33 passed (37)
```

Observed output of `npx vitest run tests/unit/modulepreload.test.js` before the preload links:

```
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

The anchor test of `tests/e2e/long-list.spec.js` failed with `Expected: < 2, Received: 48` before the scroller kept the rows in view.
The reorder midpoints test was written after the implementation.

## Passing
$ npx eslint .
exit 0
$ npx vitest run
 Test Files  39 passed (39)
      Tests  866 passed (866)
$ node scripts/check-sw-version.mjs
OK: 57 precached files match VERSION 2026-11-07.13.
$ npx playwright test tests/e2e/long-list.spec.js
Running 4 tests using 4 workers

  ✓  3 [chromium] › tests\e2e\long-list.spec.js:101:3 › rows taller than 48 px in a long list (TEC-16) › reaches the end of the list with its last row at the bottom (2.9s)
  ✓  1 [chromium] › tests\e2e\long-list.spec.js:129:1 › the first rows paint before the start-up maintenance ends (TEC-16) (3.1s)
  ✓  2 [chromium] › tests\e2e\long-list.spec.js:83:3 › rows taller than 48 px in a long list (TEC-16) › renders rows without gaps or overlaps that cover the view wherever the list is scrolled (3.7s)
  ✓  4 [chromium] › tests\e2e\long-list.spec.js:113:3 › rows taller than 48 px in a long list (TEC-16) › keeps the rows in view where they are while rows above them are measured (5.2s)

  4 passed (7.3s)

Full end-to-end run: `npx playwright test` printed `164 passed (1.9m)`.

## Performance (`npm run test:perf`)
The machine was loaded by other processes, so absolute numbers are higher than in the docs.
Both builds fail the 200 ms budgets here; the original build failed them on an unloaded run too (218 ms).
Side by side, same machine state, 5000 tasks:

```
ORIG desktop: view open median 95 ms; cold start to first rows median 369 ms
NEW  desktop: view open median 94 ms; cold start to first rows median 191 ms
ORIG 4x CPU: view open median 462 ms; cold start median 2095 ms; scroll frames median 150 ms
NEW  4x CPU: view open median 366 ms; cold start median 1583 ms; scroll frames median 167 ms
```

Scroll frame times under throttling did not improve measurably; see the Execution Log.
