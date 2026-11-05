## Walkthrough & Validation
The work ran in a clean extract of `main`; each finding below got a regression test or evidence.
Filter chips now mark a set filter with `data-active`, beside `aria-expanded`, instead of `aria-pressed`.
That change also touched controls.css, the gallery, its behaviors module, two e2e specs, and the style guide.
The service worker VERSION moved to `2026-11-04.19`, with the precache hashes rewritten by the check script.

Visual-free note: nothing looks different; the filter chip keeps its styling under the new attribute.
Size: 33 counted files, 597 changed lines (508 added, 89 deleted), excluding sw-precache-hashes.json.

### Findings
| Finding                                                       | Outcome                                                                     |
| :------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| Reload notice through the live region                         | fixed (layout.test.js)                                                      |
| Stored filter of a deleted list shows no active chip          | fixed (view-controls.test.js)                                               |
| Unused `STRINGS.range`                                        | fixed (removed; dead code, no test)                                         |
| Chips with both `aria-pressed` and `aria-expanded`            | fixed (view-controls.test.js, list.test.js, behaviors and gallery e2e)      |
| Compact layouts need a delete path                            | already fixed (task-editor.js Delete task, task-editor.spec.js TSK-11 test) |
| Empty reopened Add to list menu closes and focuses More       | fixed (task-list.test.js)                                                   |
| Failed permanent delete keeps the in-row question and focus   | fixed (recycle-bin.test.js)                                                 |
| Days left match the exact 30-day purge time                   | fixed (recycle-bin.test.js)                                                 |
| Plain `light` or `dark` stored theme                          | fixed (preferences.test.js)                                                 |
| Escape after an edit saves twice                              | fixed (task-editor.test.js)                                                 |
| Gallery-controls focus-ring e2e test near its timeout         | fixed (gallery-controls.spec.js, 8.6 s to 5.4 s alone)                      |
| Drag autoscroll and pointer-capture loss                      | fixed (reorder.test.js)                                                     |
| Delete list dialog closes on unmount                          | fixed (list.test.js; list-editor.test.js for the editor too)                |
| destroy() flushes a fixed field that carries aria-invalid     | fixed (task-editor.test.js, list-editor.test.js)                            |
| List editor counter linked with aria-describedby              | fixed (list-editor.test.js)                                                 |
| Connect card double announcements and focus on phase change   | fixed (connect.test.js)                                                     |
| settings.js uses `navigate`                                   | fixed (settings.test.js)                                                    |
| devops.md lists `/sign-in` among the CORS routes              | fixed (docs only)                                                           |
| Node-side Playwright `request` calls bypass the host guard    | fixed (comment in playwright.config.js)                                     |

**[Decided]** The task editor records handled values in a `saved` map, not in `shown`.
The description's blur handler compares against `shown` and would otherwise refill the stale stored value.

### Red Phase
The new and changed unit tests ran against the `main` code before any fix.

Command: `npx vitest run` (exit code 1), filtered with `grep -E '^ FAIL|Test Files|      Tests'`

```text
 FAIL  tests/unit/connect.test.js > mountConnect > moves focus to Done once the sign-in finished
 FAIL  tests/unit/connect.test.js > mountConnect > announces a failed sign-in once, through the live card only, and moves focus to Sign in
 FAIL  tests/unit/connect.test.js > mountConnect > announces an account without an invitation once, and moves focus to Back to Settings
 FAIL  tests/unit/layout.test.js > renderShell > announces a lasting notice through the polite live region, not a status role made with its text
 FAIL  tests/unit/list-editor.test.js > mountListEditor > saves a name fixed after an error when the editor closes without a change event
 FAIL  tests/unit/list-editor.test.js > mountListEditor > links the description to its character counter, also while it shows an error
 FAIL  tests/unit/list-editor.test.js > mountListEditor > closes an open Delete list dialog as Keep when the editor closes
 FAIL  tests/unit/list.test.js > mountList > shows the status filter state without aria-pressed, since the chip opens a popover
 FAIL  tests/unit/list.test.js > mountList > closes an open Delete list dialog as Keep when the view unmounts
 FAIL  tests/unit/preferences.test.js > theme preference > accepts a plain light or dark value stored without JSON quotes
 FAIL  tests/unit/recycle-bin.test.js > describeDeletion > counts the days left to the exact purge time, which a daylight saving change moves to another date
 FAIL  tests/unit/recycle-bin.test.js > mountRecycleBin > keeps the in-row question and focus when deleting for good fails
 FAIL  tests/unit/reorder.test.js > attachReorder > ends a drag cleanly when a render drops the handle, and with it the pointer capture
 FAIL  tests/unit/reorder.test.js > attachReorder > scrolls while the pointer rests near an edge, and places the row by the scrolled positions
 FAIL  tests/unit/settings.test.js > Connect in Settings > opens the connect flow through the navigate option, not by setting the location hash
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > saves an edited description once when Escape closes the editor after its change saved it
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > saves a field fixed after an error when the editor closes without a change event
 FAIL  tests/unit/task-list.test.js > createTaskList > closes a reopened Add to list menu that has no list left, and focuses the More button
 FAIL  tests/unit/view-controls.test.js > createViewControls > shows a chip per filter, with the active value, and a Filters button with the count
 FAIL  tests/unit/view-controls.test.js > createViewControls > shows no active Lists chip for a stored filter whose lists were all deleted
 FAIL  tests/unit/view-controls.test.js > createViewControls > clears every filter with Clear all, which shows only while a filter is active
 Test Files  11 failed | 23 passed (34)
      Tests  21 failed | 593 passed (614)
```

