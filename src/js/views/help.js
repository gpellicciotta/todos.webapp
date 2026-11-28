/**
 * Help screen: Application Info & Support, Welcome, the Getting Started Tutorial, the FAQ, and Release notes.
 *
 * The page is the vendored `createHelpPage`: a search field, topic chips, one card per panel, FAQ entries that expand,
 * and a no-results state (`HLP-1` to `HLP-4`). The middle three panels render the Markdown docs of `docs/tutorial`,
 * and Release notes the changelog, all served under `help/` (see service-worker.js and scripts/site-files.mjs).
 * Application Info shows the version, the storage mode, and the links to the source and to the issues page.
 * On mount the four files load in parallel; each panel shows a loading state until its file arrives, and a failed file
 * shows a message with Retry in its panel only. After one visit the service worker serves the files offline.
 * A link such as `#/help?topic=faq&q=shortcut` opens with that topic and search, as the router passes the query to `update`.
 * The page is rebuilt when a file arrives, keeping the search text, the topic, and the focus of the search field.
 */

import { createHelpPage } from '../../vendor/design/js/help-page.js';
import { parseChangelog } from '../../vendor/support-js/changelog-parser.mjs';
import { make } from '../ui/dom.js';
import { parseHelpDoc } from '../ui/markdown.js';
import { BUILD_DATE, VERSION } from '../version.js';

const SOURCE_URL = 'https://github.com/gpellicciotta/todos.webapp';
const ISSUES_URL = `${SOURCE_URL}/issues`;

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  info: 'Application Info & Support',
  version: (version, built) => `Version ${version} · Built ${built}`,
  local: 'Local only: your data stays on this device',
  connected: (email, server) => `Connected as ${email} on ${server}`,
  signInNeeded: (email, server) => `Sign in needed for ${email} on ${server}`,
  source: 'Requirements and source code',
  report: 'Report a problem',
  loading: 'Loading…',
  failed: 'This help could not load. Check the connection and try again.',
  retry: 'Retry',
  releaseNotes: 'Release notes',
  topics: Object.freeze({ all: 'All topics', info: 'App info', welcome: 'Welcome', tutorial: 'Tutorial', faq: 'FAQ', 'release-notes': 'Release notes' }),
});

/** The panels that load a file, in page order: the topic, the served path, the title before the doc arrives, and the shape. */
const FILE_PANELS = Object.freeze([
  { key: 'welcome', path: 'help/welcome.md', title: "Welcome to ToDo's", shape: 'parts' },
  { key: 'tutorial', path: 'help/getting-started.md', title: 'Getting Started Tutorial', shape: 'parts' },
  { key: 'faq', path: 'help/faq.md', title: 'Frequently Asked Questions', shape: 'faq' },
  { key: 'release-notes', path: 'help/CHANGELOG.md', title: STRINGS.releaseNotes, shape: 'releases' },
]);

/**
 * Format the build date as in "4 Nov 2026".
 * @param {string} isoDate the ISO date
 * @returns {string} the date
 */
function formatBuildDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

/**
 * Fetch a help file as text.
 * @param {string} path the served path, relative to the app
 * @returns {Promise<string>} the text
 */
async function fetchHelpText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`The service answered ${response.status} for ${path}`);
  }
  return response.text();
}

/**
 * Create an external link styled as a secondary button.
 * @param {Document} doc the document
 * @param {string} label the label
 * @param {string} href the address
 * @returns {HTMLAnchorElement} the link
 */
