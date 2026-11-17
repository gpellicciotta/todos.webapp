## Walkthrough & Validation

### Key Changes
- `bin.deleteAllData` saves `pending-erase` `{time, account}` in the same transaction in local mode.
- `pull.disconnect` saves `last-account` and turns a queued `erase` entry into `pending-erase`.
- `adopt.settlePendingErase` runs before adoption: erases the matching account, or returns the pending erase to ask.
- `push` publishes the new `question` sync state and uploads nothing until the answer.
- Settings asks in place with Keep and Erase; the sync indicator shows "Waiting for your answer".
- Undeclared files: `src/js/sync/push.js`, `src/js/sync/engine.js` (doc line), `src/js/views/sync-indicator.js`,
  `tests/unit/bin.test.js`, `src/service-worker.js`, and `scripts/sw-precache-hashes.json`.
- Mechanical command: `node scripts/check-sw-version.mjs --update`
- Mechanical files: scripts/sw-precache-hashes.json

### Screenshots
- Before: [erase-question-before.png](erase-question-before.png), captured on base commit `30be458` in a temporary worktree.
  The flow: local Delete all data on a never-connected device, add a task, sign in.
  The old code asked nothing, sent no erase, and kept the old account task.
  Spec: [before-shot.spec.js](before-shot.spec.js); `npx playwright test tests/e2e/before-shot.spec.js`, exit code 0, `1 passed (4.3s)`.
- After, light: [erase-question-after-light.png](erase-question-after-light.png)
- After, dark: [erase-question-after-dark.png](erase-question-after-dark.png)

### Failing tests before the implementation
`npx vitest run tests/unit/bin.test.js tests/unit/pull.test.js tests/unit/adopt.test.js tests/unit/settings.test.js`, exit code 1:

```text
 ❯ tests/unit/pull.test.js (19 tests | 3 failed) 197ms
     × saves the account as the last account, which outlives the disconnect 13ms
     × takes the last account from an unfinished adoption when no adoption finished 2ms
     × turns a queued erase into a pending erase with the entry time and the account 11ms
 ❯ tests/unit/adopt.test.js (19 tests | 6 failed) 507ms
     × erases the same account before adoption, with before set to the saved time 17ms
     × asks before erasing another account, and uploads nothing until the answer 11ms
     × asks on a device never connected 6ms
     × erases after Erase, which names the connected account 8ms
     × keeps the pending erase and stops before adoption when the erase fails 3ms
     × drops a refused erase with a sync error, then adopts 5ms
 ❯ tests/unit/bin.test.js (51 tests | 3 failed) 456ms
     × saves a pending erase with its time and the last account in local mode 50ms
     × saves a pending erase without an account on a device never connected 7ms
     × replaces the time and keeps the account of an earlier pending erase 17ms
 ❯ tests/unit/settings.test.js (51 tests | 4 failed) 980ms
     × asks in place, with the date and the email, before anything uploads 12ms
     × Keep drops the pending erase, syncs, and the question goes 4ms
     × Erase names the connected account in the pending erase, then syncs 4ms
     × keeps the question with a toast when the answer cannot be saved 5ms
AssertionError: expected -1 to be greater than or equal to 0
AssertionError: expected 'synced' to be 'paused' // Object.is equality
AssertionError: expected null to deeply equal { …(2) }
AssertionError: expected 'Signed in as Jane Doe (jane@example.c…' to contain 'You deleted all data on this device o…'
TypeError: Cannot read properties of undefined (reading 'click')
 Test Files  4 failed (4)
      Tests  16 failed | 124 passed (140)
```

### Task unit tests after the implementation
Same command, exit code 0:

```text
 Test Files  4 passed (4)
      Tests  140 passed (140)
   Duration  2.36s (tests 48%, environment 26%, import 16%, transform 8%, setup 1%, worker 1%)
```

### Full unit suite
`npm test`, exit code 0:

```text
 Test Files  65 passed (65)
      Tests  1720 passed (1720)
   Duration  18.98s (tests 43%, environment 43%, import 8%, transform 4%, worker 1%, setup 1%)
```

### Contract suite
`TODOS_SERVER_DIR=<workspace>/todos.server npm run test:contract`, exit code 0:

```text
 Test Files  1 passed (1)
      Tests  21 passed (21)
   Duration  5.69s (tests 96%, import 2%, transform 1%)
```

### Connect e2e spec
`npx playwright test tests/e2e/connect.spec.js --reporter=line`, exit code 0:

```text
[9/12] [chromium] › tests\e2e\connect.spec.js:248:1 › a local Delete all data erases the last account on the next connect, before the new local data uploads
[10/12] [chromium] › tests\e2e\connect.spec.js:269:1 › connecting a device never connected asks before erasing, and Keep leaves the account alone
[11/12] [chromium] › tests\e2e\connect.spec.js:290:1 › Erase in the connect question erases the account before the local data uploads
[12/12] [chromium] › tests\e2e\connect.spec.js:303:1 › an expired session asks to sign in again and keeps local work going
  12 passed (18.0s)
```

### Full e2e suite
`npx playwright test --reporter=line`, exit code 1 with one failure in an untouched gallery spec:

```text
  1) [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus 
ring at 1440 px 
    Error: browserContext.close: Target page, context or browser has been closed
  1 failed
  249 passed (4.5m)
```

`npx playwright test tests/e2e/gallery-controls.spec.js --reporter=line`, exit code 0.
The failure's cause is unconfirmed; it did not reproduce alone, and this task changes no gallery code:

```text
  14 passed (26.2s)
```

### Lint and service worker check
`npx eslint .` printed nothing, exit code 0. `npm run check:sw`, exit code 0:

```text
OK: 131 precached files match VERSION 2026-11-17.23.
```

### Review round 1 rework (D1: a refused erase must stay)
`settlePendingErase` now throws on a refusal, so `pending-erase` stays and adoption never starts.
The reworked test failed first, `npx vitest run tests/unit/adopt.test.js`, exit code 1:

```text
 ❯ tests/unit/adopt.test.js (19 tests | 1 failed) 282ms
     × keeps a refused erase, stops before adoption, and erases before adoption on a later try 21ms
AssertionError: expected 'synced' to be 'retry' // Object.is equality
      Tests  1 failed | 18 passed (19)
```

After the fix, `npx vitest run tests/unit/adopt.test.js tests/unit/push.test.js tests/unit/engine.test.js`, exit code 0:

```text
      Tests  68 passed (68)
```

`npm test`, exit code 0:

```text
 Test Files  65 passed (65)
      Tests  1720 passed (1720)
```

`npx playwright test tests/e2e/connect.spec.js --reporter=line`, exit code 0:

```text
  12 passed (14.8s)
```

`TODOS_SERVER_DIR=<workspace>/todos.server npm run test:contract`, exit code 0:

```text
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

`npx eslint .`, exit code 0 with no output. `npm run check:sw`, exit code 0:

```text
OK: 131 precached files match VERSION 2026-11-17.24.
```
