/**
 * List editor: explicit creation for drafts, and save-on-change editing (`LST-1`, `LST-2`, `LST-4`).
 *
 * It opens in the editor panel, like the task editor. A duplicate or empty name shows a field error and saves
 * nothing (`LST-3`). On `#/lists/new`, Create or Enter in the name field creates the list; closing discards
 * the draft. Details show the creation time and, when connected, the owner. The Sharing section is in sharing.js.
 * A role below editor sees the fields read-only under a banner naming the owner, and only the owner may delete (`SHR-4`).
 * Delete list asks first, stating that the tasks stay, then opens All tasks with Undo (`LST-6`, `LST-7`).
 */

import { can, listRole } from '../core/permissions.js';
import { DESCRIPTION_MAX } from '../store/lists.js';
import { confirmDialog } from '../ui/dialog.js';
import { DEFAULT_HASH } from '../ui/router.js';
import { createField } from './editor-panel.js';
import { mountSharing } from './sharing.js';
import { make as el, spriteIcon } from './task-list.js';

/** Editor strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'List', newTitle: 'New list', name: 'Name', description: 'Description',
  create: 'Create',
  counter: (count) => `${count} / ${DESCRIPTION_MAX}`, details: 'Details', created: 'Created ',
  sharing: 'Sharing', owner: ' · Owner: ', readOnly: (owner) => `You cannot edit this list${owner ? `. Its owner is ${owner}` : ''}.`,
  delete: 'Delete list',
  deleteHint: 'Deleting a list never deletes its tasks.', deleteTitle: (name) => `Delete the list ${name}?`,
  deleteText: 'The list moves to the recycle bin. Its tasks stay in your other lists.', keep: 'Keep',
  deleted: 'List moved to the recycle bin.', failed: 'That change could not be saved.',
});

let instances = 0;
const LOCAL_SESSION = Object.freeze({ state: () => 'local' });

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
 * @param {object} [context.session] the session, local when left out
 * @param {{send: Function}} [context.api] the API client of the Sharing section
 * @param {object} [context.sync] the sync engine, which tells when the connection is lost
 * @returns {{idle: () => Promise<void>, returnFocus: () => HTMLElement|null, destroy: () => void}} the editor
 */
