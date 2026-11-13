/**
 * Form: validates its fields on blur and on submit, and marks itself busy while sending.
 *
 * After a failed submit, the error summary lists every invalid field as a link, and focus moves to it.
 * A link click moves focus to its field's control. Server errors from `onSubmit` reach the fields the same way.
 * While sending, the form carries `aria-busy` and its submit buttons `aria-disabled`, and the busy message is announced.
 * Uses `field.js`, the module of the fields it holds.
 */

import { attachField } from './field.js';
import { announce as announceInRegion } from './live-region.js';

let instances = 0;

/**
 * Enhance a `form[data-form]`: attach its `[data-field]` fields and handle submit.
 * @param {HTMLFormElement} form the form, with `novalidate` so the summary replaces the browser bubbles
 * @param {object} [options] form options
 * @param {Document} [options.document] document to use, the form's own by default
 * @param {Object<string, object>} [options.fields] `attachField` options by control name
 * @param {(submission: {form: HTMLFormElement, data: FormData, fields: Map<string, object>}) =>
 *   (void|{errors?: Object<string, string>}|Promise<void|{errors?: Object<string, string>}>)} [options.onSubmit]
 *   sends valid data; returned errors by control name mark those fields invalid
 * @param {(message: string) => void} [options.announce] reads a message aloud; the fields' live region by default
 * @param {string} [options.busyMessage] announced when sending starts
 * @param {(count: number) => string} [options.summaryTitle] the summary heading for a number of invalid fields
 * @returns {{element: HTMLFormElement, fields: Map<string, object>, submit: () => Promise<boolean>,
 *   setErrors: Function, destroy: Function}} the controller
 */
export function attachForm(form, options = {}) {
    const doc = options.document ?? form.ownerDocument;
    const {
        fields: fieldOptions = {}, onSubmit = () => {}, announce, busyMessage = 'Sending.',
        summaryTitle = (count) => `Fix ${count} ${count === 1 ? 'field' : 'fields'}`
    } = options;
    const fields = new Map();
    for (const element of form.querySelectorAll('[data-field]')) {
        const name = element.querySelector('.field__control').name;
        fields.set(name, attachField(element, { document: doc, ...(announce ? { announce } : {}), ...fieldOptions[name] }));
    }
    let summary = form.querySelector('.error-summary');
    if (!summary) {
        summary = doc.createElement('div');
        summary.className = 'error-summary';
        summary.hidden = true;
        form.prepend(summary);
    }
    summary.setAttribute('tabindex', '-1');
    let submitting = false;

    /**
     * Show the summary for the invalid fields and focus it, or hide it when none is invalid.
     * @returns {boolean} whether any field is invalid
     */
    function summarize() {
        const invalid = [...fields.values()].filter((field) => field.error);
        summary.hidden = invalid.length === 0;
        summary.replaceChildren();
        if (invalid.length === 0) {
            summary.removeAttribute('role');
            return false;
        }
        const title = doc.createElement('h2');
        title.className = 'error-summary__title';
        title.id = summary.id ? `${summary.id}-title` : `error-summary-${(instances += 1)}-title`;
        title.textContent = summaryTitle(invalid.length);
        const list = doc.createElement('ul');
        list.className = 'error-summary__list';
        for (const field of invalid) {
            const item = doc.createElement('li');
            const link = doc.createElement('a');
            link.className = 'error-summary__link';
            link.href = `#${field.control.id}`;
            link.textContent = field.error;
            item.append(link);
            list.append(item);
        }
        summary.append(title, list);
        summary.setAttribute('role', 'alert');
        summary.setAttribute('aria-labelledby', title.id);
        summary.focus();
        return true;
    }

    /**
     * Mark fields invalid by control name, such as server errors, and show the summary.
     * @param {Object<string, string>} errors messages by control name
     * @returns {boolean} whether any field is invalid
     */
    function setErrors(errors) {
        for (const [name, message] of Object.entries(errors)) {
            fields.get(name)?.setError(message);
        }
        return summarize();
    }

    /**
     * Mark the form busy, or idle again.
     * @param {boolean} value whether a submit is sending
     */
    function setBusy(value) {
        for (const button of form.querySelectorAll('button[type="submit"], button:not([type]), input[type="submit"]')) {
            if (value) {
                button.setAttribute('aria-disabled', 'true');
            }
            else {
                button.removeAttribute('aria-disabled');
            }
        }
        if (value) {
            form.setAttribute('aria-busy', 'true');
            (announce ?? ((message) => announceInRegion(doc, message)))(busyMessage);
        }
        else {
            form.removeAttribute('aria-busy');
        }
    }

    /**
     * Validate every field, then send the data when all pass.
     * One submit runs at a time, from the first validation to the end of sending; a submit meanwhile resolves false.
     * The data is read right after the last validation, with no wait between, so every sent field value was checked.
     * @returns {Promise<boolean>} whether the form was valid and sent without field errors
     */
    async function submit() {
        if (submitting) {
            return false;
        }
        submitting = true;
        try {
            // An edit while any check runs makes every earlier result stale, so validate again until no value changed.
            const values = () => [...fields.values()].map((field) => field.control.value);
            let results;
            let checked;
            do {
                checked = values();
                results = await Promise.all([...fields.values()].map((field) => field.validate()));
            } while (!results.includes(false) && values().some((value, index) => value !== checked[index]));
            if (results.includes(false)) {
                summarize();
                return false;
            }
            summarize();
            setBusy(true);
            let result;
            try {
                result = await onSubmit({ form, data: new (doc.defaultView ?? globalThis).FormData(form), fields });
            }
            finally {
                setBusy(false);
            }
            return !(result?.errors && setErrors(result.errors));
        }
        finally {
            submitting = false;
        }
    }

    const onSubmitEvent = (event) => {
        event.preventDefault();
        submit();
    };
    const onClick = (event) => {
        const link = event.target.closest?.('.error-summary__link');
        const control = link && doc.getElementById(link.getAttribute('href').slice(1));
        if (control) {
            event.preventDefault();
            control.focus();
        }
    };
    form.addEventListener('submit', onSubmitEvent);
    summary.addEventListener('click', onClick);

    return {
        element: form, fields, submit, setErrors,

        /** Remove the listeners and detach the fields; the markup keeps its current state. */
        destroy() {
            form.removeEventListener('submit', onSubmitEvent);
            summary.removeEventListener('click', onClick);
            for (const field of fields.values()) {
                field.destroy();
            }
        }
    };
}
