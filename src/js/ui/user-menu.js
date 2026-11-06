/**
 * User menu: the circular user button at the top right of the main view, and its popover panel.
 *
 * The button is the one place for what the user needs only now and then: the account, Recycle bin, and Settings.
 * Local mode shows a person icon named Local User. A connected account shows its initials and its name.
 * Its hover text and accessible name are the user name; the panel shows the name, the connection state,
 * and buttons, each with its icon, that open Recycle bin and Settings. They carry `data-nav` so the shell marks the current route.
 * An expired session adds a Sign in button before the user button, which opens the connect screen (`CON-13`).
 * Without one, the page holds no Sign in text at all (`LOC-1`).
 * The panel re-reads the session when it changes and each time it opens.
 */

import { anchorPanel, attachPopover } from './popover.js';

const ICONS = 'img/icons.svg';

/** User menu strings, for the strings module of TEC-13 to absorb. */
export const USER_STRINGS = Object.freeze({
  localUser: 'Local User',
  localOnly: 'Local only',
  connected: 'Connected',
  signInNeeded: 'Sign in needed',
  signIn: 'Sign in',
  panel: 'Account',
  bin: 'Recycle bin',
  settings: 'Settings',
});

/** Panel links: the route, the navigation key the shell marks, the icon, and the label. */
const LINKS = [
  { hash: '#/bin', nav: 'bin', icon: 'bin', label: USER_STRINGS.bin },
  { hash: '#/settings', nav: 'settings', icon: 'settings', label: USER_STRINGS.settings },
];

/**
 * Take the initials of a name: the first letters of its first and last word, in upper case.
 * An email address or a single word gives one letter.
 * @param {string} name the user name or email address
 * @returns {string} one or two letters
 */
export function initialsOf(name) {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const letters = [words[0], words.length > 1 ? words.at(-1) : null]
    .filter(Boolean)
    .map((word) => [...word][0].toLocaleUpperCase());
  return letters.join('');
}

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
 * Create a decorative sprite icon.
 * @param {Document} doc the document
 * @param {string} id the symbol identifier
 * @returns {SVGElement} the icon
 */
function icon(doc, id) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${ICONS}#${id}`);
  svg.append(use);
  return svg;
}

/**
 * Describe what the user menu shows for the session state.
 * @param {object} session the session
 * @returns {{name: string, status: string, initials: string|null, signInNeeded: boolean}} the view
 */
function describe(session) {
  const state = session.state();
  const account = session.account();
  if (state === 'local' || !account) {
    return { name: USER_STRINGS.localUser, status: USER_STRINGS.localOnly, initials: null, signInNeeded: false };
  }
  const name = account.name?.trim() || account.email;
  return {
    name,
    status: state === 'connected' ? USER_STRINGS.connected : USER_STRINGS.signInNeeded,
    initials: initialsOf(name),
    signInNeeded: state === 'sign-in-needed',
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

  const signIn = make(doc, 'a', 'button button--secondary user-menu__sign-in', USER_STRINGS.signIn);
  signIn.href = '#/connect';

  const button = make(doc, 'button', 'user-button');
  button.type = 'button';

  const panel = make(doc, 'div', 'popover user-panel');
  panel.id = 'user-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', USER_STRINGS.panel);
  const name = make(doc, 'p', 'user-panel__name');
  const status = make(doc, 'p', 'user-panel__status');
  const links = LINKS.map(({ hash, nav, icon: iconId, label }) => {
    const link = make(doc, 'a', 'button button--secondary user-panel__link');
    link.href = hash;
    link.dataset.nav = nav;
    link.append(icon(doc, iconId), doc.createTextNode(label));
    return link;
  });
  panel.append(name, status, ...links);
  slot.append(button, panel);

  /** Show the name, the connection state, and the Sign in button the session asks for. */
  function refresh() {
    const view = describe(session);
    button.title = view.name;
    button.setAttribute('aria-label', view.name);
    // Keep the face while it is the same, so the icon does not reload on every open.
    const face = view.initials ?? '';
    if (button.dataset.face !== face || button.childNodes.length === 0) {
      button.dataset.face = face;
      button.replaceChildren(view.initials ? doc.createTextNode(view.initials) : icon(doc, 'user'));
    }
    button.dataset.state = session.state();
    name.textContent = view.name;
    status.textContent = view.status;
    if (view.signInNeeded) {
      if (signIn.parentNode !== slot) {
        slot.prepend(signIn);
      }
    }
    else {
      signIn.remove();
    }
    if (popover?.isOpen()) {
      anchorPanel(panel, button, undefined, 'end');
    }
  }

  let popover = null;
  // Refresh before the popover opens, so it places the panel at its current size.
  button.addEventListener('click', refresh);
  popover = attachPopover(button, panel, { align: 'end' });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      popover.close('select');
    }
  });
  refresh();
  const stopListening = session.subscribe(refresh);

  return {
    refresh,

    /** Stop following the session and remove the menu. */
    destroy() {
      stopListening();
      button.removeEventListener('click', refresh);
      popover.destroy();
      signIn.remove();
      button.remove();
      panel.remove();
      slot.classList.remove('user-menu');
    },
  };
}