export function mountListEditor(panel, route, { store, toaster, navigate, locale, session = LOCAL_SESSION, api, sync }) {
  const doc = panel.document;
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  let listId = route.params.listId ?? null;
  let list = null;
  let chain = Promise.resolve();
  let pending = null;
  let destroyed = false;
  let creating = false;
  let latestDraft = null;
  let draftTouched = false;
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
  const create = el(doc, 'button', 'button', STRINGS.create);
  create.type = 'button';
  create.disabled = true;
  create.hidden = Boolean(listId);
  root.append(create);
  const details = el(doc, 'p', 'editor-panel__details');
  const detailsSection = section('details', STRINGS.details);
  detailsSection.append(details);
  const banner = el(doc, 'div', 'banner');
  banner.setAttribute('role', 'status');
  banner.hidden = true;
  const bannerText = el(doc, 'p', 'banner__text');
  banner.append(spriteIcon(doc, 'alert', 'icon banner__icon'), bannerText);
  root.prepend(banner);
  const sharingSection = section('sharing', STRINGS.sharing);
  let sharing = null;
  const danger = el(doc, 'div', 'editor-panel__danger');
  const remove = el(doc, 'button', 'button button--danger');
  remove.type = 'button';
  remove.append(spriteIcon(doc, 'bin'), STRINGS.delete);
  danger.append(remove, el(doc, 'p', 'editor-panel__details', STRINGS.deleteHint));
  root.append(danger);
  // Details, Sharing, and Delete list appear once the list exists.
  const later = [detailsSection, sharingSection, danger];
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
    const editable = can(listRole(list), 'edit-list');
    name.control.disabled = !editable;
    description.control.disabled = !editable;
    danger.hidden = !can(listRole(list), 'delete-list');
    const owner = session.state() === 'local' ? '' : list.owner?.name || list.owner?.email || '';
    banner.hidden = editable;
    bannerText.textContent = STRINGS.readOnly(owner);
    details.textContent = `${STRINGS.created}${format.format(new Date(list['creation-time']))}${owner ? `${STRINGS.owner}${owner}` : ''}`;
    if (sharing) {
      sharing.update(list);
    }
    else if (api || session.state() === 'local') {
      sharing = mountSharing(sharingSection, { list, api, session, sync });
    }
  }

  /**
   * Store a change to an existing list after the earlier ones.
   * A validation failure shows on its field; other failures show in a toast.
   * @param {{name?: string, description?: string}} changes the changed fields
   */
  function save(changes) {
    chain = chain.then(async () => {
      try {
        if (listId) {
          list = await store.updateList(listId, changes);
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

  /** Validate the current draft without writing, ignoring results for values that have since changed. */
  function validateDraft(force = false) {
    const draft = { name: name.control.value, description: description.control.value };
    if (!force && latestDraft?.name === draft.name && latestDraft?.description === draft.description) {
      return;
    }
    latestDraft = draft;
    create.disabled = true;
    chain = chain.then(async () => {
      if (destroyed || listId || creating) {
        return;
      }
      let error = null;
      try {
        await store.validateList(draft);
      }
      catch (failure) {
        error = failure;
      }
      if (destroyed || listId || creating || draft.name !== name.control.value || draft.description !== description.control.value) {
        return;
      }
      name.setError(null);
      description.setError(null);
      if (error?.name === 'ValidationError' && draftTouched) {
        (error.field === 'description' ? description : name).setError(error.message);
      }
      else if (error && error.name !== 'ValidationError') {
        fail(toaster, error);
      }
      create.disabled = Boolean(error);
    });
  }

  /** Persist one explicitly submitted draft; subsequent changes use the existing edit behavior. */
  function submit() {
    if (destroyed || listId || creating) {
      return;
    }
    creating = true;
    name.control.disabled = true;
    description.control.disabled = true;
    create.disabled = true;
    const draft = { name: name.control.value, description: description.control.value };
    chain = chain.then(async () => {
      try {
        if (destroyed) {
          return;
        }
        list = await store.createList(draft);
        listId = list.id;
        create.hidden = true;
        panel.setTitle(STRINGS.title);
        name.setError(null);
        description.setError(null);
        fill();
      }
      catch (error) {
        if (error?.name === 'ValidationError') {
          (error.field === 'description' ? description : name).setError(error.message);
        }
        else {
          fail(toaster, error);
        }
      }
      finally {
        creating = false;
        name.control.disabled = false;
        description.control.disabled = false;
        if (!listId && !destroyed) {
          validateDraft(true);
        }
      }
    });
  }

  create.addEventListener('click', submit);
  name.control.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && !listId) {
      event.preventDefault();
      submit();
    }
  });

  for (const [field, key] of [[name, 'name'], [description, 'description']]) {
    field.control.addEventListener('input', () => {
      if (!listId) {
        draftTouched = true;
        validateDraft();
      }
    });
    field.control.addEventListener('change', () => {
      shown.set(field.control, field.control.value);
      if (listId) {
        save({ [key]: field.control.value });
      }
      else {
        draftTouched = true;
        validateDraft();
      }
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
        if (!listId && !creating) {
          validateDraft(true);
        }
      }
    }).catch((error) => console.error('List editor failed to render:', error));
    return pending;
  }

  const unsubscribe = store.subscribe(() => refresh());
  count();
  const first = refresh().then(() => {
    if (destroyed) {
      return;
    }
    // Share list opens the editor at its Sharing section, so the name field does not take the scroll back.
    if (route.name === 'list-share' && list) {
      sharingSection.scrollIntoView?.({ block: 'start' });
      sharingSection.querySelector('input[name="email"], a')?.focus({ preventScroll: true });
    }
    else {
      name.control.focus();
    }
  });

  return {
    idle: () => first.then(() => chain),
    returnFocus: () => (route.params.listId ? doc.querySelector('.list-view__more') : null),
    destroy() {
      // Closing, such as with Back, fires no change event, so typed values save here, also a fixed invalid one.
      for (const [field, key] of [[name, 'name'], [description, 'description']]) {
        if (listId && field.control.value !== shown.get(field.control)) {
          save({ [key]: field.control.value });
        }
      }
      destroyed = true;
      unsubscribe();
      sharing?.destroy();
      root.querySelector('dialog[open]')?.close('cancel');
    },
  };
}
