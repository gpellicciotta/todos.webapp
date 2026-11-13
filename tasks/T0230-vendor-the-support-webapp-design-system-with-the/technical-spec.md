# T0230 Technical Specification
Vendor the support.webapp design system with the neutral look and apply its token renames, losslessly.

---

## Declared Files
Files are listed when the task starts, after reading the app at a recorded commit.

Size note: No estimate yet; the task counts as above the large line until refined.

### Tests
- Unit: a test that fails on any renamed token name left in the app's CSS and JavaScript.
- Integration: the app's browser tests on its main pages at 390 and 1440 px, light and dark, before and after the switch

Completion check: the app's full check and `node src/vendor/design/bin/check.mjs`, both exit code 0
