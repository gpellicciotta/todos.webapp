/**
 * Field: a label, one control, and optional hint, help, counter, status, and error parts.
 *
 * `attachField` enhances existing `.field` markup; `createField` builds the skeleton, then attaches.
 * The control's `aria-describedby` lists the hint, help, counter, status, and error parts in that order,
 * keeping ids that belong to no part. The help text stays described while collapsed.
 * States: `setError` sets `aria-invalid`, `setPending` sets `aria-busy` on the field, `setValid` shows the status line.
 * Each state pairs an icon from the look sprite with text; messages reach screen readers through a polite live region.
 * Ported from todos.webapp `views/editor-panel.js` at commit 0cf4981.
 */

import { createIcon } from './icon.js';
import { announce } from './live-region.js';

const PARTS = ['hint', 'help', 'counter', 'status', 'error'];
const VALIDITY_KEYS = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'tooShort', 'rangeUnderflow', 'rangeOverflow',
    'stepMismatch', 'badInput', 'customError'];
// A cleared or destroyed field settles its overtaken checks as not passed, so no unchecked value is sent.
const SETTLED_FALSE = Promise.resolve(false);
let instances = 0;

/**
 * Announce a message through the document's shared polite live region, adding it on first use.
 * The region is cleared first, so a repeated message is read again.
 * @param {Document} doc the document
 * @param {string} message the message
 */
export { announce } from './live-region.js';

/**
 * Return the first failing native constraint of a control, such as `valueMissing`, or null.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} control the control
 * @returns {string|null} the validity key
 */
function failingConstraint(control) {
    const validity = control.validity;
    if (!validity || validity.valid) {
        return null;
    }
    return VALIDITY_KEYS.find((key) => validity[key] === true) ?? 'customError';
}

/**
 * Enhance a `.field` element: wire the help toggle, the counter, the described-by ids, and validation.
 * @param {HTMLElement} element the `.field` element
 * @param {object} [options] field options
 * @param {Document} [options.document] document to use, the element's own by default
 * @param {(message: string) => void} [options.announce] reads a message aloud; a shared live region by default
 * @param {Object<string, string>} [options.messages] error messages by validity key, such as `valueMissing`;
 *   the browser's message applies to keys without one
 * @param {(value: string, control: HTMLElement) => (string|null|Promise<string|null>)} [options.validate]
 *   returns an error message, or null when the value is valid; a promise shows the pending state while it runs
 * @param {string} [options.pendingMessage] status text while an async check runs
 * @param {string} [options.validMessage] status text after a passing async check
 * @returns {{element: HTMLElement, control: HTMLElement, readonly error: string|null, setError: Function,
 *   setValid: Function, setPending: Function, clear: Function, validate: () => Promise<boolean>, destroy: Function}}
 *   the controller
 */
