## Technical Specifications

The Help screen (T0311) shows five panels, modeled on the Help screen of the Counters app:
Application Info & Support, Welcome to ToDo's, Getting Started Tutorial, FAQ, and Release notes.
This task writes the content of the middle three as Markdown.
T0311 builds Application Info from `src/js/version.js` and Release notes from `CHANGELOG.md`, so these docs hold neither.

### Files
- `docs/tutorial/welcome.md`: the Welcome to ToDo's panel.
- `docs/tutorial/getting-started.md`: the Getting Started Tutorial panel.
- `docs/tutorial/faq.md`: the FAQ panel.

### Structure Contract
T0311 parses the docs by heading, so every doc keeps this shape:
- Line 1 is the only level-1 heading; it becomes the panel title.
  - `# Welcome to ToDo's`
  - `# Getting Started Tutorial`
  - `# Frequently Asked Questions`
- One or more intro paragraphs follow before the first level-2 heading.
- Each level-2 heading starts one part, which runs until the next level-2 heading:
  - `welcome.md`: one concept per part, such as `## Lists`.
  - `getting-started.md`: one step per part, numbered in the heading, such as `## 1. Add your first task`.
  - `faq.md`: one question per part, ending in `?`; the part body is the answer.

### Markdown Subset
The renderer of T0311 supports only these constructs; everything else shows as plain text:
- Level-1 and level-2 headings, as described above; no level-3 or deeper headings.
- Paragraphs separated by one blank line; no hard line breaks.
- One level of `-` bullet lists or `1.` numbered lists; no nesting.
- `**bold**`, `*italic*`, and inline code in backticks.
- Links `[label](https://...)` to public pages, and `[label](#/route)` to app routes such as `#/settings`.
- No raw HTML, images, tables, blockquotes, code fences, or footnotes.

### Style
- Follow the `markdown-guidelines` skill and US English.
- Write for end users, not developers: short sentences, active verbs, and second person.
- Name controls in bold exactly as the screen labels them, such as **Edit view options** or **Make Enter add**.
- Write keys as inline code, such as `Shift+Enter`.

### Facts and Sources
- Describe only behavior shipped in `main` when the task runs; read `docs/requirements.md` and `docs/specs/ui-design.md`.
- Leave out ADR-0006 goals, logs, and start times until T0306 and T0307 ship them; those tasks update the docs.
- Copy every row of `SHORTCUTS` in `src/js/views/settings.js` into the shortcut answer, with the same keys and meaning.
- Copy the add field syntax of `STRINGS.syntax` in `src/js/views/settings.js` and the Typed syntax rules of `ui-design.md`.

### Welcome Concepts
One part each, in this order:
- Tasks: a description, notes, and an optional due time.
- Statuses: To do, In progress, Completed, and Cancelled, and the status button.
- Lists: a task can sit in several lists or none; All tasks shows every task.
- Due times and overdue handling.
- Repeating tasks and target counts.
- Search and view options: the search and add field, filters, grouping, and sorting.
- Local and connected mode: data stays on the device until the user connects to sync and share.
- Recycle bin: deleted lists and tasks stay 30 days.

### Tutorial Steps
One part each, in this order:
1. Add your first task with the search and add field, Enter, or the **+** button.
2. Set a due date, time, and list by typing, such as `Buy paint tomorrow 18:00 #home`.
3. Create a list on the Lists screen and open it.
4. Open a task to edit its description, notes, status, lists, due time, and repeat.
5. Tick tasks with the status button or `x`, and undo with the toast or `Ctrl+Z`.
6. Find tasks with search and **Edit view options**.
7. Export a backup from **Settings**.
8. Optionally connect to sync across devices and share lists.
9. Install the app on a phone or computer.

### Required FAQ Questions
Keep these questions, in this order; reword them only for accuracy:
1. Do I need an account to use ToDo's?
2. Where are my lists and tasks stored?
3. How do I sync my tasks across devices?
4. How do I back up or move my data?
5. What can I type in the add field?
6. How do I search, filter, group, or sort tasks?
7. Why does Enter add a task, and how can it only search?
8. How do repeating tasks and target counts work?
9. What happens when a task becomes overdue?
10. How do reminders work?
11. How do I share a list?
12. What happens when I delete a task or a list?
13. How do I install ToDo's on my phone or computer?
14. How do I get a new version of the app?
15. Which keyboard shortcuts can I use?
16. Where can I report a problem or suggest an idea?

The shortcut answer is one bullet per `SHORTCUTS` row, keys joined by "or", such as:

```markdown
- `n` or `/`: Focus the search and add field.
```

The report answer points to the **Report a problem** link of the Application Info & Support panel.

### Declared Files
- docs/index.md

Added files, outside the size count: `docs/tutorial/welcome.md`, `docs/tutorial/getting-started.md`, `docs/tutorial/faq.md`.

### Tests
- Unit test: none (documentation only; T0311 adds a unit test that parses these docs against the contract).
- Integration test: none (documentation only; T0311 renders the docs in its end-to-end tests).

Completion check: agent review of the three docs against this contract, and `git diff --check`.

Size estimate: 1 files, 5 lines
