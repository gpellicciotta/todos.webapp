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
