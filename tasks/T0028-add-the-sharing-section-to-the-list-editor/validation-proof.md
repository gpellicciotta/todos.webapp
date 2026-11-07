## Walkthrough & Validation

### Red phase (tests written first, failing)
Honest note: the permissions and sharing modules were written before their first failing run was captured.
The modules were then moved aside so the tests ran red. The other red runs came before their code.

Command: `npx vitest run tests/unit/permissions.test.js tests/unit/sharing.test.js` (modules moved aside), exit code 1

```text
Error: Failed to resolve import "../../src/js/views/sharing.js" from "tests/unit/sharing.test.js". Does the file exist?
 Test Files  2 failed (2)
      Tests  no tests
```

Command: `npx vitest run tests/unit/list-editor.test.js`, exit code 1

```text
 ❯ tests/unit/list-editor.test.js (19 tests | 5 failed) 429ms
     × offers the owner the editable fields, the Sharing controls, and Delete list 10ms
     × lets an editor edit the list but not share or delete it 3ms
     × shows a task-editor the list read-only with a banner naming the owner 5ms
     × shows a viewer the list read-only with a banner naming the owner 4ms
     × scrolls to the Sharing section when opened with Share list 5ms
 Test Files  1 failed (1)
      Tests  5 failed | 14 passed (19)
```

Command: `npx vitest run tests/unit/lists.test.js tests/unit/list.test.js tests/unit/router.test.js`, exit code 1

```text
     × parses and formats #/lists/0192f1a2-0000-7000-8000-000000000001/share 13ms
     × opens the list editor, the view options, and the sharing section of the row list from its More menu 29ms
     × offers each role only the list actions it may use, and shows the owner of lists shared with the user (SHR-3, SHR-4) 18ms
     × names the owner and the own role of a shared list, and offers a viewer no list changes (SHR-3, SHR-4) 1032ms
 Test Files  3 failed (3)
      Tests  4 failed | 50 passed (54)
```

Command: `npx vitest run tests/unit/task-list.test.js`, exit code 1

```text
       × locks the status of a viewer and leaves them no row menu 17ms
       × lets a task editor change the status and remove the task from the list, but not delete it 17ms
       × offers a task editor Add to list only for the lists they may add to 6ms
       × offers the owner of the list every action, including Delete 8ms
 Test Files  1 failed (1)
      Tests  4 failed | 37 passed (41)
```

Command: `npx vitest run tests/unit/view-controls.test.js`, exit code 1

```text
       × names the filter, keeps it in the device storage, and counts it as a change from the defaults 13ms
       × offers the Shared filter in All tasks only while connected, as Any, Shared, and Not shared (TV-7) 61ms
       × shows the Shared row once the session connects 59ms
 Test Files  1 failed (1)
      Tests  3 failed | 37 passed (40)
```

Command: `npx vitest run tests/unit/all-tasks.test.js`, exit code 1

```text
       × shows only the tasks in a shared list for Shared 13ms
       × shows the others for Not shared 4ms
       × ignores a stored Shared filter in local mode, also in the info line 3ms
 Test Files  1 failed | 2 passed (3)
      Tests  3 failed | 20 passed (23)
```

Command: `npx vitest run tests/unit/task-editor.test.js`, exit code 1

```text
     × shows a viewer every field read-only under a banner naming the list owner 12ms
     × lets a task editor change the task but not delete it 4ms
     × offers the task owner Delete task whatever the list role 4ms
 Test Files  1 failed (1)
      Tests  3 failed | 21 passed (24)
```

### Review round 1 rework
The rebase onto main (`1857838`) had stopped with conflicts in `views.css`, `index.html`, `service-worker.js`, and the hash manifest. I resolved them, bumped VERSION, and regenerated the manifest.
The reviewer also found that the Shared filter ignored lists shared with the user. The new tests failed first.

Command: `npx vitest run tests/unit/all-tasks.test.js tests/unit/permissions.test.js`, exit code 1

```text
     × counts a list the user shares with people and a list shared with the user 6ms
     × leaves out an owned list without people and a local list 1ms
       × shows the tasks in a list the user shares or that is shared with them for Shared 12ms
       × shows the others for Not shared 4ms
AssertionError: expected [ 'Plan trip' ] to deeply equal [ 'Plan trip', 'Their task' ]
AssertionError: expected [ 'Buy paint', 'Loose task', …(1) ] to deeply equal [ 'Buy paint', 'Loose task' ]
TypeError: isSharedList is not a function
 Test Files  2 failed (2)
```

Two e2e flakes also showed up under load. `sync.spec.js` failed once in a full run and passed alone, with no code change in between. The sharing spec asserted the service state before a role change had finished, so I made it wait for the status line. After that it passed 270 of 270 repeated runs.

### Green phase (after the final code change)
Command: `npm test`, exit code 0

```text
 Test Files  55 passed (55)
      Tests  1130 passed (1130)
   Start at  23:47:39
   Duration  14.30s (environment 62%, tests 25%, import 9%, transform 2%, worker 2%)

    Isolate  55 workers spawned · ~1.18s startup each (spawn + environment, per file)
             at least ~8.07s faster with isolate: false — reuses workers across files instead of one per file

exit=0
```

Command: `npm run lint`, exit code 0

```text

> todos-webapp@0.2.1-pre lint
> eslint .

exit=0
```

Command: `npm run check:sw`, exit code 0

```text
> node scripts/check-sw-version.mjs

OK: 72 precached files match VERSION 2026-11-07.28.
exit=0
```

Command: `npm run test:e2e`, exit code 0

```text
  ✓  183 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.3s)
  ✓  184 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.0s)

  184 passed (1.8m)
exit=0
```

### Visual verification
Captured with a temporary Playwright config (`shots.config.mjs`, `shots.spec.mjs`, kept here). It served the main checkout (before) and this worktree (after) on ports 8801 and 8802, started and stopped by Playwright.
The service was mocked on each app origin. Each of the 16 captures ran with zero console errors, page errors, failed requests, and HTTP 400+ responses.
Screens: the list editor (before: Edit list, after: Share list route) and the view options of All tasks, at 390 and 1440 px in light and dark.
The first after-capture of the list editor showed the Sharing section not scrolled into view and clipped role labels; both were fixed and recaptured.

Files are in `screenshots/`, named by phase, screen, width, and theme.
- [after, list editor, 1440 light](screenshots/after-list-editor-1440-light.png)
- [after, list editor, 390 light](screenshots/after-list-editor-390-light.png)
- [after, list editor, 390 dark](screenshots/after-list-editor-390-dark.png)
- [after, view options, 1440 dark](screenshots/after-view-options-1440-dark.png)
- [before, list editor, 1440 light](screenshots/before-list-editor-1440-light.png)
- [before, view options, 1440 light](screenshots/before-view-options-1440-light.png)
