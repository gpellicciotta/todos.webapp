## Walkthrough & Validation

Documentation only: both specs gained the ADR-0006 model; the lint run is the completion check.
The first lint run flagged an unverifiable external ADR link (HTTP 429) and two links to files that do not exist yet.
Those became plain text and code spans.

### `lint-markdown check docs/specs/local-store.md docs/specs/backup-format.md`
Exit code: 0

```text
All 2 markdown files passed linting.
```
