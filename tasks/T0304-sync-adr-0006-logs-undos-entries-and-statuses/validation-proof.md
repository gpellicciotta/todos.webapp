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