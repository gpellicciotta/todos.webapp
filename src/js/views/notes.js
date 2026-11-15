/**
 * Note thread of the task editor: the add note field on top, then the notes, newest first (`NOT-1` to `NOT-6`).
 *
 * The thread shows the global notes, then the notes of the current occurrence, then those of earlier ones (`NOT-6`).
 * Each linked note shows its occurrence, so notes of past periods stay reachable for edits and deletes.
 * Each note shows its author, its time, and "edited" after a change (`NOT-2`).
 * The edit form of a note also chooses what it belongs to: the whole task, or one occurrence, newest first.
 * It offers every occurrence up to the current one; while connected it labels the earlier ones from the server route.
 * Own notes, every note in local mode, have Edit and Delete in a More menu; deleting asks in place (`NOT-4`).
 * Notes of others show Collaborator, or Former member when their author's account was deleted.

 * Rendering again keeps an open edit, its draft text, a pending delete question, and focus.
 * A typed new note stays as a draft per task for the session, so closing the editor never drops it.
 * Escape in a note's edit field cancels that edit only.
 */

import { TEXT_MAX } from '../store/notes.js';
import { attachMenu } from '../../vendor/design/js/menu.js';
import { createEditorField } from './editor-panel.js';
import { dayFormat, occurrenceLabel } from './task-history.js';
import { spriteIcon } from './task-list.js';

/** Thread strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  add: 'Add note', placeholder: 'Add a note', list: 'Notes, newest first', you: 'You', edited: 'edited',
  listLinked: 'Notes on the whole task, then on the current occurrence, then on earlier ones, newest first',
  other: 'Collaborator', formerMember: 'Former member',
  more: 'More actions for your note of ', edit: 'Edit', editLabel: 'Edit note', save: 'Save note',
  cancel: 'Cancel', delete: 'Delete', keep: 'Keep', confirm: 'Delete this note?',
  confirmOf: 'Delete your note of ', required: 'Enter a note.', link: 'Belongs to', wholeTask: 'Whole task',
  tooLong: `A note holds at most ${TEXT_MAX} characters.`,
});

/** Typed new notes that were not added yet, by task identifier. */
const drafts = new Map();

/**
 * Tell whether the user wrote a note: in local mode every note is the user's;
 * connected, a note is the user's when its `owner-id` is the user, or it was written here and not uploaded yet.
 * A synced note without owner comes from a deleted account.
 * @param {object} note the note
 * @param {number|string|null} userId the connected user, or null in local mode
 * @returns {boolean} true for the user's own note
 */
export function ownsNote(note, userId) {
  const owner = note['owner-id'] ?? null;
  if (userId === null || userId === undefined) {
    return true;
  }
  return owner === null ? note.revision === undefined : String(owner) === String(userId);
}

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
 * @param {() => Promise<object[]|null>} [options.loadOccurrences] reads the occurrences the store may lack, such as
 *   the server's while connected; the edit form calls it once per current occurrence, and null keeps the known ones
 * @returns {{element: HTMLElement, render: (notes: object[], readOnly: boolean) => void, destroy: () => void}} the thread
 */
