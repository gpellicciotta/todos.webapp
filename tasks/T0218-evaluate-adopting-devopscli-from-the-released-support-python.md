---
id: T0218
owner: "@claude"
session: claude-20261117-253404
needs: []
branch: task/T0218-evaluate-adopting-devopscli-from-the-released-support-python
worktree: .plan/work/T0218-evaluate-adopting-devopscli-from-the-released-support-python
status: active
started_at: "2026-11-17T03:57:55Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 97.5, input: 32, output: 8264, cache_read: 1231506, cache_write: 76971}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T03:59:40Z"
---
# T0218: Evaluate adopting DevopsCli from support-python v3.3.0, modeled on support.webapp's devops script.

## Goals
Investigation only: decide whether `scripts/devops.py` should move onto support-python's `DevopsCli`.
Evaluate against the latest support-python release, v3.3.0, not v2.0.0; read its migration-v2.md and migration-v3.md.
Use support.webapp's `scripts/devops.py` as the model: a `NodeProject` subclass plus `DevopsCli.add_action`.
Map each current action (lint, test, e2e, check, server, release) to a built-in or an added action.
Name what the release flow loses or gains, including the todos server backend handling and GitHub releases.
Record the decision in the Execution Log, and create a follow-up adoption task when it fits.
Completion check: review of the recorded decision.

## Task Execution Steps
- [x] **[Read]**      Read scripts/devops.py, docs/devops.md, support.webapp's devops.py, and support-python's DevopsCli docs.
- [x] **[Decide]**    Map every action and option to DevopsCli and decide whether to adopt it.
- [x] **[Doc]**       Record the decision and the mapping in the Execution Log, and file the follow-up task.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Retargeted to support-python v3.3.0, now released, with support.webapp's adopted DevopsCli as the model.

- [2026-11-17] **[Decided]**
  Adopt DevopsCli with a NodeProject subclass, as support.webapp does; keep the release flow as a Project.release override. Gain: shared help, logging, versions, format, clean, tests. Follow-up: T0267.

- [2026-11-17] **[Decide]**
  Action map, support-python v3.3.0 DevopsCli.
  - lint: override lint; add ESLint, Ruff check, format check.
  - test: override test; Vitest then pytest.
  - e2e: add action, or override test_slow to run test:e2e.
  - check: override; add sw check, design check, e2e.
  - server: add_action with start|stop, --port, --background.
  - build: override to a no-op; todos has no build step.

- [2026-11-17] **[Decide]**
  Release gaps in v3.3.0, so release stays an override.
  - No VERSION operand; version is the -pre heading minus -pre.
  - sync_versions runs only for the next dev version.
  - No release-time hook for version.js, service worker, lock.
  - No --backend-dir pin; no plan push; main and tag pushed separately.

- [2026-11-17] **[Decide]**
  Release gains and losses if the built-in pipeline replaced the override.
  - Gain: gh auth and existing-release checks, typed confirm, release URL.
  - Lose: todos backend pin, GitHub release stays optional via --skip-github-release.
  - Lose: rollback of edited files on failure, atomic push.
  - Commit messages change to 'Released version X.'.

- [2026-11-17] **[Doc]**
  Filed T0267 for adoption; an upstream release-time hook in support-python would later remove the override, but no task was filed in that repository.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 0.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

