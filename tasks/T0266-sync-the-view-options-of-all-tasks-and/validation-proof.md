## Walkthrough & Validation

### Key Changes
- `src/js/sync/settings.js` (new): uploads pending synced settings with `PATCH /api/users/me/settings`, or downloads with `GET` and `If-None-Match`.
- Every reply merges by edit time. A sent name adopts the entry the service kept, so clamped edit times never loop.
- `preferences.js` names the synced settings, records edit times and pending names, and announces downloads.
- The engine runs the settings step after the feed pull, kicks a run after a local edit, and clears state on disconnect.
- View models reload on downloads and wait while their panel is open. The Lists screen follows the sort and defers an order during a drag.
- The Settings switch follows a downloaded Make Enter add.

**[Decided]** A value stored before edit times existed uploads with edit time `2000-01-01T00:00:00.000Z`, inside the MySQL `TIMESTAMP(3)` range.
**[Decided]** A `PATCH` the service refuses with a 4xx drops those pending names, so one bad value cannot block the queue.
**[Decided]** The settings step runs only when the feed pull ran (visible page), so pruning list view options never races a skipped pull.

### Failing Tests Before the Implementation
Command: `npx vitest run tests/unit/settings-sync.test.js tests/unit/settings.test.js tests/unit/lists.test.js` (exit 1)
```text
 ❯ tests/unit/settings.test.js (52 tests | 1 failed) 1031ms
     × follows a downloaded Make Enter add while the screen is open (SYN-13) 13ms
 ❯ tests/unit/lists.test.js (37 tests | 2 failed) 3990ms
     × applies a downloaded sort of the Lists screen at once (SYN-13) 14ms
     × applies a downloaded list order that arrives during a drag after the drag ends (SYN-13) 11ms
⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/settings-sync.test.js [ tests/unit/settings-sync.test.js ]
Error: Cannot find module '../../src/js/sync/settings.js' imported from 
C:/Dev-Projects/todos.webapp/.plan/work/T0266-sync-the-view-options-of-all-tasks-and/tests/unit/settings-sync.test.js
 FAIL  tests/unit/lists.test.js > mountLists > applies a downloaded sort of the Lists screen at once (SYN-13)
TypeError: announceSettings is not a function
 FAIL  tests/unit/settings.test.js > Adding tasks in Settings > follows a downloaded Make Enter add while the screen 
is open (SYN-13)
TypeError: announceSettings is not a function
 Test Files  3 failed (3)
      Tests  3 failed | 86 passed (89)
```

The engine kick test, with the kick disabled: `npx vitest run tests/unit/settings-sync.test.js -t "runs again soon"` (exit 1)
```text
     × runs again soon after a local edit of a synced setting, and not after an edit of the theme 1116ms
AssertionError: expected "vi.fn()" to be called 2 times, but got 1 times
      Tests  1 failed | 16 skipped (17)
```

### Unit Suite
Command: `npm test` (exit 0)
```text
 Test Files  67 passed (67)
      Tests  1783 passed (1783)
   Start at  23:41:12
   Duration  16.36s (tests 47%, environment 40%, import 9%, transform 2%, worker 1%, setup 1%)
```

### Lint and Service Worker Check
Command: `npx eslint .` (exit 0, no output)

Command: `node scripts/check-sw-version.mjs` (exit 0)
```text
OK: 143 precached files match VERSION 2026-11-17.40.
```

### End-to-End Suite
Command: `npx playwright test` (exit 0), on commit `b1848c0`
```text
  ok 213 [chromium] › tests\e2e\settings-sync.spec.js:111:1 › view options, the list order, and Make Enter add set on 
one device appear on the other (SYN-13) (6.5s)
  274 passed (3.7m)
```

### Contract Suite
The sibling's built jar predates todos.server T0262, so the suite ran against a scratch clone at `8992db5`.
The clone was built with `gradlew.bat :server:installDist --offline`; the sibling checkout stayed untouched.

Command: `$env:TODOS_SERVER_DIR = "{{scratch}}/todos-server"; npx vitest run --config vitest.contract.config.js --reporter verbose` (exit 0)
```text
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > signs in through the Auth routes of the server 154ms
[... 19 lines omitted ...]
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > patches, reads, and conditionally reads the user settings, and merges two devices by edit time (SYN-13) 132ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > answers 426 to a client below the minimum version, and the client stops syncing 25ms

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  23:40:38
   Duration  6.23s (tests 96%, import 2%, transform 1%)
```
