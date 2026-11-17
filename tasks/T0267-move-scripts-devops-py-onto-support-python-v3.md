---
id: T0267
owner: "@claude"
session: claude-20261117-e1c0a9
needs: []
branch: task/T0267-move-scripts-devops-py-onto-support-python-v3
worktree: .plan/work/T0267-move-scripts-devops-py-onto-support-python-v3
status: active
started_at: "2026-11-17T09:44:52Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0267: Move scripts/devops.py onto support-python v3.3.0 DevopsCli, keeping todos-specific release steps as a Project.release override

## Goals
Rebuild scripts/devops.py on support-python v3.3.0 `DevopsCli` and a `NodeProject` subclass, as support.webapp does.
Keep lint, test, e2e, check, server, and release behavior; map them as T0218's Execution Log decides.
Keep the release flow as a `Project.release` override: version.js, service worker, lock file, backend pin, atomic push, plan push.
Add `scripts/requirements.txt` pinning support-python v3.3.0, and update docs/devops.md and CHANGELOG.md.
Completion check: `python scripts/devops.py check` and `python scripts/devops.py release --dry-run --skip-github-release` pass.
Size estimate: 4 files, 500 lines.
Mechanical command: ruff format scripts tests
Mechanical files: scripts/draw-wireframes.py

### Declared Files
- scripts/devops.py
- tests/test_devops.py
- docs/devops.md
- scripts/requirements.txt

### Tests
- Unit: each action maps to the expected commands; release override keeps version files, pin, and push order.
- Integration: dry-run release and server start and stop run through DevopsCli.

## Task Execution Steps
- [x] **[Implement]** Author tests for the mapped actions and the release override.
- [x] **[Verify]**    Run the new tests and confirm they fail.
- [x] **[Implement]** Rebuild scripts/devops.py on DevopsCli and NodeProject.
- [x] **[Verify]**    Run the tests, check, and the release dry run.
- [x] **[Doc]**       Update docs/devops.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Decided]**
  Kept the release flow and its y/N question as a Project.release override; release is re-registered to add VERSION and --backend-dir.
  - --no-github-release became --skip-github-release, keeping an alias.
  - A .py test selection runs pytest; any other runs Vitest.
  - devops.py re-runs itself in .venv, pinned by scripts/requirements.txt.

- [2026-11-17] **[Implement]**
  Rebuilt scripts/devops.py on DevopsCli with TodosProject(NodeProject), plus e2e and server actions; 16 new tests.
  - Undeclared: .gitignore and eslint.config.js ignore .venv/.
  - Deleted scripts/_cli_common.py, used only by devops.py.
  - Mechanical: ruff format fixed scripts/draw-wireframes.py, unformatted on main.

- [2026-11-17] **[Verify]**
  devops.py test and lint pass; check and the full release dry run fail only on behaviors.spec.js:109, which fails identically on main.
  - pytest 172 passed; Vitest 1691 passed; Playwright 245 passed, 1 failed.
  - Release dry run with --skip-checks passed in a scratch main clone.
  - Follow-up T0274 fixes the failing popover e2e test.
  - Proof: validation-proof.md.

- [2026-11-17] **[Verify]**
  Size note: 712 counted lines in 5 files exceed the typical line; tests and script move together, so no split.
  - Files touched: 5.
  - Lines touched: 712.
  - Reopenings: 0.

- [2026-11-17] **[Doc]**
  Updated docs/devops.md for DevopsCli, the .venv setup, and the renamed option, and appended two CHANGELOG bullets.

