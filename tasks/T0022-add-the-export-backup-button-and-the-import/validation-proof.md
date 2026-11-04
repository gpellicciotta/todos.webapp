## Walkthrough & Validation
`settings.js` enables Export backup and Import backup in the Data card.
Export reads the store through `exportBackup` and saves a Blob through a temporary `<a download>` link.
The file name comes from `backupFileName`, in local time; a toast names the file and its list and task counts.
`import-dialog.js` opens a native `<dialog>` through `dialog.js`, with focus on the Backup file field.
A valid file shows its name, export date, and counts, then Merge (default) or Overwrite with a hint each.
The `role="status"` counts line reruns `previewImport` when the mode changes; stale answers are dropped.
An invalid file shows its reason in a `role="alert"` error, marks the field invalid, and keeps Import disabled.
Import runs `importBackup`, closes the dialog, returns focus to Import backup, and repeats the counts in a toast.
Cancel, Close, and Escape remove the dialog without writing.
T0020 follow-ups: a theme the browser cannot store shows a toast, and still applies.
Connect stays disabled, with a hint as its accessible description saying connecting comes later.
`import-dialog.js` is in PRECACHE; VERSION is `2026-11-04.15`, and the precache hashes were updated.
The work ran in a clean extract of `main`, so outputs show that folder's path.

### Red Phase
The tests ran before the dialog existed and while both backup buttons were disabled.

Command: `E2E_PORT=8853 npx playwright test tests/e2e/backup.spec.js tests/e2e/bin-settings.spec.js` (exit code 1)

```text

Running 9 tests using 4 workers

  x  2 [chromium] › tests\e2e\backup.spec.js:109:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it (30.1s)
  x  3 [chromium] › tests\e2e\backup.spec.js:169:1 › an invalid file shows its reason, keeps Import disabled, and changes nothing (30.1s)
  x  1 [chromium] › tests\e2e\backup.spec.js:149:1 › Overwrite updates the counts, and Import restores the missing task and bins the extra one (30.2s)
  x  4 [chromium] › tests\e2e\backup.spec.js:129:1 › importing an export in Merge mode shows its counts, and Cancel changes nothing (30.1s)
  ok 5 [chromium] › tests\e2e\bin-settings.spec.js:58:1 › restoring a task brings it back into its lists, with a toast linking to it (1.1s)
  ok 7 [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload (1.2s)
  ok 6 [chromium] › tests\e2e\bin-settings.spec.js:82:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it (1.5s)
  x  9 [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version (5.5s)
  x  8 [chromium] › tests\e2e\bin-settings.spec.js:119:1 › a theme that cannot be saved still applies, and a toast says so (5.7s)


  1) [chromium] › tests\e2e\backup.spec.js:109:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it 

    Test timeout of 30000ms exceeded.

    Error: page.waitForEvent: Test timeout of 30000ms exceeded.
    =========================== logs ===========================
    waiting for event "download"
    ============================================================

[... 227 lines omitted ...]
    Error: expect(locator).toBeEnabled() failed

    Locator:  getByRole('button', { name: 'Export backup', exact: true })
    Expected: enabled
    Received: disabled
    Timeout:  5000ms

    Call log:
      - Expect "toBeEnabled" getByRole('button', { name: 'Export backup', exact: true }) with timeout 5000ms
      - waiting for getByRole('button', { name: 'Export backup', exact: true })
        14 × locator resolved to <button disabled type="button" class="button button--secondary">Export backup</button>
           - unexpected value "disabled"
[... 20 lines omitted ...]

  6 failed
    [chromium] › tests\e2e\backup.spec.js:109:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it 
    [chromium] › tests\e2e\backup.spec.js:129:1 › importing an export in Merge mode shows its counts, and Cancel changes nothing 
    [chromium] › tests\e2e\backup.spec.js:149:1 › Overwrite updates the counts, and Import restores the missing task and bins the extra one 
    [chromium] › tests\e2e\backup.spec.js:169:1 › an invalid file shows its reason, keeps Import disabled, and changes nothing 
    [chromium] › tests\e2e\bin-settings.spec.js:119:1 › a theme that cannot be saved still applies, and a toast says so 
    [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version 
  3 passed (40.1s)
```

### Green Phase
Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t22work


 Test Files  26 passed (26)
      Tests  550 passed (550)
   Start at  21:34:54
   Duration  15.45s (environment 67%, tests 19%, import 9%, transform 2%, worker 2%)

    Isolate  26 workers spawned · ~2.59s startup each (spawn + environment, per file)
             at least ~7.03s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 47 precached files match VERSION 2026-11-04.15.
```

Command: `E2E_PORT=8853 npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test
[... 14 lines omitted ...]
  ok 11 [chromium] › tests\e2e\backup.spec.js:109:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it (1.3s)
  ok 14 [chromium] › tests\e2e\backup.spec.js:169:1 › an invalid file shows its reason, keeps Import disabled, and changes nothing (1.2s)
  ok 13 [chromium] › tests\e2e\backup.spec.js:149:1 › Overwrite updates the counts, and Import restores the missing task and bins the extra one (1.4s)
  ok 12 [chromium] › tests\e2e\backup.spec.js:129:1 › importing an export in Merge mode shows its counts, and Cancel changes nothing (1.5s)
[... 12 lines omitted ...]
  ok 28 [chromium] › tests\e2e\bin-settings.spec.js:119:1 › a theme that cannot be saved still applies, and a toast says so (852ms)
  ok 27 [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload (1.1s)
  ok 29 [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version (954ms)
  ok 32 [chromium] › tests\e2e\gallery-app.spec.js:102:3 › task rows keep one line at 48 px and truncate long text at 390 px (986ms)
[... 69 lines omitted ...]

  99 passed (52.9s)
```

### Visual Verification
A throwaway Playwright script served `src/` in-process on port 8857 and seeded a list Home with two tasks.
It picked `tests/fixtures/backup-v1.json`, switched to Overwrite, then picked an invalid file.
It recorded no console errors, page errors, or HTTP errors in either run.
- Before: [settings-390-light-before.png](screenshots/settings-390-light-before.png): Export and Import disabled.
- After: [settings-390-light-after.png](screenshots/settings-390-light-after.png), [import-1440-light-after.png](screenshots/import-1440-light-after.png).
- After: [import-overwrite-390-dark-after.png](screenshots/import-overwrite-390-dark-after.png), [import-invalid-390-light-after.png](screenshots/import-invalid-390-light-after.png).
- Fixed after the first capture: mode hints sat a row away from their labels, and the native file button clashed in dark.
- Differs from import.svg: a Backup file field leads the dialog, and Cancel precedes Import, as in the dialog component.
