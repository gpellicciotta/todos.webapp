## Walkthrough & Validation

### Summary
- The task editor has Content, Status, and History tabs on the vendored tabs.js; each open starts on Content.
- Content: description and notes; the "Add or search notes" field also filters the thread.
- Status: status, rule, Lists, rule, Target count, Due, Overdue behavior, Repeat, rule, Delete task.
- History: the history, loaded when the tab first shows, then Details.
- A field error on a hidden tab selects that tab and focuses the field.
- tabs.js joins the service worker precache and the start page module preloads; VERSION is 2026-11-17.31.

### Red phase: new unit tests fail before the implementation
`npx vitest run tests/unit/task-editor.test.js`, exit code 1:

```text
 ❯ tests/unit/task-editor.test.js (69 tests | 10 failed) 6794ms
       × shows Content, Status, and History tabs under the header, each linked to its panel, opening on Content 38ms
       × holds the description and notes on Content, History then Details on History 20ms
       × holds the status, Lists, the configuration groups, and Delete task on Status, with a rule between each part 16ms
       × moves between the tabs with the arrow keys, Home, and End, following the WAI-ARIA tabs pattern 25ms
       × opens on Content again for each task, focusing the description (TSK-13) 25ms
       × selects the hidden tab of a field error and focuses that field 31ms
       × loads the history once its tab first shows 59ms
       × closes on Escape from any tab 20ms
       × deletes from the bottom of Status, closing with the Undo toast, and hides Delete task with its rule on a deleted task 22ms
       × filters the note thread to the notes matching the add field 92ms
[... failure details omitted ...]
TypeError: Cannot read properties of null (reading 'getAttribute')
TypeError: Cannot read properties of undefined (reading 'click')
AssertionError: expected 'Add a note' to be 'Add or search notes' // Object.is equality
 Test Files  1 failed (1)
      Tests  10 failed | 59 passed (69)
```

`npx playwright test tests/e2e/task-editor.spec.js -g "splits into" --reporter=line` (E2E_PORT=8862), exit code 1:

```text
    Call log:
      - Expect "toHaveText" locator('[data-editor-slot] .editor-panel').getByRole('tablist', { name: 'Task sections' }).getByRole('tab') with timeout 5000ms
      - waiting for locator('[data-editor-slot] .editor-panel').getByRole('tablist', { name: 'Task sections' }).getByRole('tab')
        13 × locator resolved to 0 elements
[... 12 lines omitted ...]
  2 failed
    [chromium] › tests\e2e\task-editor.spec.js:75:3 › the editor splits into Content, Status, and History tabs, edits a field on each, and deletes from Status at 390 px
    [chromium] › tests\e2e\task-editor.spec.js:75:3 › the editor splits into Content, Status, and History tabs, edits a field on each, and deletes from Status at 1440 px
```

### Green phase: unit suite
`npm test`, exit code 0:

```text
 Test Files  65 passed (65)
      Tests  1754 passed (1754)
   Duration  21.15s (environment 46%, tests 42%, import 7%, transform 2%, worker 1%, setup 1%)
```

### Lint and service worker check
`npx eslint .`, exit code 0, no output.

`node scripts/check-sw-version.mjs`, exit code 0:

```text
OK: 132 precached files match VERSION 2026-11-17.31.
```

### Affected end-to-end specs
`npx playwright test tests/e2e/task-editor.spec.js tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js tests/e2e/behaviors-dialog.spec.js tests/e2e/behaviors.spec.js tests/e2e/gallery-app.spec.js tests/e2e/gallery-chrome.spec.js tests/e2e/gallery-controls.spec.js tests/e2e/gallery-danger.spec.js tests/e2e/gallery.spec.js --reporter=line` (E2E_PORT=8862), exit code 1:

```text
[... 126 progress lines omitted ...]
[127/140] [chromium] › tests\e2e\task-editor.spec.js:75:3 › the editor splits into Content, Status, and History tabs, edits a field on each, and deletes from Status at 390 px
[128/140] [chromium] › tests\e2e\task-editor.spec.js:75:3 › the editor splits into Content, Status, and History tabs, edits a field on each, and deletes from Status at 1440 px
[... 11 progress lines omitted ...]
  1) [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes
    Error: expect(locator).toHaveText(expected) failed
    Error: strict mode violation: locator('[aria-live="polite"]') resolved to 2 elements:
        1) <span aria-live="polite" class="task-editor__count">1 of 3</span> aka getByText('1 of 3', { exact: true })
        2) <div role="status" aria-live="polite" aria-atomic="true" class="visually-hidden" data-live-region="polite">Task moved to the recycle bin.</div>
  1 failed
    [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes
  139 passed (1.7m)
```

The one failure predates this task.
The gallery at the base commit 6503ee0 already holds the stepper's `task-editor__count` live region, which the test's locator also matches.
An earlier full run of `npx playwright test` (264 tests) also failed `bin-settings.spec.js:296` at both widths.
That test checks the Settings shortcut list, which this task does not change.
Follow-up task T0281 tracks both.

### Visual verification
Captured with a temporary Playwright spec, deleted afterwards. Its server returned HTTP 200 for `/`.
The spec failed on any console error, page error, failed request, or HTTP status of 400 or more; all 8 runs passed.
Before (main checkout, base commit 6503ee0) and after (this branch), at 390 × 1500 and 1440 × 1300, light and dark:

- Before: [phone light](screenshots/before-phone-light.png), [phone dark](screenshots/before-phone-dark.png), [desktop light](screenshots/before-desktop-light.png), [desktop dark](screenshots/before-desktop-dark.png).
- Content: [phone light](screenshots/after-content-phone-light.png), [phone dark](screenshots/after-content-phone-dark.png), [desktop light](screenshots/after-content-desktop-light.png), [desktop dark](screenshots/after-content-desktop-dark.png).
- Status: [phone light](screenshots/after-status-phone-light.png), [phone dark](screenshots/after-status-phone-dark.png), [desktop light](screenshots/after-status-desktop-light.png), [desktop dark](screenshots/after-status-desktop-dark.png).
- History: [phone light](screenshots/after-history-phone-light.png), [phone dark](screenshots/after-history-phone-dark.png), [desktop light](screenshots/after-history-desktop-light.png), [desktop dark](screenshots/after-history-desktop-dark.png).
