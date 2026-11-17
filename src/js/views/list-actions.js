/**
 * List actions: the More menu of a list, shared by the List screen header and the rows of the Lists screen.
 *
 * The menu holds Edit list, Edit view options, Share list, and Delete list (`VO-4`), left out where the user's role on
 * the list does not allow them (`SHR-4`): List details replaces Edit list below the editor role, and only the owner
 * shares or deletes. Edit list and List details open the list editor route, Share list the same editor scrolled to its
 * Sharing section, Edit view options the view options route of the list, and Delete list asks for confirmation first (`LST-6`).
 * The rows of the Lists screen add Move to top and Move to bottom before Delete list while reordering is on, leaving out
 * the end a row is already at (`LST-13`); the List screen header has no row to move, so it never shows them.
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
  moveTop: 'Move to top',
  moveBottom: 'Move to bottom',
  delete: 'Delete list',
});

/**
 * The More menu entries, the routes that Edit list, Edit view options, and Share list open, and the end that Move to top
 * and Move to bottom move the list to.
 */
export const LIST_ACTIONS = Object.freeze([
  { action: 'edit', text: STRINGS.edit, route: 'list-edit' },
  { action: 'details', text: STRINGS.details, route: 'list-edit' },
  { action: 'view-options', text: STRINGS.editViewOptions, route: 'list-view-options' },
  { action: 'share', text: STRINGS.share, route: 'list-share' },
  { action: 'move-top', text: STRINGS.moveTop, end: -1 },
  { action: 'move-bottom', text: STRINGS.moveBottom, end: 1 },
  { action: 'delete', text: STRINGS.delete },
]);

/**
 * Fill a list menu with the actions that a role is offered, and the move entries that are asked for.
 * The order of the lists belongs to the device, so the move entries do not depend on the role.
 * @param {HTMLElement} menu the menu element
 * @param {string|null} role the role of the user on the list; none offers every action of a local list
 * @param {{top?: boolean, bottom?: boolean}} [moves] whether Move to top and Move to bottom show; neither by default
 */
export function fillListMenu(menu, role, { top = false, bottom = false } = {}) {
  const doc = menu.ownerDocument;
  const allowed = new Set(listActionsFor(role ?? 'owner'));
  if (top) {
    allowed.add('move-top');
  }
  if (bottom) {
    allowed.add('move-bottom');
  }
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
  const more = make(doc, 'button', `icon-button ${className}`.trim());
  more.type = 'button';
  more.setAttribute('aria-label', actionsLabel(name));
  more.append(spriteIcon(doc, 'more'));
  return { more, menu: createListMenuElement({ document: doc, id, name, list }) };
}

/**
 * Create only the hidden menu of a list, for a caller that builds menus on first open.
 * @param {object} options menu options
 * @param {Document} options.document the document
 * @param {string} options.id the identifier of the menu element
 * @param {string} [options.name] the list name, which tells the menus of several lists apart
 * @param {object|null} [options.list] the list, whose role decides the entries; a local list offers all
 * @param {{top?: boolean, bottom?: boolean}} [options.moves] whether Move to top and Move to bottom show; neither by default
 * @returns {HTMLElement} the hidden menu
 */
export function createListMenuElement({ document: doc, id, name = '', list = null, moves = {} }) {
  const menu = make(doc, 'div', 'menu');
  menu.id = id;
  menu.setAttribute('aria-label', actionsLabel(name));
  menu.hidden = true;
  fillListMenu(menu, listRole(list), moves);
  return menu;
}

/**
 * Name the actions of a list for assistive technology.
 * @param {string} name the list name, if known
 * @returns {string} "List actions: {{name}}", or "List actions"
 */
export function actionsLabel(name) {
  return name ? `${STRINGS.actions}: ${name}` : STRINGS.actions;
}

/**
 * Run the action of a picked menu item: open a route, move the list to an end, or ask to delete the list.
 * @param {HTMLElement} item the picked menu item
 * @param {object} options action options
 * @param {string} options.listId the list identifier
 * @param {{id: string, name: string}|null} options.list the list, or null once it left the store
 * @param {HTMLElement} options.parent holds the Delete list dialog while it is open
 * @param {HTMLElement} options.opener gets focus back when the list is kept
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string) => void} options.navigate opens another route
 * @param {(end: -1|1) => void} [options.jump] moves the list to the top or the bottom, for the move entries
 */
export function runListAction(item, { listId, list, parent, opener, store, toaster, navigate, jump = () => {} }) {
  const { route, end } = LIST_ACTIONS.find(({ action }) => action === item.dataset.action);
  if (route) {
    navigate(formatRoute(route, { listId }));
  }
  else if (end) {
    jump(end);
  }
  else if (list) {
    confirmListDelete({ parent, opener, list, store, toaster, navigate });
  }
}
