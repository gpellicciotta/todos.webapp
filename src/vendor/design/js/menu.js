/**
 * Menu behavior: a menu button that opens an anchored `role="menu"` list of items.
 *
 * Enter, Space, ArrowDown, or a click open the menu at its first item; ArrowUp opens it at the last.
 * In the menu, ArrowUp and ArrowDown move with wrap, Home and End jump, and a letter jumps by first letter.
 * Enter, Space, or a click select an item; Escape, Tab, or an outside click close the menu.
 * Items with `aria-disabled="true"` are skipped and never selected.
 */

import { attachPopover } from './popover.js';

const ITEM = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/**
 * Tell whether a menu item can be focused and selected.
 * @param {HTMLElement} item menu item
 * @returns {boolean} true unless the item is disabled
 */
function isEnabled(item) {
    return item.getAttribute('aria-disabled') !== 'true' && !item.disabled;
}

/**
 * Attach menu behavior to a trigger button and its menu.
 * @param {HTMLElement} trigger button that opens the menu
 * @param {HTMLElement} menu container of the items; it gets `role="menu"` and becomes a closed popover
 * @param {object} [options] behavior options
 * @param {(item: HTMLElement, event: Event) => void} [options.onSelect] called after an item is selected
 *   and the menu has closed; radio items are checked and checkbox items toggled before the call
 * @param {boolean} [options.anchor] position the menu at the trigger, true by default
 * @param {'start'|'end'} [options.align] the inline edge of the menu that lines up with the trigger's, `start` by default
 * @param {() => void} [options.onOpen] called after the menu opens
 * @param {(reason: string) => void} [options.onClose] called after the menu closes, as for popovers
 * @returns {{open: (at?: 'first'|'last') => void, close: (reason?: string) => void, isOpen: () => boolean, destroy: () => void}}
 *   the controller
 */
export function attachMenu(trigger, menu, options = {}) {
    const { onSelect, anchor = true, align, onOpen, onClose } = options;

    /**
     * List the menu's enabled items in order.
     * @returns {HTMLElement[]} the items that can take focus
     */
    function enabledItems() {
        return [...menu.querySelectorAll(ITEM)].filter(isEnabled);
    }

    /**
     * Find the item that gets focus on open, keeping every item out of the Tab order.
     * @param {'first'|'last'} at which enabled item to return
     * @returns {HTMLElement|undefined} the item, if the menu has an enabled one
     */
    function entryItem(at) {
        for (const item of menu.querySelectorAll(ITEM)) {
            item.setAttribute('tabindex', '-1');
        }
        const items = enabledItems();
        return at === 'last' ? items.at(-1) : items[0];
    }

    // Trigger clicks toggle the popover, which then focuses the first enabled item.
    const popover = attachPopover(trigger, menu, { anchor, align, initialFocus: () => entryItem('first'), onOpen, onClose });

    /**
     * Open the menu with focus on its first or last enabled item.
     * @param {'first'|'last'} [at] which item gets focus
     */
    function open(at = 'first') {
        popover.open(() => entryItem(at));
    }

    /**
     * Move focus by an offset among the enabled items, wrapping at both ends.
     * @param {HTMLElement|null} current item that has focus, if any
     * @param {number} offset +1 for the next item, -1 for the previous one
     */
    function move(current, offset) {
        const items = enabledItems();
        if (items.length === 0) {
            return;
        }
        const index = items.indexOf(current);
        const start = index === -1 ? (offset > 0 ? -1 : 0) : index;
        items[(start + offset + items.length) % items.length].focus();
    }

    /**
     * Focus the next enabled item whose text starts with a character, after the current item.
     * @param {HTMLElement|null} current item that has focus, if any
     * @param {string} character typed character
     */
    function typeAhead(current, character) {
        const items = enabledItems();
        const index = items.indexOf(current);
        const wanted = character.toLowerCase();
        for (let step = 1; step <= items.length; step += 1) {
            const item = items[(index + step) % items.length];
            if (item.textContent.trim().toLowerCase().startsWith(wanted)) {
                item.focus();
                return;
            }
        }
    }

    /**
     * Select an item: update its checked state, close the menu, and call `onSelect`.
     * @param {HTMLElement} item selected item
     * @param {Event} event event that selected it
     */
    function select(item, event) {
        if (!isEnabled(item)) {
            return;
        }
        const role = item.getAttribute('role');
        if (role === 'menuitemradio') {
            const group = item.closest('[role="group"]') ?? menu;
            for (const radio of group.querySelectorAll('[role="menuitemradio"]')) {
                radio.setAttribute('aria-checked', String(radio === item));
            }
        }
        else if (role === 'menuitemcheckbox') {
            item.setAttribute('aria-checked', String(item.getAttribute('aria-checked') !== 'true'));
        }
        popover.close('select');
        onSelect?.(item, event);
    }

    /**
     * Open the menu from the keyboard on the trigger.
     * @param {KeyboardEvent} event keydown event
     */
    function onTriggerKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault();
            open('first');
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            open('last');
        }
    }

    /**
     * Keep a released Space from clicking a button, since keydown already acted on it.
     * @param {KeyboardEvent} event keyup event
     */
    function onKeyup(event) {
        if (event.key === ' ') {
            event.preventDefault();
        }
    }

    /**
     * Navigate, select, and close from the keyboard inside the menu.
     * @param {KeyboardEvent} event keydown event
     */
    function onMenuKeydown(event) {
        const current = event.target.closest(ITEM);
        const key = event.key;
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();
            move(current, key === 'ArrowDown' ? 1 : -1);
        }
        else if (key === 'Home' || key === 'End') {
            event.preventDefault();
            const items = enabledItems();
            (key === 'Home' ? items[0] : items.at(-1))?.focus();
        }
        else if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            if (current) {
                select(current, event);
            }
        }
        else if (key === 'Tab') {
            popover.close('tab');
        }
        else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            typeAhead(current, key);
        }
    }

    /**
     * Select an item on click; clicks on disabled items do nothing.
     * @param {MouseEvent} event click event
     */
    function onMenuClick(event) {
        const item = event.target.closest(ITEM);
        if (item && menu.contains(item)) {
            select(item, event);
        }
    }

    /**
     * Close the menu and remove every listener and attribute this module added.
     */
    function destroy() {
        trigger.removeEventListener('keydown', onTriggerKeydown);
        trigger.removeEventListener('keyup', onKeyup);
        menu.removeEventListener('keydown', onMenuKeydown);
        menu.removeEventListener('keyup', onKeyup);
        menu.removeEventListener('click', onMenuClick);
        popover.destroy();
        trigger.removeAttribute('aria-haspopup');
    }

    trigger.setAttribute('aria-haspopup', 'menu');
    if (!menu.hasAttribute('role')) {
        menu.setAttribute('role', 'menu');
    }
    entryItem('first');
    trigger.addEventListener('keydown', onTriggerKeydown);
    trigger.addEventListener('keyup', onKeyup);
    menu.addEventListener('keydown', onMenuKeydown);
    menu.addEventListener('keyup', onKeyup);
    menu.addEventListener('click', onMenuClick);

    return { open, close: popover.close, isOpen: popover.isOpen, destroy };
}
