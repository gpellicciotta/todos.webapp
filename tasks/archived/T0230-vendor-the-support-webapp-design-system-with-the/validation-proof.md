## Walkthrough & Validation
Vendored support.webapp 0.1.0 (neutral look), moved every token to the vendored base and look, and renamed uses to contract names.

### Summary of Changes
- `src/vendor/design/` holds the vendored copy, written by `vendor` from a `git -c core.autocrlf=false archive v0.1.0` export.
- `design.json` pins version 0.1.0, look `neutral`, target `src/vendor/design`, and styles `src/css`.
- `.gitattributes` marks `src/vendor/**` as `-text`, so `core.autocrlf` checkouts keep the release's LF bytes.
- `style.css` imports the vendored `base.css`, `primitives.css`, `fonts.css`, and `look.css`, then the app stylesheets.
- `tokens.css` keeps only six app-local size tokens; `src/css/fonts.css` and `src/fonts/` are gone.
- The sed sweep of the technical specification renamed old tokens; `--radius-md` uses moved to roles by hand.
- The gallery's primitive ramps became a note, since primitives are private to the look; its radius specimen shows the roles.
- The service worker precaches the five vendored files `style.css` loads; VERSION moved to `2026-11-13.1`.
- CI and `devops.py check` run `node src/vendor/design/bin/check.mjs`; ESLint ignores `src/vendor/`.

### Red Phase
Command, run before vendoring and renaming (PowerShell, from `C:\Dev-Projects\todos.webapp`):
`npx vitest run tests/unit/design-system.test.js tests/unit/tokens.test.js tests/unit/precache.test.js` - exit code 1

```text
 ❯ tests/unit/design-system.test.js (7 tests | 7 failed) 86ms
     × is pinned by design.json to release 0.1.0 with the neutral look 10ms
     × passes the vendored integrity and conformance checks 12ms
     × keeps the vendored bytes exact across platform checkouts 5ms
     × provides the tokens: style.css loads the vendored base and neutral look before the app stylesheets 6ms
     × leave no old token name in the app CSS, HTML, or JavaScript 46ms
     × leave no private primitive of the neutral look in the app files 2ms
     × leave the app defining no token that the vendored base or look defines 1ms
 ❯ tests/unit/precache.test.js (5 tests | 1 failed) 100ms
     × precaches the vendored base, neutral look, and font that style.css loads 23ms
 ❯ tests/unit/tokens.test.js (184 tests | 177 failed) 165ms
     × exist in src/vendor/design and src/css 17ms
[... 176 lines of failing contrast tests omitted ...]
AssertionError: expected [ …(233) ] to deeply equal []
Error: ENOENT: no such file or directory, open 'C:\Dev-Projects\todos.webapp\design.json'
Error: ENOENT: no such file or directory, open 'C:\Dev-Projects\todos.webapp\src\vendor\design\css\base.css'
Error: Cannot find module 'file:///C:/Dev-Projects/todos.webapp/src/vendor/design/bin/check.mjs' imported from C:/Dev-Projects/todos.webapp/tests/unit/design-system.test.js

 Test Files  3 failed (3)
      Tests  185 failed | 11 passed (196)
```

The 233 entries are the old token names still in use; the ENOENT errors are the missing vendored copy and pin.

### Vendoring
Review round 1 found the first copy in CRLF: `git archive` had applied support.webapp's `core.autocrlf=true`.
67 of 69 files then differed from the tag. The copy was vendored again from an LF export:

`git -C ../support.webapp -c core.autocrlf=false archive v0.1.0 | tar -x -C {{scratchpad}}/swa-0.1.0-lf`

`node {{scratchpad}}/swa-0.1.0-lf/bin/cli.mjs vendor --look neutral --to src/vendor/design --styles src/css` - exit code 0

```text
Wrote:
src/vendor/design/contract.json
src/vendor/design/css/base.css
[... 64 lines omitted ...]
src/vendor/design/bin/check.mjs
src/vendor/design/manifest.json
design.json
```

Byte comparison of every vendored file with the tag, run after vendoring again - exit code 0:

```bash
for f in $(cd src/vendor/design && find . -type f ! -name manifest.json | sed 's#^\./##'); do src="src/$f"; [ "$f" = "bin/check.mjs" ] && src="$f"; git -C ../support.webapp -c core.autocrlf=false show "v0.1.0:$src" | cmp -s - "src/vendor/design/$f" || echo "DIFF $f"; done
```

```text
compared 69 files, differing 0
```

### Vendored Check
`node src/vendor/design/bin/check.mjs` - exit code 0

```text
integrity: PASS
conformance: PASS
src/css/app-shell.css: fixed or sticky position outside shell
src/css/controls.css: fixed or sticky position outside shell
src/css/views.css: fixed or sticky position outside shell
```

The three warnings name the fixed floating button and toast region and the sticky add bar.
T0231 moves them into the `shell.css` areas; the unit test accepts only these warnings until then.

### Leftover Search
`git grep -nE -- "--(color-signal|color-on-signal|color-hover-bg|color-active-bg|color-selected-bg|space-8|width-editor|icon-size|icon-size-lg|radius-sm|radius-md|radius-lg)\b" -- . ":!CHANGELOG.md" ":!src/vendor/" ":!tests/unit/design-system.test.js"` - exit code 0

