## Technical Specifications

### Sources
- `../template.python/scripts/devops.py` and `_cli_common.py`: the action layout, help text, and the `release` skeleton.
- `../todos/scripts/devops.py`, `finalize_changelog`: the commit, annotated tag, and push order.
- [devops.md](../../../docs/devops.md), Release Procedure and Service Worker Version Check.
- The change management guidelines: `-pre` headings, `[released: {{date}}]` tags, next patch `-pre`.

### Decisions
- **[Decided]** The script uses the current interpreter and the system `npm`, `ruff`, and `pytest`; there is no virtual environment.
- **[Decided]** `check` runs what the Pages test job runs: `npm run check:sw`, `npm test`, `npm run lint`, `npm run test:e2e`, then `ruff check`, `ruff format --check`, and `pytest` on the Python files.
- **[Decided]** Usage: `python scripts/devops.py release [{{version}}] [--dry-run] [--skip-checks] [--yes] [--no-github-release] [--backend-dir {{path}}]`.
- **[Decided]** Without `{{version}}` the release uses the top `-pre` heading; with it, the single `-pre` heading is renamed in place.
  The version must exceed the newest released heading, and the tag `v{{version}}` must not exist.
- **[Decided]** Exit codes: 0 success; 1 a precondition or check failed; 2 a release step failed.

### Release Flow
1. Preflight: branch is `main`; the working tree is clean; `git fetch` shows `main` not behind `origin/main`; `check` passes unless `--skip-checks`.
2. Release commit: the top heading becomes `## v{{version}} [released: {{date}}]`; `package.json` and `package-lock.json` carry the version;
   `src/js/version.js` sets `VERSION` and `BUILD_DATE`; the service worker `VERSION` and the hash manifest are bumped through `check-sw-version.mjs --update`.
3. Verify: `npm run check:sw` and `npm test` pass on the release commit.
4. Tag: annotated `v{{version}}` on the release commit.
5. Next development commit: a new `## v{{next-patch}}-pre` heading on top, and `-pre` version files, with another service worker bump.
6. Confirm: print the exact commands, then ask `y/N`; `--yes` skips only the question. `--dry-run` runs steps 1 and prints the rest, changing nothing.
7. Push: `git push origin main v{{version}}`, then `git push origin plan`, since the plan store travels with the code.
8. GitHub release: `gh release create v{{version}}` with the changelog entry as notes; skipped with a warning when `gh` is missing or `--no-github-release` is set.
9. Pin, only with `--backend-dir`: after `git ls-remote --tags origin v{{version}}` shows the tag, set `todosWebappVersion={{version}}` in `{{backend-dir}}/gradle.properties` and commit it there.
   The commit message is one past-tense sentence, `Pinned todos.webapp v{{version}}.`; the script never pushes that repository and never deploys it.
   It refuses when that repository has other uncommitted changes, and prints the manual next steps: deploy, then push.
10. Print the Pages run address, `https://github.com/gpellicciotta/todos.webapp/actions`, and the checks of the Release Procedure.

### Declared Files
- scripts/devops.py
- scripts/_cli_common.py
- tests/test_devops.py
- docs/devops.md
- CHANGELOG.md

Size estimate: 5 files, 650 lines
Size note: Above the typical line. The script, its helpers, and its tests share one flow and cannot merge apart.

### Tests
- Unit: the changelog finalizer renames the `-pre` heading, opens the next patch `-pre`, and rejects a missing heading or a version not above the last release.
- Unit: the version rewriters set `package.json`, `package-lock.json`, `VERSION`, and `BUILD_DATE`, and the service worker bump increments the counter of the same day.
- Unit: preflight refuses a dirty tree, a branch other than `main`, a branch behind origin, and an existing tag.
- Unit: declining the confirmation pushes nothing, and `--dry-run` changes no file, commit, or tag.
- Unit: the pin rewrite changes only the `todosWebappVersion` line, refuses a dirty backend repository, and runs no `git push`.
- Integration: in a scratch clone with a bare local `origin` and a scratch backend repository, `release 0.2.0 --skip-checks --yes --no-github-release --backend-dir {{scratch}}`
  creates the release commit, tags it `v0.2.0`, adds the next `-pre` commit, pushes `main`, `plan`, and the tag to the bare origin,
  commits the pin in the backend without a push, and `node scripts/check-sw-version.mjs` passes on the result.

Completion check: `python -m pytest tests`, `ruff check scripts tests`, and `ruff format --check scripts tests`.
