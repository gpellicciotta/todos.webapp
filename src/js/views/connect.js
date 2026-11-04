/**
 * Connect screen: explains connected mode, signs in through Auth, and shows the result (`CON-1` to `CON-3`).
 *
 * Sign in sends the browser to Auth, which returns to `#/connect`; the shell captures the code before routing.
 * Phases: intro, working, signed in, not invited, error, and expired (`CON-13`).
 * Uploading and downloading data come with the sync tasks; until then signing in ends at Done.
 */

import { spriteIcon } from './task-list.js';

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  gains: 'Connecting syncs your data across devices and lets you share lists.',
  cost: 'It needs an account, so you are no longer anonymous. Access is by invitation.',
  server: (url) => `Server: ${url}`,
  signIn: 'Sign in',
  working: 'Signing in…',
  signedIn: (account) => (account.name ? `Signed in as ${account.name} (${account.email})` : `Signed in as ${account.email}`),
  syncLater: 'Syncing your data arrives in a later version; until then it stays on this device.',
  done: 'Done',
  notInvited: 'Access to ToDo\'s is by invitation only.',
  notInvitedHint: 'Ask someone who uses ToDo\'s to invite you. Your data stays on this device.',
  back: 'Back to Settings',
  failed: 'Sign-in did not finish.',
  reasons: Object.freeze({
    network: 'The server could not be reached. Check the connection and try again.',
    'not-started': 'Start the sign-in from this screen, then try again.',
    rejected: 'The server did not accept the sign-in. Try again.',
  }),
  expired: 'Your session expired. Sign in again to keep syncing; your changes stay on this device.',
});

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
 * Mount the connect screen into its view element.
 * @param {HTMLElement} view the `[data-view="connect"]` element
 * @param {object} options screen options
 * @param {object} options.session the session
 * @param {(hash: string) => void} [options.navigate] opens a route
 * @param {(url: string) => void} [options.assign] opens the Auth URL, `location.assign` by default
 * @returns {{update: () => void, destroy: () => void}} the screen
 */
export function mountConnect(view, { session, navigate, assign }) {
  const doc = view.ownerDocument;
  const win = doc.defaultView;
  const root = make(doc, 'div', 'settings connect');
  const card = make(doc, 'section', 'settings__section');
  card.setAttribute('aria-live', 'polite');
  root.append(card);
  view.replaceChildren(root);
  let alive = true;

  /**
   * Create a button.
   * @param {string} text the label
   * @param {string} className the class
   * @param {() => void} onClick the action
   * @returns {HTMLButtonElement} the button
   */
  function button(text, className, onClick) {
    const element = make(doc, 'button', className, text);
    element.type = 'button';
    element.addEventListener('click', onClick);
    return element;
  }

  /** Send the browser to Auth, after remembering the sign-in on this device. */
  function signIn() {
    const returnUrl = new URL('#/connect', win.location.href).href;
    const logoUrl = new URL('img/app-icon-192.png', win.location.href).href;
    (assign ?? ((url) => win.location.assign(url)))(session.start({ returnUrl, logoUrl }));
  }

  /**
   * Show one phase of the screen.
   * @param {'intro'|'working'|'signed-in'|'not-invited'|'error'|'expired'} phase the phase
   * @param {string} [reason] the reason of an error
   */
  function show(phase, reason) {
    const parts = [];
    const actions = make(doc, 'div', 'settings__actions');
    if (phase === 'signed-in') {
      const status = make(doc, 'p', 'settings__text connect__status');
      status.append(spriteIcon(doc, 'check'), doc.createTextNode(STRINGS.signedIn(session.account())));
      parts.push(status, make(doc, 'p', 'settings__hint', STRINGS.syncLater));
      actions.append(button(STRINGS.done, 'button', () => navigate?.('#/tasks')));
    }
    else if (phase === 'not-invited') {
      const status = make(doc, 'p', 'settings__text', STRINGS.notInvited);
      status.setAttribute('role', 'alert');
      const back = make(doc, 'a', 'button button--secondary', STRINGS.back);
      back.href = '#/settings';
      parts.push(status, make(doc, 'p', 'settings__hint', STRINGS.notInvitedHint));
      actions.append(back);
    }
    else if (phase === 'working') {
      parts.push(make(doc, 'p', 'settings__text', STRINGS.working));
    }
    else {
      if (phase === 'error') {
        const status = make(doc, 'p', 'settings__text', STRINGS.failed);
        status.setAttribute('role', 'alert');
        parts.push(status, make(doc, 'p', 'settings__hint', STRINGS.reasons[reason] ?? STRINGS.reasons.rejected));
      }
      else if (phase === 'expired') {
        parts.push(make(doc, 'p', 'settings__text', STRINGS.expired));
      }
      else {
        parts.push(make(doc, 'p', 'settings__text', STRINGS.gains), make(doc, 'p', 'settings__text', STRINGS.cost));
      }
      parts.push(make(doc, 'p', 'settings__hint', STRINGS.server(session.account()?.server ?? session.serverUrl())));
      actions.append(button(STRINGS.signIn, 'button', signIn));
    }
    card.replaceChildren(...parts, ...(phase === 'working' ? [] : [actions]));
  }

  /** Show the phase that matches the session state. */
  function showState() {
    const state = session.state();
    show(state === 'connected' ? 'signed-in' : state === 'sign-in-needed' ? 'expired' : 'intro');
  }

  const finishing = session.finish();
  if (finishing) {
    show('working');
    finishing.then(() => alive && showState(), (error) => {
      if (error?.name !== 'AuthError') {
        console.error('Sign-in failed:', error);
      }
      if (alive) {
        show(error?.reason === 'not-invited' ? 'not-invited' : 'error', error?.reason);
      }
    });
  }
  else {
    showState();
  }

  return {
    /** Follow a route of this view; the connect screen has no sub-routes. */
    update() {},

    /** Stop showing results of a sign-in that finishes after the view closed. */
    destroy() {
      alive = false;
    },
  };
}
