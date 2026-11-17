---
id: T0218
owner: "@claude"
needs: []
branch: task/T0218-evaluate-adopting-devopscli-from-the-released-support-python
worktree: .plan/work/T0218-evaluate-adopting-devopscli-from-the-released-support-python
status: active
started_at: "2026-11-17T03:57:55Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read scripts/devops.py, docs/devops.md, support.webapp's devops.py, and support-python's DevopsCli docs.
- [ ] **[Decide]**    Map every action and option to DevopsCli and decide whether to adopt it.
- [ ] **[Doc]**       Record the decision and the mapping in the Execution Log, and file the follow-up task.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Retargeted to support-python v3.3.0, now released, with support.webapp's adopted DevopsCli as the model.
