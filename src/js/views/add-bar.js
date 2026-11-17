/**
 * Add bar: one text field that searches the view, and an Add button that creates a task (`TSK-1`, `VO-3`).
 *
 * Typing reports the text to `onSearch` once it pauses for 150 ms.
 * The Add button, Shift+Enter, or Alt+Enter creates the task, then clears the field and the filter,
 * and focuses the field again, so the next task can follow; the task editor of a wide screen leaves it there.
 * Enter adds too while the device's Make Enter add preference is on, its default; when it is off, or for a viewer,
 * Enter reports the search at once and never adds.
 * The button reads "Add anyway" while the typed text equals a known description, ignoring case and spaces.
 * A viewer, who cannot add tasks, sees "Search tasks" and no Add button (`VO-14`).
 * The field holds at most 500 characters; a counter appears from 450.
 * The field carries `data-shortcut="add search"`, so the `n` and `/` shortcuts both focus it.
 * A due date, a time, and `#list` tags typed in the field set the new task (`TSK-14`); a preview line under the
 * field names what they set, and the search keeps the raw text.
 */

import { readEnterAdds } from '../core/preferences.js';
import { hidingFilters, normalizeDescription } from '../core/query.js';
import { describeQuickAdd, parseQuickAdd } from '../core/quick-add.js';
import { DESCRIPTION_MAX } from '../store/tasks.js';
import { spriteIcon } from './task-list.js';
import { describeFilters } from './view-controls.js';

const COUNTER_FROM = 450;
const SEARCH_DELAY_MS = 150;
/** Below 64rem the task editor covers the add field, so an add opens no editor there (`TSK-13`). */
const COMPACT = '(width < 64rem)';
let instances = 0;

/** Add bar strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  label: 'Search or add a task',
  viewerLabel: 'Search tasks',
  add: 'Add',
  addAnyway: 'Add anyway',
  addHint: 'Add (Shift+Enter or Alt+Enter)',
  addHintEnter: 'Add (Enter, Shift+Enter, or Alt+Enter)',
  added: (description) => `Added “${description}”.`,
  show: 'Show',
  noMatch: 'No task matches. Add creates it.',
  creates: (text) => `Add creates a new task “${text}”.`,
  hidden: (parts) => `Task added. ${parts} hides it.`,
});

/**
 * Create an add bar.
 * @param {object} options add bar options
 * @param {Document} [options.document] the document
 * @param {(description: string, extra: {due: string|null, listIds: string[]}) => Promise<void>} options.onAdd stores
 *   a task with the trimmed description, the typed due time, and the tagged lists, and reports its own failures;
 *   the field clears once it resolves and keeps its text when it rejects
 * @param {(text: string) => void} [options.onSearch] receives the search text once typing pauses, on Enter, and when
 *   the field clears
 * @param {string} [options.text] the starting text
 * @param {boolean} [options.viewer] whether the user cannot add tasks (`VO-14`)
 * @param {() => Date} [options.now] the clock, for typed dates and times
 * @param {() => Storage} [options.getStorage] returns the storage of the Make Enter add preference
 * @returns {{element: HTMLFormElement, input: HTMLInputElement, setText: Function, setKnown: Function,
 *   setViewer: Function, setLists: Function, descriptionOf: Function, destroy: Function}} the add bar
 */
