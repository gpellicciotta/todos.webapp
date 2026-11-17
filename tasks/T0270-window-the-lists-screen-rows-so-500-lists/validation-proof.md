## Walkthrough & Validation

### Key changes
- [lists.js](../../work/T0270-window-the-lists-screen-rows-so-500-lists/src/js/views/lists.js) windows rows past 200 shown lists.
- Padding and row margins keep the scroll height true; a resize observer measures rendered rows.
- The tab stop, focused row, open menu, and dragged row stay rendered; keys reach every shown list.
- The perf spec runs the 150 and 500-list tests serially and asserts 500 < 2 x 150.
- Known limitation past 200 lists: find in page sees only rendered rows.

### Failing tests before the implementation
`npx vitest run tests/unit/lists-many-rows.test.js`, exit code 1:

```text
 ❯ tests/unit/lists-many-rows.test.js (15 tests | 3 failed) 5308ms
     × renders only a window of the rows past 200 lists, with padding for the rest and the set size on each row 347ms
     × renders the row below the window when Down leaves the last rendered row 302ms
     × moves a list that starts out of the window with Alt+Up, over every list, and keeps focus on it 454ms
AssertionError: expected 300 to be less than 80
AssertionError: expected 'List 300' to be 'List 301' // Object.is equality
AssertionError: expected null to be '299' // Object.is equality
      Tests  3 failed | 12 passed (15)
```

`npx playwright test --config playwright.perf.config.js -g "Lists with many lists"`, exit code 1:

```text
4x CPU throttling, 150 lists: Lists open 168, 179, 158 ms (median 168 ms)
4x CPU throttling, 500 lists: Lists open 393, 293, 404 ms (median 393 ms)
    Error: expect(received).toBeLessThan(expected)
    Expected: < 336
    Received:   392.59999999403954
  1 failed
  1 passed (26.5s)
```

`npx playwright test tests/e2e/lists-many-rows.spec.js`, exit code 1: all 6 tests failed at the `aria-setsize` seed check.

```text
    Error: expect(locator).toHaveAttribute(expected) failed
  6 failed
```

### After the implementation
`npx playwright test --config playwright.perf.config.js`, exit code 0, on a quiet machine before the final comment-only edits:

```text
4x CPU throttling, 150 lists: Lists open 170, 169, 163 ms (median 169 ms)
  ok 3 [performance] › tests\e2e\performance.spec.js:352:3 › Lists with many lists › Lists opens with 150 lists and 
5000 tasks within 200 ms under 4x CPU throttling (TEC-16, LST-15) (7.1s)
4x CPU throttling, 500 lists: Lists open 194, 195, 202 ms (median 195 ms)
  ok 4 [performance] › tests\e2e\performance.spec.js:358:3 › Lists with many lists › Lists opens with 500 lists and 
5000 tasks within twice the 150-list time under 4x CPU throttling (TEC-16, LST-15) (6.8s)
  5 passed (1.2m)
```

`npx playwright test --config playwright.perf.config.js -g "Lists with many lists"` on commit 074ccac, exit code 0:

```text
4x CPU throttling, 150 lists: Lists open 240, 199, 171 ms (median 199 ms)
4x CPU throttling, 500 lists: Lists open 223, 244, 222 ms (median 223 ms)
  2 passed (17.9s)
```

Later runs on 074ccac ran under 57 to 100 % CPU load from other sessions; the 150-list budget failed on base ba41de1 too.
Alternating runs, 150-list test, exit code 1 each:

```text
base ba41de1:  4x CPU throttling, 150 lists: Lists open 296, 225, 467 ms (median 296 ms)
base r1:       4x CPU throttling, 150 lists: Lists open 309, 716, 487 ms (median 487 ms)
branch r1:     4x CPU throttling, 150 lists: Lists open 425, 434, 278 ms (median 425 ms)
branch r2:     4x CPU throttling, 150 lists: Lists open 568, 761, 554 ms (median 568 ms)
```

`npx playwright test tests/e2e/lists-many-rows.spec.js --repeat-each 8`, exit code 0:

```text
  48 passed (3.0m)
```

`npx playwright test`, exit code 1; the one failure also fails on base ba41de1, tracked as T0273:

```text
  x   50 [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, 
sets a filter, and closes it (9.3s)
    Error: expect(locator).toBeFocused() failed
  1 failed
  245 passed (3.4m)
```

`npm test`, `npm run lint`, and `npm run check:sw` on 074ccac, exit code 0 each:

```text
 Test Files  65 passed (65)
      Tests  1691 passed (1691)
> todos-webapp@0.5.1-pre lint
> eslint .
OK: 131 precached files match VERSION 2026-11-17.21.
```
