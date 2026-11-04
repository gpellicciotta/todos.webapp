/**
 * Gallery behavior specimens: working menus, popovers, dialogs, and toasts driven by the modules in src/js/ui/.
 */

import { openDialog } from '../js/ui/dialog.js';
import { attachMenu } from '../js/ui/menu.js';
import { attachPopover } from '../js/ui/popover.js';
import { createToaster } from '../js/ui/toast.js';

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

/**
 * Wire every `[data-open-dialog]` button to open its modal dialog and report how it closed.
 */
function wireDialogs() {
  const result = document.getElementById('dialog-demo-result');
  for (const button of document.querySelectorAll('[data-open-dialog]')) {
    button.addEventListener('click', () => {
      openDialog(document.getElementById(button.dataset.openDialog), {
        opener: button,
        onClose(returnValue) {
          result.textContent = `Closed with: ${returnValue || 'none'}`;
        },
      });
    });
  }
}

/**
 * Wire the working toast: a delete confirmation with Undo, which reports how the toast went.
 */
function wireToast() {
  const result = document.getElementById('toast-demo-result');
  const toaster = createToaster({ region: document.getElementById('toast-demo-region') });
  document.getElementById('toast-demo-trigger').addEventListener('click', () => {
    toaster.show('Task moved to the recycle bin.', {
      onAction() {
        toaster.show('Task restored.');
      },
      onDismiss(reason) {
        result.textContent = `Last toast: ${reason === 'action' ? 'undone' : reason}`;
      },
    });
  });
}

wireMenu();
wirePopover();
wireDialogs();
wireToast();
