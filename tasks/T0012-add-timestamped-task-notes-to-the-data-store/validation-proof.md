## Walkthrough & Validation

### Red Phase
Command: `npx vitest run tests/unit/store-notes.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/store-notes.test.js (21 tests | 21 failed) 45ms
   ❯ addNote (9)
     × stores the text, creation time, no edit time, and a null local author 18ms
     × keeps a given author 1ms
     × trims the text before checking its length 2ms
     × accepts notes of 1 and 2000 characters 1ms
     × rejects an empty note and stores nothing 1ms
     × rejects a blank note and stores nothing 1ms
     × rejects a missing text and stores nothing 1ms
     × rejects a note over 2000 characters and stores nothing 1ms
     × fails with not-found for an unknown task 2ms
   ❯ notesOfTask (4)
     × returns the notes of one task, newest first 2ms
     × orders notes created in the same millisecond newest first 1ms
     × keeps the creation order after an edit 1ms
     × fails with not-found for an unknown task 1ms
   ❯ editNote (4)
     × replaces the text and sets the edit time, keeping the creation time 1ms
     × rejects an empty text and keeps the note 1ms
     × rejects a text over 2000 characters and keeps the note 0ms
     × fails with not-found for an unknown note 1ms
   ❯ deleteNote (2)
     × removes only that note 1ms
     × fails with not-found for an unknown note 1ms
   ❯ task activity (1)
     × updates the last activity time, not the last update time, on every note change 1ms
   ❯ schema upgrade (1)
     × adds the notes store at version 2 without losing lists, tasks, or memberships 6ms

⎯⎯⎯⎯⎯⎯ Failed Tests 21 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/store-notes.test.js > addNote > stores the text, creation time, no edit time, and a null local author
TypeError: store.addNote is not a function
[... 215 lines omitted ...]
      Tests  21 failed (21)
   Start at  02:21:03
   Duration  475ms (import 42%, transform 28%, tests 25%, worker 4%)
```

### Green Phase
Command: `npm test && npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  5 passed (5)
      Tests  87 passed (87)
   Start at  02:21:57
   Duration  501ms (import 52%, tests 33%, transform 9%, worker 6%)


> todos-webapp@0.1.0-pre lint
> eslint .
```
