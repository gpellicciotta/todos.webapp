---
id: T0248
owner: "@claude"
needs: []
branch: task/T0248-add-restore-all-and-delete-all-for-the
worktree: .plan/work/T0248-add-restore-all-and-delete-all-for-the
status: active
started_at: "2026-11-17T02:18:23Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0248: Add Restore all and Delete all for the entries matching the Recycle Bin filter

## Goals
Let users act on every entry that matches the Recycle Bin filter at once.
- While the filter narrows the bin, Restore {{n}} and Delete {{n}} permanently replace Empty recycle bin.
- Delete asks in place first, like Empty recycle bin; Restore needs no question.
- Each action runs in one store transaction and reports the result in a toast.
- Rules and tests: [technical-spec.md](T0248-add-restore-all-and-delete-all-for-the/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0247 filter, the bin store functions, and Empty recycle bin in recycle-bin.js.
- [ ] **[Doc]**       Add BIN-9 and update the Recycle Bin design and the local store spec.
- [ ] **[Implement]** Author failing unit tests for the bulk store calls, the toolbar, the question, and the toasts.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the bulk store calls and the filtered toolbar.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture the filtered toolbar and its question in light and dark themes.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request to act on filter matches.
