---
id: T0309
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
# T0309: Write the welcome, getting started, and FAQ help docs in docs/tutorial as Markdown

## Goals
Write the three Markdown docs that the Help screen of T0311 shows: `welcome.md`, `getting-started.md`, and `faq.md`.
They live in `docs/tutorial/`, so maintainers edit help text without touching code.
They describe the app as shipped, and replace the Keyboard shortcuts and add field syntax text of Settings.
T0310 serves them, and T0311 renders them; the content contract is in [technical-spec.md](T0309-write-the-welcome-getting-started-and-faq-help-docs/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read requirements.md, ui-design.md, and settings.js shortcuts and syntax strings for accurate facts.
- [ ] **[Doc]**       Write welcome.md with the intro and one level-2 section per concept.
- [ ] **[Doc]**       Write getting-started.md with numbered level-2 steps from first task to installing the app.
- [ ] **[Doc]**       Write faq.md with every required question, including the full keyboard shortcut list.
- [ ] **[Verify]**    Check every doc against the Markdown subset, structure, and facts in technical-spec.md.
- [ ] **[Doc]**       Link the docs from docs/index.md and add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Split the Help request into docs (T0309), serving (T0310), and the screen (T0311), one concern each.
