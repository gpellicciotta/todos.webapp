## Walkthrough & Validation

Changes: pulled tasks read goal-target and progress, and store entries as events; requests send goal-target; contract tests cover logs, undos, aliases, and rejected undos.

### Red phase
Command: npx vitest run tests/unit/merge.test.js (before the merge.js change), exit code 1
```text
 ❯ tests/unit/merge.test.js (34 tests | 4 failed) 53ms
     × reads the goal, progress, and time spent that the service sends instead of the former counts 15ms
     × stores the entries of a pulled occurrence as events, so they can be undone and refolded 1ms
     × drops stored entries that another device undid, and keeps the queued ones 2ms
     × lists an entry of an unknown type without failing, and stores only log entries 1ms
```
Command: npx vitest run tests/unit/pull.test.js tests/unit/merge.test.js (merge.js reverted), exit code 1
```text
 ❯ tests/unit/pull.test.js (20 tests | 6 failed) 101ms
     × stores the pulled entries as events, undoes one locally, and drops one that another device undid 11ms
 Test Files  2 failed (2)
      Tests  10 failed | 44 passed (54)
```
Command: npx vitest run tests/unit/push.test.js tests/unit/adopt.test.js (before the push.js change), exit code 1
```text
 ❯ tests/unit/adopt.test.js (19 tests | 1 failed) 217ms
 ❯ tests/unit/push.test.js (39 tests | 4 failed) 464ms
     × sends a goal change as goal-target, with its edit time
     × replays a change queued before the upgrade through the goal-target key
     × applies a kept goal-target of a conflict to the local target count
AssertionError: expected { 'target-count': 3, …(7) } to match object { 'goal-target': 3 }
```
Command: npx vitest run --config vitest.contract.config.js (before any change, TODOS_SERVER_DIR=C:/Dev-Projects/todos.server), exit code 1
```text
 ❯ tests/contract/sync.contract.test.js (23 tests | 16 failed) 4936ms
     × adopts local lists and tasks on first connect, merges same-named lists, and repeats without duplicates 408ms
     × ticks a target-3 task three times through events, and another device sees it completed 195ms
```

### Green phase
Command: npx vitest run tests/unit/merge.test.js tests/unit/pull.test.js tests/unit/push.test.js tests/unit/adopt.test.js, exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  4 passed (4)
      Tests  112 passed (112)
   Start at  05:45:54
   Duration  1.17s (tests 53%, import 29%, transform 13%, setup 2%, worker 2%)
```
Command: npx vitest run --config vitest.contract.config.js (TODOS_SERVER_DIR=C:/Dev-Projects/todos.server), exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  05:45:57
   Duration  8.55s (tests 97%, import 2%, transform 1%)
```
Command: npx vitest run, exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  72 passed (72)
      Tests  2020 passed (2020)
   Start at  05:46:07
   Duration  20.59s (tests 51%, environment 37%, import 9%, transform 2%, worker 1%, setup 1%)
    Isolate  72 workers spawned · ~924ms startup each (spawn + environment, per file)
             at least ~8.58s faster with isolate: false — reuses workers across files instead of one per file
```
Command: npm run lint, exit code 0
```text
> todos-webapp@0.6.1-pre lint
> eslint .
```
### Review round 1 rework: queued logs and undos on a pulled occurrence
Command: npx vitest run tests/unit/merge.test.js (merge.js at the reviewed commit), exit code 1
```text
 ❯ tests/unit/merge.test.js (38 tests | 4 failed) 81ms
       × keeps the time of a queued unchecked log, and does not count it as a check 19ms
       × takes a queued undo of a pulled entry by what the entry gave, and applies a duplicate undo once 2ms
       × undoes only the time of an entry that gave time and no check 3ms
       × sums a queued amount log on an amount goal 2ms
      Tests  4 failed | 34 passed (38)
```
Command: npx vitest run tests/unit/merge.test.js tests/unit/pull.test.js, exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  2 passed (2)
      Tests  58 passed (58)
   Start at  05:52:00
   Duration  507ms (import 37%, tests 34%, transform 21%, setup 5%, worker 3%)
```
Command: npx vitest run, exit code 0
```text
 Test Files  72 passed (72)
      Tests  2024 passed (2024)
   Start at  05:52:02
   Duration  27.23s (tests 46%, environment 42%, import 8%, transform 2%, worker 1%, setup 1%)
    Isolate  72 workers spawned · ~1.35s startup each (spawn + environment, per file)
             at least ~12.58s faster with isolate: false — reuses workers across files instead of one per file
```
Command: npx vitest run --config vitest.contract.config.js (TODOS_SERVER_DIR=C:/Dev-Projects/todos.server), exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  05:52:32
   Duration  8.29s (tests 96%, import 3%, transform 1%)
```
Command: npm run lint, exit code 0
```text
> eslint .
```
### Review round 2 rework: a log in both the feed and the queue counts once
Command: npx vitest run tests/unit/merge.test.js (before the deduplication), exit code 1
```text
 ❯ tests/unit/merge.test.js (39 tests | 1 failed) 43ms
       × counts a log once when the feed lists it and the queue still holds it 13ms
AssertionError: expected { occurrence: 1, …(12) } to match object { progress: 2, …(1) }
```
Command: npx vitest run, exit code 0
```text
 Test Files  72 passed (72)
      Tests  2025 passed (2025)
   Start at  05:55:10
   Duration  22.52s (tests 50%, environment 38%, import 9%, transform 2%, worker 1%, setup 1%)
    Isolate  72 workers spawned · ~1.02s startup each (spawn + environment, per file)
             at least ~9.49s faster with isolate: false — reuses workers across files instead of one per file
```
Command: npx vitest run --config vitest.contract.config.js (TODOS_SERVER_DIR=C:/Dev-Projects/todos.server), exit code 0
```text
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  05:55:35
   Duration  7.67s (tests 96%, import 2%, transform 2%)
```
Command: npm run lint, exit code 0
```text
> eslint .
```