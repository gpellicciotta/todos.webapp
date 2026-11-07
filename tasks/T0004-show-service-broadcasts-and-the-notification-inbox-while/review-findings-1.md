---
task: T0004
round: 1
verdict: approved
reviewer: "@gemini"
reviewed_at: 2026-11-07T19:10:22Z
reviewed_commit: "d53577f"
base_commit: "5127588"
branch: task/T0004-show-service-broadcasts-and-the-notification-inbox-while
---
# Review Findings: Task T0004 (Round 1)

## Summary
The implementation of the notification inbox and service broadcast banners meets all task goals, technical specifications (`NTF-1` to `NTF-7`, `LOC-1`, `LOC-3`, `CON-13`), and project guidelines.
- `src/js/sync/inbox.js` normalizes notifications, resolves only `http:` and `https:` action URLs, deduplicates refreshes, refreshes at startup/sign-in/visibility/2-minute intervals while connected, handles `401` by expiring the session, preserves cached notifications when offline, and makes zero requests in local mode or when expired.
- `src/js/ui/inbox.js` and `src/js/ui/layout.js` mount the inbox bell and popover panel before the user menu button and render unread broadcast banners above views alongside lasting notices without replacing them, using semantic CSS tokens, accessible ARIA attributes, live-region announcements, and `textContent` rendering.
- Unit tests (911 passing), ESLint, service worker precache verification, and Playwright end-to-end tests pass cleanly, and visual verification screenshots confirm light/dark and wide/compact layouts.

## Defects
None

## Process Gaps
None

## Required Rework
None
