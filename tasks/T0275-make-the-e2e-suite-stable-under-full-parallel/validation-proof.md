## Walkthrough & Validation

### Key changes
- `all-tasks.spec.js`: the just added row test pauses the clock, so the two second highlight stays on; it also waits for each add to clear the field.
- `sidebar-find.spec.js`: waits for the `11 of 20` count, so the 150 ms find debounce cannot hide the row End focused.
- `sharing.spec.js`: opens the menu by the name `Family actions`; the old pattern also matched the All tasks view's button.
- `serve.test.js`: waits for the pid in the pid file, not just the file, which exists empty first.
- `service-worker.js`: VERSION bump, since T0278 changed precached files without one (check failed on main).

### Reproduction before the fix
Command: `$env:E2E_PORT='8771'; npx playwright test tests/e2e/all-tasks.spec.js:731 tests/e2e/sidebar-find.spec.js:43 --repeat-each 40 --workers 16 --reporter=line`, exit code 1:

```text
    Locator:  locator('.app__sidebar').locator('[data-nav-lists] li:not([hidden]) a').last()
    Expected: focused
    Received: inactive
[... call log omitted ...]
        13 × locator resolved to <a tabindex="-1" title="List 19" class="app__nav-item nav-item nav-item--list" href="#/lists/01a1eb28-d538-76c0-96d5-34e1a54d935b" data-nav="list:01a1eb28-d538-76c0-96d5-34e1a54d935b">…</a>
           - unexpected value "inactive"
[... 20 lines omitted ...]
  5 failed
    [chromium] › tests\e2e\all-tasks.spec.js:731:1 › a just added row keeps the hover feedback of other rows while it is highlighted 
    [chromium] › tests\e2e\all-tasks.spec.js:731:1 › a just added row keeps the hover feedback of other rows while it is highlighted 
    [chromium] › tests\e2e\all-tasks.spec.js:731:1 › a just added row keeps the hover feedback of other rows while it is highlighted 
    [chromium] › tests\e2e\sidebar-find.spec.js:43:1 › Down moves into the rows, which are one tab stop, and Escape clears the field 
    [chromium] › tests\e2e\sidebar-find.spec.js:43:1 › Down moves into the rows, which are one tab stop, and Escape clears the field 
  75 passed (1.4m)
```

The serve pid flake, from a full check run, exit code 1:

```text
 FAIL  tests/unit/serve.test.js > the pid file and the stop file > writes the pid, exits cleanly when the stop file appears, and removes both files
AssertionError: expected +0 to be 38580 // Object.is equality
```

The Share list flake, from a full check run, exit code 1:

```text
  2) [chromium] › tests\e2e\sharing.spec.js:127:1 › Share list opens the list editor at its Sharing section (SHR-1) 
    Error: locator.click: Test ended.
    > 131 |   await page.getByRole('menuitem', { name: 'Share list' }).click();
```

### Stress after the fix
Same command as the reproduction, exit code 0:

```text
[80/80] [chromium] › tests\e2e\sidebar-find.spec.js:43:1 › Down moves into the rows, which are one tab stop, and Escape clears the field
  80 passed (1.5m)
```

`npx playwright test tests/e2e/sharing.spec.js:127 tests/e2e/pwa.spec.js --repeat-each 20 --workers 16 --reporter=line`, exit code 0:

```text
  80 passed (2.9m)
```

`npx vitest run tests/unit/serve.test.js`, ten times in a row: `fails=0 of 10`.

### Completion check: three consecutive full checks on f374c06
`$env:E2E_PORT='8771'; python scripts/devops.py check`, run 1, exit code 0:

```text
OK: 141 precached files match VERSION 2026-11-17.37.
 Test Files  66 passed (66)
      Tests  1755 passed (1755)
  272 passed (4.2m)
All checks passed!
189 passed in 133.84s (0:02:13)
```

Run 2, exit code 0:

```text
OK: 141 precached files match VERSION 2026-11-17.37.
 Test Files  66 passed (66)
      Tests  1755 passed (1755)
  272 passed (3.5m)
All checks passed!
189 passed in 94.36s (0:01:34)
```

Run 3, exit code 0:

```text
OK: 141 precached files match VERSION 2026-11-17.37.
 Test Files  66 passed (66)
      Tests  1755 passed (1755)
  272 passed (3.4m)
All checks passed!
189 passed in 90.31s (0:01:30)
```
