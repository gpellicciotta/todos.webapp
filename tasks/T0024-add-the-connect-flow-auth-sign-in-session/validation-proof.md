## Walkthrough & Validation
`src/js/sync/auth.js` holds the Auth contract; docs/devops.md, Auth Integration, lists it with its sources.
Sign in opens Auth with `app-redirect-url={{app}}/#/connect`; Auth appends `?authorization-code=` to that hash.
`app.js` creates the session and calls `session.capture(window)` before routing, which strips the code from the address.
The connect screen finishes the return: callback redirect, `POST /api/auth-token` with Basic email and passcode, then `/api/users/me`.
A code counts only after a sign-in started on this device within 15 minutes; a crafted link shows "Sign-in did not finish."
A `403` from the exchange shows the invitation-only message and keeps the device local (`CON-3`).
`session.js` keeps `todos.session` in `localStorage`; an expired token is dropped, the account kept, and the state reads Sign in needed.
Settings shows Connect in local mode; connected, it names the account and server, hides the server URL field, and offers Disconnect.
Disconnect asks in a dialog; a `sync` hook adds Sync and disconnect with the pending count, for T0025 to supply.
Disconnect deletes the token first, then sends `DELETE /api/auth-token`, ignoring failures (`TEC-18`).
The service worker skips `/api/` requests too; VERSION is `2026-11-04.17`, and the precache hashes were regenerated.
The sync indicator keeps Local only; T0027 drives its states.
The work ran in a clean extract of `main` at a994e12, so outputs show that folder's path.

### Open Points
- **[Feedback Needed]** ToDo's sends CORS headers only in test mode; production needs them for the app origin.
- **[Feedback Needed]** The callback redirects to its own `/sign-in`; a JSON answer would suit a cross-origin client.
- **[Feedback Needed]** The callback turns Auth's `403` (no grant) into `401`, so uninvited users see the generic error today.
- **[Feedback Needed]** Auth must accept this app's `#/connect` address as `app-redirect-url` for `todos`.

### Mocking Note
Playwright does not intercept the request that a fulfilled redirect leads to; a probe confirmed it.
An early green run mocked the service at `https://todos.pellicciotta.com`, so the redirect follow-up left the machine.
Two such runs sent `GET https://todos.pellicciotta.com/sign-in?opc=123456&email=jane%40example.com`, with fake values and no token.
The tests now mock the service on the app's own origin, so a followed redirect lands on the local server.

### Red Phase
The tests ran before `auth.js`, `session.js`, and `connect.js` existed, with Connect still disabled.
After this run, connect.spec.js moved its service mock to the app origin, per the Mocking Note.

Command: `npx vitest run tests/unit/session.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t24work

 ❯ tests/unit/session.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/session.test.js [ tests/unit/session.test.js ]
Error: Cannot find module '../../src/js/sync/auth.js' imported from C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t24work/tests/unit/session.test.js
 ❯ tests/unit/session.test.js:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { AuthError, exchangeCode, readReturn, signInUrl } from '../../…
       | ^
      3| import { createSession } from '../../src/js/sync/session.js';
      4| import { freshStore } from './store-helpers.js';

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  21:57:59
   Duration  236ms (worker 97%, environment 3%)
```

Command: `E2E_PORT=8863 npx playwright test tests/e2e/connect.spec.js tests/e2e/bin-settings.spec.js` (exit code 1)

