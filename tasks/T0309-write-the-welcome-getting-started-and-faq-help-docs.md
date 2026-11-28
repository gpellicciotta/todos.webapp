---
id: T0309
owner: "@claude"
session: claude-20261128-7a3611
needs: []
branch: task/T0309-write-the-welcome-getting-started-and-faq-help-docs
worktree: .plan/work/T0309-write-the-welcome-getting-started-and-faq-help-docs
status: active
started_at: "2026-11-28T00:31:04Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0309: Write the welcome, getting started, and FAQ help docs in docs/tutorial as Markdown

## Goals
Write the three Markdown docs that the Help screen of T0311 shows: `welcome.md`, `getting-started.md`, and `faq.md`.
They live in `docs/tutorial/`, so maintainers edit help text without touching code.
They describe the app as shipped, and replace the Keyboard shortcuts and add field syntax text of Settings.
T0310 serves them, and T0311 renders them; the content contract is in [technical-spec.md](T0309-write-the-welcome-getting-started-and-faq-help-docs/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read requirements.md, ui-design.md, and settings.js shortcuts and syntax strings for accurate facts.
- [x] **[Doc]**       Write welcome.md with the intro and one level-2 section per concept.
- [x] **[Doc]**       Write getting-started.md with numbered level-2 steps from first task to installing the app.
- [x] **[Doc]**       Write faq.md with every required question, including the full keyboard shortcut list.
- [x] **[Verify]**    Check every doc against the Markdown subset, structure, and facts in technical-spec.md.
- [x] **[Doc]**       Link the docs from docs/index.md and add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Split the Help request into docs (T0309), serving (T0310), and the screen (T0311), one concern each.

- [2026-11-28] **[Doc]**
  Wrote the three docs, linked them from docs/index.md, added the CHANGELOG entry, and recorded checks in validation-proof.md.

- [2026-11-28] **[Read]**
  Read requirements.md, ui-design.md typed syntax rules, and the SHORTCUTS and syntax strings in settings.js.

- [2026-11-28] **[Doc]**
  Wrote welcome.md with 8 concept parts.

- [2026-11-28] **[Doc]**
  Wrote getting-started.md with 9 numbered steps.

- [2026-11-28] **[Doc]**
  Wrote faq.md with the 16 required questions and the full shortcut list.

- [2026-11-28] **[Verify]**
  Checked headings, subset, and facts; see validation-proof.md.

