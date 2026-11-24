/**
 * The view lifecycle base (ADR-0004): attach and detach, a wait status, an error page, and long-running operations.
 *
 * `View` is the base of every screen part that loads its own data. It owns one root element with three children:
 * - `[data-view-error]`: the error page, an `empty-state` with a retry button and an optional way back;
 * - `[data-view-wait]`: a status with a spinner, shown only when an operation outlasts the wait delay;
 * - `[data-view-main]`: the view's own markup, kept in place while the wait status shows.
 * State lives in `data-view-state` (`ready`, `updating`, or `error`), `hidden`, and `aria-busy`; no class is a hook.
 * `RoutedView` adds a title, a route pattern, and the registration of the view's actions with the app.
 */

import { createIcon } from './icon.js';

const DEFAULT_LABELS = {
    retry: 'Try again',
    waiting: 'Waiting for data...',
    errorTitle: 'Unknown Error',
    errorText: 'No details available... Sorry.'
};
const DEFAULT_WAIT_DELAY = 700;
const QUIET_LOG = { trace() {}, info() {}, warn() {}, error() {} };

/**
 * Capitalize the first character of a message.
 * @param {string} text the message
 * @returns {string} the message, starting with an uppercase letter
 */
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Escape a text for use inside a regular expression.
 * @param {string} text the literal text
 * @returns {string} the escaped text
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A long-running operation of a view.
 * @typedef {object} LongRunningOperation
 * @property {string} title what the operation does, shown as the error page title
 * @property {string} [description] the wait status text
 * @property {() => Promise<unknown>} start starts the operation
 * @property {(result: unknown) => void} [success] called when the promise resolves
 * @property {(errorInfo: {'error-title': string, 'error-description': string, 'error-cause': unknown}) => void} [error] called when it rejects
 * @property {() => void} [always] called after `success` or `error`
 */

export class View {
    /**
     * Create the view; it attaches later.
     * @param {string} id unique ID of the view, used as the root element's id
     * @param {object} app the app the view belongs to; may offer `startProgress` and `stopProgress`
     * @param {object} [options] view options
     * @param {{trace: Function, info: Function, warn: Function, error: Function}} [options.log] the logger; silent by default
     * @param {number} [options.waitDelay] milliseconds an operation runs before the wait status shows, 700 by default
     * @param {string|null} [options.icon] the error page glyph, `alert` by default; `null` shows none; set the sprite url first
     * @param {{retry?: string, waiting?: string, errorTitle?: string, errorText?: string}} [options.labels] localized texts
     * @param {Document} [options.document] the document that builds the elements, the global one by default
     */
    constructor(id, app, { log = QUIET_LOG, waitDelay = DEFAULT_WAIT_DELAY, icon = 'alert', labels = {}, document: doc = globalThis.document } = {}) {
        this.id = id;
        this.app = app;
        this.log = log;
        this.waitDelay = waitDelay;
        this.icon = icon;
        this.labels = { ...DEFAULT_LABELS, ...labels };
        this.doc = doc;
        this.domParentEl = null;
        this.componentUIEl = null;
        this.mainUIEl = null;
        this.eventListeners = [];
        this.template = doc.createElement('template');
        this.template.innerHTML = this.createComponentUIHtml();
    }

    /**
     * Attach to the DOM, register event listeners, and do any additional startup.
     * @param {HTMLElement} el the element that receives the view
     */
    attach(el) {
        this.log.trace(`Attach '${this.id}' to DOM...`);
        this.domParentEl = el;
        if (this.componentUIEl === null) {
            this.componentUIEl = this.template.content.querySelector('[data-view]').cloneNode(true);
            this.createMainUI();
            this.createOverlays();
        }
        this.domParentEl.appendChild(this.componentUIEl);
        this.registerEventListeners();
    }

    /**
     * Find the main UI element, which is the root's last child.
     */
    createMainUI() {
        this.mainUIEl = this.componentUIEl.lastElementChild;
        this.mainUIEl.setAttribute('data-view-main', '');
    }

    /**
     * Fill the overlays' texts and icon, and wire the retry button.
     */
    createOverlays() {
        this.errorUIEl = this.componentUIEl.querySelector('[data-view-error]');
        this.waitUIEl = this.componentUIEl.querySelector('[data-view-wait]');
        this.errorTitleEl = this.errorUIEl.querySelector('.empty-state__title');
        this.errorDescriptionEl = this.errorUIEl.querySelector('.empty-state__text');
        this.waitProgressEl = this.waitUIEl.querySelector('[role="status"]');
        this.backEl = this.errorUIEl.querySelector('[data-view-back]');
        this.errorUIEl.querySelector('[data-view-retry]').textContent = this.labels.retry;
        const iconSlot = this.errorUIEl.querySelector('[data-view-error-icon]');
        if (this.icon === null) {
            iconSlot.remove();
        }
        else {
            iconSlot.replaceWith(createIcon(this.doc, this.icon, { size: 'lg' }));
        }
        this.errorUIEl.querySelector('[data-view-retry]').addEventListener('click', (event) => {
            event.preventDefault();
            this.refreshComponentUI();
        });
    }

