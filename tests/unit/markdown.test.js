// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseHelpDoc } from '../../src/js/ui/markdown.js';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'tutorial');

/**
 * Read a help doc of the repository.
 * @param {string} name the file name
 * @returns {string} the Markdown text
 */
function doc(name) {
  return readFileSync(join(DOCS, name), 'utf8');
}

/**
 * Render nodes to HTML text, for comparison.
 * @param {Node[]} nodes the nodes
 * @returns {string} the HTML
 */
function html(nodes) {
  const host = document.createElement('div');
  host.append(...nodes);
  return host.innerHTML;
}

describe('parseHelpDoc', () => {
  it('splits the level-1 title, the intro, and the level-2 parts', () => {
    const result = parseHelpDoc('# Title\n\nIntro one.\n\nIntro two.\n\n## First\n\nBody one.\n\n## Second\n\nBody two.\n');
    expect(result.title).toBe('Title');
    expect(result.intro.map((node) => node.textContent)).toEqual(['Intro one.', 'Intro two.']);
    expect(result.parts.map((part) => part.heading)).toEqual(['First', 'Second']);
    expect(result.parts[1].body.map((node) => node.textContent)).toEqual(['Body two.']);
  });

  it('joins the lines of a paragraph with a space', () => {
    const { intro } = parseHelpDoc('# T\n\nOne line\nnext line.\n');
    expect(html(intro)).toBe('<p>One line next line.</p>');
  });

  it('renders bold, italic, and inline code', () => {
    const { intro } = parseHelpDoc('# T\n\nPress **Settings**, then *Data*, and type `Shift+Enter`.\n');
    expect(html(intro)).toBe('<p>Press <strong>Settings</strong>, then <em>Data</em>, and type <code>Shift+Enter</code>.</p>');
  });

  it('renders bullet and numbered lists of one level', () => {
    const { intro } = parseHelpDoc('# T\n\n- one\n- two **b**\n\n1. first\n2. second\n');
    expect(html(intro)).toBe('<ul><li>one</li><li>two <strong>b</strong></li></ul><ol><li>first</li><li>second</li></ol>');
  });

  it('opens https links in a new tab without an opener, and keeps app routes in the tab', () => {
    const { intro } = parseHelpDoc('# T\n\nSee [the site](https://example.com/a) and [Settings](#/settings).\n');
    const [site, route] = intro[0].querySelectorAll('a');
    expect(site.getAttribute('href')).toBe('https://example.com/a');
    expect(site.target).toBe('_blank');
    expect(site.rel).toBe('noopener noreferrer');
    expect(route.getAttribute('href')).toBe('#/settings');
    expect(route.hasAttribute('target')).toBe(false);
  });

  it('keeps a link to a route under the public address of the app in the tab', () => {
    const { intro } = parseHelpDoc('# T\n\n[Bin](https://todos.pellicciotta.com/#/bin) and [home](https://todos.pellicciotta.com/).\n');
    const [bin, home] = intro[0].querySelectorAll('a');
    expect([bin.getAttribute('href'), bin.hasAttribute('target')]).toEqual(['#/bin', false]);
    expect([home.getAttribute('href'), home.target]).toEqual(['https://todos.pellicciotta.com/', '_blank']);
  });

  it('shows other links as their label text', () => {
    const { intro } = parseHelpDoc('# T\n\n[bad](javascript:alert(1)) and [ftp](ftp://x.test) and [rel](page.html).\n');
    expect(intro[0].querySelector('a')).toBeNull();
    expect(intro[0].textContent).toBe('bad and ftp and rel.');
  });

  it('keeps raw HTML as plain text, never as markup', () => {
    const { intro } = parseHelpDoc('# T\n\n<script>alert(1)</script>\n\n| <img src=x> |\n|---|\n| <b>bold</b> |\n');
    expect(intro[0].querySelector('script')).toBeNull();
    expect(intro[0].textContent).toBe('<script>alert(1)</script>');
    expect(intro[1].querySelector('img, b')).toBeNull();
    expect(intro[1].querySelector('td').textContent).toBe('<b>bold</b>');
    expect(html(intro)).not.toContain('<script>');
  });

  it('renders a table with column headings, inline text in its cells, and escaped pipes', () => {
    const { intro } = parseHelpDoc('# T\n\n| Keys | What it does |\n|:-----|-------------:|\n| `n` or `/` | Focus the [field](#/tasks). |\n| `a\\|b` |  |\n');
    const table = intro[0].querySelector('table');
    expect(intro).toHaveLength(1);
    expect([...table.querySelectorAll('thead th')].map((cell) => [cell.textContent, cell.getAttribute('scope')])).toEqual([['Keys', 'col'], ['What it does', 'col']]);
    const rows = [...table.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent));
    expect(rows).toEqual([['n or /', 'Focus the field.'], ['a|b', '']]);
    expect([...table.querySelectorAll('tbody tr td code')].map((code) => code.textContent)).toEqual(['n', '/', 'a|b']);
    expect(table.querySelector('a').getAttribute('href')).toBe('#/tasks');
  });

  it('keeps pipes without a delimiter row as plain text', () => {
    const { intro } = parseHelpDoc('# T\n\n| a | b |\n| c | d |\n');
    expect(intro[0].querySelector('table')).toBeNull();
    expect(intro[0].textContent).toBe('| a | b | | c | d |');
  });

  it('draws an icon image from the app sprite, named by its text, and hidden without one', () => {
    const { intro } = parseHelpDoc('# T\n\n![To do](img/icons/status-ready.svg) and ![](img/icons/bin.svg) here.\n');
    const [named, silent] = intro[0].querySelectorAll('.help__icon');
    expect([named.dataset.icon, named.getAttribute('role'), named.getAttribute('aria-label')]).toEqual(['status-ready', 'img', 'To do']);
    expect(named.querySelector('use').getAttribute('href')).toBe('img/icons.svg#status-ready');
    expect([silent.dataset.icon, silent.getAttribute('aria-hidden')]).toEqual(['bin', 'true']);
    expect(intro[0].querySelector('img')).toBeNull();
  });

  it('shows a screenshot of its own line as a figure with a light and a dark image', () => {
    const { intro } = parseHelpDoc('# T\n\n![The add field with its preview](img/add-task.png)\n');
    const figure = intro[0];
    expect(figure.matches('figure.help__shot')).toBe(true);
    expect([...figure.querySelectorAll('img')].map((image) => [image.getAttribute('src'), image.alt, image.className])).toEqual([
      ['help/img/add-task.png', 'The add field with its preview', 'help__shot-image help__shot-image--light'],
      ['help/img/add-task-dark.png', 'The add field with its preview', 'help__shot-image help__shot-image--dark'],
    ]);
  });

  it('shows any other image as its text, so a doc loads nothing from elsewhere', () => {
    const { intro } = parseHelpDoc('# T\n\n![far](https://example.com/a.png)\n\n![up](img/../../secret.png)\n\n![odd](img/icons/a%20b.svg) x ![inline](img/add-task.png)\n');
    expect(html(intro)).not.toMatch(/<img|<svg/);
    expect(intro.map((node) => node.textContent)).toEqual(['far', 'up', 'odd x inline']);
  });

  it('shows a level-3 heading as plain text', () => {
    const { parts } = parseHelpDoc('# T\n\n## P\n\n### Deeper\n');
    expect(parts[0].body[0].textContent).toBe('### Deeper');
  });

  it('returns an empty title and no parts for empty text', () => {
    expect(parseHelpDoc('')).toEqual({ title: '', intro: [], parts: [] });
  });
});

