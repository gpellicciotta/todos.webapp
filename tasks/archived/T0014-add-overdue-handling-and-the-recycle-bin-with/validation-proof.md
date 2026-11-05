## Walkthrough & Validation

### Red Phase
Command: `npx vitest run tests/unit/overdue.test.js tests/unit/bin.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/overdue.test.js (0 test)
 ❯ tests/unit/bin.test.js (20 tests | 20 failed) 50ms
   ❯ deleteList (6)
     × moves the list to the bin and hides it from listLists 18ms
     × keeps its tasks in their other lists, without changing their activity 2ms
     × leaves a task of only that list in no list 3ms
     × keeps the memberships stored but shows no tasks for the deleted list 1ms
     × rejects changes to the deleted list 2ms
     × fails with not-found for an unknown list 2ms
   ❯ deleteTask (3)
     × moves the task to the bin and hides it from every list and view 1ms
     × rejects edits, membership changes, and note changes until restored 2ms
     × fails with not-found for an unknown task 2ms
   ❯ restore (4)
     × brings back a task with all its memberships 1ms
     × brings back a list with all its memberships 1ms
     × restores within 30 days and rejects later restores as expired 1ms
     × rejects restoring an entry outside the bin, or an unknown one 1ms
   ❯ listBin (2)
     × lists deleted lists and tasks, newest deletion first, with their purge time 2ms
     × is empty when nothing is deleted 2ms
   ❯ purgeForever (3)
     × deletes a list and its memberships, never its tasks 1ms
     × deletes a task, its memberships, and its notes 2ms
     × rejects entries outside the bin, unknown entries, and unknown types 1ms
   ❯ purgeExpired (2)
     × removes entries deleted more than 30 days ago and keeps younger ones 1ms
     × uses the store clock by default 1ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/overdue.test.js [ tests/unit/overdue.test.js ]
Error: Cannot find module '../../src/js/core/overdue.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/overdue.test.js
[... 254 lines omitted ...]
      Tests  20 failed (20)
   Start at  02:39:42
   Duration  515ms (transform 37%, import 36%, tests 21%, worker 6%)
```

### Green Phase
Command: `npm test && npx eslint src/js tests/unit` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  8 passed (8)
      Tests  195 passed (195)
   Start at  02:41:06
   Duration  883ms (import 47%, tests 36%, transform 13%, worker 4%)
```

### Review Rework
The agent review found that `applyOverdueHandling` could cancel a task completed or deleted after its first read.
Each update now re-checks the stored task inside its transaction through `updateTask(..., { when })`.
The new test failed on the reviewed code (1 failed, 11 passed in tests/unit/overdue.test.js) and passes after the fix.
All 56 tests in overdue, store-tasks, and bin pass; ESLint is clean.
