// Shared unit test setup: what app.js does at startup for the vendored components.
// happy-dom lacks the popover API that the vendored menus and popovers use, so DOM test files get the shim.
// The vendored field and account menu draw icons from the look sprite, which app.js sets once.
import { setSpriteUrl } from '../../src/vendor/design/js/icon.js';
import { installPopoverShim } from './popover-shim.js';

if (globalThis.HTMLElement) {
  installPopoverShim();
}
setSpriteUrl('vendor/design/looks/neutral/icons.svg');