export function createAddBar({
  document: doc = globalThis.document, onAdd, onSearch = () => {}, text = '', viewer = false, now = () => new Date(),
  getStorage = () => globalThis.localStorage,
}) {
  const id = `add-bar-${(instances += 1)}`;
  const element = doc.createElement('form');
  element.className = 'add-bar';
  element.noValidate = true;
  element.innerHTML = `<div class="field add-bar__field">
      <label class="field__label visually-hidden" for="${id}"></label>
      <input class="field__control" id="${id}" type="text" maxlength="${DESCRIPTION_MAX}"
        autocomplete="off" enterkeyhint="done" data-shortcut="add search" aria-describedby="${id}-counter ${id}-preview">
      <p class="field__counter add-bar__counter" id="${id}-counter" hidden></p>
    </div>
    <button class="button" type="submit"></button>
    <p class="add-bar__preview" id="${id}-preview" hidden></p>`;
  const input = element.querySelector('input');
  const label = element.querySelector('label');
  const counter = element.querySelector('.field__counter');
  const button = element.querySelector('button');
  const preview = element.querySelector('.add-bar__preview');
  const buttonText = doc.createTextNode(STRINGS.add);
  button.append(spriteIcon(doc, 'plus'), buttonText);
  input.value = text;
  let busy = false;
  let timer = null;
  let known = new Set();
  let readOnly = viewer;
  let lists = [];

  /**
   * Parse typed text against the current lists and time.
   * @param {string} value the text
   * @returns {object} the result of `parseQuickAdd`
   */
  function parse(value) {
    return parseQuickAdd(value, { now: now(), lists });
  }

  /** Show the counter from 450 characters. */
  function updateCounter() {
    const length = input.value.length;
    counter.hidden = length < COUNTER_FROM;
    counter.textContent = counter.hidden ? '' : `${length} / ${DESCRIPTION_MAX}`;
  }

  /** Name the field and the button for the typed text and the role, and preview what the typed syntax sets. */
  function updateLabels() {
    const name = readOnly ? STRINGS.viewerLabel : STRINGS.label;
    label.textContent = name;
    input.placeholder = name;
    button.hidden = readOnly;
    const parsed = parse(input.value);
    buttonText.data = parsed.description && known.has(normalizeDescription(parsed.description)) ? STRINGS.addAnyway : STRINGS.add;
    preview.textContent = readOnly ? '' : describeQuickAdd(parsed, now());
    preview.hidden = preview.textContent === '';
  }

  /**
   * Name the keys that add, on the field and in the Add button tooltip, for the stored Make Enter add choice.
   * A viewer's field only searches, so it names none (`VO-14`).
   */
  function updateShortcuts() {
    if (readOnly) {
      input.removeAttribute('aria-keyshortcuts');
      return;
    }
    const enterAdds = readEnterAdds(getStorage);
    input.setAttribute('aria-keyshortcuts', enterAdds ? 'Enter Shift+Enter Alt+Enter' : 'Shift+Enter Alt+Enter');
    button.title = enterAdds ? STRINGS.addHintEnter : STRINGS.addHint;
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

  /** Create the task from the parsed text, once at a time; the Add button and its shortcuts share this path. */
  async function add() {
    const { description, due, lists: tagged } = parse(input.value);
    if (!description || busy || readOnly) {
      return;
    }
    busy = true;
    try {
      await onAdd(description, { due, listIds: tagged.map((list) => list.id) });
      clear();
    }
    catch {
      // onAdd reports the failure; the text stays for another try.
    }
    finally {
      busy = false;
      input.focus();
    }
  }

  element.addEventListener('submit', (event) => {
    event.preventDefault();
    add();
  });
  // Typing reports the text once it pauses, so a word runs one query, not one per key (`TEC-16`).
  input.addEventListener('input', () => {
    updateCounter();
    updateLabels();
    clearTimeout(timer);
    timer = setTimeout(emit, SEARCH_DELAY_MS);
  });
  // Settings may change the choice while this view stays mounted, so focus reads it again.
  input.addEventListener('focus', updateShortcuts);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) {
      return;
    }
    // Shift+Enter and Alt+Enter add, like the Add button; Enter does too while Make Enter add is on.
    const enterAdds = event.key === 'Enter' && !readOnly && Boolean(parse(input.value).description) && readEnterAdds(getStorage);
    if (event.key === 'Enter' && (event.shiftKey || event.altKey || enterAdds)) {
      event.preventDefault();
      add();
    }
    // Otherwise Enter applies the search; without this, the form would submit and add the task.
    else if (event.key === 'Enter') {
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
  updateShortcuts();

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
      updateShortcuts();
    },

    /**
     * Set the lists that `#name` tags can name.
     * @param {object[]} next the live lists
     */
    setLists(next) {
      lists = next;
      updateLabels();
    },

    /**
     * Read the description that Add would create from a text, without its typed syntax.
     * @param {string} value the text
     * @returns {string} the description
     */
    descriptionOf(value) {
      return parse(value).description;
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
 * Tell whether an add opens the new task's editor: only on a wide screen, where the editor sits beside the add field
 * and leaves it the focus; on a compact screen it would cover the field (`TSK-13`).
 * @param {Document} doc the document
 * @returns {boolean} true to open the editor
 */
export function editorOpensAfterAdd(doc) {
  return !doc.defaultView?.matchMedia?.(COMPACT).matches;
}

/**
 * Name a new task for the polite live region, since the focus stays in the add field.
 * @param {string} description the description
 * @returns {string} the message
 */
export function addedMessage(description) {
  return STRINGS.added(description);
}

/**
 * Tell the user when a new task is hidden by the view options, with a Show action that resets those options.
 * @param {object} options the new task and its view
 * @param {object} options.task the stored task
 * @param {string[]} options.listIds the lists the task joined
 * @param {object} options.filter the filter of the view
 * @param {object[]} options.lists the live lists
 * @param {Set<string>} [options.sharedListIds] the identifiers of the shared lists, for the Shared filter
 * @param {Date} options.now the current time
 * @param {{show: Function}} options.toaster the toaster
 * @param {(keys: string[]) => void} options.onShow resets the filters that hide the task
 */
export function notifyIfHidden({ task, listIds, filter, lists, sharedListIds, now, toaster, onShow }) {
  const keys = hidingFilters(task, filter, { now, listsByTask: new Map([[task.id, listIds]]), sharedListIds });
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
 * @param {(text: string) => string} [options.describe] reads the description Add creates from the typed text
 * @returns {{element: HTMLElement, update: (view: {text: string, shown: number, viewer: boolean}) => boolean}} the line;
 *   `update` returns true when nothing matches and the line replaces the rows' empty state
 */
export function createAddHint({ document: doc = globalThis.document, describe = (text) => text }) {
  const element = doc.createElement('p');
  element.className = 'add-hint';
  element.hidden = true;
  return {
    element,

    update({ text, shown, viewer }) {
      const typed = text.trim();
      element.hidden = !typed || viewer;
      element.textContent = element.hidden ? '' : (shown === 0 ? STRINGS.noMatch : STRINGS.creates(describe(typed)));
      return !element.hidden && shown === 0;
    },
  };
}
