---
task: T0310
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-28T01:06:33Z
reviewed_commit: "254de85"
base_commit: "aeda479"
branch: task/T0310-serve-the-help-docs-and-the-changelog-under
---
# Review Findings: Task T0310 (Round 1)

## Summary
The work meets every goal in the task and its technical spec.
- The shared `HELP_FILES` list is explicit, and `serve.mjs` maps it to the repository files only for the default root.
- `stage-site.mjs` copies `src/` and the help files, fails on a missing source, refuses a non-empty folder, and exits 2 on usage errors.
- The Pages deploy stages `_site` and uploads it, and `_site/` is git-ignored.
- The service worker serves `help/*.md` network first, stores only OK non-HTML answers, falls back to the cache or rethrows, and keeps cache first for app files. `VERSION` is bumped to `2026-11-28.3`, and `check-sw-version.mjs` passes.
- No help copies are committed under `src/`.
- Docs and the changelog are updated.

Verification run in the worktree:
- Vitest for `serve`, `stage-site`, and `service-worker`: 88 tests passed.
- Playwright `service-worker.spec.js`: 4 passed, including the offline help test.
- `node scripts/stage-site.mjs {{tmp}}`: staged `help/CHANGELOG.md`, `faq.md`, `getting-started.md`, and `welcome.md`.
- `node scripts/check-sw-version.mjs`: OK, 158 precached files match `VERSION 2026-11-28.3`.

## Defects
None

## Process Gaps
- The branch edits `scripts/draw-wireframes.py`, `tests/test_draw_wireframes.py`, and `tests/test_devops.py`, which are not in the declared files. The log records these as a **[Decided]** fix for Ruff failures and the copy list, so the deviation is documented. It is non-blocking.
- The `sw-precache-hashes.json` update also refreshed the hash of `js/core/occurrences.js`, which this branch does not touch. The hash was stale on `main`. It is non-blocking.
- The deploy job in `pages.yml` runs `node scripts/stage-site.mjs` without `actions/setup-node`. It relies on the Node version preinstalled on `ubuntu-latest`. The script needs only Node 18.3 or later, so this is non-blocking, but pinning Node would make it explicit.

## Required Rework
None
