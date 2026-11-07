/**
 * List actions: the More menu of a list, shared by the List screen header and the rows of the Lists screen.
 *
 * The menu holds Edit list, Edit view options, Share list, and Delete list (`VO-4`), left out where the user's role on
 * the list does not allow them (`SHR-4`): List details replaces Edit list below the editor role, and only the owner
 * shares or deletes. Edit list and List details open the list editor route, Share list the same editor scrolled to its
 * Sharing section, Edit view options the view options route of the list, and Delete list asks for confirmation first (`LST-6`).
 */

import { listActionsFor, listRole } from '../core/permissions.js';
import { formatRoute } from '../ui/router.js';
import { confirmListDelete } from './list-editor.js';
import { make, spriteIcon } from './task-list.js';

/** Menu strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  actions: 'List actions',
  edit: 'Edit list',
  details: 'List details',
  editViewOptions: 'Edit view options',
  share: 'Share list',
  delete: 'Delete list',
});

/** The More menu entries and the routes that Edit list, Edit view options, and Share list open. */
export const LIST_ACTIONS = Object.freeze([
  { action: 'edit', text: STRINGS.edit, route: 'list-edit' },
  { action: 'details', text: STRINGS.details, route: 'list-edit' },
  { action: 'view-options', text: STRINGS.editViewOptions, route: 'list-view-options' },
  { action: 'share', text: STRINGS.share, route: 'list-share' },
  { action: 'delete', text: STRINGS.delete },
]);

/**
 * Fill a list menu with the actions that a role is offered.
 * @param {HTMLElement} menu the menu element
 * @param {string|null} role the role of the user on the list; none offers every action of a local list
 */
export function fillListMenu(menu, role) {
  const doc = menu.ownerDocument;
  const allowed = new Set(listActionsFor(role ?? 'owner'));
  menu.replaceChildren(...LIST_ACTIONS.filter(({ action }) => allowed.has(action)).map(({ action, text }) => {
    const item = make(doc, 'button', action === 'delete' ? 'menu__item menu__item--danger' : 'menu__item', text);
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.dataset.action = action;
    return item;
  }));
}

/**
 * Create the More button of a list and its hidden menu; the caller adds both to the page and attaches the menu.
 * @param {object} options menu options
 * @param {Document} options.document the document
 * @param {string} options.id the identifier of the menu element
 * @param {string} [options.name] the list name, which tells the buttons of several lists apart
 * @param {string} [options.className] extra classes of the button
 * @param {object|null} [options.list] the list, whose role decides the entries; a local list offers all
 * @returns {{more: HTMLButtonElement, menu: HTMLElement}} the button and the menu
 */
export function createListMenu({ document: doc, id, name = '', className = '', list = null }) {
  const label = name ? `${STRINGS.actions}: ${name}` : STRINGS.actions;
  const more = make(doc, 'button', `icon-button ${className}`.trim());
  more.type = 'button';
  more.setAttribute('aria-label', label);
  more.append(spriteIcon(doc, 'more'));
  const menu = make(doc, 'div', 'menu');
  menu.id = id;
  menu.setAttribute('aria-label', label);
  menu.hidden = true;
  fillListMenu(menu, listRole(list));
  return { more, menu };
}

/**
 * Run the action of a picked menu item: open a route, or ask to delete the list.
 * @param {HTMLElement} item the picked menu item
 * @param {object} options action options
 * @param {string} options.listId the list identifier
 * @param {{id: string, name: string}|null} options.list the list, or null once it left the store
 * @param {HTMLElement} options.parent holds the Delete list dialog while it is open
 * @param {HTMLElement} options.opener gets focus back when the list is kept
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string) => void} options.navigate opens another route
 */
export function runListAction(item, { listId, list, parent, opener, store, toaster, navigate }) {
  const { route } = LIST_ACTIONS.find(({ action }) => action === item.dataset.action);
  if (route) {
    navigate(formatRoute(route, { listId }));
  }
  else if (list) {
    confirmListDelete({ parent, opener, list, store, toaster, navigate });
  }
}
