/**
 * View actions: the three-dot button of a view's menu, which sits beside the account button in the top bar from 64rem.
 *
 * A view builds its button and menu in its own header, and this module moves both into the shell's top bar slot while the
 * layout is wide, then back below 64rem. A move closes an open menu. The slot hides while it holds nothing.
 */

import { spriteIcon } from '../views/task-list.js';

const COMPACT = '(width < 64rem)';

/**
 * Keep a view's More button and menu in the header slot on wide layouts and in the view header on compact ones.
 * @param {HTMLElement|null} slot the top bar slot; none keeps both in the view header
 * @param {object} options the view's parts
 * @param {HTMLElement} options.header the view header that holds the button on compact layouts
 * @param {HTMLButtonElement} options.more the button
 * @param {HTMLElement} options.menu the menu element
 * @param {string} options.compactLabel the accessible name of the button in the view header
 * @param {() => string} options.wideLabel returns the accessible name of the button in the top bar
 * @param {() => void} options.close closes the menu
 * @returns {{refresh: () => void, setVisible: (visible: boolean) => void, destroy: () => void}} the controller
 */
export function attachViewActions(slot, { header, more, menu, compactLabel, wideLabel, close }) {
  const doc = more.ownerDocument;
  const media = slot ? doc.defaultView?.matchMedia?.(COMPACT) : null;
  let visible = true;
  let inSlot = null;

  /** Put the button and the menu where the layout and the view's state want them. */
  function place() {
    const next = Boolean(slot) && !media?.matches && visible;
    const label = next ? wideLabel() : compactLabel;
    if (next !== inSlot) {
      close();
      inSlot = next;
      more.replaceChildren(spriteIcon(doc, next ? 'more-vertical' : 'more'));
      (next ? slot : header).append(more, menu);
    }
    more.setAttribute('aria-label', label);
    menu.setAttribute('aria-label', label);
    if (slot) {
      slot.hidden = slot.childElementCount === 0;
    }
  }

  media?.addEventListener?.('change', place);
  place();
  return {
    refresh: place,

    /**
     * Show or hide the button, for views whose header leaves while they hold no tasks.
     * @param {boolean} shown whether the view offers its actions
     */
    setVisible(shown) {
      visible = shown;
      place();
    },

    /** Stop following the layout and take the button and the menu out of the slot. */
    destroy() {
      media?.removeEventListener?.('change', place);
      if (inSlot) {
        more.remove();
        menu.remove();
        inSlot = null;
      }
      if (slot) {
        slot.hidden = slot.childElementCount === 0;
      }
    },
  };
}
