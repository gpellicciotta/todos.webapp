## Walkthrough & Validation

### Key Changes
- `task-list.js` drops the More button, the shared row menu, its five entries, and the menu focus memo.
- `isLocked` replaces `accessOf`; rows keep only the status button and the open link.
- `list.js` drops `moves.step`, which only the menu called; `reorder.js` keeps it for the Alt keys.
- CSS drops `.task-row__more` rules; the gallery drops the row specimens' More buttons.
- Tests move delete and remove-from-list flows to the editor and assert that no row menu opens.

### Red Phase: Changed Tests Before the Removal
Command: `npx vitest run tests/unit/task-list.test.js tests/unit/all-tasks.test.js tests/unit/reorder.test.js`, filtered to results.
Exit code: 1.

```text
 ❯ tests/unit/all-tasks.test.js (33 tests | 1 failed) 739ms
     × updates the due chip on the minute tick and keeps the row and its focus, with no row menu (OVD-2) 38ms
 ❯ tests/unit/task-list.test.js (66 tests | 4 failed) 2639ms
     × builds no menu next to the list, and rows end with no More button or other trailing control 19ms
     × opens no row menu from any key on any row control 23ms
       × locks the status of a viewer only, and gives no role a row menu: lists and Delete live in the editor 4ms
       × leaves grace completion of the previous period to the task editor, with no row menu offering it 3ms
[... failure headers omitted ...]
AssertionError: expected <div class="menu" …(2)></div> to be null
AssertionError: more Enter: expected 1 to be +0 // Object.is equality
AssertionError: viewer: expected <button …(6)>…(1)</button> to be null
AssertionError: expected <button …(5)>…(1)</button> to be null
 Test Files  2 failed | 1 passed (3)
      Tests  5 failed | 111 passed (116)
```

Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js tests/e2e/sharing.spec.js tests/e2e/gallery-app.spec.js -g "{{changed tests}}" --reporter=line`, filtered.
Exit code: 1. The editor-based remove and delete flows already passed, since T0262 built them.

```text
  1) [chromium] › tests\e2e\all-tasks.spec.js:546:1 › rows have no More button, and the editor deletes a task that
Undo brings back, also with Ctrl+Z (TSK-11)
    Error: expect(locator).toHaveCount(expected) failed
  2) [chromium] › tests\e2e\gallery-app.spec.js:274:1 › task row specimens cover every documented state
    Error: expect(locator).toHaveCount(expected) failed
  3) [chromium] › tests\e2e\list.spec.js:292:3 › List screen › Alt+Down moves the focused row, keeps focus on it, and
announces the move (LV-3)
    Error: expect(locator).toHaveCount(expected) failed
  4) [chromium] › tests\e2e\sharing.spec.js:136:1 › a viewer sees the list read-only, without edit, move, or delete
controls (SHR-3, SHR-4)
    Error: expect(locator).toHaveCount(expected) failed
  4 failed
  4 passed (14.2s)
```

### Green Phase
Command: `npm test`, filtered to the summary. Exit code: 0.

```text
 Test Files  65 passed (65)
      Tests  1747 passed (1747)
   Duration  37.31s (environment 48%, tests 40%, import 7%, transform 2%, worker 2%, setup 1%)
```

Command: `npx eslint .` Exit code: 0, no output.

Command: `node scripts/check-sw-version.mjs`. Exit code: 0.

```text
OK: 132 precached files match VERSION 2026-11-17.32.
```

Command: `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js tests/e2e/sharing.spec.js tests/e2e/gallery-app.spec.js tests/e2e/task-editor.spec.js --reporter=line`, last lines.
Exit code: 0.

```text
[... 95 progress lines omitted ...]
[96/98] [chromium] › tests\e2e\task-editor.spec.js:416:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)
[97/98] [chromium] › tests\e2e\task-editor.spec.js:450:3 › recurring tasks in local mode › a weekly task ticked this week comes back as ready next week, and its history shows the roll-over
[98/98] [chromium] › tests\e2e\task-editor.spec.js:485:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global
  98 passed (1.9m)
```

### Full e2e Suite
Command: `npx playwright test --reporter=line`, filtered. Exit code: 1.
The three failures predate this branch and touch no changed code:
- `bin-settings.spec.js` expects 9 shortcuts; settings.js at HEAD added Alt+Home and Alt+End in T0076.
- `behaviors-dialog.spec.js` toast test matches two `aria-live="polite"` elements.
  The gallery's `task-editor__count` specimen, present at HEAD since T0262, is the second.
- Follow-up task T0282 fixes them.
- The 266 passed include the 4 runs of the temporary capture spec, which was then deleted.

```text
  1) [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its
Undo, and undoes
    Error: expect(locator).toHaveText(expected) failed
  2) [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at compact width
without a horizontal scroll
    Error: expect(locator).toHaveText(expected) failed
  3) [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at wide width without a
horizontal scroll
    Error: expect(locator).toHaveText(expected) failed
  3 failed
  266 passed (3.5m)
```

### Visual Verification
A temporary Playwright spec seeded five tasks in two lists and captured All tasks and the Home list.
It hovered the second row and checked that the page returned HTTP 200.
It also checked for no console errors, page errors, failed requests, or responses of 400 or more.
It ran at 360 and 1440 px, in light and dark, before and after the change; all 8 runs passed.

| View           | Before                                                                 | After                                                                |
| :------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------- |
| All tasks 360  | [light](before-all-tasks-360-light.png), [dark](before-all-tasks-360-dark.png)   | [light](after-all-tasks-360-light.png), [dark](after-all-tasks-360-dark.png)   |
| All tasks 1440 | [light](before-all-tasks-1440-light.png), [dark](before-all-tasks-1440-dark.png) | [light](after-all-tasks-1440-light.png), [dark](after-all-tasks-1440-dark.png) |
| List 360       | [light](before-list-360-light.png), [dark](before-list-360-dark.png)             | [light](after-list-360-light.png), [dark](after-list-360-dark.png)             |
| List 1440      | [light](before-list-1440-light.png), [dark](before-list-1440-dark.png)           | [light](after-list-1440-light.png), [dark](after-list-1440-dark.png)           |

- Before: every 1440 px row ends in a "…" More button, and so does every list view row at 360 px.
- After: no row has a trailing control, and the lists on the meta line reach the row's end edge.
