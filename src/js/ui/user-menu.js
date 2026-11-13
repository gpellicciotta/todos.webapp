/**
 * User menu: the vendored account menu at the end of the top bar, kept current with the session.
 *
 * The menu is the one place for what the user needs only now and then: the account, Recycle bin, and Settings.
 * Local mode shows the person icon named Local User. A connected account shows its initials and its name.
 * The button's hover text and accessible name are the user name. The menu shows the name, then three items,
 * each with its icon: the connection state, which opens Connect, then Recycle bin and Settings.
 * The items carry `data-nav`, so the shell marks the current route.
 * An expired session says Sign in needed; the Sign in button sits in the session banner (see views/sync-indicator.js).
 * The menu re-reads the session when it changes and each time it opens.
 */

import { attachAccountMenu, initialsOf } from '../../vendor/design/js/account-menu.js';
import { createIcon } from '../../vendor/design/js/icon.js';

export { initialsOf };

/** User menu strings, for the strings module of TEC-13 to absorb. */
export const USER_STRINGS = Object.freeze({
  localUser: 'Local User',
  localOnly: 'Local only',
  connected: 'Connected',
  signInNeeded: 'Sign in needed',
  bin: 'Recycle bin',
  settings: 'Settings',
});

/** Menu items after the status item: the route, the navigation key the shell marks, the icon, and the label. */
const LINKS = [
  { hash: '#/bin', nav: 'bin', icon: 'bin', label: USER_STRINGS.bin },
  { hash: '#/settings', nav: 'settings', icon: 'settings', label: USER_STRINGS.settings },
];

/**
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text content
 * @returns {HTMLElement} the element
 */
function make(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

/**
 * Create a menu item link.
 * @param {Document} doc the document
 * @param {string} hash the route
 * @param {string} nav the navigation key the shell marks
 * @returns {HTMLAnchorElement} the item
 */
function item(doc, hash, nav) {
  const link = make(doc, 'a', 'menu__item');
  link.setAttribute('role', 'menuitem');
  link.href = hash;
  link.dataset.nav = nav;
  return link;
}

/**
 * Describe what the user menu shows for the session state.
 * @param {object} session the session
 * @returns {{account: {name: string}|null, status: string, icon: string}} the view
 */
function describe(session) {
  const state = session.state();
  const account = session.account();
  if (state === 'local' || !account) {
    return { account: null, status: USER_STRINGS.localOnly, icon: 'sync-local' };
  }
  const isConnected = state === 'connected';
  return {
    account: { name: account.name?.trim() || account.email },
    status: isConnected ? USER_STRINGS.connected : USER_STRINGS.signInNeeded,
    icon: isConnected ? 'sync-synced' : 'sync-sign-in',
  };
}

/**
 * Build the user menu into a slot and keep it current with the session.
 * @param {HTMLElement} slot the element that holds the menu, such as the end of the top bar
 * @param {object} options menu options
 * @param {object} options.session the session
 * @returns {{refresh: () => void, destroy: () => void}} the controller
 */
export function attachUserMenu(slot, { session }) {
  const doc = slot.ownerDocument;
  slot.classList.add('user-menu');

  const root = make(doc, 'div', 'account-menu');
  root.dataset.accountMenu = '';
  const button = make(doc, 'button', 'account-menu__button');
  button.type = 'button';
  const panel = make(doc, 'div', 'menu account-menu__panel');
  panel.id = 'user-panel';
  panel.setAttribute('role', 'menu');
  panel.popover = 'auto';
  const name = make(doc, 'p', 'account-menu__name');
  name.id = 'user-panel-name';
  name.dataset.accountMenuName = '';
  name.setAttribute('aria-hidden', 'true');
  const status = item(doc, '#/connect', 'connect');
  const links = LINKS.map(({ hash, nav, icon, label }) => {
    const link = item(doc, hash, nav);
    link.append(createIcon(doc, icon), doc.createTextNode(label));
    return link;
  });
  panel.append(name, status, ...links);
  root.append(button, panel);
  slot.append(root);

  let face = null;
  let menu = null;

  /** Show the name, the face, and the connection state the session asks for. */
  function refresh() {
    const view = describe(session);
    // Keep the face while it is the same, so the icon does not reload on every open.
    const key = view.account?.name ?? '';
    if (key !== face) {
      face = key;
      menu?.setAccount(view.account);
    }
    status.replaceChildren(createIcon(doc, view.icon), doc.createTextNode(view.status));
  }

  refresh();
  menu = attachAccountMenu(root, { account: describe(session).account, signedOutLabel: USER_STRINGS.localUser, onOpen: refresh });
  const stopListening = session.subscribe(refresh);

  return {
    refresh,

    /** Stop following the session and remove the menu. */
    destroy() {
      stopListening();
      menu.destroy();
      root.remove();
      slot.classList.remove('user-menu');
    },
  };
}
