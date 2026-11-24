/**
 * DOM builders for package components (ADR-0003), promoted from the admin console helpers.
 *
 * - `h` and `setChildren` build light-DOM elements with `on*` event listeners, native DOM properties
 *   (`value`, `checked`, `disabled`, `hidden`, `open`, `selected`), flattened children, and text-node escaping.
 * - Component builders emit the normative HTML skeletons of `components.md` using `data-*` hooks and ARIA states,
 *   never `innerHTML` or style classes as hooks.
 * - `createDomBuilders(doc, options)` binds every builder to an injected `document` and tracks `inlineConfirm`
 *   controllers for cleanup via `destroy()`.
 */

import { createIcon } from './icon.js';
import { attachInlineConfirm } from './inline-confirm.js';

const PROPERTIES = new Set(['value', 'checked', 'disabled', 'hidden', 'open', 'selected']);
const BUTTON_KINDS = new Set(['primary', 'secondary', 'quiet', 'inverse']);

// Severity mapping: icon shape, default label, and chip modifier so color never carries meaning alone.
const SEVERITIES = {
    ok: { icon: 'check', label: 'Ok', modifier: '' },
    success: { icon: 'check', label: 'Success', modifier: '' },
    info: { icon: 'note', label: 'Info', modifier: '' },
    debug: { icon: 'note', label: 'Debug', modifier: '' },
    warning: { icon: 'sync-error', label: 'Warning', modifier: 'chip--warning' },
    error: { icon: 'alert', label: 'Error', modifier: 'chip--danger' }
};

let tableCounter = 0;

/**
 * Tell whether a value is a DOM `Node`, working across realms and injected documents.
 * @param {unknown} value candidate value
 * @returns {boolean} `true` when `value` is a DOM node
 */
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}

/**
 * Resolve an icon option into a sprite `<svg>` element or keep an existing node.
 * @param {Document} doc target document
 * @param {string|Node|null|undefined} iconSpec glyph name, node, or `null`
 * @param {object} [options] options passed to `createIcon`
 * @returns {Node|null} icon node or `null`
 */
function resolveIcon(doc, iconSpec, options) {
    if (!iconSpec) {
        return null;
    }
    return isNode(iconSpec) ? iconSpec : createIcon(doc, iconSpec, options);
}

/**
 * Append flattened children to `parent`, turning primitives into text nodes and skipping `null`, `undefined`, and `false`.
 * @param {Document} doc document used to create text nodes
 * @param {Node} parent container node
 * @param {unknown[]} children child values or nested arrays
 */
function appendChildren(doc, parent, children) {
    for (const child of children.flat(Infinity)) {
        if (child !== null && child !== undefined && child !== false) {
            parent.append(isNode(child) ? child : doc.createTextNode(String(child)));
        }
    }
}

/**
 * Normalize a severity or log level name to a known severity key.
 * @param {unknown} name severity name in any case
 * @returns {'ok'|'success'|'info'|'debug'|'warning'|'error'} normalized severity; unknown names read as `'info'`
 */
export function severityOf(name) {
    const key = String(name ?? '').trim().toLowerCase();
    const normalized = key === 'warn' ? 'warning' : (key === 'danger' ? 'error' : key);
    return Object.hasOwn(SEVERITIES, normalized) ? normalized : 'info';
}

/**
 * Create a set of DOM builders bound to an injected document, with lifecycle cleanup for attached inline confirmations.
 * @param {Document} [doc] document used to create elements, `globalThis.document` by default
 * @param {object} [defaults] default builder options
 * @param {Record<string, string>} [defaults.icons] optional icon name overrides keyed by severity
 * @returns {{h: Function, setChildren: Function, button: Function, select: Function, checkbox: Function, facts: Function, dataTable: Function, severityOf: Function, severityChip: Function, statusLine: Function, errorBanner: Function, emptyState: Function, inlineConfirm: Function, destroy: Function}}
 *   bound builder controller
 */
