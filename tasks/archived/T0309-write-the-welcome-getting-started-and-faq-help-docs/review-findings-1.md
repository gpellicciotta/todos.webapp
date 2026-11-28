---
task: T0309
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-28T00:33:50Z
reviewed_commit: "99ddb5a"
base_commit: "82eec25"
branch: task/T0309-write-the-welcome-getting-started-and-faq-help-docs
session: antigravity-20261128-71ef0a
session_agent: antigravity
session_created_at: 2026-11-28T00:32:59Z
---
# Review Findings: Task T0309 (Round 1)

## Summary
The three docs meet the contract in technical-spec.md, so the work is approved.
The commit adds `welcome.md`, `getting-started.md`, and `faq.md`, links them from `docs/index.md`, and adds a CHANGELOG entry.

Checks I ran:
- Structure: each doc has one level-1 heading on line 1 with the exact required title, an intro, and only level-2 parts. Counts are 8 welcome concepts, 9 numbered tutorial steps, and 16 FAQ questions, all in spec order, and every FAQ heading ends in `?`.
- Subset: no level-3 headings, tables, images, code fences, HTML, blockquotes, nested lists, or links.
- Shortcuts: all 10 `SHORTCUTS` rows in `src/js/views/settings.js` appear with the same keys and meaning, in the `a` or `b` bullet form.
- Add syntax: dates, times, `#list`, and the backslash escape match `STRINGS.syntax` and the Typed syntax rules of ui-design.md.
- Other facts: 23:59 and 09:00 date-only rules, the 1 to 99 repeat unit, share roles, the Update button, the 30-day recycle bin, and the control labels (**Make Enter add**, **Export backup**, **Import backup**, **Remind me when tasks come due**, **Sign in**) match requirements.md, ui-design.md, and the code. The placeholder "Search or add a task" exists in `add-bar.js`.
- Scope: the docs leave out ADR-0006 goals, logs, and start times, as the spec requires.
- `git diff --check main...HEAD` exits 0.

## Defects
None

## Process Gaps
- Non-blocking: paragraphs wrap one sentence per source line, while the spec says "no hard line breaks". These are soft breaks, so T0311 must join the lines of a paragraph. The T0311 parser test should cover this.
- Non-blocking: `validation-proof.md` records heading counts only. It does not record the shortcut and syntax comparison it claims, which this review redid.
- Non-blocking: the FAQ report answer and the Help screen references describe the T0311 Application Info & Support panel, which does not exist yet. The spec permits this.

## Required Rework
None