```text
[... 3 lines omitted ...]
  ok  4 [chromium] › tests\e2e\bin-settings.spec.js:119:1 › a theme that cannot be saved still applies, and a toast says so (1.2s)
  ok  1 [chromium] › tests\e2e\bin-settings.spec.js:103:1 › choosing Dark sets data-theme at once and keeps it after a reload (1.7s)
  ok  2 [chromium] › tests\e2e\bin-settings.spec.js:58:1 › restoring a task brings it back into its lists, with a toast linking to it (1.7s)
  ok  3 [chromium] › tests\e2e\bin-settings.spec.js:82:1 › Delete permanently asks in the row, Keep leaves the entry, and Delete removes it (2.0s)
  x   5 [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version (5.7s)
  x   6 [chromium] › tests\e2e\connect.spec.js:68:1 › local mode makes no network request outside the app origin (5.7s)
  x   9 [chromium] › tests\e2e\connect.spec.js:112:1 › a code that no sign-in on this device started is ignored (5.5s)
  x  10 [chromium] › tests\e2e\connect.spec.js:120:1 › disconnecting deletes the token and shows Local only (5.5s)
  x  11 [chromium] › tests\e2e\connect.spec.js:144:1 › an expired session asks to sign in again and keeps local work going (5.5s)
  x   7 [chromium] › tests\e2e\connect.spec.js:85:1 › a mocked Auth redirect returns to #/connect signed in (30.1s)
  x   8 [chromium] › tests\e2e\connect.spec.js:101:1 › an uninvited user sees that access is by invitation only, and stays local (30.1s)
[... 4 lines omitted ...]
    Error: expect(locator).toBeEnabled() failed

    Locator:  getByRole('button', { name: 'Connect', exact: true })
    Expected: enabled
[... 223 lines omitted ...]
  7 failed
    [chromium] › tests\e2e\bin-settings.spec.js:133:1 › Settings shows the local connection card, the server URL, the enabled backup actions, and the version 
    [chromium] › tests\e2e\connect.spec.js:68:1 › local mode makes no network request outside the app origin 
    [chromium] › tests\e2e\connect.spec.js:85:1 › a mocked Auth redirect returns to #/connect signed in 
    [chromium] › tests\e2e\connect.spec.js:101:1 › an uninvited user sees that access is by invitation only, and stays local 
    [chromium] › tests\e2e\connect.spec.js:112:1 › a code that no sign-in on this device started is ignored 
    [chromium] › tests\e2e\connect.spec.js:120:1 › disconnecting deletes the token and shows Local only 
    [chromium] › tests\e2e\connect.spec.js:144:1 › an expired session asks to sign in again and keeps local work going 
  4 passed (34.0s)
```

### Green Phase
Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/t24work


 Test Files  29 passed (29)
      Tests  574 passed (574)
   Start at  22:08:53
   Duration  17.87s (environment 69%, tests 13%, import 12%, transform 3%, worker 2%)

    Isolate  29 workers spawned · ~3.02s startup each (spawn + environment, per file)
             at least ~9.48s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx eslint .` (exit code 0, no output)

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 52 precached files match VERSION 2026-11-04.17.
```

Command: `E2E_PORT=8863 npx playwright test` (exit code 0)

```text

Running 109 tests using 4 workers

[... 99 lines omitted ...]
  ok 101 [chromium] › tests\e2e\shell.spec.js:199:1 › a newer app version in another tab shows a lasting banner with Reload (1.0s)
  ok 102 [chromium] › tests\e2e\shell.spec.js:223:1 › a start-up failure shows an error banner instead of a broken page (907ms)
  ok 103 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (2.1s)
  ok  74 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (20.8s)
  ok 104 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (2.2s)
  ok 105 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.3s)
  ok 106 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (2.0s)
  ok 109 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.0s)
  ok 107 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.3s)
  ok 108 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.7s)

  109 passed (1.2m)
```

### Visual Check
`node shots.mjs before|after`, a throwaway script, served `src/` in-process on port 8864 and mocked Auth and the service.
It captured `#/settings` and `#/connect` at 390 and 1440 px in light and dark themes, before and after.
After adds signed in, connected Settings, the disconnect dialog, sign in needed, and invitation only.
Expected console errors, two per run: the static server's `404` for the callback's `/sign-in` landing, and the `403` mock.

```text
in-process server (PID 12048) on port 8864
server HTTP 200
server closed
PROBLEMS:
390-light console: Failed to load resource: the server responded with a status of 404 (Not Found)
390-light console: Failed to load resource: the server responded with a status of 403 (Forbidden)
390-dark console: Failed to load resource: the server responded with a status of 404 (Not Found)
390-dark console: Failed to load resource: the server responded with a status of 403 (Forbidden)
1440-light console: Failed to load resource: the server responded with a status of 404 (Not Found)
1440-light console: Failed to load resource: the server responded with a status of 403 (Forbidden)
1440-dark console: Failed to load resource: the server responded with a status of 404 (Not Found)
1440-dark console: Failed to load resource: the server responded with a status of 403 (Forbidden)
```

- Before: [settings-390-light-before.png](screenshots/settings-390-light-before.png), [connect-1440-dark-before.png](screenshots/connect-1440-dark-before.png).
- After: [connect-signed-in-390-light-after.png](screenshots/connect-signed-in-390-light-after.png), [settings-connected-390-light-after.png](screenshots/settings-connected-390-light-after.png).
- After: [disconnect-dialog-390-dark-after.png](screenshots/disconnect-dialog-390-dark-after.png), [connect-uninvited-390-light-after.png](screenshots/connect-uninvited-390-light-after.png).