export function createDomBuilders(doc = globalThis.document, defaults = {}) {
    const defaultIcons = defaults?.icons ?? null;
    const cleanups = new Set();

    /**
     * Resolve the effective document for a builder call.
     * @param {Document} [override] per-call document override
     * @returns {Document} active document
     */
    function targetDoc(override) {
        return override ?? doc ?? globalThis.document;
    }

    /**
     * Build an HTML element with attributes, `on*` listeners, DOM properties, and flattened children.
     * @param {string} tag HTML tag name
     * @param {Record<string, unknown>|null} [props] attributes, listeners, and properties
     * @param {...unknown} children nodes, text values, or nested arrays; `null`, `undefined`, and `false` are skipped
     * @returns {HTMLElement} created element
     */
    function buildElement(tag, props, ...children) {
        const activeDoc = targetDoc();
        return createElementIn(activeDoc, tag, props, children);
    }

    /**
     * Create an element inside a specific document.
     * @param {Document} activeDoc target document
     * @param {string} tag HTML tag name
     * @param {Record<string, unknown>|null} [props] attributes, listeners, and properties
     * @param {unknown[]} children child values
     * @returns {HTMLElement} created element
     */
    function createElementIn(activeDoc, tag, props, children) {
        const element = activeDoc.createElement(tag);
        let deferredValue;
        let hasDeferredValue = false;

        for (const [key, value] of Object.entries(props ?? {})) {
            if (value === null || value === undefined || (value === false && !PROPERTIES.has(key))) {
                continue;
            }
            if (key.startsWith('on') && key.length > 2 && typeof value === 'function') {
                element.addEventListener(key.slice(2), value);
            }
            else if (key === 'class') {
                if (value) {
                    element.className = String(value);
                }
            }
            else if (key === 'value') {
                deferredValue = value;
                hasDeferredValue = true;
            }
            else if (PROPERTIES.has(key)) {
                element[key] = value;
            }
            else {
                element.setAttribute(key, value === true ? '' : String(value));
            }
        }

        appendChildren(activeDoc, element, children);
        // Apply `value` after children so `<select>` matches its newly appended `<option>` elements.
        if (hasDeferredValue) {
            element.value = deferredValue;
        }
        return element;
    }

    /**
     * Replace all children of an element with flattened nodes and text.
     * @param {Node} parent container element
     * @param {...unknown} children replacement children
     * @returns {Node} `parent`
     */
    function replaceChildrenOf(parent, ...children) {
        parent.replaceChildren();
        appendChildren(parent.ownerDocument ?? targetDoc(), parent, children);
        return parent;
    }

    /**
     * Build a `.button` matching `components.md#button`.
     * @param {unknown} label button text or child nodes
     * @param {((event: MouseEvent) => void)|null} [onclick] optional click listener
     * @param {object} [options] button variants and attributes
     * @param {'primary'|'secondary'|'quiet'|'inverse'} [options.kind] button style, `'secondary'` by default
     * @param {boolean} [options.danger] true for the `--danger` modifier
     * @param {boolean} [options.small] true for the `--small` modifier
     * @param {boolean} [options.disabled] native `disabled` state
     * @param {string|Node|null} [options.icon] optional leading sprite glyph name or SVG node
     * @param {string} [options.type] button `type` attribute, `'button'` by default
     * @param {string} [options.className] extra classes appended after button classes
     * @param {Document} [options.document] document override
     * @returns {HTMLButtonElement} built button
     */
    function buildButton(label, onclick = null, options = {}) {
        const {
            kind = 'secondary',
            danger = false,
            small = false,
            disabled = false,
            icon = null,
            type = 'button',
            className = '',
            document: docOverride,
            ...rest
        } = options ?? {};
        if (!BUTTON_KINDS.has(kind)) {
            throw new RangeError(`Unknown button kind: ${kind}`);
        }
        const activeDoc = targetDoc(docOverride);
        const classes = [
            'button',
            kind === 'primary' ? '' : `button--${kind}`,
            danger ? 'button--danger' : '',
            small ? 'button--small' : '',
            className
        ].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'button', { class: classes, type, onclick, disabled, ...rest }, [
            resolveIcon(activeDoc, icon),
            label
        ]);
    }

    /**
     * Build a `<select class="field__control">` matching `components.md#field`.
     * @param {Array<string|number|[unknown, unknown, Record<string, unknown>?]|{value: unknown, label?: unknown, disabled?: boolean}>} items option entries
     * @param {unknown} [selected] currently selected value
     * @param {object} [props] additional attributes, listeners, or `{ document }`
     * @returns {HTMLSelectElement} built select element
     */
    function buildSelect(items, selected, props = {}) {
        const { class: classProp = '', className = '', document: docOverride, ...rest } = props ?? {};
        const activeDoc = targetDoc(docOverride);
        const hasSelected = selected !== undefined && selected !== null;
        const selectedValue = hasSelected ? String(selected) : null;
        const optionNodes = (items ?? []).map((item) => {
            let value;
            let label;
            let optProps = null;
            if (Array.isArray(item)) {
                [value, label, optProps] = item;
            }
            else if (item && typeof item === 'object') {
                const { value: itemValue, label: itemLabel, ...itemRest } = item;
                value = itemValue;
                label = itemLabel ?? itemValue;
                optProps = itemRest;
            }
            else {
                value = item;
                label = item;
            }
            const valueText = String(value);
            return createElementIn(activeDoc, 'option', {
                ...optProps,
                value: valueText,
                selected: hasSelected && valueText === selectedValue
            }, [label]);
        });
        const classes = ['field__control', classProp, className].filter(Boolean).join(' ');
        const element = createElementIn(activeDoc, 'select', { class: classes, ...rest }, optionNodes);
        if (hasSelected) {
            element.value = selectedValue;
        }
        return element;
    }

    /**
     * Build a `.checkbox` matching `components.md#checkbox`.
     * @param {unknown} label checkbox label text or nodes
     * @param {object} [props] `<input type="checkbox">` attributes, listeners, `indeterminate`, or `{ document }`
     * @returns {HTMLLabelElement} built checkbox label
     */
    function buildCheckbox(label, props = {}) {
        const {
            class: classProp = '',
            className = '',
            indeterminate = false,
            labelClass = '',
            document: docOverride,
            ...rest
        } = props ?? {};
        const activeDoc = targetDoc(docOverride);
        const inputClasses = ['checkbox__control', classProp, className].filter(Boolean).join(' ');
        const input = createElementIn(activeDoc, 'input', { class: inputClasses, type: 'checkbox', ...rest }, []);
        if (indeterminate) {
            input.indeterminate = true;
        }
        const wrapperClasses = ['checkbox', labelClass].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'label', { class: wrapperClasses }, [
            input,
            createElementIn(activeDoc, 'span', { class: 'checkbox__label' }, [label])
        ]);
    }

    /**
     * Build a `<dl class="list list--facts">` matching `components.md#list`.
     * @param {Array<[unknown, unknown, Record<string, unknown>?]|{term?: unknown, label?: unknown, value: unknown, key?: string, props?: Record<string, unknown>}|null|false|undefined>} rows term/value pairs
     * @param {boolean|object} [options] `true` for `--compact`, or options `{ compact, className, document, ...rest }`
     * @returns {HTMLDListElement} built facts definition list
     */
    function buildFacts(rows, options = false) {
        const normalized = typeof options === 'boolean' ? { compact: options } : (options ?? {});
        const { compact = false, className = '', document: docOverride, ...rest } = normalized;
        const activeDoc = targetDoc(docOverride);
        const classes = ['list', 'list--facts', compact ? 'list--compact' : '', className].filter(Boolean).join(' ');
        const children = [];
        for (const row of rows ?? []) {
            if (!row) {
                continue;
            }
            let term;
            let value;
            let valueProps = null;
            if (Array.isArray(row)) {
                [term, value, valueProps] = row;
            }
            else {
                term = row.term ?? row.label;
                value = row.value;
                valueProps = row.props ?? (row.key ? { 'data-fact': row.key } : null);
            }
            children.push(
                createElementIn(activeDoc, 'dt', { class: 'list__term' }, [term]),
                createElementIn(activeDoc, 'dd', { class: 'list__value', ...valueProps }, [value])
            );
        }
        return createElementIn(activeDoc, 'dl', { class: classes, ...rest }, children);
    }

    /**
     * Build a data table inside its focusable scroll frame matching `components.md#table`.
     * @param {string} caption table caption text
     * @param {Array<string|{label: string, numeric?: boolean, hidden?: boolean, className?: string, content?: unknown}>} columns column definitions
     * @param {HTMLElement[]} rows `<tr>` body rows
     * @param {object} [options] table options (`dense`, `framed`, `showCaption`, `captionId`, `className`, `tableClassName`, `document`)
     * @returns {HTMLDivElement} focusable table scroll region
     */
    function buildDataTable(caption, columns, rows, options = {}) {
        const {
            dense = true,
            framed = true,
            showCaption = false,
            captionId,
            className = '',
            tableClassName = '',
            document: docOverride,
            ...rest
        } = options ?? {};
        const activeDoc = targetDoc(docOverride);
        const id = captionId ?? `table-caption-${(tableCounter += 1)}`;
        const headings = (columns ?? []).map((column) => {
            if (typeof column === 'string') {
                return createElementIn(activeDoc, 'th', { scope: 'col' }, [column]);
            }
            const { label, numeric = false, hidden = false, className: colClass = '', content, ...colRest } = column;
            const thClass = [numeric ? 'table__numeric' : '', colClass].filter(Boolean).join(' ');
            const body = content !== undefined
                ? content
                : (hidden ? createElementIn(activeDoc, 'span', { class: 'visually-hidden' }, [label]) : label);
            return createElementIn(activeDoc, 'th', { scope: 'col', class: thClass, ...colRest }, [body]);
        });
        const frameClasses = [framed ? 'table__frame' : 'table__scroll', className].filter(Boolean).join(' ');
        const tableClasses = ['table', dense ? 'table--dense' : '', tableClassName].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'div', {
            class: frameClasses,
            role: 'region',
            'aria-labelledby': id,
            tabindex: '0',
            ...rest
        }, [
            createElementIn(activeDoc, 'table', { class: tableClasses }, [
                createElementIn(activeDoc, 'caption', { class: showCaption ? 'table__caption' : 'visually-hidden', id }, [caption]),
                createElementIn(activeDoc, 'thead', null, [createElementIn(activeDoc, 'tr', null, headings)]),
                createElementIn(activeDoc, 'tbody', null, rows ?? [])
            ])
        ]);
    }

    /**
     * Build a `.chip.chip--status` severity chip matching `components.md#chip`.
     * @param {string} severity severity name (`ok`, `success`, `info`, `debug`, `warning`/`warn`, `error`/`danger`)
     * @param {string|null} [label] visible word, defaulting to the severity's label
     * @param {object} [options] optional `{ icon, icons, className, document, ...rest }`
     * @returns {HTMLSpanElement} built status chip
     */
    function buildSeverityChip(severity, label, options = {}) {
        const { icon, icons, className = '', document: docOverride, ...rest } = options ?? {};
        const activeDoc = targetDoc(docOverride);
        const key = severityOf(severity);
        const spec = SEVERITIES[key];
        const iconSpec = icon !== undefined ? icon : (icons?.[key] ?? defaultIcons?.[key] ?? spec.icon);
        const classes = ['chip', 'chip--status', spec.modifier, className].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'span', { class: classes, 'data-severity': key, ...rest }, [
            resolveIcon(activeDoc, iconSpec),
            label ?? spec.label
        ]);
    }

    /**
     * Build a polite `.loading__status` line matching `components.md#loading`.
     * @param {unknown} text status message text or nodes
     * @param {object} [options] optional attributes or `{ className, document }`
     * @returns {HTMLParagraphElement} built status line
     */
    function buildStatusLine(text, options = {}) {
        const { className = '', document: docOverride, ...rest } = options ?? {};
        const activeDoc = targetDoc(docOverride);
        const classes = ['loading__status', className].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'p', {
            class: classes,
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true',
            ...rest
        }, [text]);
    }

    /**
     * Build a `.banner.banner--danger` error banner matching `components.md#banner`.
     * @param {unknown} text error message text or nodes
     * @param {unknown} [action] optional trailing action button or nodes
     * @param {object} [options] optional `{ icon, className, document, ...rest }`
     * @returns {HTMLDivElement} built error banner
     */
    function buildErrorBanner(text, action = null, options = {}) {
        const { icon = 'alert', className = '', document: docOverride, ...rest } = options ?? {};
        const activeDoc = targetDoc(docOverride);
        const classes = ['banner', 'banner--danger', className].filter(Boolean).join(' ');
        return createElementIn(activeDoc, 'div', { class: classes, role: 'alert', ...rest }, [
            resolveIcon(activeDoc, icon),
            createElementIn(activeDoc, 'p', { class: 'banner__text' }, [text]),
            action
        ]);
    }

    /**
     * Build an `.empty-state` matching `components.md#empty-state`.
     * @param {unknown} text descriptive message text or nodes
     * @param {unknown} [action] optional action button or array of up to two actions
     * @param {object} [options] optional `{ icon, title, headingLevel, className, document, ...rest }`
     * @returns {HTMLDivElement} built empty state
     */
    function buildEmptyState(text, action = null, options = {}) {
        const {
            icon = null,
            title = null,
            headingLevel = 2,
            className = '',
            document: docOverride,
            ...rest
        } = options ?? {};
        const activeDoc = targetDoc(docOverride);
        const classes = ['empty-state', className].filter(Boolean).join(' ');
        const actionList = Array.isArray(action)
            ? action.flat(Infinity).filter((item) => item !== null && item !== undefined && item !== false)
            : (action ? [action] : []);
        const hasText = text !== null && text !== undefined && text !== false && text !== '';
        return createElementIn(activeDoc, 'div', { class: classes, ...rest }, [
            resolveIcon(activeDoc, icon, { size: 'lg' }),
            title ? createElementIn(activeDoc, `h${headingLevel}`, { class: 'empty-state__title' }, [title]) : null,
            hasText ? createElementIn(activeDoc, 'p', { class: 'empty-state__text' }, [text]) : null,
            actionList.length > 0 ? createElementIn(activeDoc, 'div', { class: 'empty-state__actions' }, actionList) : null
        ]);
    }

    /**
     * Wrap a destructive trigger button with an attached `.inline-confirm` matching `components.md#inline-confirm`.
     * @param {HTMLButtonElement} trigger button that opens the in-place confirmation
     * @param {object} options confirmation options
     * @param {string} options.label accessible group name (`aria-label`)
     * @param {unknown|(() => unknown)} options.text question text/nodes, or a function evaluated when the trigger is clicked
     * @param {string} options.confirmLabel confirm button label
     * @param {string} [options.cancelLabel] cancel button label, `'Keep'` by default
     * @param {'primary'|'secondary'|'quiet'|'inverse'} [options.cancelKind] cancel button kind, `'secondary'` by default
     * @param {() => void} [options.onConfirm] callback invoked after confirmation restores the trigger
     * @param {() => void} [options.onCancel] callback invoked on cancel or Escape
     * @param {() => void} [options.onKeep] alias for `onCancel`
     * @param {string} [options.className] optional extra class on the slot container
     * @param {Document} [options.document] document override
     * @returns {HTMLDivElement} `[data-inline-confirm-slot]` container holding the trigger and hidden question
     */
    function buildInlineConfirm(trigger, options) {
        const {
            label,
            text,
            confirmLabel,
            cancelLabel = 'Keep',
            cancelKind = 'secondary',
            onConfirm,
            onCancel,
            onKeep,
            className = '',
            document: docOverride,
            ...rest
        } = options;
        const activeDoc = targetDoc(docOverride ?? trigger.ownerDocument);
        trigger.setAttribute('data-inline-confirm-content', '');
        trigger.setAttribute('data-inline-confirm-trigger', '');
        const questionText = createElementIn(activeDoc, 'p', { class: 'inline-confirm__question' }, typeof text === 'function' ? [] : [text]);
        const confirmBtn = buildButton(confirmLabel, null, {
            kind: 'primary',
            danger: true,
            document: activeDoc,
            'data-inline-confirm-answer': 'yes'
        });
        const cancelBtn = buildButton(cancelLabel, null, {
            kind: cancelKind,
            document: activeDoc,
            'data-inline-confirm-answer': 'no'
        });
        const question = createElementIn(activeDoc, 'div', {
            class: 'inline-confirm',
            role: 'group',
            'aria-label': label,
            'data-inline-confirm': true
        }, [questionText, confirmBtn, cancelBtn]);
        let onTriggerClick = null;
        if (typeof text === 'function') {
            // Runs before attachInlineConfirm's click listener so the question reflects the latest state.
            onTriggerClick = () => {
                replaceChildrenOf(questionText, text());
            };
            trigger.addEventListener('click', onTriggerClick);
        }
        const slot = createElementIn(activeDoc, 'div', {
            class: className,
            'data-inline-confirm-slot': true,
            ...rest
        }, [trigger, question]);
        const controller = attachInlineConfirm(slot, {
            document: activeDoc,
            onConfirm,
            onCancel: onCancel ?? onKeep
        });
        cleanups.add(() => {
            if (onTriggerClick) {
                trigger.removeEventListener('click', onTriggerClick);
            }
            controller.destroy();
        });
        return slot;
    }

    /** Destroy every inline confirmation controller created by this builder instance. */
    function destroy() {
        for (const cleanup of cleanups) {
            cleanup();
        }
        cleanups.clear();
    }

    return {
        h: buildElement,
        setChildren: replaceChildrenOf,
        button: buildButton,
        select: buildSelect,
        checkbox: buildCheckbox,
        facts: buildFacts,
        dataTable: buildDataTable,
        severityOf,
        severityChip: buildSeverityChip,
        statusLine: buildStatusLine,
        errorBanner: buildErrorBanner,
        emptyState: buildEmptyState,
        inlineConfirm: buildInlineConfirm,
        destroy
    };
}

const shared = createDomBuilders(undefined);

export const h = shared.h;
export const setChildren = shared.setChildren;
export const button = shared.button;
export const select = shared.select;
export const checkbox = shared.checkbox;
export const facts = shared.facts;
export const dataTable = shared.dataTable;
export const severityChip = shared.severityChip;
export const statusLine = shared.statusLine;
export const errorBanner = shared.errorBanner;
export const emptyState = shared.emptyState;
export const inlineConfirm = shared.inlineConfirm;
