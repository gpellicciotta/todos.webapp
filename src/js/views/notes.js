/**
 * Note thread of the task editor: the add note field on top, then the notes, newest first (`NOT-1` to `NOT-5`).
 *
 * Each note shows its author, its time, and "edited" after a change (`NOT-2`).
 * Own notes, every note in local mode, have Edit and Delete in a More menu; deleting asks in place (`NOT-4`).
 * Rendering again keeps an open edit, its draft text, a pending delete question, and focus.
 * A typed new note stays as a draft per task for the session, so closing the editor never drops it.
 * Escape in a note's edit field cancels that edit only.
 */

import { TEXT_MAX } from '../store/notes.js';
import { attachMenu } from '../ui/menu.js';
import { createField } from './editor-panel.js';
import { spriteIcon } from './task-list.js';

/** Thread strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  add: 'Add note', placeholder: 'Add a note', list: 'Notes, newest first', you: 'You', edited: 'edited',
  more: 'More actions for your note of ', edit: 'Edit', editLabel: 'Edit note', save: 'Save note',
  cancel: 'Cancel', delete: 'Delete', keep: 'Keep', confirm: 'Delete this note?',
  confirmOf: 'Delete your note of ', required: 'Enter a note.',
  tooLong: `A note holds at most ${TEXT_MAX} characters.`,
});

/** Typed new notes that were not added yet, by task identifier. */
const drafts = new Map();

/**
 * Check a note text before it is stored.
 * @param {string} text the text
 * @returns {string|null} the error, or null when the text is valid
 */
function noteError(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return STRINGS.required;
  }
  return trimmed.length > TEXT_MAX ? STRINGS.tooLong : null;
}

/**
 * Create a button.
 * @param {Document} doc the document
 * @param {string} className the classes
 * @param {string} text the label
 * @param {string} role the `data-role`, which finds the button again after a render
 * @returns {HTMLButtonElement} the button
 */
function button(doc, className, text, role) {
  const element = doc.createElement('button');
  element.className = className;
  element.type = 'button';
  element.textContent = text;
  element.dataset.role = role;
  return element;
}

/**
 * Create the note thread of a task.
 * @param {object} options thread options
 * @param {Document} [options.document] the document
 * @param {object} options.store the store facade
 * @param {string} options.taskId the task identifier
 * @param {(error: unknown) => void} options.onError reports a change that could not be saved
 * @param {string} [options.locale] the locale of note times, the user's by default
 * @returns {{element: HTMLElement, render: (notes: object[], readOnly: boolean) => void, destroy: () => void}} the thread
 */