    /**
     * Detach from the DOM, unregister event listeners, and do any additional cleanup.
     */
    detach() {
        this.unregisterEventListeners();
        this.componentUIEl.remove();
        this.domParentEl = null;
        this.log.trace(`Detached '${this.id}' from DOM...`);
    }

    /**
     * Add an event listener that `detach` removes again.
     * @param {EventTarget} target the element or object to listen on
     * @param {string} eventType the event name
     * @param {EventListener} cb the handler
     */
    registerEventListener(target, eventType, cb) {
        target.addEventListener(eventType, cb);
        this.log.trace(`Registering event listener for event '${eventType}' in view '${this.id}'`);
        this.eventListeners.push({ target, eventType, handler: cb });
    }

    /**
     * Register the view's own event listeners; override it.
     */
    registerEventListeners() {}

    /**
     * Remove every listener added through `registerEventListener`.
     */
    unregisterEventListeners() {
        for (const { target, eventType, handler } of this.eventListeners) {
            this.log.trace(`Unregister event listener for event '${eventType}' from view '${this.id}'`);
            target.removeEventListener(eventType, handler);
        }
        this.eventListeners = [];
    }

    /**
     * Build the root markup: the error page, the wait status, and the main UI; override only to change the overlays.
     * @returns {string} the markup, with a single root element
     */
    createComponentUIHtml() {
        return `
      <div id="${this.id}" class="app__view" data-view data-view-state="ready">
        <div data-view-error hidden>
          <div class="empty-state" role="alert">
            <span data-view-error-icon></span>
            <h2 class="empty-state__title"></h2>
            <p class="empty-state__text"></p>
            <div class="empty-state__actions">
              <button class="button" type="button" data-view-retry></button>
              <a class="button button--secondary" data-view-back hidden></a>
            </div>
          </div>
        </div>
        <div data-view-wait hidden>
          <span class="spinner" aria-hidden="true"></span><span role="status"></span>
        </div>
        ${this.createMainUIHtml()}
      </div>`;
    }

    /**
     * Build the view's own markup, a single root element; override it.
     * @returns {string} the markup
     */
    createMainUIHtml() {
        return `<div class="${this.id}"></div>`;
    }

    /**
     * The link back out of the error page, asked for on every error; override it.
     * @returns {{href: string, label: string, attributes?: Record<string, string>}|null} the link, or `null` for none
     */
    getBackLink() {
        return null;
    }

    /**
     * Set the view's state and the matching `aria-busy` attribute.
     * @param {'ready'|'updating'|'error'} state the new state
     */
    setState(state) {
        this.componentUIEl.dataset.viewState = state;
        if (state === 'updating') {
            this.componentUIEl.setAttribute('aria-busy', 'true');
        }
        else {
            this.componentUIEl.removeAttribute('aria-busy');
        }
    }

    /**
     * Show the main UI with the data, and hide both overlays.
     * @param {unknown} [info] the data `refreshData` returned, passed to `updateMainUI`
     */
    showMainUI(info) {
        this.errorUIEl.hidden = true;
        this.waitUIEl.hidden = true;
        this.mainUIEl.hidden = false;
        this.setState('ready');
        this.updateMainUI(info);
    }

    /**
     * Update the main UI with data; override it.
     * @param {unknown} _info the data `refreshData` returned
     */
    updateMainUI() {}

    /**
     * Show the wait status; the main UI stays in place.
     * @param {object} [waitInfo] the status
     * @param {string} [waitInfo.progress-message] the status text
     */
    showWaitOverlay(waitInfo) {
        this.errorUIEl.hidden = true;
        this.mainUIEl.hidden = false;
        this.waitProgressEl.textContent = waitInfo?.['progress-message'] || this.labels.waiting;
        this.waitUIEl.hidden = false;
        this.setState('updating');
    }

    /**
     * Show the error page in place of the main UI.
     * @param {object} [errInfo] the error
     * @param {string} [errInfo.error-title] the page title
     * @param {string} [errInfo.error-description] the page text
     */
    showErrorOverlay(errInfo) {
        this.waitUIEl.hidden = true;
        this.mainUIEl.hidden = true;
        this.errorTitleEl.textContent = errInfo?.['error-title'] || this.labels.errorTitle;
        this.errorDescriptionEl.textContent = errInfo?.['error-description'] || this.labels.errorText;
        this.showBackLink(this.getBackLink());
        this.errorUIEl.hidden = false;
        this.setState('error');
    }

    /**
     * Show, or hide, the way back on the error page.
     * @param {{href: string, label: string, attributes?: Record<string, string>}|null} link the link, or `null` for none
     */
    showBackLink(link) {
        for (const name of this.backAttributes ?? []) {
            this.backEl.removeAttribute(name);
        }
        this.backAttributes = [];
        this.backEl.hidden = link === null;
        if (link === null) {
            return;
        }
        this.backEl.setAttribute('href', link.href);
        this.backEl.textContent = link.label;
        for (const [name, value] of Object.entries(link.attributes ?? {})) {
            this.backEl.setAttribute(name, value);
            this.backAttributes.push(name);
        }
    }

