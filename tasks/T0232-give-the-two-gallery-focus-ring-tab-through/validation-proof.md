# T0232 Validation Proof

## Walkthrough & Validation
Both tab-through tests call `test.setTimeout(90_000)` first.
The full end-to-end suite ran twice in a row with 4 workers; both runs passed.

### Run 1

```text
$ npm run test:e2e

> todos-webapp@0.4.1-pre test:e2e
> playwright test

[WebServer] (node:82048) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 201 tests using 4 workers
[... 210 other passing test lines omitted; focus ring lines follow ...]
  ok  70 [chromium] › tests\e2e\gallery-app.spec.js:218:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 390 px (11.3s)
  ok  72 [chromium] › tests\e2e\gallery-app.spec.js:218:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (13.8s)
  ok  94 [chromium] › tests\e2e\gallery-chrome.spec.js:254:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (11.0s)
  ok 101 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (10.5s)
  ok  96 [chromium] › tests\e2e\gallery-chrome.spec.js:254:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (22.5s)
  ok 105 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (21.3s)
[... remaining lines omitted ...]
  ok 192 [chromium] › tests\e2e\sync.spec.js:128:1 › an overwritten value shows the dot; opening the Sync log clears it and lists the entry (9.8s)
  ok 201 [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.5s)

  201 passed (2.8m)
exit code: 0
```

### Run 2

```text
$ npm run test:e2e

> todos-webapp@0.4.1-pre test:e2e
> playwright test

[WebServer] (node:14988) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 201 tests using 4 workers
[... 210 other passing test lines omitted; focus ring lines follow ...]
  ok  70 [chromium] › tests\e2e\gallery-app.spec.js:218:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 390 px (11.7s)
  ok  72 [chromium] › tests\e2e\gallery-app.spec.js:218:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px (19.4s)
  ok  94 [chromium] › tests\e2e\gallery-chrome.spec.js:254:3 › every keyboard stop in the chrome sections shows a focus ring at 390 px (11.0s)
  ok 101 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (11.0s)
  ok  96 [chromium] › tests\e2e\gallery-chrome.spec.js:254:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px (15.2s)
  ok 105 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (11.9s)
[... remaining lines omitted ...]
  ok 200 [chromium] › tests\e2e\task-editor.spec.js:181:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (2.8s)
  ok 201 [chromium] › tests\e2e\task-editor.spec.js:213:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (3.2s)

  201 passed (2.7m)
exit code: 0
```