export function createNoteThread({ document: doc = globalThis.document, store, taskId, onError, locale }) {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const element = doc.createElement('div');
  element.className = 'note-thread';
  const add = doc.createElement('div');
  add.className = 'note-thread__add';
  const field = createField(doc, { label: STRINGS.add, name: 'new-note', tag: 'textarea' });
  field.control.placeholder = STRINGS.placeholder;
  field.control.value = drafts.get(taskId) ?? '';
  field.control.addEventListener('input', () => drafts.set(taskId, field.control.value));
  const actions = doc.createElement('div');
  actions.className = 'note-thread__actions';
  const addButton = button(doc, 'button button--secondary', STRINGS.add, 'add');
  actions.append(addButton);
  add.append(field.element, actions);
  const list = doc.createElement('ol');
  list.className = 'note-thread__list';
  list.setAttribute('aria-label', STRINGS.list);
  element.append(add, list);
  let menus = [];
  let notes = [];
  let readOnly = false;
  let editing = null;
  let confirming = null;

  addButton.addEventListener('click', async () => {
    const error = noteError(field.control.value);
    field.setError(error);
    if (error) {
      field.control.focus();
      return;
    }
    try {
      await store.addNote(taskId, { text: field.control.value });
      field.control.value = '';
      drafts.delete(taskId);
    }
    catch (failure) {
      onError(failure);
    }
  });

  /**
   * Run a note change, then render again; a failure is reported and the thread keeps its state.
   * @param {() => Promise<unknown>} change the store call
   * @param {() => void} done resets the edit or delete state once the change is stored
   */
  async function save(change, done) {
    try {
      await change();
      done();
      render(notes, readOnly);
      field.control.focus();
    }
    catch (failure) {
      onError(failure);
    }
  }

  /**
   * Leave a note's edit or delete question, and return focus to its More button.
   * @param {object} note the note
   */
  function leave(note) {
    editing = null;
    confirming = null;
    render(notes, readOnly);
    list.querySelector(`[data-note-id="${note.id}"] [data-role="more"]`)?.focus();
  }

  /**
   * Render the editing form of a note.
   * @param {HTMLElement} item the note element
   * @param {object} note the note
   */
  function renderEdit(item, note) {
    const edit = createField(doc, { label: STRINGS.editLabel, name: 'edit-note', tag: 'textarea', hideLabel: true });
    edit.control.value = editing.draft;
    edit.control.dataset.role = 'edit';
    edit.control.addEventListener('input', () => {
      editing.draft = edit.control.value;
    });
    const row = doc.createElement('div');
    row.className = 'note-thread__actions';
    const cancel = button(doc, 'button button--quiet', STRINGS.cancel, 'cancel');
    cancel.addEventListener('click', () => leave(note));
    edit.control.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        // The panel skips a handled Escape, so only the edit closes.
        event.preventDefault();
        leave(note);
      }
    });
    const submit = button(doc, 'button button--secondary', STRINGS.save, 'save');
    submit.addEventListener('click', () => {
      const error = noteError(edit.control.value);
      edit.setError(error);
      if (!error) {
        save(() => store.editNote(note.id, edit.control.value), () => {
          editing = null;
        });
      }
    });
    row.append(cancel, submit);
    item.append(edit.element, row);
  }

  /**
   * Render the in-place delete question of a note.
   * @param {HTMLElement} item the note element
   * @param {object} note the note
   * @param {string} when the formatted note time
   */
  function renderConfirm(item, note, when) {
    const box = doc.createElement('div');
    box.className = 'inline-confirm';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', `${STRINGS.confirmOf}${when}`);
    const text = doc.createElement('p');
    text.className = 'inline-confirm__text';
    text.textContent = STRINGS.confirm;
    const row = doc.createElement('div');
    row.className = 'inline-confirm__actions';
    const keep = button(doc, 'button button--secondary', STRINGS.keep, 'keep');
    keep.addEventListener('click', () => leave(note));
    const remove = button(doc, 'button', STRINGS.delete, 'delete');
    remove.addEventListener('click', () => save(() => store.deleteNote(note.id), () => {
      confirming = null;
    }));
    row.append(keep, remove);
    box.append(text, row);
    item.append(box);
  }

  /**
   * Render one note.
   * @param {object} note the note
   * @returns {HTMLLIElement} the note element
   */
  function renderNote(note) {
    const when = format.format(new Date(note['creation-time']));
    const item = doc.createElement('li');
    item.className = 'note';
    item.dataset.noteId = note.id;
    const header = doc.createElement('div');
    header.className = 'note__header';
    const meta = doc.createElement('p');
    meta.className = 'note__meta';
    const author = doc.createElement('span');
    author.className = 'note__author';
    author.textContent = note.author?.name ?? STRINGS.you;
    const time = doc.createElement('time');
    time.dateTime = note['creation-time'];
    time.textContent = when;
    meta.append(author, ' · ', time, ...(note['edit-time'] ? [` · ${STRINGS.edited}`] : []));
    header.append(meta);
    if (!readOnly && !note.author) {
      const more = button(doc, 'icon-button', '', 'more');
      more.setAttribute('aria-label', `${STRINGS.more}${when}`);
      more.append(spriteIcon(doc, 'more'));
      const menu = doc.createElement('div');
      menu.className = 'menu';
      menu.setAttribute('aria-label', `${STRINGS.more}${when}`);
      menu.hidden = true;
      for (const [action, label, icon] of [['edit', STRINGS.edit, 'note'], ['delete', STRINGS.delete, 'bin']]) {
        const entry = button(doc, 'menu__item', label, `menu-${action}`);
        entry.setAttribute('role', 'menuitem');
        entry.prepend(spriteIcon(doc, icon));
        menu.append(entry);
      }
      menus.push(attachMenu(more, menu, { onSelect: (entry) => {
        editing = entry.dataset.role === 'menu-edit' ? { id: note.id, draft: note.text } : null;
        confirming = entry.dataset.role === 'menu-delete' ? note.id : null;
        render(notes, readOnly);
        list.querySelector(`[data-note-id="${note.id}"] [data-role="${editing ? 'edit' : 'keep'}"]`)?.focus();
      } }));
      header.append(more, menu);
    }
    item.append(header);
    if (editing?.id === note.id && !readOnly) {
      renderEdit(item, note);
    }
    else {
      const text = doc.createElement('p');
      text.className = 'note__text';
      text.textContent = note.text;
      item.append(text);
      if (confirming === note.id && !readOnly) {
        renderConfirm(item, note, when);
      }
    }
    return item;
  }

  /**
   * Show the notes, keeping focus on the same control of the same note.
   * @param {object[]} next the notes, newest first
   * @param {boolean} locked whether the task is read-only, such as a deleted task
   */
  function render(next, locked) {
    const focused = doc.activeElement;
    const noteId = list.contains(focused) ? focused.closest('.note')?.dataset.noteId : null;
    const role = noteId ? focused.dataset.role : null;
    notes = next;
    readOnly = locked;
    add.hidden = locked;
    menus.forEach((menu) => menu.destroy());
    menus = [];
    list.replaceChildren(...notes.map(renderNote));
    if (role) {
      list.querySelector(`[data-note-id="${noteId}"] [data-role="${role}"]`)?.focus();
    }
  }

  return {
    element,
    render,
    destroy() {
      menus.forEach((menu) => menu.destroy());
    },
  };
}
