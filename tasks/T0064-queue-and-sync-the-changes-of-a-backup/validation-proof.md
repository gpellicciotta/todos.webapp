## Walkthrough & Validation

### Red run, before the implementation

Command: `npx vitest run tests/unit/backup.test.js tests/unit/import-dialog.test.js`
Exit code: 1

```text
     × queues all fields of a newer row without an edit time, nothing for an older row, and only missing notes 15ms
     × sends the final name of a renamed list, and adds new memberships in their list order 2ms
     × sends a restore before the update when the newer row leaves the recycle bin 3ms
     × never queues a removal, and refuses overwrite mode 5ms
     × rolls an entry back through the queue undo, as for a refused change 8ms
     × disables Overwrite with a reason, keeps Merge chosen, and previews the merge 12ms
     × queues the import through the store, then shows Syncing and Synced until Done closes it 36ms
     × does not say Synced while changes are still queued 45ms
     × says when the changes wait for a connection or a sign-in, and still closes 19ms
 Test Files  2 failed (2)
      Tests  9 failed | 61 passed (70)
```

Command: `npx playwright test tests/e2e/backup.spec.js -g "connected"`
Exit code: 1

```text
        14 × locator resolved to <input type="radio" value="overwrite" name="import-dialog-1-mode" aria-describedby="import-dialog-1-overwrite-hint"/>
           - unexpected value "enabled"
    > 323 |   await expect(overwrite).toBeDisabled();
  1 failed
    [chromium] › tests\e2e\backup.spec.js:305:1 › connected, a merge import queues its changes, shows Syncing then Synced, and drains the queue
```

### Green run, after the implementation

Command: `npm test`
Exit code: 0

```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0064-queue-and-sync-the-changes-of-a-backup


 Test Files  51 passed (51)
      Tests  1033 passed (1033)
   Start at  21:31:45
   Duration  10.75s (environment 58%, tests 27%, import 9%, transform 4%, worker 2%)
```

Command: `npm run lint`
Exit code: 0

```text
> todos-webapp@0.2.1-pre lint
> eslint .
```

Command: `npx playwright test tests/e2e/backup.spec.js`
Exit code: 0

```text
  ✓   9 [chromium] › tests\e2e\backup.spec.js:255:1 › an invalid file shows its reason, keeps Import disabled, and changes nothing (1.3s)
  ✓   8 [chromium] › tests\e2e\backup.spec.js:235:1 › Overwrite updates the counts, and Import restores the missing task and bins the extra one (1.6s)
  ✓  10 [chromium] › tests\e2e\backup.spec.js:308:1 › connected, a merge import queues its changes, shows Syncing then Synced, and drains the queue (1.1s)
  ✓   2 [chromium] › tests\e2e\backup.spec.js:139:1 › on a compact layout Import backup imports a file, with the bars in view (9.2s)

  10 passed (11.0s)
```

Command: `npx playwright test`
Exit code: 0

```text
  ✓  171 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.5s)
  ✓  169 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (3.5s)
  ✓  172 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.7s)

  172 passed (1.6m)
```

### Visual check
The e2e test fails on any console error, page error, failed request, or HTTP status of 400 or higher; it passed.
Screenshots, light theme, wide dialog: [before import](connected-before-import.png) shows Overwrite disabled with its reason.
[Syncing](connected-after-syncing.png) and [Synced](connected-after-synced.png) show the sync line with Done.
The local-mode dialog is unchanged, so its before capture is the existing import dialog.

### Completion check

Command: `plan tasks validate --completion --verbose .plan/tasks/T0064-queue-and-sync-the-changes-of-a-backup.md`
Exit code: 0

```text
Resolved worktree root: C:\Dev-Projects\todos.webapp\.plan
Task files being validated:
- **    OK** [T0064-queue-and-sync-the-changes-of-a-backup.md]

All 1 task file passed validation.
```
