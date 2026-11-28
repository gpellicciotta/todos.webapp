---
id: T0317
owner: "@claude"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-28T14:13:08Z"
ended_at: —
review: agent
preview: none
protocol: standard
review_status: pending
review_round: 1
review_requested_at: "2026-11-28T14:13:22Z"
---
# T0317: Inspect a pushed reminder on an installed Android PWA after the release

## Goals
Check on a real Android phone that an installed ToDo's PWA shows a pushed reminder with every tab closed.
This needs the deployed release over HTTPS and the user's phone, so no agent can run it.
Moved here from T0227.

## Task Execution Steps
- [x] **[Verify]**    Install the PWA from production, enable reminders, add a due task, and record the pushed notification.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Verify]**
  User confirmed on 2026-11-28 a pushed reminder from the live app on an Android device, with the app closed.
  - Opening the notification showed the closed app on the right task.
  - A repeated job run sent no further notification.
  - Still missing: Android version, and whether the app was installed.

- [2026-11-28] **[Verify]**
  User reported a pushed reminder on 2026-11-28 in ToDo's installed as an app, on Android 17 (One UI 9.0), from the live app.
  - Opening the notification showed the right task, with the app closed.
  - A repeated job run sent no further notification.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

