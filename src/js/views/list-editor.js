/**
 * List editor: the name and description of one list, saved on change, with no Save button (`LST-1`, `LST-2`, `LST-4`).
 *
 * It opens in the editor panel, like the task editor. A duplicate or empty name shows a field error and saves
 * nothing (`LST-3`). On `#/lists/new` the list is created once its name is valid; closing before that creates
 * nothing. Details show the creation time; in local mode the Sharing section only links to the connect flow.
 * Delete list asks first, stating that the tasks stay, then opens All tasks with Undo (`LST-6`, `LST-7`).
 */

import { DESCRIPTION_MAX } from '../store/lists.js';
import { confirmDialog } from '../ui/dialog.js';
import { DEFAULT_HASH } from '../ui/router.js';
import { createField } from './editor-panel.js';
import { make as el, spriteIcon } from './task-list.js';

/** Editor strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'List', newTitle: 'New list', name: 'Name', description: 'Description',
  counter: (count) => `${count} / ${DESCRIPTION_MAX}`, details: 'Details', created: 'Created ',
  sharing: 'Sharing', connect: 'Connect to share this list', delete: 'Delete list',
  deleteHint: 'Deleting a list never deletes its tasks.', deleteTitle: (name) => `Delete the list ${name}?`,
  deleteText: 'The list moves to the recycle bin. Its tasks stay in your other lists.', keep: 'Keep',
  deleted: 'List moved to the recycle bin.', failed: 'That change could not be saved.',
});

let instances = 0;

/**
 * Report a change that could not be saved, in the console and in a toast.
 * @param {{show: Function}} toaster the toaster
 * @param {unknown} error the failure
 */
function fail(toaster, error) {
  console.error('List change failed:', error);
  toaster.show(STRINGS.failed);
}

/**
 * Ask to delete a list, then move it to the recycle bin, open All tasks, and offer Undo (`LST-6`, `LST-7`).
 * @param {object} options delete options
 * @param {HTMLElement} options.parent holds the dialog while it is open
 * @param {HTMLElement} options.opener gets focus back when the list is kept
 * @param {{id: string, name: string}} options.list the list
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string) => void} options.navigate opens another route
 * @returns {Promise<boolean>} true once the list moved to the recycle bin
 */
