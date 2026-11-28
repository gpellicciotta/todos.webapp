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

  it('shows other links as their label text', () => {
    const { intro } = parseHelpDoc('# T\n\n[bad](javascript:alert(1)) and [ftp](ftp://x.test) and [rel](page.html).\n');
    expect(intro[0].querySelector('a')).toBeNull();
    expect(intro[0].textContent).toBe('bad and ftp and rel.');
  });

  it('keeps raw HTML and tables as plain text, never as markup', () => {
    const { intro } = parseHelpDoc('# T\n\n<script>alert(1)</script>\n\n| a | b |\n|---|---|\n');
    expect(intro[0].querySelector('script')).toBeNull();
    expect(intro[0].textContent).toBe('<script>alert(1)</script>');
    expect(intro[1].textContent).toBe('| a | b | |---|---|');
    expect(html(intro)).not.toContain('<script>');
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

  it('answers the keyboard shortcut question in the FAQ', () => {
    const { parts } = parseHelpDoc(doc('faq.md'));
    const answer = parts.find((part) => part.heading === 'Which keyboard shortcuts can I use?');
    expect(answer).toBeDefined();
    expect(answer.body.map((node) => node.textContent).join(' ')).toContain('Shift+Enter');
  });
});
