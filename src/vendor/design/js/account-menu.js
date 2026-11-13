/**
 * Account menu: the round account button at the end of the top bar, and the menu it opens.
 *
 * A signed-in account shows its initials; a signed-out user, or a name without letters, shows the person icon.
 * The button's hover text and accessible name are the user name, and the menu takes its name from the name line.
 * The item whose `href` equals the current route carries `aria-current="page"`.
 * Keyboard and pointer behavior come from the menu module; a link chosen by keyboard is followed through a click.
 */

import { createIcon } from './icon.js';
import { attachMenu } from './menu.js';

/**
 * Take the initials of a name: the first letters of its first and last word, in upper case.
 * An email address or a single word gives one letter.
 * @param {string} name the user name or email address
 * @returns {string} up to two letters, empty for a blank name
 */
export function initialsOf(name) {
    const words = name.trim().split(/\s+/u).filter(Boolean);
    return [words[0], words.length > 1 ? words.at(-1) : null]
        .filter(Boolean)
        .map((word) => [...word][0].toLocaleUpperCase())
        .join('');
}

/**
 * Attach account menu behavior to a `.account-menu` holding its button and its menu.
 * @param {HTMLElement} root element whose child button opens its child `popover` menu
 * @param {object} [options] behavior options
 * @param {{name: string}|null} [options.account] the signed-in account, or nothing when signed out
 * @param {string} [options.route] the current route, compared with each item's `href` attribute
 * @param {string} [options.signedOutLabel] the name shown when signed out, `Not signed in` by default
 * @param {(item: HTMLElement, event: Event) => void} [options.onSelect] called after an item is selected;
 *   a link's `click` event reaches it, so `event.preventDefault()` keeps the page
 * @param {boolean} [options.anchor] position the menu at the button, true by default
 * @param {() => void} [options.onOpen] called after the menu opens
 * @param {(reason: string) => void} [options.onClose] called after the menu closes, as for popovers
 * @returns {{setAccount: (account: {name: string}|null) => void, setRoute: (route: string|null) => void,
 *   open: (at?: 'first'|'last') => void, close: (reason?: string) => void, isOpen: () => boolean, destroy: () => void}}
 *   the controller
 */
export function attachAccountMenu(root, options = {}) {
    const { signedOutLabel = 'Not signed in', onSelect, anchor = true, onOpen, onClose } = options;
    const doc = root.ownerDocument;
    const button = root.querySelector(':scope > button');
    const menu = root.querySelector(':scope > [popover]');
    const nameLine = menu.querySelector('[data-account-menu-name]');
    const labelsMenu = Boolean(nameLine?.id) && !menu.hasAttribute('aria-label') && !menu.hasAttribute('aria-labelledby');

    /**
     * Show the initials or the person icon, and name the button and the name line.
     * @param {{name: string}|null} [account] the signed-in account
     */
    function setAccount(account) {
        const name = account?.name?.trim() ?? '';
        const initials = initialsOf(name);
        const label = initials ? name : signedOutLabel;
        const face = doc.createElement('span');
        face.className = initials ? 'avatar avatar--sm avatar--initials' : 'avatar avatar--sm';
        face.setAttribute('aria-hidden', 'true');
        face.append(initials || createIcon(doc, 'user'));
        button.replaceChildren(face);
        button.title = label;
        button.setAttribute('aria-label', label);
        if (nameLine) {
            nameLine.textContent = label;
        }
    }

    /**
     * Mark the item of the current route, and clear the mark on every other item.
     * @param {string|null} [route] the current route, such as `#/settings` or `/account`
     */
    function setRoute(route) {
        for (const item of menu.querySelectorAll('[href]')) {
            if (route && item.getAttribute('href') === route) {
                item.setAttribute('aria-current', 'page');
            }
            else {
                item.removeAttribute('aria-current');
            }
        }
    }

    /**
     * Follow a link chosen by keyboard through a click, which selects it again and reaches `onSelect` once.
     * @param {HTMLElement} item selected item
     * @param {Event} event event that selected it
     */
    function select(item, event) {
        if (event.type === 'keydown' && item.matches('a[href]')) {
            item.click();
            return;
        }
        onSelect?.(item, event);
    }

    const controller = attachMenu(button, menu, { onSelect: select, anchor, align: 'end', onOpen, onClose });

    /**
     * Close the menu and remove every listener and attribute this module added.
     * The button keeps its face and name.
     */
    function destroy() {
        controller.destroy();
        setRoute(null);
        if (labelsMenu) {
            menu.removeAttribute('aria-labelledby');
        }
    }

    if (labelsMenu) {
        menu.setAttribute('aria-labelledby', nameLine.id);
    }
    setAccount(options.account);
    setRoute(options.route);

    return { setAccount, setRoute, open: controller.open, close: controller.close, isOpen: controller.isOpen, destroy };
}