export function createNoteThread({ document: doc = globalThis.document, store, taskId, onError, locale, loadOccurrences = null }) {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const day = dayFormat(locale);
  const element = doc.createElement('div');
  element.className = 'note-thread';
  const add = doc.createElement('div');
  add.className = 'note-thread__add';
  const field = createEditorField(doc, { label: STRINGS.add, name: 'new-note', tag: 'textarea' });
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
  let links = { occurrences: [], current: null };
  let loaded = { current: null, occurrences: [] };
  let readOnly = false;
  let userId = null;
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
      render(notes, readOnly, userId, links);
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
    render(notes, readOnly, userId, links);
    list.querySelector(`[data-note-id="${note.id}"] [data-role="more"]`)?.focus();
  }

  /**
   * Name the occurrence a note belongs to by its number and period, or by its number alone when it is not known here.
   * @param {number} number the occurrence number
   * @returns {string} the label
   */
  function labelOf(number) {
    const occurrence = [...links.occurrences, ...loaded.occurrences].find((candidate) => candidate.occurrence === number);
    return occurrence ? occurrenceLabel(occurrence, day) : `#${number}`;
  }

  /**
   * Render the choice of what a note belongs to: the whole task, or one occurrence, newest first.
   * @param {object} note the note
   * @returns {HTMLElement} the field
   */
  function renderLink(note) {
    const newest = Math.max(links.current ?? 0, Number.isInteger(note.occurrence) ? note.occurrence : 0);
    const numbers = Array.from({ length: newest }, (_, index) => index + 1);
    const choices = [{ value: '', label: STRINGS.wholeTask },
      ...numbers.reverse().map((number) => ({ value: String(number), label: labelOf(number) }))];
    const link = createEditorField(doc, { label: STRINGS.link, name: 'note-link', tag: 'select', choices });
    link.control.value = editing.link;
    link.control.dataset.role = 'link';
    link.control.addEventListener('change', () => {
      editing.link = link.control.value;
    });
    return link.element;
  }

  /**
   * Read the occurrences the store may lack once per current occurrence, then label the open edit form with them.
   */
  function loadLabels() {
    if (!loadOccurrences || loaded.current === links.current) {
      return;
    }
    const current = links.current;
    loaded = { current, occurrences: [] };
    loadOccurrences().then((occurrences) => {
      if (occurrences && loaded.current === current) {
        loaded = { current, occurrences };
        render(notes, readOnly, userId, links);
      }
    }, () => {
      // The known occurrences keep labeling the choice.
    });
  }

  /**
   * Render the editing form of a note.
   * @param {HTMLElement} item the note element
   * @param {object} note the note
   */
  function renderEdit(item, note) {
    const edit = createEditorField(doc, { label: STRINGS.editLabel, name: 'edit-note', tag: 'textarea', hideLabel: true });
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
        const occurrence = editing.link === '' ? null : Number(editing.link);
        save(() => store.editNote(note.id, { text: edit.control.value, occurrence }), () => {
          editing = null;
        });
      }
    });
    row.append(cancel, submit);
    item.append(edit.element, renderLink(note), row);
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
    const remove = button(doc, 'button button--danger', STRINGS.delete, 'delete');
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
    const own = ownsNote(note, userId);
    author.textContent = own ? STRINGS.you : (note['owner-id'] ?? null) === null ? STRINGS.formerMember : STRINGS.other;
    const time = doc.createElement('time');
    time.dateTime = note['creation-time'];
    time.textContent = when;
    const edited = Boolean(note['last-update-time']) && note['last-update-time'] !== note['creation-time'];
    meta.append(author, ' · ', time, ...(edited ? [` · ${STRINGS.edited}`] : []));
    if (Number.isInteger(note.occurrence)) {
      const mark = doc.createElement('span');
      mark.className = 'note__occurrence';
      mark.textContent = labelOf(note.occurrence);
      meta.append(' · ', mark);
    }
    header.append(meta);
    if (!readOnly && own) {

      const more = button(doc, 'icon-button', '', 'more');
      more.setAttribute('aria-label', `${STRINGS.more}${when}`);
      more.append(spriteIcon(doc, 'more'));
      const menu = doc.createElement('div');
      menu.className = 'menu';
      menu.setAttribute('aria-label', `${STRINGS.more}${when}`);
      menu.hidden = true;
      for (const [action, label, icon] of [['edit', STRINGS.edit, 'note'], ['delete', STRINGS.delete, 'bin']]) {
        const entry = button(doc, action === 'delete' ? 'menu__item menu__item--danger' : 'menu__item', label, `menu-${action}`);
        entry.setAttribute('role', 'menuitem');
        entry.prepend(spriteIcon(doc, icon));
        menu.append(entry);
      }
      menus.push(attachMenu(more, menu, { onSelect: (entry) => {
        editing = entry.dataset.role === 'menu-edit'
          ? { id: note.id, draft: note.text, link: Number.isInteger(note.occurrence) ? String(note.occurrence) : '' } : null;
        confirming = entry.dataset.role === 'menu-delete' ? note.id : null;
        render(notes, readOnly, userId, links);
        list.querySelector(`[data-note-id="${note.id}"] [data-role="${editing ? 'edit' : 'keep'}"]`)?.focus();
        if (editing) {
          loadLabels();
        }
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
   * With a current occurrence, the global notes come first, then those of the current occurrence; others stay hidden.
   * @param {object[]} next the notes of the task, newest first
   * @param {boolean} locked whether the task is read-only, such as a deleted task
   * @param {number|string|null} [user] the connected user, null in local mode, which tells own notes
   * @param {{occurrences: object[], current: number|null}} [context] the occurrences of the task and the current number
   */
  function render(next, locked, user = null, context = { occurrences: [], current: null }) {
    const focused = doc.activeElement;
    const noteId = list.contains(focused) ? focused.closest('.note')?.dataset.noteId : null;
    const role = noteId ? focused.dataset.role : null;
    notes = next;
    links = context;
    readOnly = locked;
    userId = user;
    add.hidden = locked;
    menus.forEach((menu) => menu.destroy());
    menus = [];
    const global = notes.filter((note) => !Number.isInteger(note.occurrence));
    const linked = notes.filter((note) => Number.isInteger(note.occurrence));
    const shown = links.current === null ? notes : [...global, ...linked.filter((note) => note.occurrence === links.current),
      ...linked.filter((note) => note.occurrence !== links.current)];
    list.setAttribute('aria-label', links.current === null || linked.length === 0 ? STRINGS.list : STRINGS.listLinked);
    list.replaceChildren(...shown.map(renderNote));
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
