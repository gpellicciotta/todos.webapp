## Walkthrough & Validation

Redrew `src/img/app-icon.svg` with the portal Todos glyph, rendered the PNGs, bumped the service worker VERSION.

### Service worker check
```text
$ npm run check:sw
> node scripts/check-sw-version.mjs

OK: 75 precached files match VERSION 2026-11-08.5.
exit code: 0
```

### Unit tests
```text
$ npx vitest run
 Test Files  59 passed (59)
      Tests  1170 passed (1170)
```
