## Walkthrough & Validation

T0283 (commit `0be6585`) already changed both declared specs before this task started.
- `bin-settings.spec.js` expects the Alt+Home or Alt+End row, 15 `kbd` elements, and 10 actions.
- `behaviors-dialog.spec.js` reads `[data-live-region="polite"]` instead of `[aria-live="polite"]`.
- `CHANGELOG.md` line 14 records the change under the current -pre heading.

This branch carries no change. The completion check passes at `0be6585`.

### Completion check

Command: `npx playwright test tests/e2e/bin-settings.spec.js tests/e2e/behaviors-dialog.spec.js --reporter=line`

Exit code: 0

```text
[1/17] [chromium] › tests\e2e\behaviors-dialog.spec.js:65:3 › dialog behavior › the modal fills the viewport height as a sheet at 390 px
[2/17] [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button
[3/17] [chromium] › tests\e2e\behaviors-dialog.spec.js:100:3 › toast behavior › Escape inside a toast dismisses it and returns focus
[4/17] [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes
[5/17] [chromium] › tests\e2e\behaviors-dialog.spec.js:112:3 › toast behavior › a toast expires after 8 seconds
[6/17] [chromium] › tests\e2e\bin-settings.spec.js:59:1 › restoring a task brings it back into its lists, with a toast linking to it
[7/17] [chromium] › tests\e2e\bin-settings.spec.js:83:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it
[8/17] [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Restore and Delete act on every entry that matches the filter
[9/17] [chromium] › tests\e2e\bin-settings.spec.js:104:1 › the find field and the type choice filter the bin, and a match restores
[10/17] [chromium] › tests\e2e\bin-settings.spec.js:164:1 › Empty recycle bin asks with the count, then empties the bin for good, also after a reload
[11/17] [chromium] › tests\e2e\bin-settings.spec.js:186:1 › Delete all data needs DELETE typed, erases everything including the bin, and keeps the theme
[12/17] [chromium] › tests\e2e\bin-settings.spec.js:216:1 › connected, Delete all data also erases the account through the service, then the app syncs empty
[13/17] [chromium] › tests\e2e\bin-settings.spec.js:265:1 › choosing Dark sets data-theme at once and keeps it after a reload
[14/17] [chromium] › tests\e2e\bin-settings.spec.js:281:1 › a theme that cannot be saved still applies, and a toast says so
[15/17] [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at wide width without a horizontal scroll
[16/17] [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at compact width without a horizontal scroll
[17/17] [chromium] › tests\e2e\bin-settings.spec.js:328:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version
  17 passed (12.5s)
```
