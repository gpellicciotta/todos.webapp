/**
 * Task editor: every field of one task, saved on change, with no Save button.
 *
 * Sections, in order: description (`TSK-1`), status (`TSK-3`, `TSK-4`), due date and time (`TSK-5`, `TSK-6`),
 * overdue behavior once a due time is set (`TSK-7`), lists (`TSK-8`), notes (`NOT-1` to `NOT-5`),
 * details (`TSK-12`), and Delete task (`TSK-11`). An invalid value shows a field error and saves nothing.
 * A deleted task opens read-only with a Restore banner (`BIN-6`); an unknown task closes with a toast.
 * Store changes, also from other tabs, fill the fields again, except a focused or invalid one;
 * a focused field left unchanged then shows the newest value. The due date and time save once focus leaves them,
 * since a date field changes on each typed digit, such as year 0202 on the way to 2026.
 */

import { DESCRIPTION_MAX, STATUSES } from '../store/tasks.js';
import { createField } from './editor-panel.js';
import { createNoteThread } from './notes.js';
import { make as el, spriteIcon, STATUS_LABELS } from './task-list.js';

/** Editor strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  title: 'Task', description: 'Description', status: 'Status', dueDate: 'Due date', dueTime: 'Due time',
  clear: 'Clear', clearLabel: 'Clear the due date', overdue: 'Overdue behavior',
  keep: 'Keep open', cancel: 'Cancel when overdue', lists: 'Lists',
  addToList: 'Add to list', createList: (name) => `Create list "${name}"`,
  removeFrom: 'Remove from ', notes: 'Notes', details: 'Details', created: 'Created ',
  updated: 'Last updated ', activity: 'Last activity ', delete: 'Delete task',
  deleted: 'Task moved to the recycle bin.', inBin: 'This task is in the recycle bin.',
  restore: 'Restore', notFound: 'That task was not found.', failed: 'That change could not be saved.',
  required: 'Enter a description.', tooLong: `A description holds at most ${DESCRIPTION_MAX} characters.`,
  dateFirst: 'Enter a date to set a time.', fullYear: 'Enter a four-digit year.',
});

let instances = 0;

/**
 * Create a segmented control of radio buttons.
 * @param {Document} doc the document
 * @param {string} legend the group name
 * @param {string} name the radio name
 * @param {[string, string][]} options the values and their labels
 * @returns {HTMLFieldSetElement} the control
 */
function segmented(doc, legend, name, options) {
  const set = el(doc, 'fieldset', 'segmented');
  const row = el(doc, 'div', 'segmented__options');
  for (const [value, label] of options) {
    const option = el(doc, 'label', 'segmented__option');
    const radio = doc.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    option.append(radio, ` ${label}`);
    row.append(option);
  }
  set.append(el(doc, 'legend', '', legend), row);
  return set;
}

/**
 * Split a stored due time into local date and time values; 23:59 is a date-only due time (`TSK-6`).
 * @param {string|null} iso the stored due time
 * @returns {{date: string, time: string}} the input values
 */
function dueParts(iso) {
  if (!iso) {
    return { date: '', time: '' };
  }
  const due = new Date(iso);
  const pad = (number) => String(number).padStart(2, '0');
  const date = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  const dateOnly = due.getHours() === 23 && due.getMinutes() === 59;
  return { date, time: dateOnly ? '' : `${pad(due.getHours())}:${pad(due.getMinutes())}` };
}

/**
 * Mount the task editor of a task route into an editor panel.
 * @param {{body: HTMLElement, document: Document, setTitle: Function, close: Function}} panel the panel
 * @param {{params: {taskId: string}}} route the editor route
 * @param {object} context the editor context
 * @param {object} context.store the store facade
 * @param {{show: Function}} context.toaster the toaster
 * @param {string} [context.locale] the locale of times, the user's by default
 * @returns {{idle: () => Promise<void>, returnFocus: () => HTMLElement|null, destroy: () => void}} the editor
 */
