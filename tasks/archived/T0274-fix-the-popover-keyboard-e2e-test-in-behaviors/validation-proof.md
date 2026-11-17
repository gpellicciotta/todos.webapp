## Walkthrough & Validation

### Root cause
- T0217 (050f27c) added a fifth `Finished today only` checkbox to the gallery's working popover.
- Opening the popover focuses `To do`; four Tabs now land on `Finished today only`, one short of `Clear`.
- The popover module and gallery behave as intended; the test drifted.

### Fix
- `tests/e2e/behaviors.spec.js`: after four Tabs, assert focus on `Finished today only`.
- Press Space to toggle it, assert the chip text, then Tab once more onto `Clear`.
- Enter on `Clear` now also proves it clears the toggle.
- `scripts/draw-wireframes.py`: `ruff format` only; the drift already existed on main and blocked the check.

### Red phase (before the fix, on 59a5c83)
`npx playwright test tests/e2e/behaviors.spec.js:109 --reporter=line` exit code 1:

```text
[1/1] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
  1) [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it 

    Error: expect(locator).toBeFocused() failed

    Locator:  locator('#popover-demo').getByRole('button', { name: 'Clear' })
    Expected: focused
    Received: inactive
    Timeout:  5000ms

    Call log:
      - Expect "toBeFocused" locator('#popover-demo').getByRole('button', { name: 'Clear' }) with timeout 5000ms
      - waiting for locator('#popover-demo').getByRole('button', { name: 'Clear' })
        14 × locator resolved to <button type="button" data-popover-clear="" class="button button--quiet">Clear</button>
           - unexpected value "inactive"

  1 failed
    [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
```

### Green phase: the test five times
`npx playwright test tests/e2e/behaviors.spec.js:109 --repeat-each 5 --reporter=line` exit code 0:

```text
[1/5] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
[2/5] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
[3/5] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
[4/5] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
[5/5] [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
  5 passed (7.4s)
```

### Intermediate full check runs
- Run 1: 244 e2e passed, 3 failed (`backup.spec.js:139`, `backup.spec.js:195`, `gallery-controls.spec.js:121` at 1440 px).
- Those three passed when rerun alone (`4 passed (18.8s)`), so they are load-dependent flakes, unrelated to this change.
- Run 2: 247 e2e passed; the check then stopped on `ruff format --check` for `scripts/draw-wireframes.py`.

### Full check after all changes
`python scripts/devops.py check` exit code 0 (step headers and summaries extracted from the log):

```text
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  65 passed (65)
      Tests  1700 passed (1700)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
Running 247 tests using 4 workers
[... 247 per-test lines omitted ...]
  247 passed (4.9m)
[*] C:\Users\giova\AppData\Local\Programs\Python\Python315\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Users\giova\AppData\Local\Programs\Python\Python315\Scripts\ruff.EXE format --check scripts tests
5 files already formatted
[*] C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
156 passed in 138.86s (0:02:18)
```