```text
docs/specs/visual-style-guide.md:75:  `--space-8` became `--space-9`, `--width-editor` became `--width-side-panel`, and `--icon-size` became `--icon-md`.
```

The one hit is the style guide decision that records the renames; no code or style uses an old name.

### Lossless Switch Proof
Harness: [proof/capture.spec.js](proof/capture.spec.js) with [proof/proof.config.js](proof/proof.config.js) and [proof/compare.mjs](proof/compare.mjs).
It seeds three lists, six tasks, a note, and a bin entry under a fixed clock of 2026-11-12T10:00:00Z.
It captures 8 screens: All tasks, Lists, a list, the task editor, the list editor, Settings, the recycle bin, and the user panel.
Each screen is captured at 390 and 1440 px, in light and dark, with a computed-style snapshot of every element.
The snapshot holds the bounding box and 67 properties per element, keyed by tag, classes, and position.

Determinism: two baseline runs at `0cf4981` gave 0 differences over all 32 snapshots.

`PROOF_OUT={{scratchpad}}/proof/after2 npx playwright test --config .plan/tasks/T0230-vendor-the-support-webapp-design-system-with-the/proof/proof.config.js` - exit code 0

```text
Running 4 tests using 4 workers
  4 passed (13.1s)
```

`node .plan/tasks/T0230-vendor-the-support-webapp-design-system-with-the/proof/compare.mjs {{scratchpad}}/proof/before {{scratchpad}}/proof/after2` - exit code 0

```text
dark-1440/all-tasks.json: 0 differences
dark-1440/bin.json: 0 differences
dark-1440/list-editor.json: 0 differences
[... 28 lines omitted, each reporting 0 differences ...]
light-390/user-menu.json: 0 differences
total differences: 0
```

Screenshots: [before](screenshots/before/) and [after](screenshots/after/), one folder per theme and width.
PNG bytes differ between runs even at the same commit: 14 of 32 baseline screenshots changed between two baseline runs.
ADR-0007 rules out pixel diffs, so the computed-style comparison is the gate; the screenshots were inspected by eye.

Visual differences: none in the app screens.
Deliberate gallery changes, outside the app screens:
- The gray, navy, and orange ramp swatches became a note, because app files may not use the look's private primitives.
- The radius specimen shows the five radius roles instead of the three size steps.

### Full Check
`python scripts/devops.py check` - exit code 0 (second run)

```text
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
OK: 78 precached files match VERSION 2026-11-13.1.
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  60 passed (60)
      Tests  1241 passed (1241)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
[... 196 test lines and Node.js color warnings omitted ...]
  196 passed (2.6m)
[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
5 files already formatted
[*] C:\Program Files\Python312\python.exe -m pytest -q tests
156 passed in 170.32s (0:02:50)
```

The first full run failed two Playwright tests on the 30-second timeout, then stopped before Ruff and pytest:

```text
  1) [chromium] › tests\e2e\gallery-app.spec.js:212:3 › every keyboard stop in the task row, status, and task list sections shows a focus ring at 1440 px
    Error: page.evaluate: Test timeout of 30000ms exceeded.
  2) [chromium] › tests\e2e\gallery-chrome.spec.js:257:3 › every keyboard stop in the chrome sections shows a focus ring at 1440 px
    Error: page.evaluate: Test timeout of 30000ms exceeded.
  2 failed
  194 passed (3.9m)
```

Both tests tab through up to 600 stops. Run alone with one worker, they took these times before and after the change:

| Test                       | HEAD `0cf4981` | This change |
| :------------------------- | :------------- | :---------- |
| gallery-app focus, 390 px  | 6.6 s          | 10.6 s      |
| gallery-app focus, 1440 px | 12.1 s         | 13.6 s      |
| gallery-chrome, 390 px     | 10.2 s         | 11.2 s      |
| gallery-chrome, 1440 px    | 16.8 s         | 13.6 s      |

Run with four parallel workers, the gallery-app 1440 px test took 28.1 s, close to its 30 s limit.
The gallery-app 390 px run was 60% slower, but the others were close, and one was faster.
The timeouts most likely come from machine load in the full parallel run; the second full run passed unchanged.
Follow-up T0232 gives these two tab-through tests more time, so load cannot fail them.

`python scripts/devops.py check` - exit code 0 (third run, after the pre-review fixes and the LF re-vendor)

```text
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
OK: 78 precached files match VERSION 2026-11-13.1.
[*] C:\Program Files\nodejs\node.EXE src/vendor/design/bin/check.mjs
integrity: PASS
conformance: PASS
[*] C:\Program Files\nodejs\npm.CMD test
 Test Files  60 passed (60)
      Tests  1241 passed (1241)
[*] C:\Program Files\nodejs\npm.CMD run lint
[*] C:\Program Files\nodejs\npm.CMD run test:e2e
[... 196 test lines and Node.js color warnings omitted ...]
  196 passed (2.6m)
[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
5 files already formatted
[*] C:\Program Files\Python312\python.exe -m pytest -q tests
156 passed in 97.79s (0:01:37)
```