export function mountTaskEditor(panel, route, { store, toaster, locale }) {
  const doc = panel.document;
  const taskId = route.params.taskId;
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const n = (instances += 1);
  let task = null;
  let lists = [];
  let members = [];
  let pending = null;
  let destroyed = false;
  const shown = new Map();

  /**
   * Put a stored value into a control, remembering it, so leaving the control unchanged can show a newer one.
   * @param {HTMLInputElement|HTMLTextAreaElement} control the control
   * @param {string} value the value
   */
  const put = (control, value) => {
    control.value = value;
    shown.set(control, value);
  };

  /**
   * Report a change that could not be saved.
   * @param {unknown} error the failure
   */
  function fail(error) {
    console.error('Task editor change failed:', error);
    toaster.show(STRINGS.failed);
  }

  /**
   * Store task changes; a validation failure shows on the field, other failures in a toast.
   * @param {object} changes the changed fields
   * @param {{setError: Function}} [field] the field that shows a validation failure
   * @returns {Promise<void>}
   */
  async function save(changes, field) {
    try {
      await store.updateTask(taskId, changes);
      field?.setError(null);
    }
    catch (error) {
      if (error?.name === 'ValidationError' && field) {
        field.setError(error.message);
      }
      else {
        fail(error);
      }
    }
  }

  panel.setTitle(STRINGS.title);
  const banner = el(doc, 'div', 'banner');
  banner.setAttribute('role', 'status');
  banner.append(spriteIcon(doc, 'bin', 'icon banner__icon'), el(doc, 'p', 'banner__text', STRINGS.inBin));
  const restore = el(doc, 'button', 'button button--secondary', STRINGS.restore);
  restore.type = 'button';
  restore.addEventListener('click', () => store.restoreTask(taskId).catch(fail));
  banner.append(restore);
  const fields = el(doc, 'fieldset', 'task-editor__fields');
  const section = (name, title) => {
    const element = el(doc, 'div', 'editor-panel__section');
    element.dataset.section = name;
    if (title) {
      element.append(el(doc, 'h3', 'editor-panel__section-title', title));
    }
    fields.append(element);
    return element;
  };

  const description = createField(doc, { label: STRINGS.description, name: 'description', tag: 'textarea' });
  section('description').append(description.element);
  /** Save the description; an empty or too long one is a field error. */
  function saveDescription() {
    const value = description.control.value.trim();
    const error = !value ? STRINGS.required : value.length > DESCRIPTION_MAX ? STRINGS.tooLong : null;
    description.setError(error);
    if (!error) {
      save({ description: value }, description);
    }
  }
  description.control.addEventListener('change', saveDescription);
  description.control.addEventListener('blur', () => {
    if (task && description.control.value === shown.get(description.control)) {
      put(description.control, task.description);
    }
  });

  const status = segmented(doc, STRINGS.status, `status-${n}`, STATUSES.map((value) => [value, STATUS_LABELS[value]]));
  section('status').append(status);
  status.addEventListener('change', (event) => save({ status: event.target.value }));

  const date = createField(doc, { label: STRINGS.dueDate, name: 'due-date', type: 'date' });
  const time = createField(doc, { label: STRINGS.dueTime, name: 'due-clock', type: 'time' });
  const clear = el(doc, 'button', 'button button--quiet', STRINGS.clear);
  clear.type = 'button';
  clear.setAttribute('aria-label', STRINGS.clearLabel);
  const dueRow = el(doc, 'div', 'editor-panel__row');
  dueRow.append(date.element, time.element, clear);
  section('due').append(dueRow);

  /** Save the due date and time; a time without a date or a year below 1000 is a field error. */
  function saveDue() {
    const [day, clock] = [date.control.value, time.control.value];
    const error = !day && clock ? STRINGS.dateFirst : day && Number(day.split('-')[0]) < 1000 ? STRINGS.fullYear : null;
    date.setError(error);
    if (error) {
      return;
    }
    let value = day || null;
    if (day && clock) {
      const [year, month, dayOfMonth] = day.split('-').map(Number);
      const [hours, minutes] = clock.split(':').map(Number);
      value = new Date(year, month - 1, dayOfMonth, hours, minutes).toISOString();
    }
    save({ 'due-time': value }, date);
  }
  dueRow.addEventListener('focusout', () => setTimeout(() => {
    if (destroyed || dueRow.contains(doc.activeElement) || !task) {
      return;
    }
    if (date.control.value === shown.get(date.control) && time.control.value === shown.get(time.control)) {
      const due = dueParts(task['due-time']);
      put(date.control, due.date);
      put(time.control, due.time);
      date.setError(null);
    }
    else {
      saveDue();
    }
  }));
  clear.addEventListener('click', () => {
    date.control.value = '';
    time.control.value = '';
    saveDue();
    date.control.focus();
  });

  const overdue = segmented(doc, STRINGS.overdue, `overdue-${n}`, [['keep', STRINGS.keep], ['cancel', STRINGS.cancel]]);
  const overdueSection = section('overdue');
  overdueSection.append(overdue);
  overdue.addEventListener('change', (event) => save({ 'overdue-handling': event.target.value }));

  const chips = el(doc, 'ul', 'chip-list');
  const combo = createField(doc, { label: STRINGS.addToList, name: 'add-to-list', hideLabel: true });
  const input = combo.control;
  input.placeholder = STRINGS.addToList;
  input.autocomplete = 'off';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const listbox = el(doc, 'ul', 'menu combo-box__list');
  listbox.id = `task-editor-${n}-lists`;
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', STRINGS.lists);
  listbox.hidden = true;
  input.setAttribute('aria-controls', listbox.id);
  const comboBox = el(doc, 'div', 'combo-box');
  comboBox.append(combo.element, listbox);
  section('lists', STRINGS.lists).append(chips, comboBox);
  let options = [];
  let active = -1;

  /**
   * Show or hide the options that match the typed text: free lists, then Create list for a new name.
   * @param {boolean} show whether the list box opens
   */
  function showOptions(show) {
    const text = input.value.trim();
    const lower = text.toLocaleLowerCase();
    options = lists.filter((list) => !members.includes(list.id) && list.name.toLocaleLowerCase().includes(lower))
      .map((list) => ({ list, label: list.name }));
    if (text && !lists.some((list) => list.name.trim().toLocaleLowerCase() === lower)) {
      options.push({ create: text, label: STRINGS.createList(text) });
    }
    active = Math.min(active, options.length - 1);
    listbox.replaceChildren(...options.map((option, index) => {
      const item = el(doc, 'li', 'menu__item', option.label);
      item.id = `${listbox.id}-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === active));
      item.addEventListener('mousedown', (event) => event.preventDefault());
      item.addEventListener('click', () => choose(option));
      return item;
    }));
    listbox.hidden = !show || options.length === 0;
    input.setAttribute('aria-expanded', String(!listbox.hidden));
    if (active >= 0 && !listbox.hidden) {
      input.setAttribute('aria-activedescendant', `${listbox.id}-${active}`);
    }
    else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Add the task to a chosen list, creating the list first for a new name.
   * @param {{list?: object, create?: string}} option the chosen option
   * @returns {Promise<void>}
   */
  async function choose(option) {
    try {
      const listId = option.list?.id ?? (await store.createList({ name: option.create })).id;
      await store.addToList(taskId, listId);
      input.value = '';
      active = -1;
      combo.setError(null);
      showOptions(false);
    }
    catch (error) {
      if (error?.name === 'ValidationError') {
        combo.setError(error.message);
      }
      else {
        fail(error);
      }
    }
  }

  input.addEventListener('input', () => {
    active = -1;
    showOptions(true);
  });
  input.addEventListener('blur', () => showOptions(false));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = listbox.hidden ? (step > 0 ? 0 : options.length - 1) : (active + step + options.length) % options.length;
      showOptions(true);
    }
    else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[active] ?? options.find((candidate) => candidate.create)
        ?? options.find((candidate) => candidate.label.toLocaleLowerCase() === input.value.trim().toLocaleLowerCase());
      if (option) {
        choose(option);
      }
    }
    else if (event.key === 'Escape' && !listbox.hidden) {
      event.preventDefault();
      showOptions(false);
    }
  });

  const thread = createNoteThread({ document: doc, store, taskId, onError: fail, locale });
  section('notes', STRINGS.notes).append(thread.element);
  const details = el(doc, 'p', 'editor-panel__details');
  section('details', STRINGS.details).append(details);
  const danger = el(doc, 'div', 'editor-panel__danger');
  const remove = el(doc, 'button', 'button button--secondary');
  remove.type = 'button';
  remove.append(spriteIcon(doc, 'bin'), STRINGS.delete);
  remove.addEventListener('click', () => store.deleteTask(taskId).then(() => {
    toaster.show(STRINGS.deleted, { undo: true, onAction: () => store.restoreTask(taskId).catch(fail) });
    panel.close();
  }, fail));
  danger.append(remove);
  panel.body.append(banner, fields, danger);

  /**
   * Tell whether a field keeps its value on a fill: while focused or showing an error.
   * @param {HTMLElement} control the control
   * @returns {boolean} true when the fill skips it
   */
  const busy = (control) => control === doc.activeElement || control.getAttribute('aria-invalid') === 'true';

  /**
   * Fill the fields from the stored task, its lists, and its notes.
   * @param {object[]} notes the notes, newest first
   */
  function fill(notes) {
    const deleted = Boolean(task['deletion-time']);
    const wasDeleted = fields.disabled;
    banner.hidden = !deleted;
    fields.disabled = deleted;
    danger.hidden = deleted;
    if (!busy(description.control)) {
      put(description.control, task.description);
    }
    status.querySelector(`input[value="${task.status}"]`).checked = true;
    const due = dueParts(task['due-time']);
    if (!busy(date.control) && !busy(time.control)) {
      put(date.control, due.date);
      put(time.control, due.time);
    }
    overdueSection.hidden = !task['due-time'];
    overdue.querySelector(`input[value="${task['overdue-handling']}"]`).checked = true;
    const joined = lists.filter((list) => members.includes(list.id));
    chips.replaceChildren(...joined.map((list) => {
      const item = doc.createElement('li');
      const chip = el(doc, 'span', 'chip chip--removable', list.name);
      const button = el(doc, 'button', 'icon-button');
      button.type = 'button';
      button.setAttribute('aria-label', `${STRINGS.removeFrom}${list.name}`);
      button.append(spriteIcon(doc, 'close'));
      button.addEventListener('click', () => store.removeFromList(taskId, list.id).then(() => input.focus(), fail));
      chip.append(button);
      item.append(chip);
      return item;
    }));
    showOptions(!listbox.hidden);
    thread.render(notes, deleted);
    details.textContent = [[STRINGS.created, 'creation-time'], [STRINGS.updated, 'last-update-time'],
      [STRINGS.activity, 'last-activity-time']].map(([label, key]) => `${label}${format.format(new Date(task[key]))}`).join(' · ');
    if (wasDeleted && !deleted) {
      description.control.focus();
    }
  }

  /**
   * Read the task and fill the fields, once per burst of store changes.
   * @param {boolean} [first] whether this is the first read, which sets the focus
   * @returns {Promise<void>} resolves once filled
   */
  function refresh(first = false) {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const next = await store.getTask(taskId);
      if (destroyed) {
        return;
      }
      if (!next) {
        toaster.show(STRINGS.notFound);
        panel.close();
        return;
      }
      const [all, ids, notes] = await Promise.all([store.listLists(), store.listsOfTask(taskId), store.notesOfTask(taskId)]);
      if (destroyed) {
        return;
      }
      task = next;
      lists = [...all].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      members = ids;
      fill(notes);
      if (first) {
        (task['deletion-time'] ? restore : description.control).focus();
      }
    }).catch((error) => console.error('Task editor failed to render:', error));
    return pending;
  }

  const unsubscribe = store.subscribe(() => refresh());
  const first = refresh(true);

  return {
    idle: () => first,
    returnFocus: () => [...doc.querySelectorAll('.task-row')].find((row) => row.dataset.taskId === taskId)
      ?.querySelector('[data-role="open"]') ?? null,
    destroy() {
      // Closing, such as with Back, fires no change or focusout, so typed values save here.
      const typed = (control) => task && !fields.disabled && control.value !== shown.get(control)
        && control.getAttribute('aria-invalid') !== 'true';
      if (typed(description.control)) {
        saveDescription();
      }
      if (typed(date.control) || typed(time.control)) {
        saveDue();
      }
      destroyed = true;
      unsubscribe();
      thread.destroy();
    },
  };
}
