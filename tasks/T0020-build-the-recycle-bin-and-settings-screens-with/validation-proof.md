## Walkthrough & Validation
`recycle-bin.js` fills `#/bin`: one row per deleted list or task, with type icon, name, and days ago and days left.
Restore brings back every membership and shows a toast whose Open action goes to the item.
Delete permanently asks in the row; Keep and Escape close the question, and Delete purges the entry.
`settings.js` fills `#/settings` with Appearance, Data, Connection, and About cards.
The theme applies at once and persists as `todos.theme` through `core/preferences.js`; `layout.js` reads it there.
Export backup, Import backup, and Connect show disabled until T0022 and T0024.
The server URL defaults to `https://todos.pellicciotta.com`, the base of `https://todos.pellicciotta.com/api` in the todos REST spec (`docs/specs/rest-api-spec.md`, line 8).
`src/js/version.js` holds the version and build date; `preferences.test.js` checks it against `package.json`.
Both views, and `version.js`, are in PRECACHE; VERSION is bumped at commit time, so `check:sw` fails until then.

### Red Phase
The tests ran before the views, `version.js`, and the preference helpers existed.

Command: `npx vitest run tests/unit/preferences.test.js tests/unit/recycle-bin.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/preferences.test.js (0 test)
 ❯ tests/unit/recycle-bin.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/preferences.test.js [ tests/unit/preferences.test.js ]
Error: Cannot find module '../../src/js/version.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/preferences.test.js
[... 30 lines omitted ...]

 Test Files  2 failed (2)
      Tests  no tests
   Start at  20:12:04
   Duration  955ms (environment 98%, worker 2%)

```

Command: `E2E_PORT=8815 npx playwright test tests/e2e/bin-settings.spec.js` (exit code 1)

```text

Running 4 tests using 4 workers

  x  1 [chromium] › tests\e2e\bin-settings.spec.js:119:1 › Settings shows the local connection card, the server URL, the disabled actions, and the version (5.9s)
  x  3 [chromium] › tests\e2e\bin-settings.spec.js:58:1 › restoring a task brings it back into its lists, with a toast linking to it (6.0s)
  x  2 [chromium] › tests\e2e\bin-settings.spec.js:82:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it (6.1s)
  x  4 [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload (6.1s)
[... 134 lines omitted ...]
    ────────────────────────────────────────────────────────────────────────────────────────────────

  4 failed
    [chromium] › tests\e2e\bin-settings.spec.js:58:1 › restoring a task brings it back into its lists, with a toast linking to it 
    [chromium] › tests\e2e\bin-settings.spec.js:82:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it 
    [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload 
    [chromium] › tests\e2e\bin-settings.spec.js:119:1 › Settings shows the local connection card, the server URL, the disabled actions, and the version 
```

### Green Phase
The working tree also held T0018's in-progress editor files; every test, theirs included, passed.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  26 passed (26)
      Tests  542 passed (542)
   Start at  20:21:18
   Duration  13.58s (environment 70%, tests 17%, import 8%, worker 3%, transform 2%)

    Isolate  26 workers spawned · ~2.53s startup each (spawn + environment, per file)
             at least ~6.87s faster with isolate: false — reuses workers across files instead of one per file

```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .

```

Command: `E2E_PORT=8815 npm run test:e2e` (exit code 0)

```text

  ok 21 [chromium] › tests\e2e\bin-settings.spec.js:58:1 › restoring a task brings it back into its lists, with a toast linking to it (2.9s)
  ok 24 [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload (1.6s)
  ok 22 [chromium] › tests\e2e\bin-settings.spec.js:119:1 › Settings shows the local connection card, the server URL, the disabled actions, and the version (1.9s)
  ok 23 [chromium] › tests\e2e\bin-settings.spec.js:82:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it (1.9s)
  ok 81 [chromium] › tests\e2e\shell.spec.js:94:1 › every route renders its title and its view, and the sidebar follows the lists (2.1s)
  ok 85 [chromium] › tests\e2e\shell.spec.js:183:1 › the theme follows the system by default and a stored preference pins it (1.8s)
  ok 86 [chromium] › tests\e2e\shell.spec.js:199:1 › a newer app version in another tab shows a lasting banner with Reload (2.0s)
  ok 89 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.9s)
  ok 88 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (3.0s)
  ok 90 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (4.3s)
  ok 91 [chromium] › tests\e2e\task-editor.spec.js:122:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (3.5s)
  ok 92 [chromium] › tests\e2e\task-editor.spec.js:146:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.8s)
[... 88 lines omitted ...]

  94 passed (1.4m)
```

Command: `npm run check:sw` (exit code 1, expected: VERSION is bumped at commit time for T0018 and T0020 together)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

ERROR: precached files changed but VERSION is still 2026-11-04.9:
  css/views.css
  js/app.js
  js/core/preferences.js
  js/ui/layout.js
  js/version.js
  js/views/editor-panel.js
  js/views/notes.js
  js/views/recycle-bin.js
  js/views/settings.js
  js/views/task-editor.js
Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update
```

### Visual Verification
A throwaway Playwright script served `src/` in-process on port 8817, seeded four bin entries, and captured each screen.
It recorded no console errors, page errors, or HTTP errors in either run.
- Before: [bin-1440-light-before.png](screenshots/bin-1440-light-before.png), [settings-390-light-before.png](screenshots/settings-390-light-before.png): both views empty.
- After: [bin-1440-light-after.png](screenshots/bin-1440-light-after.png), [bin-confirm-390-dark-after.png](screenshots/bin-confirm-390-dark-after.png), [settings-390-dark-after.png](screenshots/settings-390-dark-after.png).
- Fixed after the first capture: compact meta wrapped into three lines, and the theme options wrapped into two rows.
- Fixed too: long names pushed the row actions onto a second line.
