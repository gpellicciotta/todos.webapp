// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountHelp } from '../../src/js/views/help.js';
import { BUILD_DATE, VERSION } from '../../src/js/version.js';
import { setSpriteUrl } from '../../src/vendor/design/js/icon.js';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'tutorial');
const FILES = {
  'help/welcome.md': readFileSync(join(DOCS, 'welcome.md'), 'utf8'),
  'help/getting-started.md': readFileSync(join(DOCS, 'getting-started.md'), 'utf8'),
  'help/faq.md': readFileSync(join(DOCS, 'faq.md'), 'utf8'),
  'help/CHANGELOG.md': '# Changelog\n\n## v9.9.9-pre\n\n- Help: Added a test release.\n\n## v9.9.8 [2026-11-01]\n\n- Tasks: Fixed an old thing.\n',
};
const LOCAL = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };

/**
 * Create a text fetcher over the fixture files; a path in `failing` rejects until it is removed.
 * @param {Set<string>} [failing] the paths that fail
 * @returns {import('vitest').Mock} the fetcher
 */
function fetcher(failing = new Set()) {
  return vi.fn(async (path) => {
    if (failing.has(path) || !(path in FILES)) {
      throw new Error(`Failed: ${path}`);
    }
    return FILES[path];
  });
}

/**
 * Mount the Help view.
 * @param {object} [options] mount options
 * @returns {Promise<{view: HTMLElement, screen: object}>} the view and the screen, once the files settled
 */
async function mount(options = {}) {
  const view = document.body.appendChild(document.createElement('div'));
  const screen = mountHelp(view, { session: LOCAL, fetchText: fetcher(), ...options });
  await screen.idle();
  return { view, screen };
}

/**
 * Read the panel titles in order.
 * @param {HTMLElement} view the view
 * @returns {string[]} the titles
 */
function titles(view) {
  return [...view.querySelectorAll('[data-help-page-section] > h2')].map((heading) => heading.textContent);
}

