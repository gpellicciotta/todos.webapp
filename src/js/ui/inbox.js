/**
 * Inbox view: the bell button with its popover panel, and the broadcast banners above the views (`NTF-1` to `NTF-5`).
 *
 * The view builds on the vendored package: `createUnreadButton` draws the bell, `createInbox` the panel's rows,
 * and `attachNotices` the broadcast banner. sync/inbox.js stays the service adapter; the view answers the package's
 * `inbox:action` events with its requests.
 * The bell sits before the user button, shows the unread count in a badge, and appears only while connected,
 * so local mode shows nothing of it (`LOC-1`). Its panel lists the notifications, most recent first, each with
 * Open for a safe action link, Mark read while unread, and Discard; checked rows take the same actions in bulk,
 * one request each, and Clear all discards every one.
 * An unread notification that asks for a banner also shows as a banner with Dismiss, which marks it read.
 * The banner area shows the most severe, then newest, one; with more, its "View all" link opens the panel.
 * The package inbox sits in the panel only while the panel is open, so a closed panel and local mode add
 * no header, empty state, or controls to the page.
 * A change the service does not accept leaves the view as it was and shows a toast.
 * All texts come from the service, so they render as text only.
 */

import { actionLink } from '../sync/inbox.js';
import { anchorPanel } from '../../vendor/design/js/anchor.js';
import { createInbox, createUnreadButton, INBOX_ACTION_EVENT } from '../../vendor/design/js/inbox.js';
import { tabbableIn } from '../../vendor/design/js/focus.js';
import { attachNotices } from '../../vendor/design/js/notices.js';
import { attachPopover } from '../../vendor/design/js/popover.js';
import { make } from './dom.js';

/** Inbox strings, for the strings module of TEC-13 to absorb. */
export const INBOX_STRINGS = Object.freeze({
  button: 'Inbox',
  buttonUnread: (count) => `Inbox, ${count} unread`,
  title: 'Inbox',
  empty: 'No notifications',
  emptyText: 'Announcements and messages from the service show here.',
  offline: 'Offline. Showing the last inbox.',
  clearAll: 'Clear all',
  open: 'Open',
  markRead: 'Mark read',
  discard: 'Discard',
  selectAll: 'Select all',
  clearSelection: 'Clear selection',
  dismiss: 'Dismiss',
  viewAll: (count) => `View all ${count} alerts`,
  failed: 'The service could not be reached. Try again.',
});

/** The package inbox and bell labels, taken from the app strings. */
const INBOX_LABELS = Object.freeze({
  title: INBOX_STRINGS.title,
  listLabel: INBOX_STRINGS.title,
  emptyTitle: INBOX_STRINGS.empty,
  emptyText: INBOX_STRINGS.emptyText,
  discardAll: INBOX_STRINGS.clearAll,
  open: INBOX_STRINGS.open,
  markRead: INBOX_STRINGS.markRead,
  discard: INBOX_STRINGS.discard,
  selectAll: INBOX_STRINGS.selectAll,
  clearSelection: INBOX_STRINGS.clearSelection,
  unreadButton: INBOX_STRINGS.button,
  unreadButtonCount: (count) => INBOX_STRINGS.buttonUnread(count),
});

/** The package banner labels, taken from the app strings. */
const NOTICE_LABELS = Object.freeze({
  dismiss: INBOX_STRINGS.dismiss,
  open: INBOX_STRINGS.open,
  viewAll: INBOX_STRINGS.viewAll,
});

/**
 * Turn an app notification into the record shape of the package.
 * The package tells read from unread by a set read time; the app keeps only the flag.
 * The action address is already resolved against the server, and null when it is not safe (`NTF-7`).
 * @param {object} item the notification of sync/inbox.js
 * @param {string|undefined} server the server URL
 * @returns {object} the package notification
 */
function toPackage(item, server) {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.type,
    banner: item.banner,
    'creation-time': item.creationTime,
    'read-time': item.read ? 'read' : null,
    'action-url': actionLink(item, server),
  };
}

/**
 * Make the matching links open in a new tab, without access to this page.
 * @param {HTMLElement} root the element holding the links
 * @param {string} selector the links
 */
function openInNewTab(root, selector) {
  for (const link of root.querySelectorAll(selector)) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}

/**
 * Run a change for each notification in order.
 * @param {Array<number>} ids the notification identifiers
 * @param {(id: number) => Promise<boolean>} change the change of one notification
 * @returns {Promise<boolean>} true when the service accepted every change
 */
async function each(ids, change) {
  let accepted = true;
  for (const id of ids) {
    accepted = (await change(id)) && accepted;
  }
  return accepted;
}

/**
 * Describe the focused control of a row, so the same control can take focus after a rebuild.
 * @param {HTMLElement|null} control the focused element
 * @returns {string|null} the selector of the control within its row
 */
function controlSelector(control) {
  if (control?.dataset.inboxAction) {
    return `[data-inbox-action="${control.dataset.inboxAction}"]`;
  }
  return control?.hasAttribute('data-selection-item') ? '[data-selection-item]' : null;
}

/**
 * Build the inbox view and keep it current with the inbox and the session.
 * @param {HTMLElement} slot the element the bell and its panel go into, such as the end of the top bar
 * @param {object} options the dependencies
 * @param {object} options.inbox the inbox
 * @param {object} options.session the session
 * @param {HTMLElement} options.banners the element the broadcast banners go into
 * @param {{show: (message: string) => void}} options.toaster the toaster
 * @param {(message: string) => void} options.announce speaks a message through the polite live region
 * @returns {{destroy: () => void}} the controller
 */
