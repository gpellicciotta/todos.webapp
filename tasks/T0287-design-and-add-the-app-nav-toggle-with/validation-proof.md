## Walkthrough & Validation

### Key Changes
- The top bar opens with the vendored `app__nav-toggle`; the sidebar is its `app-nav` popover.
- From 64rem the toggle cycles open, an icon rail, and hidden; `todos.view.nav` keeps the state per device.
- The rail shows each list as a monogram tile and hides the find field and the sidebar separator.
- The gallery gained a `.sidebar--rail` specimen; ui-design, the visual style guide, and local-store document the design.

### Red Phase (before implementation)
Command: `npx vitest run tests/unit/layout.test.js tests/unit/preferences.test.js 2>&1 | Select-String -Pattern "✓|×|FAIL|Tests |Test Files|Error:" | Select-Object -Last 30` (exit code 1)

```text
 ❯ tests/unit/preferences.test.js (18 tests | 2 failed) 22ms
     × defaults to open for a missing, unknown, or unreadable entry 7ms
     × round-trips open, rail, and hidden under todos.view.nav, and refuses other values 1ms
 ❯ tests/unit/layout.test.js (34 tests | 6 failed) 625ms
     × opens the top bar with the nav toggle, which controls the sidebar popover 12ms
     × cycles the wide sidebar through open, rail, and hidden, and stores each state on the device 4ms
     × starts in the state stored on the device 4ms
     × keeps the sidebar out of the hidden state below 64rem, where the toggle names the drawer 4ms
     × gives each list row a hidden monogram of its first letter, and every sidebar link a title 12ms
     × clears the find text when the sidebar becomes a rail 11ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > opens the top bar with the nav toggle, which controls the sidebar popover
AssertionError: expected <h1 class="app__title" …(1)></h1> to be null // Object.is equality
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > cycles the wide sidebar through open, rail, and hidden, and stores each state on the device
TypeError: Cannot read properties of null (reading 'click')
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > starts in the state stored on the device
TypeError: Cannot read properties of null (reading 'getAttribute')
 Test Files  2 failed (2)
      Tests  8 failed | 44 passed (52)
   Duration  1.83s (environment 44%, tests 37%, transform 14%, import 4%, setup 1%, worker 1%)
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > keeps the sidebar out of the hidden state below 64rem, where the toggle names the drawer
TypeError: Cannot read properties of null (reading 'getAttribute')
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > gives each list row a hidden monogram of its first letter, and every sidebar link a title
TypeError: Cannot read properties of null (reading 'textContent')
 FAIL  tests/unit/layout.test.js > renderShell navigation toggle and rail > clears the find text when the sidebar becomes a rail
TypeError: Cannot read properties of null (reading 'click')
 FAIL  tests/unit/preferences.test.js > navigation state preference > defaults to open for a missing, unknown, or unreadable entry
TypeError: readNavState is not a function
 FAIL  tests/unit/preferences.test.js > navigation state preference > round-trips open, rail, and hidden under todos.view.nav, and refuses other values
TypeError: writeNavState is not a function
```

Command: `npx playwright test tests/e2e/shell.spec.js -g "nav toggle" 2>&1 | Select-String -Pattern "✘|✓|passed|failed|Error:|Expected|Received|^\s+>" | Select-Object -First 15` (exit code 1)

```text
    Error: expect(locator).toHaveAccessibleName(expected) failed
    Expected: "Collapse navigation"
    Error: element(s) not found
    > 141 |   await expect(toggle).toHaveAccessibleName('Collapse navigation');
  1 failed
```

### Green Phase (after the final code change)
Command: `npx vitest run tests/unit/layout.test.js tests/unit/preferences.test.js tests/unit/design-system.test.js 2>&1 | Select-Object -Last 8` (exit code 0)

```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0287-design-and-add-the-app-nav-toggle-with


 Test Files  3 passed (3)
      Tests  62 passed (62)
   Start at  23:03:29
   Duration  1.72s (tests 44%, environment 42%, transform 6%, import 5%, setup 2%, worker 1%)
```

Command: `npx playwright test tests/e2e/shell.spec.js -g "nav toggle" 2>&1 | Select-Object -Last 4` (exit code 0)

```text
(Use `node --trace-warnings ...` to show where the warning was created)
  ok 1 [chromium] › tests\e2e\shell.spec.js:130:1 › the nav toggle cycles the wide sidebar through open, a rail of list monograms, and hidden, and the state survives a reload (1.5s)

  1 passed (2.8s)
```

### Full Suites and Checks
Command: `npx eslint . ; node scripts/check-sw-version.mjs ; npx vitest run 2>&1 | Select-String -Pattern "×|FAIL|Tests |Test Files"` (each exit code 0)

```text
eslint exit: 0
OK: 142 precached files match VERSION 2026-11-17.38.
sw exit: 0
 Test Files  66 passed (66)
      Tests  1763 passed (1763)
   Duration  16.63s (tests 46%, environment 41%, import 9%, transform 2%, worker 1%, setup 1%)
vitest exit: 0
```

Command: `npx playwright test 2>&1 | Select-String -Pattern "✘|^\s+\d+\) |passed|failed|flaky" | Select-Object -Last 20` (exit code 0)

```text
  273 passed (3.5m)
playwright exit: 0
```

An earlier full run failed 3 tests that the change broke: two gallery-chrome checks assumed one `nav.sidebar`.
The shell route check read link text that now starts with the hidden monogram; all three were updated.
A second full run also failed bin-settings (4) and connect (1); both specs passed alone, so they are load flakes.

### Visual Verification
A scratchpad Playwright spec seeded six lists and captured each state; Playwright started and stopped the server.
Each capture asserted no console errors, page errors, failed requests, or HTTP errors, and no horizontal scroll at 390 px.

| State                      | Before                                                 | After                                                 |
| :------------------------- | :----------------------------------------------------- | :---------------------------------------------------- |
| Wide open, light           | [before](before-wide-open-light.png)                   | [after](after-wide-open-light.png)                    |
| Wide open, dark            | [before](before-wide-open-dark.png)                    | [after](after-wide-open-dark.png)                     |
| Wide rail, light           | none                                                   | [after](after-wide-rail-light.png)                    |
| Wide rail, dark            | none                                                   | [after](after-wide-rail-dark.png)                     |
| Wide hidden, light         | none                                                   | [after](after-wide-hidden-light.png)                  |
| Wide hidden, dark          | none                                                   | [after](after-wide-hidden-dark.png)                   |
| Compact 390 px, light      | [before](before-compact-light.png)                     | [after](after-compact-light.png)                      |
| Compact 390 px, dark       | [before](before-compact-dark.png)                      | [after](after-compact-dark.png)                       |
| Gallery navigation, light  | [before](before-gallery-navigation-light.png)          | [after](after-gallery-navigation-light.png)           |
| Gallery navigation, dark   | [before](before-gallery-navigation-dark.png)           | [after](after-gallery-navigation-dark.png)            |
