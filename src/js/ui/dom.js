/**
 * Element helper of the app views, over the `h` builder of the vendored `dom-builders.js`.
 *
 * `make` keeps the signature of the local helpers it replaced, so its call sites stay unchanged.
 * Text renders as a text node, never as markup.
 */

import { createDomBuilders } from '../../vendor/design/js/dom-builders.js';

/** Builders per document, so views that render into another document get elements of that document. */
const BUILDERS = new WeakMap();

/**
 * Return the `h` builder bound to a document.
 * @param {Document} doc the document
 * @returns {Function} the bound `h`
 */
function builderFor(doc) {
  let builders = BUILDERS.get(doc);
  if (!builders) {
    builders = createDomBuilders(doc);
    BUILDERS.set(doc, builders);
  }
  return builders.h;
}

/**
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text content; empty, `null`, or missing text adds no child
 * @returns {HTMLElement} the element
 */
export function make(doc, tag, className, text) {
  const hasText = text !== undefined && text !== null && text !== '';
  const element = builderFor(doc)(tag, { class: className }, hasText ? String(text) : null);
  if (!className) {
    // `h` skips an empty class, while the replaced helpers always wrote the class attribute.
    element.className = className;
  }
  return element;
}
