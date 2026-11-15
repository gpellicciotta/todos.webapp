## Walkthrough & Validation

### Summary
- Export writes format 2: tasks without parts, and top-level `lifecycle-rules`, `occurrences`, and `events`.
- Import reads formats 1 and 2; format 1 keeps the T0224 mapping.
- Format 2 import rebuilds occurrences by replaying rules and events (`replayEvents` in occurrences.js).
- **[Decided]** Import adds user events when backup events miss the exported current status, as connected exports can.
- Merge adds imported events by identifier; overwrite takes exactly the backup events.
- Connected import replays new tasks with `import: true`, first rules, and `event-id`, in time order.

### Red phase: unit tests before the implementation
Command: `npx vitest run tests/unit/backup.test.js` (exit code 1)

```text
⎯⎯⎯⎯⎯⎯ Failed Tests 37 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  37 failed | 50 passed (87)
 FAIL  tests/unit/backup.test.js > exportBackup > holds the version fields, lists, tasks, memberships with positions, notes, and bin entries
 FAIL  tests/unit/backup.test.js > exportBackup > writes tasks without their parts, and the rules, occurrences, and events as top-level arrays
 FAIL  tests/unit/backup.test.js > exportBackup > exports the past occurrences and roll-over events of a recurring task
 FAIL  tests/unit/backup.test.js > exportBackup > exports an empty store as empty arrays
 FAIL  tests/unit/backup.test.js > parseBackup > reads a version 2 file
[... 32 FAIL lines omitted ...]
BackupError: Unsupported backup format version 2; this app reads version 1.
```

### Red phase: e2e backup spec before the implementation
Command: `npx playwright test tests/e2e/backup.spec.js --reporter=line` (exit code 1)

```text
  1) [chromium] › tests\e2e\backup.spec.js:195:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it
  2) [chromium] › tests\e2e\backup.spec.js:255:1 › a target-3 task with two completions shows 2/3 after an export and an import into an empty app
    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 1
  2 failed
  9 passed (13.6s)
```

### Green: unit suite
Command: `npm test` (exit code 0)

```text
 Test Files  60 passed (60)
      Tests  1431 passed (1431)
```

Command: `npx vitest run tests/unit/backup.test.js` (exit code 0)

```text
 Test Files  1 passed (1)
      Tests  87 passed (87)
```

### Green: lint and service worker precache
Commands: `npm run lint` (exit code 0, no findings) and `npm run check:sw` (exit code 0)

```text
> todos-webapp@0.4.1-pre lint
> eslint .

OK: 128 precached files match VERSION 2026-11-15.14.
```

Mechanical command: `node scripts/check-sw-version.mjs --update` rewrote scripts/sw-precache-hashes.json after the VERSION bump.

### Green: contract suite against a local todos server
The sibling server's built jar dated from 2026-11-11, before its `import: true` routes (todos.server T0241).
A fresh build ran in the ignored `work/todos-server` clone of todos.server 9564bec, with `./gradlew :server:installDist`.

Command: `TODOS_SERVER_DIR=work/todos-server npx vitest run --config vitest.contract.config.js --reporter=verbose` (exit code 0)

```text
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > signs in through the Auth routes of the server 267ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > adopts local lists and tasks on first connect, merges same-named lists, and repeats without duplicates 875ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > uploads a note with its task on first connect 172ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > merges edits of two devices: different fields both survive, and the later edit of one field wins 418ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > ticks a target-3 task three times through events, and another device sees it completed 334ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > makes a task weekly, and the server computes the same period and counts its tick 207ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > replays a format 2 backup imported while connected, so the server rebuilds a target-3 task at 2 of 3 203ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > reverts an event the server refuses with 409 144ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > delivers a purged list as a tombstone 209ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > answers 410 to an expired cursor, and the client fetches a new snapshot 147ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > answers 426 to a client below the minimum version, and the client stops syncing 41ms
      Tests  11 passed (11)
```

### Green: full e2e suite
Command: `npm run test:e2e -- --reporter=line` (exit code 0)

```text
[32/210] [chromium] › tests\e2e\backup.spec.js:195:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it
[33/210] [chromium] › tests\e2e\backup.spec.js:215:1 › importing an export in Merge mode shows its counts, and Cancel changes nothing
[34/210] [chromium] › tests\e2e\backup.spec.js:235:1 › Overwrite updates the counts, and Import restores the missing task and bins the extra one
[35/210] [chromium] › tests\e2e\backup.spec.js:255:1 › a target-3 task with two completions shows 2/3 after an export and an import into an empty app
[36/210] [chromium] › tests\e2e\backup.spec.js:297:1 › an invalid file shows its reason, keeps Import disabled, and changes nothing
[37/210] [chromium] › tests\e2e\backup.spec.js:350:1 › connected, a merge import queues its changes, shows Syncing then Synced, and drains the queue
[... 172 progress lines omitted ...]
  210 passed (2.2m)
```

## Review Round 1 Rework

### Fixes
- Rule-edit replay settles on the exported rules with one more `edit-lifecycle-rules` event, at least 1 ms after the last rule edit.
- Overwrite rebuilds a task whose fields and rules match but whose events or occurrences differ.
- Events written anew take deterministic UUIDv7 identifiers, so a second import of the same file changes nothing.
- `checkDetails` validates the `old` and `new` rule values with the rule checks, naming paths such as `events[2].details.timezone.new`.
- An ended recurring series closes with `end-recurrence`; only a series cancelled before its period end gets a user `cancel`.