function externalLink(doc, label, href) {
  const link = make(doc, 'a', 'button button--secondary', label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

/**
 * Create the content nodes of Application Info & Support.
 * @param {Document} doc the document
 * @param {{state: () => string, account: () => object|null}} session the session
 * @returns {HTMLElement[]} the nodes
 */
function infoContent(doc, session) {
  const state = session.state();
  const account = session.account();
  let storage = STRINGS.local;
  if (state !== 'local' && account) {
    storage = (state === 'connected' ? STRINGS.connected : STRINGS.signInNeeded)(account.email, account.server);
  }
  const actions = make(doc, 'div', 'help-page__actions');
  actions.append(externalLink(doc, STRINGS.source, SOURCE_URL), externalLink(doc, STRINGS.report, ISSUES_URL));
  return [
    make(doc, 'p', 'card__text', STRINGS.version(VERSION, formatBuildDate(BUILD_DATE))),
    make(doc, 'p', 'card__text', storage),
    actions,
  ];
}

/**
 * Create the loading state of a panel.
 * @param {Document} doc the document
 * @returns {HTMLElement} the state
 */
function loadingNode(doc) {
  const node = make(doc, 'div', 'loading');
  const status = make(doc, 'p', 'loading__status', STRINGS.loading);
  status.setAttribute('role', 'status');
  node.append(status);
  return node;
}

/**
 * Create the failure state of a panel, with Retry.
 * @param {Document} doc the document
 * @param {() => void} retry reloads the panel
 * @returns {HTMLElement[]} the nodes
 */
function failedNodes(doc, retry) {
  const button = make(doc, 'button', 'button button--secondary', STRINGS.retry);
  button.type = 'button';
  button.addEventListener('click', retry);
  const actions = make(doc, 'div', 'help-page__actions');
  actions.append(button);
  return [make(doc, 'p', 'card__text', STRINGS.failed), actions];
}

/**
 * Create the content of a Markdown panel that shows its intro, then each part under an `h3`.
 * @param {Document} doc the document
 * @param {{intro: Node[], parts: Array<{heading: string, body: Node[]}>}} parsed the parsed doc
 * @returns {Node[]} the nodes
 */
function partsContent(doc, parsed) {
  return [...parsed.intro, ...parsed.parts.flatMap((part) => [make(doc, 'h3', 'help__part', part.heading), ...part.body])];
}

/**
 * Mount the Help screen into its view element.
 * @param {HTMLElement} view the `[data-view="help"]` element
 * @param {object} [options] screen options
 * @param {{state: () => string, account: () => object|null}} options.session the session, for the storage mode
 * @param {(path: string) => Promise<string>} [options.fetchText] loads a help file, `fetch` by default
 * @returns {{update: (route?: object) => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountHelp(view, { session, fetchText = fetchHelpText } = {}) {
  const doc = view.ownerDocument;
  /** The state of each file panel: `loading`, `failed`, or `ready` with its data. */
  const panels = new Map(FILE_PANELS.map((panel) => [panel.key, { status: 'loading', data: null }]));
  const pending = new Set();
  let page = null;
  let alive = true;

  /** Build the page from the panel states, keeping the search text, the topic, and the search focus of the page it replaces. */
  function render() {
    const query = page?.getQuery() ?? '';
    const topic = page?.getTopic() ?? 'all';
    const hadFocus = Boolean(page) && doc.activeElement === page.element.querySelector('[data-help-page-search]');
    page?.destroy();
    const sections = [{ id: 'info', title: STRINGS.info, topics: ['info'], content: infoContent(doc, session) }];
    let releases = null;
    for (const panel of FILE_PANELS) {
      const { status, data } = panels.get(panel.key);
      const section = { id: panel.key, title: panel.title, topics: [panel.key] };
      if (status === 'loading') {
        section.content = [loadingNode(doc)];
      }
      else if (status === 'failed') {
        section.content = failedNodes(doc, () => load(panel));
      }
      else if (panel.shape === 'releases') {
        section.releaseNotes = true;
        releases = data;
      }
      else {
        section.title = data.title || panel.title;
        if (panel.shape === 'faq') {
          section.content = data.intro;
          section.faq = { items: data.parts.map((part, index) => ({ id: index + 1, question: part.heading, answer: part.body })) };
        }
        else {
          section.content = partsContent(doc, data);
        }
      }
      sections.push(section);
    }
    page = createHelpPage(doc, {
      idPrefix: 'help',
      topics: Object.entries(STRINGS.topics).map(([key, label]) => ({ key, label })),
      sections,
      releases: releases ?? undefined,
      releaseNotes: { groupByArea: true, showFilter: false, showStatus: true },
      readLocation: false,
    });
    view.replaceChildren(page.element);
    if (topic !== 'all') {
      page.setTopic(topic);
    }
    if (query) {
      page.setQuery(query);
    }
    if (hadFocus) {
      page.element.querySelector('[data-help-page-search]')?.focus();
    }
  }

  /**
   * Load one file panel and show the result.
   * @param {object} panel the entry of FILE_PANELS
   * @param {boolean} [reset] whether to show the loading state first, as a Retry does
   * @returns {Promise<void>} resolves once the panel shows its state
   */
  function load(panel, reset = true) {
    if (reset) {
      panels.set(panel.key, { status: 'loading', data: null });
      render();
    }
    let request;
    try {
      request = Promise.resolve(fetchText(panel.path));
    }
    catch (error) {
      request = Promise.reject(error);
    }
    const loading = request
      .then((text) => ({ status: 'ready', data: panel.shape === 'releases' ? parseChangelog(text) : parseHelpDoc(text, doc) }))
      .catch((error) => {
        console.error(`Loading ${panel.path} failed:`, error);
        return { status: 'failed', data: null };
      })
      .then((state) => {
        pending.delete(loading);
        if (alive) {
          panels.set(panel.key, state);
          render();
        }
      });
    pending.add(loading);
    return loading;
  }

  render();
  FILE_PANELS.forEach((panel) => load(panel, false));
  return {
    /**
     * Follow a route: `?q=` and `?topic=` of the hash set the search and the topic, and no query clears both.
     * @param {{query?: string}} [route] the route
     */
    update(route) {
      page?.applyQuery(route?.query ?? '');
    },

    /**
     * Wait for the files that are loading.
     * @returns {Promise<void>} resolves once none is loading
     */
    async idle() {
      while (pending.size > 0) {
        await Promise.all([...pending]);
      }
    },

    /** Remove the page. */
    destroy() {
      alive = false;
      page?.destroy();
      page = null;
      view.replaceChildren();
    },
  };
}