describe('the docs of docs/tutorial', () => {
  it.each([
    ['welcome.md', "Welcome to ToDo's", 8],
    ['getting-started.md', 'Getting Started Tutorial', 9],
    ['faq.md', 'Frequently Asked Questions', null],
  ])('%s keeps the structure contract', (name, title, count) => {
    const result = parseHelpDoc(doc(name));
    expect(result.title).toBe(title);
    expect(result.intro.length).toBeGreaterThan(0);
    expect(result.parts.length).toBeGreaterThan(0);
    if (count !== null) {
      expect(result.parts).toHaveLength(count);
    }
    for (const part of result.parts) {
      expect(part.body.length).toBeGreaterThan(0);
    }
  });

  it('numbers the tutorial steps and ends each FAQ question with a question mark', () => {
    parseHelpDoc(doc('getting-started.md')).parts.forEach((part, index) => expect(part.heading).toMatch(new RegExp(`^${index + 1}\\. `)));
    for (const part of parseHelpDoc(doc('faq.md')).parts) {
      expect(part.heading.endsWith('?')).toBe(true);
    }
  });

  it('answers the keyboard shortcut question in the FAQ with a table of keys, places, and actions', () => {
    const { parts } = parseHelpDoc(doc('faq.md'));
    const answer = parts.find((part) => part.heading === 'Which keyboard shortcuts can I use?');
    expect(answer).toBeDefined();
    const table = answer.body.map((node) => node.querySelector?.('table')).find(Boolean);
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Keys', 'Where', 'What happens']);
    const keys = [...table.querySelectorAll('tbody tr')].map((row) => row.querySelector('td').textContent);
    for (const key of ['n', '/', 'l', 'x', 'Escape', 'Enter', 'Shift+Enter or Alt+Enter', 'Alt+Up or Alt+Down', 'Alt+Home or Alt+End', 'Ctrl+Z or Cmd+Z']) {
      expect(keys.some((cell) => cell.split(' or ').includes(key) || cell === key), key).toBe(true);
    }
  });

  it('shows each task status with its icon in the Welcome page', () => {
    const statuses = parseHelpDoc(doc('welcome.md')).parts.find((part) => part.heading === 'Statuses');
    const table = statuses.body.map((node) => node.querySelector?.('table')).find(Boolean);
    const rows = [...table.querySelectorAll('tbody tr')].map((row) => [row.querySelector('.help__icon')?.dataset.icon, row.querySelectorAll('td')[1].textContent]);
    expect(rows).toEqual([
      ['status-ready', 'To do'], ['status-in-progress', 'In progress'], ['status-completed', 'Completed'],
      ['status-failed', 'Failed'], ['status-cancelled', 'Cancelled'], ['status-upcoming', 'Upcoming'],
    ]);
  });
});
