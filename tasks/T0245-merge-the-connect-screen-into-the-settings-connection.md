---
id: T0245
owner: "@claude"
needs: []
branch: task/T0245-merge-the-connect-screen-into-the-settings-connection
worktree: .plan/work/T0245-merge-the-connect-screen-into-the-settings-connection
status: active
started_at: "2026-11-17T02:43:04Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0245: Merge the connect screen into the Settings Connection section, keeping #/connect as an alias for the Auth return

## Goals
Make the Settings Connection section the only place to connect, removing the separate connect screen.
- The section shows every sign-in phase in place: intro, signing in, signed in, not invited, error, and expired.
- `#/connect` stays as an alias that opens Settings at the Connection section, so Auth needs no change.
- Links that open `#/connect` keep working through the alias.
- The user asked for one card: less visual clutter and easier to remember.
- Rules and tests: [technical-spec.md](T0245-merge-the-connect-screen-into-the-settings-connection/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read connect.js, the Settings Connection section, the router, and the Auth return in session.js.
- [ ] **[Doc]**       Update the Settings design, the Connecting and Session Expiry flows, and the wireframes.
- [ ] **[Implement]** Move the connect tests into Settings and router tests, and confirm they fail.
- [ ] **[Verify]**    Run the moved tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Move the phases into the Connection section, alias the route, and remove connect.js.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture each phase in Settings, light and dark, at desktop and phone widths.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for a single Connect card.

- [2026-11-16] **[Decided]**
  Folded in T0244: the Connection section drops the stale later-version sync hint, with a unit test.

