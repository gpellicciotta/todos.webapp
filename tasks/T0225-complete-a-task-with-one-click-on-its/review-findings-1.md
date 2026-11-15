---
task: T0225
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T01:04:20Z
reviewed_commit: "aead048"
base_commit: "3e003d2"
branch: task/T0225-complete-a-task-with-one-click-on-its
---
# Review Findings: Task T0225 (Round 1)

## Summary
One-click completion, status menu paths, the `x` shortcut, Undo toasts, and tests work well (`npm test` and Playwright pass).
However, `npm run check:sw` fails in CI, and [visual-style-guide.md](../../../docs/specs/visual-style-guide.md) still describes the old status button behavior.

## Defects
- `npm run check:sw` exits with code 1 because five precached files changed while `VERSION` in [service-worker.js](../../../src/service-worker.js) stayed `2026-11-13.6`.
  This breaks [pages.yml](../../../.github/workflows/pages.yml) and `devops.py check`, and leaves installed PWAs serving stale cached assets.

- Line 218 of [visual-style-guide.md](../../../docs/specs/visual-style-guide.md) still defines `.status-button` as opening the status menu rather than toggling completion on click.

## Process Gaps
- Verification omitted `npm run check:sw`, which [devops.py](../../../scripts/devops.py) and CI enforce whenever precached files under `src/` change.
- Updating [app-components.css](../../../src/css/app-components.css) and [visual-style-gallery.html](../../../src/demo/visual-style-gallery.html) omitted the matching [visual-style-guide.md](../../../docs/specs/visual-style-guide.md) update required by the UI guidelines.

## Required Rework
- Bump `VERSION` in [service-worker.js](../../../src/service-worker.js), run `node scripts/check-sw-version.mjs --update`, and confirm `npm run check:sw` passes.
- Update the Status button entry in [visual-style-guide.md](../../../docs/specs/visual-style-guide.md) to match the one-click toggle and menu-opening paths.
- Record the newly touched files, `npm run check:sw` output in [validation-proof.md](validation-proof.md), updated size notes, and task outcomes.
