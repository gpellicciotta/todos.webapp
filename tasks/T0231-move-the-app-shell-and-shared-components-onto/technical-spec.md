# T0231 Technical Specification
Move the app shell and shared components onto the vendored design system, keeping task rows app-local.

---

## Declared Files
Files are listed when the task starts, after reading the app at a recorded commit.

Size note: No estimate yet; the task counts as above the large line until refined.

### Tests
- Unit: tests of every app module whose imports move to the vendored components.
- Integration: the app's browser tests on its main pages at 390 and 1440 px, light and dark, before and after the switch

Completion check: the app's full check and `node src/vendor/design/bin/check.mjs`, both exit code 0
