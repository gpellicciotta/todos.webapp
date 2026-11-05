## Walkthrough & Validation

### Red Phase

Command: `npx vitest run tests/unit/fractional-index.test.js tests/unit/query.test.js tests/unit/store-tasks.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/fractional-index.test.js (0 test)
 ❯ tests/unit/query.test.js (0 test)
 ❯ tests/unit/store-tasks.test.js (39 tests | 15 failed) 147ms
   ❯ manual order (14)
     × appends created and added tasks after the last task of the list 14ms
     × appends after the last task by position, not by added time 3ms
     × moves a task before or after a neighbor 5ms
     × changes only the moved membership and leaves other lists unchanged 4ms
     × updates the last activity time of the moved task, not its last update time 3ms
     × rejects both neighbors 7ms
     × rejects no neighbor 4ms
     × rejects the task itself as neighbor 3ms
     × rejects a neighbor outside the list 2ms
     × rejects a neighbor that is a member of another list only 2ms
     × fails when the task is not in the list 3ms
     × rebalances the list when the new position would exceed 128 characters 3ms
     × rebalances the list when the neighbors share a position 4ms
     × keeps keys at most 128 characters over 800 moves to the same spot 2ms
   ❯ schema upgrade to version 3 (1)
     × assigns positions to existing memberships in added-time order 2ms

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/fractional-index.test.js [ tests/unit/fractional-index.test.js ]
Error: Cannot find module '../../src/js/lib/fractional-index.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/fractional-index.test.js
 ❯ tests/unit/fractional-index.test.js:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { keyBetween, keysBetween, MAX_KEY_LENGTH } from '../../src/js/…
[... 171 lines omitted ...]


 Test Files  3 failed (3)
      Tests  15 failed | 24 passed (39)
   Start at  02:29:22
   Duration  845ms (import 34%, transform 30%, tests 27%, worker 9%)
```

The red phase above predates the split; its `query.test.js` suite moved to T0029.

### Split and Rebase

The task was split for size on 2026-11-04; `query.js` and `query.test.js` moved to T0029.
The ordering changes were then merged by hand onto T0014, the recycle bin.
`moveInList` now rejects deleted tasks and lists with code `deleted`.
A new test proves this; it failed with the old lookups in `moveInList`:

Command: `npx vitest run tests/unit/store-tasks.test.js -t "deleted task or within a deleted list"` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/store-tasks.test.js (41 tests | 1 failed | 40 skipped) 38ms
   ❯ manual order (16)
     × rejects moves of a deleted task or within a deleted list 34ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/store-tasks.test.js > manual order > rejects moves of a deleted task or within a deleted list
AssertionError: promise resolved "undefined" instead of rejecting

- Expected:
Error {
  "message": "rejected promise",
}

+ Received:
undefined

 ❯ tests/unit/store-tasks.test.js:331:68
    329|     await expect(store.moveInList(c.id, home.id, { before: a.id })).re…
    330|     await store.deleteList(work.id);
    331|     await expect(store.moveInList(b.id, work.id, { before: a.id })).re…
       |                                                                    ^
    332|   });
    333|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 40 skipped (41)
   Start at  15:40:22
   Duration  508ms (import 45%, transform 38%, tests 14%, worker 3%)
```

### Green Phase

Command: `npx vitest run tests/unit/fractional-index.test.js tests/unit/store-*.test.js tests/unit/bin.test.js tests/unit/overdue.test.js tests/unit/uuid7.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  7 passed (7)
      Tests  157 passed (157)
   Start at  15:40:30
   Duration  894ms (import 43%, tests 38%, transform 15%, worker 4%)
```

Command: `npx eslint src/js tests/unit` (exit code 0)

```text
(no output)
```

### Service Key Compatibility

The service's `FractionalIndex.java` was compiled in a scratch folder with a driver printing keys.

The expected keys in tests/unit/fractional-index.test.js come from this output and the rocicorp vectors.

Command: `javac FractionalIndex.java Driver.java && java Driver` (exit code 0)

```text
null | null -> a0
null | a0 -> Zz
null | Zz -> Zy
a0 | null -> a1
a1 | null -> a2
a0 | a1 -> a0V
a1 | a2 -> a1V
a0V | a1 -> a0l
Zz | a0 -> ZzV
Zz | a1 -> a0
null | Y00 -> Xzzz
bzz | null -> c000
a0 | a0V -> a0G
a0 | a0G -> a08
b125 | b129 -> b127
a0 | a1V -> a1
Zz | a01 -> a0
null | a0V -> a0
null | b999 -> b99
null | A00000000000000000000000000 -> ERROR
null | A000000000000000000000000001 -> A000000000000000000000000000V
zzzzzzzzzzzzzzzzzzzzzzzzzzy | null -> zzzzzzzzzzzzzzzzzzzzzzzzzzz
zzzzzzzzzzzzzzzzzzzzzzzzzzz | null -> zzzzzzzzzzzzzzzzzzzzzzzzzzzV
a00 | null -> ERROR
a00 | a1 -> ERROR
0 | 1 -> ERROR
a1 | a0 -> ERROR
az | null -> b00
Zz | a0 -> ZzV
n(null,null,5) [a0, a1, a2, a3, a4]
n(null,a0,5) [Zv, Zw, Zx, Zy, Zz]
n(a0,a1,5) [a08, a0G, a0V, a0d, a0l]
n(a5,b07,10) [a58, a5G, a5V, a5d, a5l, a6, a6G, a6V, a7, a8]
after1000 len=169 a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004
append1000 bF7
```