### Red phase: new unit tests on the round 1 code (14dde2b sources)
Command: `npx vitest run tests/unit/backup.test.js` with `src/js/core/backup.js` and `occurrences.js` from 14dde2b (exit code 1)

```text
     × rejects a version 2 file with a rule edit to a target count of 0 12ms
     × rejects a version 2 file with a rule edit from an unknown overdue handling 1ms
     × rejects a version 2 file with a rule edit to an unknown recurrence unit 1ms
     × rejects a version 2 file with a rule edit to an interval of 100 1ms
     × rejects a version 2 file with a rule edit to an unknown timezone 1ms
     × rejects a version 2 file with a rule edit to a due time that is no UTC time 1ms
     × rejects a version 2 file with a rule edit to an impossible end date 1ms
     × reaches the exported rules when the rule edits miss a later change, with an edit event at the last update 7ms
     × never lets older local rule edits override the rules of a newer backup task 3ms
     × closes a series that ended met, as completed with end-recurrence, never with a user cancel 5ms
     × closes a series that ended unmet, as cancelled with end-recurrence, never with a user cancel 5ms
     × cancels a series that the user cancelled before its period ended 3ms
     × rebuilds a task whose fields and rules match the backup but whose events or occurrences differ 4ms
     × replays the rules that a partial rule history misses as one more rule edit, so the service reaches them 3ms
      Tests  14 failed | 88 passed (102)
```

The re-import stability test passed on the round 1 code, since that overwrite never compared events; it now guards the deterministic identifiers.
The settle-time test failed on the first rework commit (44f28ce), before the 1 ms rule:

```text
     × gives the settling rule edit a time after the last logged rule edit, since the service merges rules by edit time 68ms
-     "2026-11-01T10:00:00.001Z",
+     "2026-11-01T10:00:00.000Z",
```

### Red phase: new contract tests on the round 1 code
Command: `TODOS_SERVER_DIR=work/todos-server npx vitest run --config vitest.contract.config.js -t "partial rule history|ended daily"` (exit code 1)

```text
 × ... replays a partial rule history with one more rule edit, so the server reaches the exported rules 367ms
 × ... replays ended daily series without a user cancel, and the server closes them with end-recurrence 122ms
AssertionError: expected 3 to be 5 // Object.is equality
AssertionError: expected [ [ …(2) ], [ …(2) ] ] to deeply equal [ [ …(2) ] ]
      Tests  2 failed | 11 skipped (13)
```

### Green: all suites at 0e87bc9
Commands: `npm test`, `npm run lint`, `npm run check:sw`, the contract suite, and `npm run test:e2e` (each exit code 0)

```text
 Test Files  60 passed (60)
      Tests  1447 passed (1447)
OK: 128 precached files match VERSION 2026-11-15.15.
 ✓ replays a format 2 backup imported while connected, so the server rebuilds a target-3 task at 2 of 3 151ms
 ✓ replays a partial rule history with one more rule edit, so the server reaches the exported rules 119ms
 ✓ replays ended daily series without a user cancel, and the server closes them with end-recurrence 179ms
[... 10 other passing contract tests omitted ...]
      Tests  13 passed (13)
  210 passed (2.2m)
```

`npm run lint` printed no findings.

### Merge of main after T0237
The manager merged main into the task branch before review round 2, since T0237 landed meanwhile.
- `CHANGELOG.md` keeps both sides; T0237's bullet comes first.
- Both sides set VERSION `2026-11-15.15` with different files, so VERSION became `2026-11-15.16`.
- Mechanical command: `node scripts/check-sw-version.mjs --update` regenerated `scripts/sw-precache-hashes.json`.

Commands: `npx eslint .` (exit code 0, no output) and `node scripts/check-sw-version.mjs` (exit code 0)
```text
OK: 128 precached files match VERSION 2026-11-15.16.
```

Command: `npx vitest run` (exit code 0)
```text
 Test Files  60 passed (60)
      Tests  1472 passed (1472)
```

Command: `E2E_PORT=8795 npx playwright test` (exit code 0)
```text
  ok 211 [chromium] › tests\e2e\task-editor.spec.js:326:3 › note links in local mode › a note on a daily task shows on its occurrence in the history, and can be made global (4.1s)

  211 passed (2.3m)
```

Command: `TODOS_SERVER_DIR=work/todos-server npx vitest run --config vitest.contract.config.js --reporter=verbose` (exit code 0)
```text
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > posts a note linked to its occurrence, then makes it global and links it again 227ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > replays a partial rule history with one more rule edit, so the server reaches the exported rules 121ms
 ✓ tests/contract/sync.contract.test.js > the sync client against a real todos server > replays ended daily series without a user cancel, and the server closes them with end-recurrence 175ms
[... 12 more passing tests omitted ...]
      Tests  15 passed (15)
```

## Post-Merge Verification
The orchestrator merged main (T0237) into the branch as 2ea366d; the size of 12 files and 1695 lines was approved by giova.

Commands: `npm test`, `npm run lint`, `npm run check:sw`, `TODOS_SERVER_DIR=work/todos-server npx vitest run --config vitest.contract.config.js`, and `npm run test:e2e` (each exit code 0)

```text
 Test Files  60 passed (60)
      Tests  1472 passed (1472)
OK: 128 precached files match VERSION 2026-11-15.16.
      Tests  15 passed (15)
  211 passed (3.2m)
```

`npm run lint` printed no findings.