export function attachInbox(slot, { inbox, session, banners, toaster, announce }) {
  const doc = slot.ownerDocument;
  const announced = new Set();
  const connected = () => session.state() === 'connected';

  const bell = createUnreadButton(doc, { labels: INBOX_LABELS });
  const button = bell.element;

  const panel = make(doc, 'div', 'popover inbox-panel');
  panel.id = 'inbox-panel';
  panel.tabIndex = -1;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', INBOX_STRINGS.title);
  const list = createInbox(doc, { labels: INBOX_LABELS, headingLevel: 2 });
  const note = make(doc, 'p', 'inbox-panel__note', INBOX_STRINGS.offline);
  list.element.querySelector('.view-header').after(note);
  const discardAll = list.element.querySelector('[data-inbox-discard-all]');
  slot.prepend(button, panel);
  const popover = attachPopover(button, panel, {
    align: 'end',
    initialFocus: null,
    onOpen: () => {
      panel.append(list.element);
      anchorPanel(panel, button, undefined, 'end');
      (tabbableIn(panel)[0] ?? panel).focus();
    },
    onClose: () => list.element.remove(),
  });

  /**
   * Run a change; a refusal shows a toast.
   * @param {Promise<boolean>} change the change
   * @returns {Promise<void>} resolves once the change settled
   */
  async function settle(change) {
    if (!(await change)) {
      toaster.show(INBOX_STRINGS.failed);
    }
  }

  const notices = attachNotices(banners, {
    document: doc,
    toaster,
    labels: NOTICE_LABELS,
    // A modified click on "View all" opens the app in a new tab; a plain click opens the panel here.
    inboxHref: doc.defaultView?.location?.pathname || '/',
    isSignedIn: connected,
    onDiscardInbox: (id) => settle(inbox.markRead(id)),
    onNavigate: (href, { kind }) => {
      if (kind === 'all') {
        popover.open();
      }
    },
  });

  /**
   * Keep focus inside the open panel when a rebuild removed, hid, or disabled the focused control.
   * @param {string|null} id the identifier of the row that held focus
   * @param {string|null} control the selector of the focused control within its row
   */
  function restoreFocus(id, control) {
    const row = id ? [...list.element.querySelectorAll('[data-inbox-item]')].find((item) => item.dataset.inboxItem === id) : null;
    const target = (row && ((control && row.querySelector(control)) ?? row.querySelector('[data-inbox-action]')))
      ?? list.element.querySelector('[data-inbox-item] [data-inbox-action]')
      ?? (discardAll.disabled ? null : discardAll)
      ?? panel;
    target.focus();
  }

  /** Show the unread count on the bell, and hide the bell without a connection. */
  function renderButton() {
    button.hidden = !connected();
    bell.setCount(button.hidden ? 0 : inbox.unreadCount());
    if (button.hidden) {
      popover.close('close');
    }
  }

  /**
   * Rebuild the rows of the panel.
   * @param {string|undefined} server the server URL
   */
  function renderPanel(server) {
    const focused = doc.activeElement && panel.contains(doc.activeElement) ? doc.activeElement : null;
    const id = focused?.closest('[data-inbox-item]')?.dataset.inboxItem ?? null;
    const control = controlSelector(focused);
    list.setNotifications(inbox.list().map((item) => toPackage(item, server)));
    openInNewTab(list.element, '[data-inbox-action="open"]');
    note.hidden = inbox.status() !== 'offline';
    if (popover.isOpen()) {
      anchorPanel(panel, button, undefined, 'end');
      if (focused && (!focused.isConnected || focused.disabled || focused.closest('[hidden]'))) {
        restoreFocus(id, control);
      }
    }
  }

  /**
   * Show the banner of the unread notifications that ask for one, announcing a newly shown one.
   * @param {string|undefined} server the server URL
   */
  function renderBanners(server) {
    const items = connected() ? inbox.banners() : [];
    notices.setInboxNotifications(items.map((item) => toPackage(item, server)));
    openInNewTab(banners, '[data-notices-action]');
    const shownId = banners.querySelector('[data-notices-source="inbox"]')?.dataset.noticesId;
    const shown = items.find((item) => String(item.id) === shownId);
    if (shown && !announced.has(shown.id)) {
      announced.add(shown.id);
      announce(shown.title ? `${shown.title}. ${shown.message}` : shown.message);
    }
  }

  /** Bring the whole view up to date. */
  function render() {
    const server = session.account()?.server;
    renderButton();
    renderPanel(server);
    renderBanners(server);
  }

  list.element.addEventListener(INBOX_ACTION_EVENT, (event) => {
    const { action, ids } = event.detail;
    if (action === 'discard-all') {
      settle(inbox.clearAll());
    }
    else if (action === 'mark-read') {
      settle(each(ids, inbox.markRead));
    }
    else if (action === 'discard') {
      settle(each(ids, inbox.discard));
    }
  });
  const stopInbox = inbox.subscribe(render);
  const stopSession = session.subscribe(render);
  render();

  return {
    /** Stop following the inbox and remove the bell, the panel, and the banners. */
    destroy() {
      stopInbox();
      stopSession();
      popover.destroy();
      list.destroy();
      bell.destroy();
      notices.destroy();
      button.remove();
      panel.remove();
      banners.replaceChildren();
    },
  };
}
