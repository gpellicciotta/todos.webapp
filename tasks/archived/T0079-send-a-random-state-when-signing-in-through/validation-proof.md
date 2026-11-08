# T0079 Validation Proof

## Walkthrough & Validation
All output is verbatim from the terminal, taken in the task worktree on branch `task/T0079-send-a-random-state-when-signing-in-through`.
Long output keeps its failure details and final summary; each cut is marked with an omission line.
The raw captures are in the `evidence/` directory next to this file.

Summary of the change:
- `signInUrl` adds `app-state`; `readReturn` reads `state`; `randomState` makes 16 random bytes as base64url.
- `session.start` stores the state with the pending sign-in; `session.complete(code, state)` rejects a missing or different state with `state-mismatch` before any request, and uses up the pending sign-in.
- The connect screen shows a message for `state-mismatch`.

External dependency: Auth must return `state` on every redirect to the app.
Auth T0206 does it for social sign-in; Auth T0215 still has to do it for password, OTP, and cookie sign-in, which are rejected until then.
The contract suite uses an Auth stand-in, so no check here covers the real Auth redirects.

## Red phase
The new tests ran against the unchanged `src/` of the base commit `0974b7c` (`git checkout 0974b7c -- src`, restored afterwards).

### Unit tests without the implementation
Command: `npx vitest run tests/unit/session.test.js`
Exit code: 1

```text
[... 25 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/session.test.js > the Auth adapter > adds the state to the sign-in URL only when there is one
AssertionError: expected null to be 'a b&c' // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/session.test.js > the Auth adapter > reads the code or the error that Auth appends to the connect route, and nothing else
AssertionError: expected { code: 'a+b' } to deeply equal { code: 'a+b', state: null }
[... 19 lines omitted ...]
 FAIL  tests/unit/session.test.js > the session > sends a random state, a new one for each sign-in
TypeError: .toMatch() expects to receive a string, but got object
[... 10 lines omitted ...]
 FAIL  tests/unit/session.test.js > the session > rejects a callback whose state is missing or differs, sends nothing, and uses the state once
AssertionError: promise resolved "{ name: 'Jane Doe', …(2) }" instead of rejecting
[... 22 lines omitted ...]
 FAIL  tests/unit/session.test.js > the session > captures the returned code from the address and strips it before routing
AssertionError: promise resolved "{ name: 'Jane Doe', …(2) }" instead of rejecting
[... 23 lines omitted ...]
 Test Files  1 failed (1)
      Tests  5 failed | 13 passed (18)
[... 3 lines omitted ...]
```

## Green phase
Run on the committed work, after the final code change.

### Unit tests
Command: `npm test`
Exit code: 0

```text
[... 8 lines omitted ...]
 Test Files  55 passed (55)
      Tests  1134 passed (1134)
   Start at  00:10:03
   Duration  11.12s (environment 60%, tests 28%, import 9%, transform 1%, worker 1%)

    Isolate  55 workers spawned · ~911ms startup each (spawn + environment, per file)
             at least ~6.25s faster with isolate: false — reuses workers across files instead of one per file

```

### Lint
Command: `npm run lint`
Exit code: 0

```text

> todos-webapp@0.2.1-pre lint
> eslint .

```

### Service worker version
Command: `npm run check:sw`
Exit code: 0

```text

> todos-webapp@0.2.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 72 precached files match VERSION 2026-11-08.1.
```

### Whitespace check
Command: `git diff --check main...HEAD`
Exit code: 0

```text

```

### Contract tests against the real server routes
Command: `TODOS_SERVER_DIR=C:/Dev-Projects/todos npm run test:contract`
Exit code: 0

```text
[... 5 lines omitted ...]
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0079-send-a-random-state-when-signing-in-through


 Test Files  1 passed (1)
      Tests  6 passed | 1 expected fail (7)
   Start at  00:10:20
   Duration  5.12s (tests 96%, import 2%, transform 1%)

```

### Connect end-to-end tests
Command: `npx playwright test tests/e2e/connect.spec.js`
Exit code: 0

```text

Running 7 tests using 4 workers

  ✓  4 [chromium] › tests\e2e\connect.spec.js:115:1 › a code that no sign-in on this device started is ignored (1.3s)
  ✓  1 [chromium] › tests\e2e\connect.spec.js:72:1 › local mode makes no network request outside the app origin (1.7s)
  ✓  2 [chromium] › tests\e2e\connect.spec.js:104:1 › an uninvited user sees that access is by invitation only, and stays local (2.0s)
  ✓  3 [chromium] › tests\e2e\connect.spec.js:88:1 › a mocked Auth redirect returns to #/connect signed in (2.3s)
  ✓  5 [chromium] › tests\e2e\connect.spec.js:123:1 › a return whose state differs from the one sent is rejected before any request (1.5s)
  ✓  6 [chromium] › tests\e2e\connect.spec.js:140:1 › disconnecting deletes the token and shows Local only (1.7s)
  ✓  7 [chromium] › tests\e2e\connect.spec.js:164:1 › an expired session asks to sign in again and keeps local work going (1.4s)

  7 passed (5.1s)
```

