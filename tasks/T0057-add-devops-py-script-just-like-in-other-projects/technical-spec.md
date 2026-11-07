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
- **[Decided]** Exit codes follow the CLI guidelines: 0 success; 1 an operation, check, precondition, or release step failed, or the release was not confirmed; 2 invalid arguments.
  The template's code 2 for a failed release step is not adopted.

### Release Flow
1. Preflight: `node` is available; the branch is `main`; the tree is clean; `main` is not behind `origin/main`, and `plan` not behind `origin/plan`;
   the tag is free locally and on `origin`; the changelog and version rewrites are proven to match before any write; a given backend repository is clean and holds the pin line.
2. Checks: `check` runs unless `--skip-checks`; a dry run runs them too.
3. Plan: print the files, the local commands, and the exact publish commands. `--dry-run` stops here, changing nothing but fetched refs.
4. Confirm `y/N`; a closed input or an interrupt counts as no; `--yes` skips only the question. Then re-check that the tree is still clean.
5. Release commit `Released v{{version}}.` and annotated tag `v{{version}}`: heading, `package.json`, `package-lock.json`, `version.js`, service worker `VERSION`, and manifest.
   `check:sw` and, unless `--skip-checks`, `npm test` verify it. Any failure restores the files and prints the local state and the undo commands.
6. Next development commit with a `-pre` heading and `-pre` versions, with another service worker bump and `check:sw`.
7. Publish: fetch again, then `git push --atomic origin main v{{version}}`, so the tag never reaches `origin` without `main`.
   Then `git push origin plan`, and `gh release create` unless `--no-github-release`.
8. Pin, only with `--backend-dir` and only when the tag is on `origin`: set `todosWebappVersion={{version}}` and commit `Pinned todos.webapp v{{version}}.` locally.
   A failed commit restores the file; a pin already current is skipped. The script never pushes that repository and never deploys it.
9. A failed step after the push does not stop the others: the script lists what is left, each with its command, and exits 1.

- **[Decided]** The question comes before any local change, so declining leaves the repository untouched. This differs from the first draft, which asked after the local commits.
- **[Decided]** Review round 1 (an independent subagent) found three major issues, now fixed: a non-atomic push, files left edited after a failure, and silent failures after the push.

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
- Unit: a failed rewrite or verification restores the files, and names the local state and the undo commands.
- Unit: a rejected push is atomic and leaves the tag off `origin`; a failed step after the push is listed with its command, with exit code 1.
- Unit: a failing check run, a tree that changes during the checks, and a closed input change nothing.
- Unit: CRLF files keep their line endings, and malformed arguments exit with code 2.

Completion check: `python -m pytest tests`, `ruff check scripts tests`, and `ruff format --check scripts tests`.
