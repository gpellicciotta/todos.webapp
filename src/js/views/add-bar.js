/**
 * Add bar: one text field that searches the view, and an Add button that creates a task (`TSK-1`, `VO-3`).
 *
 * Typing reports the text to `onSearch` once it pauses for 150 ms; Enter reports it at once and never adds.
 * Only the Add button creates the task, then clears the field and the filter, and keeps the field focused.
 * The button reads "Add anyway" while the typed text equals a known description, ignoring case and spaces.
 * A viewer, who cannot add tasks, sees "Search tasks" and no Add button (`VO-14`).
 * The field holds at most 500 characters; a counter appears from 450.
 * The field carries `data-shortcut="add search"`, so the `n` and `/` shortcuts both focus it.
 */

import { hidingFilters, normalizeDescription } from '../core/query.js';
import { DESCRIPTION_MAX } from '../store/tasks.js';
import { spriteIcon } from './task-list.js';
import { describeFilters } from './view-controls.js';

const COUNTER_FROM = 450;
const SEARCH_DELAY_MS = 150;
let instances = 0;

/** Add bar strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  label: 'Search or add a task',
  viewerLabel: 'Search tasks',
  add: 'Add',
  addAnyway: 'Add anyway',
  show: 'Show',
  noMatch: 'No task matches. Add creates it.',
  creates: (text) => `Add creates a new task “${text}”.`,
  hidden: (parts) => `Task added. ${parts} hides it.`,
});

/**
 * Create an add bar.
 * @param {object} options add bar options
 * @param {Document} [options.document] the document
 * @param {(description: string) => Promise<void>} options.onAdd stores a task with the trimmed description
 *   and reports its own failures; the field clears once it resolves and keeps its text when it rejects
 * @param {(text: string) => void} [options.onSearch] receives the search text once typing pauses, on Enter, and when
 *   the field clears
 * @param {string} [options.text] the starting text
 * @param {boolean} [options.viewer] whether the user cannot add tasks (`VO-14`)
 * @returns {{element: HTMLFormElement, input: HTMLInputElement, setText: Function, setKnown: Function,
 *   setViewer: Function, destroy: Function}} the add bar
 */
