// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { make } from '../../src/js/ui/dom.js';
import { make as taskListMake } from '../../src/js/views/task-list.js';

/**
 * Build an element the way the replaced local helpers did.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {unknown} [text] the text content
 * @returns {HTMLElement} the element
 */
function legacyMake(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

describe('shared make element helper', () => {
  const cases = [
    ['a class and text', 'span', 'row__label', 'Buy milk'],
    ['a class and no text', 'div', 'row', undefined],
    ['empty text', 'p', 'hint', ''],
    ['null text', 'p', 'hint', null],
    ['a number as text', 'span', 'badge', 3],
    ['an empty class', 'p', '', 'Delete this list?'],
    ['several classes', 'button', 'button button--secondary', 'Import'],
    ['markup-like text', 'span', 'note', '<b>bold</b> & "quoted"'],
  ];

  it.each(cases)('matches the replaced helper for %s', (_name, tag, className, text) => {
    const built = make(document, tag, className, text);
    expect(built.outerHTML).toBe(legacyMake(document, tag, className, text).outerHTML);
    expect(built.childNodes.length).toBe(legacyMake(document, tag, className, text).childNodes.length);
  });

  it('sets the text as a single text node', () => {
    const built = make(document, 'span', 'note', '<b>bold</b>');
    expect(built.childNodes).toHaveLength(1);
    expect(built.firstChild.nodeType).toBe(Node.TEXT_NODE);
    expect(built.children).toHaveLength(0);
  });

  it('adds no child for empty or missing text', () => {
    expect(make(document, 'p', 'hint', '').childNodes).toHaveLength(0);
    expect(make(document, 'p', 'hint').childNodes).toHaveLength(0);
  });

  it('creates the element in the given document', () => {
    const other = document.implementation.createHTMLDocument('other');
    expect(make(other, 'div', 'row', 'x').ownerDocument).toBe(other);
    expect(make(document, 'div', 'row', 'x').ownerDocument).toBe(document);
  });

  it('is the make that task-list.js exports to the views', () => {
    expect(taskListMake).toBe(make);
  });
});