The failure messages, in the same order, show the old behavior.

Command: `npx vitest run` (exit code 1), filtered with `grep -E 'AssertionError|TypeError'`

```text
AssertionError: expected 'Signed in as jane@example.comSyncing …' to be 'Done' // Object.is equality
AssertionError: expected <p class="settings__text" …(1)></p> to be null
AssertionError: expected <p class="settings__text" …(1)></p> to be null
AssertionError: expected true to be false // Object.is equality
AssertionError: expected 'Home' to be 'Garden' // Object.is equality
TypeError: Cannot read properties of null (reading 'split')
AssertionError: expected true to be false // Object.is equality
AssertionError: expected true to be false // Object.is equality
AssertionError: expected true to be false // Object.is equality
AssertionError: expected 'system' to be 'light' // Object.is equality
AssertionError: expected 'Deleted 29 days ago · 1 day left' to be 'Deleted 29 days ago · last day' // Object.is equality
AssertionError: expected <p class="empty-state__title" …(1)></p> to be <button …(4)>…(2)</button> // Object.is equality
AssertionError: expected true to be false // Object.is equality
AssertionError: expected [] to have a length of 1 but got +0
AssertionError: expected "vi.fn()" to be called with arguments: [ '#/connect' ]
AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times
AssertionError: expected "vi.fn()" to be called with arguments: [ 't1', …(1) ]
AssertionError: expected false to be true // Object.is equality
AssertionError: expected [ undefined, undefined, …(2) ] to deeply equal [ 'false', 'true', 'false', 'false' ]
AssertionError: expected 'Lists: 0 lists' to be 'Lists' // Object.is equality
AssertionError: expected undefined to be 'false' // Object.is equality
```

The focus-ring test before the change, alone with two workers:

Command: `E2E_PORT=8879 npx playwright test tests/e2e/gallery-controls.spec.js -g "focus ring at"` (exit code 0)

```text
Running 2 tests using 2 workers

  ok 1 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (8.6s)
  ok 2 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (10.0s)

  2 passed (11.3s)
```

### Green Phase
Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run

[... 1 line omitted: the RUN line with the work copy path ...]

 Test Files  34 passed (34)
      Tests  614 passed (614)
   Start at  23:13:44
   Duration  6.61s (environment 68%, tests 20%, import 9%, transform 2%, worker 1%)
```

Command: `npx eslint .` (exit code 0)

```text
```

Command: `npm run check:sw` (exit code 0)

```text
> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 54 precached files match VERSION 2026-11-04.19.
```

The page now records each stop on focus, so a Tab press costs one round trip instead of two.
It counts each element once: the old loop counted date and time segments again, 79 stops against 71.

Command: `E2E_PORT=8879 npx playwright test tests/e2e/gallery-controls.spec.js -g "focus ring at"` (exit code 0)

```text
Running 2 tests using 2 workers

  ok 2 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (5.4s)
  ok 1 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (6.4s)

  2 passed (7.9s)
```

Command: `E2E_PORT=8879 npx playwright test` (exit code 0)

```text
Running 113 tests using 4 workers
[... 75 lines omitted: passing tests ...]
  ok  70 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (7.4s)
[... 19 lines omitted: passing tests ...]
  ok  74 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (11.5s)
[... 19 lines omitted: passing tests ...]
  113 passed (50.9s)
```

Command: `npm run test:perf` (exit code 0)

```text
Running 1 test using 1 worker

first rows painted: 243, 242, 294 ms (median 243 ms); all 5000 rows painted: 1369, 1376, 1389 ms (median 1376 ms); one-task update: 115, 112, 101 ms (median 112 ms)
  ok 1 [performance] › tests\e2e\performance.spec.js:92:1 › All tasks shows 5000 tasks fast and updates one task fast (TEC-16) (10.0s)

  1 passed (11.2s)
```
