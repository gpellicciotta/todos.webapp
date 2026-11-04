/**
 * Gallery behavior specimens: working menus and popovers driven by the modules in src/js/ui/.
 */

import { attachMenu } from '../js/ui/menu.js';
import { attachPopover } from '../js/ui/popover.js';

/**
 * Wire the working menu, which reports the last selected action.
 */
function wireMenu() {
  const result = document.getElementById('menu-demo-result');
  attachMenu(document.getElementById('menu-demo-trigger'), document.getElementById('menu-demo'), {
    onSelect(item) {
      result.textContent = `Last action: ${item.textContent.trim()}`;
    },
  });
}

/**
 * Wire the working filter popover, whose chip shows the checked statuses.
 */
function wirePopover() {
  const chip = document.getElementById('popover-demo-trigger');
  const panel = document.getElementById('popover-demo');
  const value = chip.querySelector('.filter-chip__value');
  const boxes = [...panel.querySelectorAll('input[type="checkbox"]')];

  /**
   * Show the checked statuses on the chip and press it while any is checked.
   */
  function update() {
    const checked = boxes.filter((box) => box.checked).map((box) => box.value);
    value.textContent = checked.length > 0 ? `: ${checked.join(', ')}` : '';
    chip.setAttribute('aria-pressed', String(checked.length > 0));
  }

  attachPopover(chip, panel);
  panel.addEventListener('change', update);
  panel.querySelector('[data-popover-clear]').addEventListener('click', () => {
    for (const box of boxes) {
      box.checked = false;
    }
    update();
  });
}

wireMenu();
wirePopover();
