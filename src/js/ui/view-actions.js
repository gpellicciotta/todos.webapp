/**
 * View actions: the three-dot button of a view's menu, which sits beside the account button in the top bar at every width.
 *
 * A view builds its button and menu in its own header, and this module moves both into the shell's top bar slot,
 * so phones and wide screens show the menu in the same place. Without a slot they stay in the view header.
 * A move closes an open menu. The slot hides while it holds nothing.
 */

import { spriteIcon } from '../views/task-list.js';

/**
 * Keep a view's More button and menu in the top bar slot while the view offers its actions.
 * @param {HTMLElement|null} slot the top bar slot; none keeps both in the view header
 * @param {object} options the view's parts
 * @param {HTMLElement} options.header the view header that holds the button while it is not in the slot
 * @param {HTMLButtonElement} options.more the button
 * @param {HTMLElement} options.menu the menu element
 * @param {string} options.headerLabel the accessible name of the button in the view header
 * @param {() => string} options.slotLabel returns the accessible name of the button in the top bar
 * @param {() => void} options.close closes the menu
 * @returns {{refresh: () => void, setVisible: (visible: boolean) => void, destroy: () => void}} the controller
 */
export function attachViewActions(slot, { header, more, menu, headerLabel, slotLabel, close }) {
  const doc = more.ownerDocument;
  let visible = true;
  let inSlot = null;

  /** Put the button and the menu where the view's state wants them. */
  function place() {
    const next = Boolean(slot) && visible;
    const label = next ? slotLabel() : headerLabel;
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

    /** Take the button and the menu out of the slot. */
    destroy() {
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
