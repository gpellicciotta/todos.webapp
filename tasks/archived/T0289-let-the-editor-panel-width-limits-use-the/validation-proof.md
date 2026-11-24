## Walkthrough & Validation

### Key Changes
- `panel-resize.js` limits the editor by the shown sidebar: the measured rail, 0 when hidden, else the open width.
- A MutationObserver on the sidebar `hidden` attribute and the nav toggle's `aria-expanded` reapplies the widths.
- The stored widths stay; reopening the sidebar yields first, as on a window resize.

### Failing Tests on Main (Before the Fix)
Command: `npx vitest run tests/unit/panel-resize.test.js` (exit code 1, filtered with `grep -E "FAIL|Tests|Assertion"`)

```text
 FAIL  tests/unit/panel-resize.test.js > nav states > limits the editor by the 4rem rail instead of the 16rem open sidebar
AssertionError: expected '460' to be '640' // Object.is equality
 FAIL  tests/unit/panel-resize.test.js > nav states > ignores the stored sidebar width while the sidebar is hidden
AssertionError: expected '400' to be '640' // Object.is equality
 FAIL  tests/unit/panel-resize.test.js > nav states > reclamps the editor when the sidebar reopens and keeps the stored widths for a wider window
AssertionError: expected '28.75rem' to be '40rem' // Object.is equality
      Tests  3 failed | 22 passed (25)
```

Command: `E2E_PORT=8789 npx playwright test tests/e2e/shell.spec.js -g "editor limits follow"` (exit code 1, filtered)

```text
    Error: expect(locator).toHaveAttribute(expected) failed
           - unexpected value "460"
  1 failed
```

### Targeted Tests After the Fix
Command: `npx vitest run tests/unit/panel-resize.test.js tests/unit/layout.test.js` (exit code 0)

```text
 Test Files  2 passed (2)
      Tests  59 passed (59)
```

Command: `E2E_PORT=8789 npx playwright test tests/e2e/shell.spec.js` (exit code 0)

```text
  30 passed (20.1s)
```

### Completion Check
Command: `python scripts/devops.py check` (exit code 0)

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
OK: 151 precached files match VERSION 2026-11-24.3.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
 Test Files  67 passed (67)
      Tests  1789 passed (1789)
Command: "C:\Program Files\nodejs\npm.CMD" run lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
[... 280 lines of passing test names omitted ...]
  276 passed (3.4m)
Command: ...python.exe -m ruff check scripts tests
All checks passed!
Command: ...python.exe -m ruff format --check scripts tests
4 files already formatted
Command: ...python.exe -m pytest -q tests
190 passed in 106.79s (0:01:46)
```