    /**
     * Fetch the data of the view; override it. The result goes to `updateMainUI`.
     * @returns {Promise<unknown>} the data
     */
    async refreshData() {
        throw new Error('The refreshData method is not implemented');
    }

    /**
     * Reload the data in a long-running operation, then show it, or show the error page.
     * @param {Event} [event] the event that asked for the refresh
     */
    refreshComponentUI(event) {
        if (!this.domParentEl) {
            return;
        }
        this.startLongRunningOperation({
            title: `Refresh ${this.title ?? this.id} View`,
            description: 'Updating data',
            start: () => this.refreshData(event),
            success: (info) => this.showMainUI(info),
            error: (errorInfo) => this.showErrorOverlay(errorInfo)
        });
    }

    /**
     * Run an operation asynchronously; its wait status shows only after the wait delay.
     * @param {LongRunningOperation} longRunningOperation the operation
     */
    startLongRunningOperation(longRunningOperation) {
        const op = longRunningOperation;
        let progressStarted = false;
        let waitTimer = setTimeout(() => {
            waitTimer = null;
            if (typeof this.app?.startProgress === 'function') {
                this.app.startProgress();
                progressStarted = true;
            }
            this.showWaitOverlay({ 'progress-message': op.description || op.title });
        }, this.waitDelay);
        const cancelWait = () => {
            if (waitTimer !== null) {
                clearTimeout(waitTimer);
                waitTimer = null;
            }
        };

        this.log.info(`Long-running operation '${op.title}' has started`);
        op.start()
            .then((info) => {
                this.log.trace(`Long-running operation '${op.title}' has succeeded: `, info);
                cancelWait();
                op.success?.(info);
            })
            .catch((err) => {
                this.log.error(`Long-running operation '${op.title}' has failed: `, err);
                cancelWait();
                const message = err?.message ? capitalize(err.message) : err?.message;
                op.error?.({ 'error-title': op.title, 'error-description': message, 'error-cause': err });
            })
            .finally(() => {
                cancelWait();
                if (progressStarted) {
                    this.app.stopProgress?.();
                }
                if (this.componentUIEl?.dataset.viewState === 'updating') {
                    this.waitUIEl.hidden = true;
                    this.setState('ready');
                }
                this.log.trace(`Long-running operation '${op.title}' has ended`);
                op.always?.();
            });
    }
}

export class RoutedView extends View {
    /**
     * Create the routed view.
     * @param {string} id unique ID of the view, also the first segment of its route
     * @param {object} app the app the view belongs to; may offer `addAction`, `removeAction`, and `setScreenActions`
     * @param {string} [title] the human-readable title
     * @param {RegExp} [routeRegex] decides whether a route selects this view; `^/{id}(/.*)?$`, ignoring case, by default
     * @param {object} [options] the options of `View`
     */
    constructor(id, app, title, routeRegex, options) {
        super(id, app, options);
        this.title = title;
        this.routeRegex = routeRegex || new RegExp(`^/${escapeRegex(id)}(/.*)?$`, 'i');
        this.actions = [];
        this.attachCount = 0;
    }

    /**
     * The actions of the view; override it. Every action id starts with the view id and a dot; `null` entries are ignored.
     * @returns {Array<{id: string, 'context-bar'?: boolean}|null>} the actions
     */
    getActions() {
        return [];
    }

    /**
     * Attach to the DOM and register the view's actions.
     * @param {HTMLElement} el the element that receives the view
     */
    attach(el) {
        super.attach(el);
        this.attachCount += 1;
        this.registerActions();
    }

    /**
     * Register the view's actions with the app; those not marked `'context-bar': false` also show in the screen actions.
     */
    registerActions() {
        const screenActions = [];
        for (const viewAction of this.getActions()) {
            if (!viewAction) {
                continue;
            }
            this.log.trace(`Registering view action '${viewAction.id}'`);
            this.actions.push(viewAction.id);
            this.app.addAction?.(viewAction);
            if (!('context-bar' in viewAction) || viewAction['context-bar']) {
                screenActions.push(viewAction.id);
            }
        }
        if (screenActions.length > 0) {
            this.app.setScreenActions?.(screenActions);
        }
    }

    /**
     * Unregister the view's actions and clear the screen actions.
     */
    unregisterActions() {
        this.app.setScreenActions?.([]);
        for (const actionId of this.actions) {
            this.log.trace(`Unregistering view action '${actionId}'`);
            this.app.removeAction?.(actionId);
        }
        this.actions = [];
    }

    /**
     * Detach from the DOM and unregister the view's actions.
     */
    detach() {
        this.unregisterActions();
        super.detach();
    }
}