export function attachField(element, options = {}) {
    const doc = options.document ?? element.ownerDocument;
    const say = options.announce ?? ((message) => announce(doc, message));
    const { messages = {}, validate: check, pendingMessage = 'Checking.', validMessage = '' } = options;
    const control = element.querySelector('.field__control');
    const part = (name) => element.querySelector(`.field__${name}`);
    const parts = Object.fromEntries(PARTS.map((name) => [name, part(name)]));
    const toggle = part('help-toggle');
    let error = parts.error && !parts.error.hidden ? parts.error.textContent.trim() || null : null;
    // Each check gets a generation; `latest` holds the newest check, or null once an edit makes every check stale.
    let run = 0;
    let latest = null;

    // Every part that a state can show needs an id, so the control can name it.
    for (const name of PARTS) {
        if (parts[name] && !parts[name].id) {
            parts[name].id = `${control.id}-${name}`;
        }
    }

    /** Rebuild `aria-describedby` from the visible parts, keeping ids that belong to no part. */
    function describe() {
        const own = new Set(PARTS.map((name) => parts[name]?.id).filter(Boolean));
        const others = (control.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && !own.has(id));
        const shown = PARTS.filter((name) => parts[name] && (!['status', 'error'].includes(name) || !parts[name].hidden));
        const ids = [...others, ...shown.map((name) => parts[name].id)];
        if (ids.length > 0) {
            control.setAttribute('aria-describedby', ids.join(' '));
        }
        else {
            control.removeAttribute('aria-describedby');
        }
    }

    /**
     * Fill a status or error line with an icon and a message, or empty and hide it.
     * @param {HTMLElement|null} line the line
     * @param {string|null} icon glyph name
     * @param {string|null} message the text
     */
    function fill(line, icon, message) {
        if (!line) {
            return;
        }
        line.hidden = !message;
        line.replaceChildren(...(message ? [createIcon(doc, icon), message] : []));
    }

    /** Show the length against `maxlength`. */
    function count() {
        if (parts.counter && control.maxLength > 0) {
            parts.counter.textContent = `${control.value.length} / ${control.maxLength}`;
        }
    }

    /**
     * Show or clear the field error.
     * @param {string|null} message the error, or null when the value is valid
     */
    function setError(message) {
        error = message || null;
        element.removeAttribute('aria-busy');
        if (error) {
            fill(parts.status, null, null);
            control.setAttribute('aria-invalid', 'true');
        }
        else {
            control.removeAttribute('aria-invalid');
        }
        fill(parts.error, 'alert', error);
        describe();
        if (error) {
            say(error);
        }
    }

    /**
     * Show the valid state, with an optional status message.
     * @param {string} [message] status text, such as "Name is free."
     */
    function setValid(message) {
        setError(null);
        fill(parts.status, 'check', message || null);
        describe();
    }

    /**
     * Show the pending state while a check runs.
     * @param {string} [message] status text, such as "Checking the name."
     */
    function setPending(message = pendingMessage) {
        setError(null);
        element.setAttribute('aria-busy', 'true');
        fill(parts.status, 'more', message);
        describe();
        say(message);
    }

    /** Return to the neutral state, without an error, status, or busy mark. */
    function clear() {
        run += 1;
        latest = SETTLED_FALSE;
        setError(null);
        fill(parts.status, null, null);
        describe();
    }

    /**
     * Check native constraints, then the custom validator, and show the result.
     * A check that a newer one or an edit overtakes changes nothing; it resolves with the result for the current value.
     * @returns {Promise<boolean>} whether the current value is valid
     */
    function validate() {
        const promise = evaluate((run += 1));
        latest = promise;
        return promise;
    }

    /**
     * Run one check generation.
     * @param {number} current the generation of this check
     * @returns {Promise<boolean>} whether the value is valid
     */
    async function evaluate(current) {
        const key = failingConstraint(control);
        if (key) {
            setError(messages[key] ?? control.validationMessage);
            return false;
        }
        let result = check ? check(control.value, control) : null;
        const async = typeof result?.then === 'function';
        if (async) {
            setPending();
            result = await result;
            if (current !== run) {
                return latest ?? validate();
            }
        }
        if (result) {
            setError(result);
            return false;
        }
        if (async) {
            setValid(validMessage);
        }
        else {
            setError(null);
        }
        return true;
    }

    const onToggle = () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        parts.help.hidden = !expanded;
    };
    const onInput = () => {
        count();
        if (error) {
            validate();
        }
        else if (element.getAttribute('aria-busy') === 'true' || parts.status?.hidden === false) {
            // A pending or valid state belongs to the old value, so the edit discards it.
            run += 1;
            latest = null;
            element.removeAttribute('aria-busy');
            fill(parts.status, null, null);
            describe();
        }
    };
    const onBlur = () => {
        validate();
    };
    if (toggle && parts.help) {
        toggle.addEventListener('click', onToggle);
    }
    control.addEventListener('input', onInput);
    control.addEventListener('blur', onBlur);
    count();
    describe();

    return {
        element, control,
        get error() {
            return error;
        },
        setError, setValid, setPending, clear, validate,

        /** Remove the listeners; the markup keeps its current state. */
        destroy() {
            run += 1;
            latest = SETTLED_FALSE;
            toggle?.removeEventListener('click', onToggle);
            control.removeEventListener('input', onInput);
            control.removeEventListener('blur', onBlur);
        }
    };
}

/**
 * Create a field skeleton and attach it; the result keeps todos.webapp's `{element, control, setError}`.
 * @param {Document} doc the document
 * @param {object} options field options, plus every `attachField` option
 * @param {string} options.label the label text
 * @param {string} options.name the control name
 * @param {'input'|'textarea'|'select'} [options.tag] the control element
 * @param {string} [options.type] the input type
 * @param {boolean} [options.hideLabel] keep the label for assistive technology only
 * @param {string} [options.id] the control id; a unique `field-{{n}}` by default
 * @param {string} [options.hint] hint text below the control
 * @param {string} [options.help] help text behind a help toggle
 * @param {string} [options.helpLabel] accessible name of the help toggle; "Help for {{label}}" by default
 * @param {number} [options.maxLength] the `maxlength`, shown in a counter
 * @param {{value: string, label: string}[]} [options.choices] the options of a select
 * @returns {ReturnType<typeof attachField>} the controller
 */
export function createField(doc, options) {
    const { label, name, tag = 'input', type = 'text', hideLabel = false, hint, help, maxLength, choices = [] } = options;
    const id = options.id ?? `field-${(instances += 1)}`;
    const make = (tagName, className, text) => {
        const node = doc.createElement(tagName);
        node.className = className;
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    };
    const element = make('div', 'field');
    element.setAttribute('data-field', '');
    const caption = make('label', hideLabel ? 'field__label field__label--hidden' : 'field__label', label);
    caption.htmlFor = id;
    element.append(caption);
    if (help) {
        const toggle = make('button', 'field__help-toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', `${id}-help`);
        toggle.setAttribute('aria-label', options.helpLabel ?? `Help for ${label}`);
        toggle.append(createIcon(doc, 'help'));
        const text = make('p', 'field__help', help);
        text.id = `${id}-help`;
        text.hidden = true;
        element.append(toggle, text);
    }
    const control = make(tag, 'field__control');
    control.id = id;
    control.name = name;
    if (tag === 'input') {
        control.type = type;
    }
    for (const choice of tag === 'select' ? choices : []) {
        const option = make('option', '', choice.label);
        option.removeAttribute('class');
        option.value = choice.value;
        control.append(option);
    }
    if (maxLength) {
        control.maxLength = maxLength;
    }
    element.append(control);
    if (hint) {
        element.append(make('p', 'field__hint', hint));
    }
    if (maxLength) {
        element.append(make('p', 'field__counter'));
    }
    const status = make('p', 'field__status');
    status.hidden = true;
    const error = make('p', 'field__error');
    error.hidden = true;
    element.append(status, error);
    return attachField(element, { ...options, document: doc });
}
