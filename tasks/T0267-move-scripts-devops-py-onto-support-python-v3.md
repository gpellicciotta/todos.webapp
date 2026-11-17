---
id: T0267
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
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

### Declared Files
- scripts/devops.py
- tests/test_devops.py
- docs/devops.md
- scripts/requirements.txt

### Tests
- Unit: each action maps to the expected commands; release override keeps version files, pin, and push order.
- Integration: dry-run release and server start and stop run through DevopsCli.

## Task Execution Steps
- [ ] **[Implement]** Author tests for the mapped actions and the release override.
- [ ] **[Verify]**    Run the new tests and confirm they fail.
- [ ] **[Implement]** Rebuild scripts/devops.py on DevopsCli and NodeProject.
- [ ] **[Verify]**    Run the tests, check, and the release dry run.
- [ ] **[Doc]**       Update docs/devops.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.
