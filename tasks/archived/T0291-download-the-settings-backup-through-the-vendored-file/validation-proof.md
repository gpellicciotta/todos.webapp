## Walkthrough & Validation

`saveBackup` now calls `downloadJson(backup, name, { document: doc, url })`.
`mountSettings` takes an optional `url` option, the URL API, which defaults to global `URL`.
`file-download.js` was already precached; `VERSION` moved to `2026-11-24.9` and the hashes were regenerated.
The vendored helper appends a trailing newline to the JSON text; `importBackup` reads it unchanged.

### Failing test before the change

Command: `npx vitest run tests/unit/settings.test.js -t "Export backup"` (exit code 1)

```text
 ❯ tests/unit/settings.test.js (54 tests | 1 failed | 53 skipped) 54ms
   ❯ Export backup in Settings (1)
     × downloads one application/json file under the backup name, revokes its URL, and names it in a toast 52ms

 FAIL  tests/unit/settings.test.js > Export backup in Settings > downloads one application/json file under the backup name, revokes its URL, and names it in a toast
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
 ❯ tests/unit/settings.test.js:707:33
    707|     expect(url.createObjectURL).toHaveBeenCalledTimes(1);

 Test Files  1 failed (1)
      Tests  1 failed | 53 skipped (54)
```

### Unit tests after the change

Command: `npx vitest run tests/unit/settings.test.js` (exit code 0)

```text
 Test Files  1 passed (1)
      Tests  54 passed (54)
```

### Completion check

Command: `python scripts/devops.py check` (exit code 0)

```text
 Test Files  68 passed (68)
      Tests  1815 passed (1815)
[... e2e lines omitted ...]
  ✓   39 [chromium] › tests\e2e\backup.spec.js:195:1 › Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it (1.5s)
  ✓   40 [chromium] › tests\e2e\backup.spec.js:215:1 › importing an export in Merge mode shows its counts, and Cancel changes nothing (1.8s)
[... e2e lines omitted ...]
  278 passed (3.7m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
Process ID: 27844
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
Process ID: 36444
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
Process ID: 22776
........................................................................ [ 33%]
........................................................................ [ 66%]
.......................................................................  [100%]
215 passed in 112.07s (0:01:52)
```

### Lint

Command: `npx eslint src/js/views/settings.js tests/unit/settings.test.js` (exit code 0)

```text
exit=0
```
