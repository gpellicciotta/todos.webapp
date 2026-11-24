## Walkthrough & Validation

### Key Changes
- `sync-log.js` builds each entry as an `.entry-list__item` card in a labeled `ul.entry-list`.
- The card shows the item line, then a clock time chip, a status chip for the kind, and an Open action.
- The values (lost, kept, undone, detail) follow as a text-only `.entry-list__details` paragraph.
- Kind chips use the package severity chip: warning for overwritten, danger for rejected, lost access, and error.
- `views.css` drops the `sync-log-entry` rules and the `.sync-log__list` grid; only `.sync-log__list:empty` stays.
- The service worker VERSION moved to `2026-11-24.7` with refreshed precache hashes.

### Red Phase: Tests Fail on the Old Markup
Command: `npx vitest run tests/unit/sync-log-view.test.js` (exit code 1)

```text
     × lists entries newest first, each with its kind 37ms
     × shows the message first, then a chip row led by a time chip with the clock icon 3ms
     × names and links the task of a rule edit and of an adopted event (SYN-8, SYN-9) 12ms
     × shows the item, the field, the lost value, and the kept value of an overwritten value 3ms
     × names the reason and the undone change of a rejected change 5ms
     × links a list while it exists and not after 4ms
 Test Files  1 failed (1)
      Tests  6 failed | 5 passed (11)
```

Command: `npx playwright test tests/e2e/sync.spec.js -g "opening the Sync log clears it" --reporter=line` (exit code 1)

```text
           - unexpected value "0"

      142 |   await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sync log');
      143 |   const entry = page.getByRole('list', { name: 'Sync log entries' }).locator('.entry-list__item');
    > 144 |   await expect(entry).toHaveCount(1);
          |                       ^
[... 12 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\sync.spec.js:128:1 › an overwritten value shows the dot; opening the Sync log clears it and lists the entry
```

### Green Phase: Unit Tests and Lint
Command: `npx vitest run tests/unit/sync-log-view.test.js` (exit code 0)

```text
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

### Completion Check
Command: `python scripts/devops.py check` (exit code 0)

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
OK: 157 precached files match VERSION 2026-11-24.7.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
 Test Files  68 passed (68)
      Tests  1809 passed (1809)
Command: "C:\Program Files\nodejs\npm.CMD" run lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
[... 260 lines omitted ...]
  ✓  259 [chromium] › tests\e2e\sync.spec.js:128:1 › an overwritten value shows the dot; opening the Sync log clears it and lists the entry (3.3s)
[... 15 lines omitted ...]
  276 passed (3.7m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
215 passed in 112.45s (0:01:52)
```

The first run failed on the stale service worker VERSION; the bump and `node scripts/check-sw-version.mjs --update` fixed it.

### Visual Verification
A temporary Playwright spec, kept out of the repository, seeded four log entries in local mode.
It seeded an overwritten value on an existing task, a rejected change, a lost list, and a sync error.
It failed on any console error, page error, failed request, or HTTP status of 400 or higher; every run passed.
The after run waits 1 s before capturing, since the external icon sprite paints just after the cards mount.

Command: `SHOTS_DIR=<companion> SHOTS_PREFIX=before|after npx playwright test zz-t0293-shots --reporter=list` (exit code 0 both times)

```text
  ✓  3 [chromium] › tests\e2e\zz-t0293-shots.spec.js:10:5 › sync log 390 light (3.5s)
  ✓  1 [chromium] › tests\e2e\zz-t0293-shots.spec.js:10:5 › sync log 1440 light (3.8s)
  ✓  4 [chromium] › tests\e2e\zz-t0293-shots.spec.js:10:5 › sync log 1440 dark (4.1s)
  ✓  2 [chromium] › tests\e2e\zz-t0293-shots.spec.js:10:5 › sync log 390 dark (4.2s)

  4 passed (5.8s)
```

| Viewport | Before                                                       | After                                                      |
| :------- | :----------------------------------------------------------- | :--------------------------------------------------------- |
| 390 px   | [light](before-390-light.png), [dark](before-390-dark.png)   | [light](after-390-light.png), [dark](after-390-dark.png)   |
| 1440 px  | [light](before-1440-light.png), [dark](before-1440-dark.png) | [light](after-1440-light.png), [dark](after-1440-dark.png) |

- Before: bold kind headings with the time at the end, and a danger start edge on rejected, lost, and error cards.
- After: package cards with the item first, clock time chips, warning or danger kind chips, and sunken monospace values.
- At 390 px the Open link wraps to the end of its own chip row line; at 1440 px it ends the chip row.