## Full end-to-end suite and the flaky connect test
The first full run failed in `connect.spec.js:88`: the first sync pull adds a second `GET /api/users/me` to the recorded calls.
The failure does not touch the state check; the sign-in calls and the signed-in result are correct.
The unchanged base commit fails the same way in 1 of 3 full runs (below), so it predates T0079.
Backlog task T0080 covers the fix.

### Full suite with the change, run 1 (failed)
Command: `npx playwright test`
Exit code: 1

```text
[... 162 lines omitted ...]
  ✓  159 [chromium] › tests\e2e\shell.spec.js:123:3 › the compact user button names Local User and opens Recycle bin and Settings (1.5s)
  ✓  160 [chromium] › tests\e2e\shell.spec.js:123:3 › the wide user button names Local User and opens Recycle bin and Settings (1.2s)
  ✓  162 [chromium] › tests\e2e\shell.spec.js:171:3 › the narrow panel stays aligned with the button for a long name (995ms)
  ✓  163 [chromium] › tests\e2e\shell.spec.js:171:3 › the desktop panel stays aligned with the button for a long name (988ms)
  ✓  164 [chromium] › tests\e2e\shell.spec.js:190:1 › a connected account shows its initials and name, and Connected in the panel (1.4s)
  ✓  165 [chromium] › tests\e2e\shell.spec.js:213:1 › an expired session shows a banner with Sign in that opens the connect screen (1.7s)
  ✓  168 [chromium] › tests\e2e\shell.spec.js:290:1 › the n and / shortcuts focus the add bar and search once a view has them (986ms)
  ✓  167 [chromium] › tests\e2e\shell.spec.js:275:1 › an unknown route or list opens All tasks with a toast naming it (1.4s)
  ✓  166 [chromium] › tests\e2e\shell.spec.js:229:1 › every route renders its title and its view, and the sidebar follows the lists (2.2s)
  ✓  169 [chromium] › tests\e2e\shell.spec.js:311:1 › Escape closes an open editor route (891ms)
  ✓  172 [chromium] › tests\e2e\shell.spec.js:358:1 › a start-up failure shows an error banner instead of a broken page (738ms)
  ✓  170 [chromium] › tests\e2e\shell.spec.js:318:1 › the theme follows the system by default and a stored preference pins it (1.3s)
  ✓  171 [chromium] › tests\e2e\shell.spec.js:334:1 › a newer app version in another tab shows a lasting banner with Reload (1.3s)
  ✓  173 [chromium] › tests\e2e\sync.spec.js:91:1 › local mode shows Local only and a Connect link in the popover (1.1s)
  ✓  174 [chromium] › tests\e2e\sync.spec.js:100:1 › going offline with pending changes shows Offline · n pending, and going online syncs them (1.7s)
  ✓  176 [chromium] › tests\e2e\sync.spec.js:128:1 › an overwritten value shows the dot; opening the Sync log clears it and lists the entry (2.0s)
  ✓  175 [chromium] › tests\e2e\sync.spec.js:114:1 › a failing service shows Sync error with Retry in the popover (2.1s)
  ✓  177 [chromium] › tests\e2e\sync.spec.js:150:1 › a 426 reply shows Update required; Check for update requests a worker update (2.1s)
  ✓  178 [chromium] › tests\e2e\sync.spec.js:170:1 › an expired session shows Sign in needed and a banner with Sign in (1.3s)
  ✓  180 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.5s)
  ✓  179 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.6s)
  ✓  181 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.7s)
  ✓  182 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (1.7s)
  ✓  183 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.6s)
  ✓  184 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.8s)
  ✓  185 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.1s)
[... 2 lines omitted ...]
  1) [chromium] › tests\e2e\connect.spec.js:88:1 › a mocked Auth redirect returns to #/connect signed in
[... 1 lines omitted ...]
    Error: expect(received).toEqual(expected) // deep equality
[... 1 lines omitted ...]
    - Expected  - 0
    + Received  + 1
[... 2 lines omitted ...]
        "GET /api/auth-token/callback",
        "POST /api/auth-token",
        "GET /api/users/me",
    +   "GET /api/users/me",
[... 21 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\connect.spec.js:88:1 › a mocked Auth redirect returns to #/connect signed in
  184 passed (1.7m)
```

### Full suite with the change, run 2 (passed)
Command: `npx playwright test`
Exit code: 0

```text
[... 187 lines omitted ...]
  ✓  184 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.7s)

  185 passed (1.8m)
```

### Full suite on the base commit, run 1 (passed)
Command: `npx playwright test  # after git checkout 0974b7c -- src tests`
Exit code: 0

