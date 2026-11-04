/**
 * Add bar: one text field and an Add button that create a task (`TSK-1`).
 *
 * Enter or Add creates the task and keeps the field focused for the next one.
 * The field holds at most 500 characters; a counter appears from 450.
 * The field carries `data-shortcut="add"`, so the `n` shortcut focuses it.
 */

import { DESCRIPTION_MAX } from '../store/tasks.js';
import { spriteIcon } from './task-list.js';

const COUNTER_FROM = 450;
let instances = 0;

/** Add bar strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({ label: 'Add a task', add: 'Add' });

/**
 * Create an add bar.
 * @param {object} options add bar options
 * @param {Document} [options.document] the document
 * @param {(description: string) => Promise<void>} options.onAdd stores a task with the trimmed description
 *   and reports its own failures; the field clears once it resolves and keeps its text when it rejects
 * @returns {{element: HTMLFormElement, input: HTMLInputElement}} the add bar
 */
export function createAddBar({ document: doc = globalThis.document, onAdd }) {
  const id = `add-bar-${(instances += 1)}`;
  const element = doc.createElement('form');
  element.className = 'add-bar';
  element.noValidate = true;
  element.innerHTML = `<div class="field add-bar__field">
      <label class="field__label visually-hidden" for="${id}">${STRINGS.label}</label>
      <input class="field__control" id="${id}" type="text" placeholder="${STRINGS.label}" maxlength="${DESCRIPTION_MAX}"
        autocomplete="off" enterkeyhint="done" data-shortcut="add" aria-describedby="${id}-counter">
      <p class="field__counter add-bar__counter" id="${id}-counter" hidden></p>
    </div>
    <button class="button" type="submit"></button>`;
  const input = element.querySelector('input');
  const counter = element.querySelector('.field__counter');
  const button = element.querySelector('button');
  button.append(spriteIcon(doc, 'plus'), STRINGS.add);
  let busy = false;

  /** Show the counter from 450 characters. */
  function updateCounter() {
    const length = input.value.length;
    counter.hidden = length < COUNTER_FROM;
    counter.textContent = counter.hidden ? '' : `${length} / ${DESCRIPTION_MAX}`;
  }

  element.addEventListener('submit', async (event) => {
    event.preventDefault();
    const description = input.value.trim();
    if (!description || busy) {
      return;
    }
    busy = true;
    try {
      await onAdd(description);
      input.value = '';
      updateCounter();
    }
    catch {
      // onAdd reports the failure; the text stays for another try.
    }
    finally {
      busy = false;
      input.focus();
    }
  });
  input.addEventListener('input', updateCounter);

  return { element, input };
}
