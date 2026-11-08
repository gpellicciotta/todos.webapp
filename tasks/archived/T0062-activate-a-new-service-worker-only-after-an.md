---
id: T0062
owner: "@claude"
session: claude-20261107-4ca7c8
needs: []
branch: task/T0062-activate-a-new-service-worker-only-after-an
worktree: .plan/work/T0062-activate-a-new-service-worker-only-after-an
status: completed
started_at: "2026-11-07T19:14:11Z"
ended_at: "2026-11-07T19:27:00Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1100.4, input: 172, output: 53558, cache_read: 7600446, cache_write: 200770}
  review: {turns: 2, duration_s: 374.6, input: 173624, output: 11922, cache_read: 1269156}
review_status: approved
review_round: 1
reviewed_by: "@gemini"
work_duration: 769.4
completion-commit: 6dd68877ed451973026f449a7686fa65a99482ad
---
# T0062: Activate a new service worker only after an Update toast click, and survive blocked database upgrades

## Goals
Make a new service worker wait until the user clicks Update on a toast, instead of calling `skipWaiting()` on install.
Show the Update toast for a waiting worker, reload once after it activates, and keep the app usable if the toast is ignored.
Handle a blocked database upgrade: an old tab closes its connection on `versionchange` and shows the reload banner.
This lets the sync tasks migrate the store to version 4 safely.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read service-worker.js, app.js, db.js, devops.md's Service Worker Updates, and the Toasts and Banners design.
- [x] **[Implement]** Write the failing unit and end-to-end tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Add the waiting state, the Update toast, the one-time reload, and the versionchange handling.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots of the Update toast at 390 and 1440 px, light and dark.
- [x] **[Doc]**       Update devops.md, ui-design.md, the style guide, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Created from the sync design review: the version 4 store migration needs controlled service worker updates.

- [2026-11-07] **[Decided]**
  Added sw-update.js and a persistent toast option; db.js already handled versionchange, so only its blocked message changed.

- [2026-11-07] **[Verify]**
  Red phase failed as expected; green phase passed.
  - 932 unit tests passed.
  - 171 e2e tests passed.
  - lint and check:sw clean.

- [2026-11-07] **[Doc]**
  Size note: 14 counted files, above typical; split pieces could not merge alone. See validation-proof.md.

- [2026-11-07] **[Read]**
  Read the worker, app.js, db.js, devops.md, and the Toasts and Banners design.

- [2026-11-07] **[Implement]**
  Wrote failing tests, then the waiting worker, sw-update.js, the persistent toast, and the blocked message.

- [2026-11-07] **[Visual]**
  Captured before and after screenshots at 390 and 1440 px, light and dark; linked in validation-proof.md.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: The implementation satisfies all goals, technical specifications, and project guidelines.
  - Findings: [review-findings-1.md](T0062-activate-a-new-service-worker-only-after-an/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