```text
[... 186 lines omitted ...]
  ✓  183 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.3s)

  184 passed (1.6m)
```

### Full suite on the base commit, run 2 (failed the same way)
Command: `npx playwright test  # after git checkout 0974b7c -- src tests`
Exit code: 1

```text
[... 161 lines omitted ...]
  ✓  160 [chromium] › tests\e2e\shell.spec.js:156:1 › the bottom bar spreads its two destinations over the full width (1.2s)
  ✓  158 [chromium] › tests\e2e\shell.spec.js:123:3 › the compact user button names Local User and opens Recycle bin and Settings (1.9s)
  ✓  161 [chromium] › tests\e2e\shell.spec.js:171:3 › the narrow panel stays aligned with the button for a long name (1.1s)
  ✓  162 [chromium] › tests\e2e\shell.spec.js:171:3 › the desktop panel stays aligned with the button for a long name (987ms)
  ✓  164 [chromium] › tests\e2e\shell.spec.js:213:1 › an expired session shows a banner with Sign in that opens the connect screen (1.1s)
  ✓  163 [chromium] › tests\e2e\shell.spec.js:190:1 › a connected account shows its initials and name, and Connected in the panel (1.4s)
  ✓  166 [chromium] › tests\e2e\shell.spec.js:275:1 › an unknown route or list opens All tasks with a toast naming it (979ms)
  ✓  165 [chromium] › tests\e2e\shell.spec.js:229:1 › every route renders its title and its view, and the sidebar follows the lists (1.9s)
  ✓  167 [chromium] › tests\e2e\shell.spec.js:290:1 › the n and / shortcuts focus the add bar and search once a view has them (1.1s)
  ✓  168 [chromium] › tests\e2e\shell.spec.js:311:1 › Escape closes an open editor route (1.1s)
  ✓  171 [chromium] › tests\e2e\shell.spec.js:358:1 › a start-up failure shows an error banner instead of a broken page (754ms)
  ✓  170 [chromium] › tests\e2e\shell.spec.js:334:1 › a newer app version in another tab shows a lasting banner with Reload (1.1s)
  ✓  169 [chromium] › tests\e2e\shell.spec.js:318:1 › the theme follows the system by default and a stored preference pins it (1.5s)
  ✓  172 [chromium] › tests\e2e\sync.spec.js:91:1 › local mode shows Local only and a Connect link in the popover (2.2s)
  ✓  173 [chromium] › tests\e2e\sync.spec.js:114:1 › a failing service shows Sync error with Retry in the popover (1.6s)
  ✓  175 [chromium] › tests\e2e\sync.spec.js:128:1 › an overwritten value shows the dot; opening the Sync log clears it and lists the entry (1.8s)
  ✓  174 [chromium] › tests\e2e\sync.spec.js:100:1 › going offline with pending changes shows Offline · n pending, and going online syncs them (2.1s)
  ✓  177 [chromium] › tests\e2e\sync.spec.js:170:1 › an expired session shows Sign in needed and a banner with Sign in (1.1s)
  ✓  176 [chromium] › tests\e2e\sync.spec.js:150:1 › a 426 reply shows Update required; Check for update requests a worker update (1.5s)
  ✓  178 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 390 px (1.6s)
  ✓  179 [chromium] › tests\e2e\task-editor.spec.js:64:3 › the editor opens from a row with focus on the description, and Escape returns to the row at 1440 px (1.6s)
  ✓  180 [chromium] › tests\e2e\task-editor.spec.js:87:1 › every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7) (2.2s)
  ✓  181 [chromium] › tests\e2e\task-editor.spec.js:122:1 › typing a due date by keyboard saves nothing until focus leaves the due fields (2.9s)
  ✓  182 [chromium] › tests\e2e\task-editor.spec.js:149:1 › the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8) (2.4s)
  ✓  184 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.0s)
  ✓  183 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.0s)
[... 2 lines omitted ...]
  1) [chromium] › tests\e2e\connect.spec.js:87:1 › a mocked Auth redirect returns to #/connect signed in
[... 1 lines omitted ...]
    Error: expect(received).toEqual(expected) // deep equality
[... 1 lines omitted ...]
    - Expected  - 0
    + Received  + 1
[... 2 lines omitted ...]
        "GET /api/auth-token/callback",
        "POST /api/auth-token",
        "GET /api/users/me",
    +   "GET /api/users/me",
[... 21 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\connect.spec.js:87:1 › a mocked Auth redirect returns to #/connect signed in
  183 passed (1.6m)
```

### Full suite on the base commit, run 3 (passed)
Command: `npx playwright test  # after git checkout 0974b7c -- src tests`
Exit code: 0

```text
[... 186 lines omitted ...]
  ✓  184 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (1.8s)

  184 passed (1.7m)
```