beforeAll(() => {
  setSpriteUrl('vendor/design/looks/neutral/icons.svg');
});

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('mountHelp', () => {
  it('builds the five panels in order, with the topic chips', async () => {
    const { view } = await mount();
    expect(titles(view)).toEqual([
      'Application Info & Support', "Welcome to ToDo's", 'Getting Started Tutorial', 'Frequently Asked Questions', 'Release notes',
    ]);
    expect([...view.querySelectorAll('[data-help-page-topic]')].map((chip) => [chip.dataset.helpPageTopic, chip.textContent])).toEqual([
      ['all', 'All topics'], ['info', 'App info'], ['welcome', 'Welcome'], ['tutorial', 'Tutorial'], ['faq', 'FAQ'], ['release-notes', 'Release notes'],
    ]);
  });

  it('shows the version, the build date, the storage mode, and the two links in Application Info', async () => {
    const { view } = await mount();
    const info = view.querySelector('[data-help-page-topics="info"]');
    expect(info.textContent).toContain(`Version ${VERSION} · Built `);
    expect(info.textContent).toMatch(/Built \d{1,2} \w{3} \d{4}/);
    expect(BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(info.textContent).toContain('Local only: your data stays on this device');
    const links = [...info.querySelectorAll('a')].map((link) => [link.textContent, link.href, link.target, link.rel]);
    expect(links).toEqual([
      ['Requirements and source code', 'https://github.com/gpellicciotta/todos.webapp', '_blank', 'noopener noreferrer'],
      ['Report a problem', 'https://github.com/gpellicciotta/todos.webapp/issues', '_blank', 'noopener noreferrer'],
    ]);
  });

  it('names the account and the server when connected', async () => {
    const session = { ...LOCAL, state: () => 'connected', account: () => ({ email: 'ada@example.com', name: 'Ada', server: 'https://todos.example.com' }) };
    const { view } = await mount({ session });
    expect(view.querySelector('[data-help-page-topics="info"]').textContent).toContain('Connected as ada@example.com on https://todos.example.com');
  });

  it('renders the Welcome and Tutorial parts as h3 headings', async () => {
    const { view } = await mount();
    const welcome = view.querySelector('[data-help-page-topics="welcome"]');
    expect([...welcome.querySelectorAll('h3')].map((heading) => heading.textContent)).toContain('Recycle bin');
    const tutorial = view.querySelector('[data-help-page-topics="tutorial"]');
    expect(tutorial.querySelectorAll('h3')).toHaveLength(9);
  });

  it('builds one FAQ item per question, collapsed, with the answer', async () => {
    const { view } = await mount();
    const items = [...view.querySelectorAll('[data-help-page-faq-item]')];
    expect(items.length).toBeGreaterThanOrEqual(10);
    const question = items.find((item) => item.querySelector('.help-page__faq-question-text').textContent === 'Which keyboard shortcuts can I use?');
    expect(question.querySelector('button').getAttribute('aria-expanded')).toBe('false');
    expect(question.textContent).toContain('Shift+Enter');
  });

  it('shows the releases of the changelog, newest first, with the version in development', async () => {
    const { view } = await mount();
    const notes = view.querySelector('[data-help-page-release-notes]');
    expect(notes.textContent).toContain('9.9.9');
    expect(notes.textContent).toContain('Added a test release.');
    expect(notes.textContent.indexOf('9.9.9')).toBeLessThan(notes.textContent.indexOf('9.9.8'));
  });

  it('finds the keyboard FAQ when searching for "shortcut"', async () => {
    const { view } = await mount();
    const input = view.querySelector('[data-help-page-search]');
    input.value = 'shortcut';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const visible = [...view.querySelectorAll('[data-help-page-faq-item]')].filter((item) => !item.hidden);
    expect(visible.map((item) => item.querySelector('.help-page__faq-question-text').textContent)).toContain('Which keyboard shortcuts can I use?');
    expect(visible.length).toBeLessThan(view.querySelectorAll('[data-help-page-faq-item]').length);
  });

  it('shows a loading state in each panel until its file arrives', async () => {
    const pending = new Map();
    const fetchText = vi.fn((path) => new Promise((resolve) => pending.set(path, resolve)));
    const view = document.body.appendChild(document.createElement('div'));
    const screen = mountHelp(view, { session: LOCAL, fetchText });
    expect(view.querySelectorAll('.loading')).toHaveLength(4);
    pending.get('help/welcome.md')(FILES['help/welcome.md']);
    await new Promise((resolve) => setTimeout(resolve));
    expect(view.querySelectorAll('.loading')).toHaveLength(3);
    for (const [path, resolve] of pending) {
      resolve(FILES[path]);
    }
    await screen.idle();
    expect(view.querySelectorAll('.loading')).toHaveLength(0);
  });

  it('fetches the four files in parallel on mount', async () => {
    const fetchText = fetcher();
    const view = document.body.appendChild(document.createElement('div'));
    const screen = mountHelp(view, { session: LOCAL, fetchText });
    expect(fetchText.mock.calls.map(([path]) => path).sort()).toEqual(Object.keys(FILES).sort());
    await screen.idle();
  });

  it('shows Retry in the one panel that failed, and Retry reloads it', async () => {
    const failing = new Set(['help/faq.md']);
    const fetchText = fetcher(failing);
    const { view, screen } = await mount({ fetchText });
    const retries = [...view.querySelectorAll('button')].filter((button) => button.textContent === 'Retry');
    expect(retries).toHaveLength(1);
    const panel = retries[0].closest('[data-help-page-section]');
    expect(panel.textContent).toContain('This help could not load. Check the connection and try again.');
    expect(view.querySelector('[data-help-page-topics="welcome"]').textContent).not.toContain('could not load');
    failing.delete('help/faq.md');
    retries[0].click();
    await screen.idle();
    expect([...view.querySelectorAll('button')].some((button) => button.textContent === 'Retry')).toBe(false);
    expect(view.querySelectorAll('[data-help-page-faq-item]').length).toBeGreaterThan(0);
    expect(fetchText.mock.calls.filter(([path]) => path === 'help/faq.md')).toHaveLength(2);
  });

  it('keeps the search text across a reload of a panel', async () => {
    const failing = new Set(['help/faq.md']);
    const { view, screen } = await mount({ fetchText: fetcher(failing) });
    const input = view.querySelector('[data-help-page-search]');
    input.value = 'welcome';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    failing.clear();
    [...view.querySelectorAll('button')].find((button) => button.textContent === 'Retry').click();
    await screen.idle();
    expect(view.querySelector('[data-help-page-search]').value).toBe('welcome');
  });

  it('filters to a topic when its chip is chosen', async () => {
    const { view } = await mount();
    view.querySelector('[data-help-page-topic="faq"]').click();
    const visible = [...view.querySelectorAll('[data-help-page-section]')].filter((section) => !section.hidden);
    expect(visible.map((section) => section.dataset.helpPageTopics)).toEqual(['faq']);
  });

  it('applies the search and topic of a route query, and resets them when the query is gone', async () => {
    const { view, screen } = await mount();
    screen.update({ name: 'help', params: {}, query: 'topic=faq&q=shortcut' });
    expect(view.querySelector('[data-help-page-search]').value).toBe('shortcut');
    const visible = [...view.querySelectorAll('[data-help-page-section]')].filter((section) => !section.hidden);
    expect(visible.map((section) => section.dataset.helpPageTopics)).toEqual(['faq']);
    expect(view.querySelector('[data-help-page-topic="faq"]').getAttribute('aria-pressed')).toBe('true');
    screen.update({ name: 'help', params: {}, query: '' });
    expect(view.querySelector('[data-help-page-search]').value).toBe('');
    expect([...view.querySelectorAll('[data-help-page-section]')].every((section) => !section.hidden)).toBe(true);
  });

  it('keeps a query link that arrives before the files load', async () => {
    const view = document.body.appendChild(document.createElement('div'));
    const screen = mountHelp(view, { session: LOCAL, fetchText: fetcher() });
    screen.update({ name: 'help', params: {}, query: 'q=shortcut' });
    await screen.idle();
    expect(view.querySelector('[data-help-page-search]').value).toBe('shortcut');
    const visible = [...view.querySelectorAll('[data-help-page-faq-item]')].filter((item) => !item.hidden);
    expect(visible.map((item) => item.querySelector('.help-page__faq-question-text').textContent)).toContain('Which keyboard shortcuts can I use?');
  });

  it('removes its content on destroy', async () => {
    const { view, screen } = await mount();
    screen.destroy();
    expect(view.querySelector('.help-page')).toBeNull();
  });
});
