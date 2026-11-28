## Walkthrough & Validation

### Failing tests before the implementation
Command: `npx vitest run tests/unit/occurrences.test.js tests/unit/store-db.test.js tests/unit/store-tasks.test.js tests/unit/queue.test.js tests/unit/merge.test.js`
Exit code: 1

```
Test Files  5 failed (5)
Tests  26 failed | 150 passed (176)
FAIL  occurrences.test.js > log events in the in-place fold and the former fold > folds a checked log and an undo-log in place like complete and uncomplete
FAIL  store-db.test.js > the version 6 event conversion > converts the shared migration vectors as the vectors say
FAIL  store-db.test.js > the version 6 event conversion > aborts and keeps version 5 when the in-place fold cannot reproduce the old fold
FAIL  store-tasks.test.js > log entries > writes complete and uncomplete as a checked log and an undo-log of the latest live check
FAIL  store-tasks.test.js > log entries > undoes an entry by its identifier, retroactively, and accepts a second undo
FAIL  queue.test.js > queued log entries > queues a log with its fields as one post-event, and an undo-log with its target
FAIL  merge.test.js > disconnecting > gives kept tasks local events that reproduce a status set on another device
[... 19 more failing tests omitted; causes: convertOccurrence, store.logEntry, and store.undoLog do not exist yet ...]
```

### Passing run after the implementation
Command: `npm test`
Exit code: 0

```
 Test Files  69 passed (69)
      Tests  1892 passed (1892)
```

Command: `npm run lint`
Exit code: 0

```
> todos-webapp@0.6.1-pre lint
> eslint .
```

Command: `npm run test:contract`
Exit code: 0

```
Contract tests skipped: set TODOS_SERVER_DIR to a todos checkout, such as TODOS_SERVER_DIR=../todos
 Test Files  1 skipped (1)
      Tests  22 skipped (22)
```
The contract tests need a todos server checkout and did not run.

### Rework after review round 1
Command: `npm test`
Exit code: 0

```
 Test Files  69 passed (69)
      Tests  1897 passed (1897)
```

Command: `npm run lint`
Exit code: 0

```
> todos-webapp@0.6.1-pre lint
> eslint .
```
New tests: `log entries in a backup` in backup.test.js and `rolling back queued log entries` in queue.test.js.
The red-phase output of round 1 was not kept verbatim; the new tests were written with the fixes and pass.

### Rework after review round 2
Failing first, with the fix reverted: `npx vitest run tests/unit/occurrences.test.js tests/unit/backup.test.js tests/unit/queue.test.js`
Exit code: 1

```
Test Files  3 failed (3)
Tests  4 failed | 184 passed (188)
FAIL  backup.test.js > mixed legacy and log histories in a backup > rebuilds time spent and live entries when the file holds a legacy completion beside a log
FAIL  occurrences.test.js > the log cache of mixed legacy and log histories > rebuilds time, live entries, and undos next to legacy completions
FAIL  occurrences.test.js > the log cache of mixed legacy and log histories > lets an uncomplete undo the latest legacy check, and drops an ignored one
FAIL  queue.test.js > rolling back a log beside legacy events > keeps the legacy check, drops the rejected time, and keeps the live entries
```

Command: `npm test`
Exit code: 0

```
 Test Files  69 passed (69)
      Tests  1901 passed (1901)
```

Command: `npm run lint`
Exit code: 0

```
> todos-webapp@0.6.1-pre lint
> eslint .
```
