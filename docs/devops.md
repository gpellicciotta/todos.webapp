# DevOps
Development environment, planning workflow, and operational procedures for `todos.webapp`.

---

## Prerequisites
- Git, with access to the `gpellicciotta/todos.webapp` GitHub repository.
- The [plan](https://github.com/gpellicciotta/plan) CLI.
- Node.js 22.13 or later, with npm.
- Python 3.10 or later, with pytest and Ruff 0.17, for the documentation scripts.

---

## Web App
The app has no build step: [src](../src/) is the web root and the deployed folder.
Install the development tools once, plus the Chromium build that Playwright drives:

```bash
npm install
npx playwright install chromium
```

Day-to-day commands:

```bash
npm run serve        # serve src/ at http://127.0.0.1:8080/
npm test             # unit tests with Vitest, from tests/unit/
npm run lint         # ESLint, including Stroustrup brace style
npm run test:e2e     # Playwright end-to-end tests, from tests/e2e/
```

- [serve.mjs](../scripts/serve.mjs) uses Node.js built-ins only and disables caching; pass `--port` or `--root` to change them.
- Playwright starts and stops its own server on port 8754; set `E2E_PORT` to use another port.

---

## Wireframes
[draw-wireframes.py](../scripts/draw-wireframes.py) draws the UI wireframes of [ui-design.md](specs/ui-design.md).
Regenerate them after changing a screen, then check the script and its output:

```bash
python scripts/draw-wireframes.py docs/img/ui
python -m pytest tests
ruff check scripts tests
ruff format --check scripts tests
```

The tests fail when a shape leaves its frame, so overflow at 390 px shows up before review.

---

## Plan Store
Tasks live on the `plan` branch, checked out at `.plan/`; [PLAN.md](../PLAN.md) is a link into that checkout.
A fresh clone has no `.plan/` until you attach the store:

```bash
git clone https://github.com/gpellicciotta/todos.webapp.git
cd todos.webapp
plan init --store branch
```

Publish both refs when pushing: `main` for code and `plan` for tasks.

---

## Task Coordination Protocol
Tasks are managed only through the `plan` CLI:
1. Create: `plan tasks create "{{description}}"`, adding `--protocol adhoc` for small changes.
2. Start: `plan tasks start {{task-id}} --owner @{{agent}}` provisions a branch and worktree for standard tasks.
3. Execute: Work in the resolved workspace, keeping the task file in `.plan/tasks/` current.
4. Finalize: Pass all checks, update `CHANGELOG.md` and documentation, then run `plan tasks stop {{task-id}} --status completed`.