export async function confirmListDelete({ parent, opener, list, store, toaster, navigate }) {
  const doc = parent.ownerDocument;
  const id = `list-delete-${(instances += 1)}`;
  const dialog = el(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  const header = el(doc, 'div', 'dialog__header');
  const title = el(doc, 'h2', 'dialog__title', STRINGS.deleteTitle(list.name));
  title.id = `${id}-title`;
  header.append(title);
  const body = el(doc, 'div', 'dialog__body');
  body.append(el(doc, 'p', '', STRINGS.deleteText));
  const actions = el(doc, 'div', 'dialog__actions');
  for (const [value, text, className] of [['cancel', STRINGS.keep, 'button button--secondary'], ['delete', STRINGS.delete, 'button button--danger']]) {
    const button = el(doc, 'button', className, text);
    button.type = 'button';
    button.dataset.dialogClose = value;
    actions.append(button);
  }
  dialog.append(header, body, actions);
  parent.append(dialog);
  const confirmed = await confirmDialog(dialog, { opener });
  dialog.remove();
  if (!confirmed) {
    return false;
  }
  try {
    await store.deleteList(list.id);
  }
  catch (error) {
    fail(toaster, error);
    return false;
  }
  navigate(DEFAULT_HASH);
  toaster.show(STRINGS.deleted, { undo: true, onAction: () => store.restoreList(list.id).catch((error) => fail(toaster, error)) });
  return true;
}

/**
 * Mount the list editor of `#/lists/{{list-id}}/edit` or `#/lists/new` into an editor panel.
 * @param {{body: HTMLElement, document: Document, setTitle: Function}} panel the panel
 * @param {{params: {listId?: string}}} route the editor route; no list identifier means a new list
 * @param {object} context the editor context
 * @param {object} context.store the store facade
 * @param {{show: Function}} context.toaster the toaster
 * @param {(hash: string) => void} context.navigate opens another route
 * @param {string} [context.locale] the locale of times, the user's by default
 * @returns {{idle: () => Promise<void>, returnFocus: () => HTMLElement|null, destroy: () => void}} the editor
 */
export function mountListEditor(panel, route, { store, toaster, navigate, locale }) {
  const doc = panel.document;
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  let listId = route.params.listId ?? null;
  let list = null;
  let chain = Promise.resolve();
  let pending = null;
  let destroyed = false;
  const shown = new Map();

  /**
   * Put a stored value into a control, remembering it, so closing can tell typed values from stored ones.
   * @param {HTMLInputElement|HTMLTextAreaElement} control the control
   * @param {string} value the value
   */
  const put = (control, value) => {
    control.value = value;
    shown.set(control, value);
  };

  panel.setTitle(listId ? STRINGS.title : STRINGS.newTitle);
  const root = el(doc, 'div', 'list-editor');
  const section = (name, title) => {
    const element = el(doc, 'div', 'editor-panel__section');
    element.dataset.section = name;
    if (title) {
      element.append(el(doc, 'h3', 'editor-panel__section-title', title));
    }
    root.append(element);
    return element;
  };
  const name = createField(doc, { label: STRINGS.name, name: 'name' });
  const description = createField(doc, { label: STRINGS.description, name: 'description', tag: 'textarea' });
  const counter = el(doc, 'p', 'field__counter');
  counter.id = `${description.control.id}-counter`;
  description.control.setAttribute('aria-describedby', counter.id);
  description.element.append(counter);
  section('fields').append(name.element, description.element);
  const details = el(doc, 'p', 'editor-panel__details');
  const detailsSection = section('details', STRINGS.details);
  detailsSection.append(details);
  const connect = el(doc, 'a', 'list-editor__connect', STRINGS.connect);
  connect.href = '#/connect';
  const sharing = el(doc, 'p', 'list-editor__sharing');
  sharing.append(connect);
  section('sharing', STRINGS.sharing).append(sharing);
  const danger = el(doc, 'div', 'editor-panel__danger');
  const remove = el(doc, 'button', 'button button--danger');
  remove.type = 'button';
  remove.append(spriteIcon(doc, 'bin'), STRINGS.delete);
  danger.append(remove, el(doc, 'p', 'editor-panel__details', STRINGS.deleteHint));
  root.append(danger);
  // Details, Sharing, and Delete list appear once the list exists.
  const later = [detailsSection, sharing.parentElement, danger];
  panel.body.append(root);
  put(name.control, '');
  put(description.control, '');

  /** Show the description length against its limit (`LST-2`). */
  const count = () => {
    counter.textContent = STRINGS.counter(description.control.value.length);
  };

  /**
   * Tell whether a field keeps its value on a fill: while focused or showing an error.
   * @param {HTMLElement} control the control
   * @returns {boolean} true when the fill skips it
   */
  const busy = (control) => control === doc.activeElement || control.getAttribute('aria-invalid') === 'true';

  /** Fill the fields and details from the stored list; a list not created yet hides its later sections. */
  function fill() {
    for (const element of later) {
      element.hidden = !list;
    }
    if (!list) {
      return;
    }
    for (const [field, key] of [[name, 'name'], [description, 'description']]) {
      if (!busy(field.control)) {
        put(field.control, list[key]);
      }
    }
    count();
    details.textContent = `${STRINGS.created}${format.format(new Date(list['creation-time']))}`;
  }

  /**
   * Store a change after the earlier ones: create a new list once a name is given, or update it.
   * A validation failure shows on its field; other failures show in a toast.
   * @param {{name?: string, description?: string}} changes the changed fields
   */
  function save(changes) {
    chain = chain.then(async () => {
      try {
        if (listId) {
          list = await store.updateList(listId, changes);
        }
        else if ('name' in changes) {
          list = await store.createList({ name: changes.name, description: description.control.value });
          listId = list.id;
          fill();
        }
        else {
          return;
        }
        name.setError(null);
        description.setError(null);
      }
      catch (error) {
        if (error?.name === 'ValidationError') {
          (error.field === 'description' ? description : name).setError(error.message);
        }
        else {
          fail(toaster, error);
        }
      }
    });
  }

  for (const [field, key] of [[name, 'name'], [description, 'description']]) {
    field.control.addEventListener('change', () => {
      shown.set(field.control, field.control.value);
      save({ [key]: field.control.value });
    });
  }
  description.control.addEventListener('input', count);
  remove.addEventListener('click', () => {
    if (list) {
      confirmListDelete({ parent: root, opener: remove, list, store, toaster, navigate });
    }
  });

  /**
   * Read the list and fill the fields, once per burst of store changes.
   * A list that left the store stays as shown; the shell and the List screen then open All tasks.
   * @returns {Promise<void>} resolves once filled
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const next = listId ? await store.getList(listId) : null;
      if (!destroyed && (!listId || (next && !next['deletion-time']))) {
        list = next;
        fill();
      }
    }).catch((error) => console.error('List editor failed to render:', error));
    return pending;
  }

  const unsubscribe = store.subscribe(() => refresh());
  count();
  const first = refresh().then(() => {
    if (!destroyed) {
      name.control.focus();
    }
  });

  return {
    idle: () => first.then(() => chain),
    returnFocus: () => (route.params.listId ? doc.querySelector('.list-view__more') : null),
    destroy() {
      // Closing, such as with Back, fires no change event, so typed values save here, also a fixed invalid one.
      for (const [field, key] of [[name, 'name'], [description, 'description']]) {
        if (field.control.value !== shown.get(field.control)) {
          save({ [key]: field.control.value });
        }
      }
      destroyed = true;
      unsubscribe();
      root.querySelector('dialog[open]')?.close('cancel');
    },
  };
}
