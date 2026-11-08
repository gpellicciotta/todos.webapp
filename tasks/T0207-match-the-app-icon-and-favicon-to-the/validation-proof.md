## Walkthrough & Validation

Redrew `src/img/app-icon.svg` with the portal Todos glyph; the box border is the app gray `#5e5e6b` (muted text color of the To do icon).

### Service worker check
```text
$ npm run check:sw
> node scripts/check-sw-version.mjs

OK: 75 precached files match VERSION 2026-11-08.6.
```

### Unit tests
```text
$ npx vitest run
 Test Files  59 passed (59)
      Tests  1170 passed (1170)
```