export function createAddBar({ document: doc = globalThis.document, onAdd, onSearch = () => {}, text = '', viewer = false }) {
  const id = `add-bar-${(instances += 1)}`;
  const element = doc.createElement('form');
  element.className = 'add-bar';
  element.noValidate = true;
  element.innerHTML = `<div class="field add-bar__field">
      <label class="field__label visually-hidden" for="${id}"></label>
      <input class="field__control" id="${id}" type="text" maxlength="${DESCRIPTION_MAX}"
        autocomplete="off" enterkeyhint="done" data-shortcut="add search" aria-describedby="${id}-counter">
      <p class="field__counter add-bar__counter" id="${id}-counter" hidden></p>
    </div>
    <button class="button" type="submit"></button>`;
  const input = element.querySelector('input');
  const label = element.querySelector('label');
  const counter = element.querySelector('.field__counter');
  const button = element.querySelector('button');
  const buttonText = doc.createTextNode(STRINGS.add);
  button.append(spriteIcon(doc, 'plus'), buttonText);
  input.value = text;
  let busy = false;
  let timer = null;
  let known = new Set();
  let readOnly = viewer;

  /** Show the counter from 450 characters. */
  function updateCounter() {
    const length = input.value.length;
    counter.hidden = length < COUNTER_FROM;
    counter.textContent = counter.hidden ? '' : `${length} / ${DESCRIPTION_MAX}`;
  }

  /** Name the field and the button for the typed text and the role. */
  function updateLabels() {
    const name = readOnly ? STRINGS.viewerLabel : STRINGS.label;
    label.textContent = name;
    input.placeholder = name;
    button.hidden = readOnly;
    buttonText.data = input.value.trim() && known.has(normalizeDescription(input.value)) ? STRINGS.addAnyway : STRINGS.add;
  }

  /** Report the text now, and drop a report still waiting. */
  function emit() {
    clearTimeout(timer);
    timer = null;
    onSearch(input.value);
  }

  /** Empty the field after an add or Escape, and remove the filter at once. */
  function clear() {
    input.value = '';
    updateCounter();
    updateLabels();
    emit();
  }

  element.addEventListener('submit', async (event) => {
    event.preventDefault();
    const description = input.value.trim();
    if (!description || busy || readOnly) {
      return;
    }
    busy = true;
    try {
      await onAdd(description);
      clear();
    }
    catch {
      // onAdd reports the failure; the text stays for another try.
    }
    finally {
      busy = false;
      input.focus();
    }
  });
  // Typing reports the text once it pauses, so a word runs one query, not one per key (`TEC-16`).
  input.addEventListener('input', () => {
    updateCounter();
    updateLabels();
    clearTimeout(timer);
    timer = setTimeout(emit, SEARCH_DELAY_MS);
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) {
      return;
    }
    // Enter applies the search; without this, the form would submit and add the task.
    if (event.key === 'Enter') {
      event.preventDefault();
      if (timer !== null) {
        emit();
      }
    }
    else if (event.key === 'Escape' && input.value !== '') {
      event.preventDefault();
      clear();
    }
  });
  updateCounter();
  updateLabels();

  return {
    element, input,

    /**
     * Show text set from outside, such as Reset, without reporting it.
     * @param {string} next the text
     */
    setText(next) {
      clearTimeout(timer);
      timer = null;
      if (input.value !== next) {
        input.value = next;
        updateCounter();
        updateLabels();
      }
    },

    /**
     * Set the descriptions that turn Add into Add anyway.
     * @param {Set<string>} next the normalized descriptions of the tasks the view options show
     */
    setKnown(next) {
      known = next;
      updateLabels();
    },

    /**
     * Switch between the add bar and the search-only field of a viewer (`VO-14`).
     * @param {boolean} next whether the user cannot add tasks
     */
    setViewer(next) {
      readOnly = next;
      updateLabels();
    },

    /** Report text still waiting, so the session keeps it. */
    destroy() {
      if (timer !== null) {
        emit();
      }
    },
  };
}

/**
 * Tell the user when a new task is hidden by the view options, with a Show action that resets those options.
 * @param {object} options the new task and its view
 * @param {object} options.task the stored task
 * @param {string[]} options.listIds the lists the task joined
 * @param {object} options.filter the filter of the view
 * @param {object[]} options.lists the live lists
 * @param {Date} options.now the current time
 * @param {{show: Function}} options.toaster the toaster
 * @param {(keys: string[]) => void} options.onShow resets the filters that hide the task
 */
export function notifyIfHidden({ task, listIds, filter, lists, now, toaster, onShow }) {
  const keys = hidingFilters(task, filter, { now, listsByTask: new Map([[task.id, listIds]]) });
  if (keys.length === 0) {
    return;
  }
  const parts = describeFilters(Object.fromEntries(keys.map((key) => [key, filter[key]])), lists).join(' and ');
  toaster.show(STRINGS.hidden(parts), { actionLabel: STRINGS.show, onAction: () => onShow(keys) });
}

/**
 * Create the muted line under the rows that says what Add creates (`VO-3`).
 * @param {object} options line options
 * @param {Document} [options.document] the document
 * @returns {{element: HTMLElement, update: (view: {text: string, shown: number, viewer: boolean}) => boolean}} the line;
 *   `update` returns true when nothing matches and the line replaces the rows' empty state
 */
export function createAddHint({ document: doc = globalThis.document }) {
  const element = doc.createElement('p');
  element.className = 'add-hint';
  element.hidden = true;
  return {
    element,

    update({ text, shown, viewer }) {
      const typed = text.trim();
      element.hidden = !typed || viewer;
      element.textContent = element.hidden ? '' : (shown === 0 ? STRINGS.noMatch : STRINGS.creates(typed));
      return !element.hidden && shown === 0;
    },
  };
}
