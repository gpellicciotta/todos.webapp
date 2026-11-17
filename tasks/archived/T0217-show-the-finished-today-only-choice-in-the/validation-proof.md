## Walkthrough & Validation

Wireframes regenerated with `python scripts/draw-wireframes.py docs/img/ui`; only view-options.svg kept (other SVGs differed only by line endings and were reverted).

```
> npx playwright test tests/e2e/gallery-controls.spec.js   (exit 0)
  14 passed (13.6s)

> node scripts/check-sw-version.mjs   (before bump, exit 1; same failure on main, files untouched by this task)
ERROR: precached files changed but VERSION is still 2026-11-17.11:
  js/app.js ... js/views/settings.js

> node scripts/check-sw-version.mjs --update   (after VERSION 2026-11-17.12)
OK: wrote 129 hashes for VERSION 2026-11-17.12
> node scripts/check-sw-version.mjs   (exit 0)
OK: 129 precached files match VERSION 2026-11-17.12.
```

Visual: wireframe SVG diff shows the new "Finished today only" rows at y=341 in both layouts. Gallery rendering in both themes is covered by the passing gallery-controls spec; no screenshots were taken.
