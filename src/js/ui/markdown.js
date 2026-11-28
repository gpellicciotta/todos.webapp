/**
 * Markdown renderer for the help docs of `docs/tutorial`: the subset of the T0309 specification, as DOM nodes.
 *
 * Supported: a level-1 title, level-2 parts, paragraphs, one level of `-` bullet and `1.` numbered lists,
 * `**bold**`, `*italic*`, inline code, and links. Anything else, such as raw HTML or a table, shows as plain text.
 * Nodes come from `createElement` and `textContent` only, never `innerHTML`, so doc text never becomes markup.
 * An `https:` link opens in a new tab; a `#/` link is an app route and stays in the tab; other links show as their label.
 */

/** Inline constructs, in one pattern: code, bold, italic, then link. */
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*([^\s*][^*]*?)\*|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;

/**
 * Create an element with text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} [text] the text content
 * @returns {HTMLElement} the element
 */
function element(doc, tag, text) {
  const node = doc.createElement(tag);
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/**
 * Create the node of a link: an anchor for an `https:` or app route target, otherwise the label as text.
 * @param {Document} doc the document
 * @param {string} label the label text
 * @param {string} target the link target
 * @returns {Node} the anchor or the text node
 */
function link(doc, label, target) {
  const isWeb = /^https:\/\/[^\s/]/i.test(target);
  if (!isWeb && !target.startsWith('#/')) {
    return doc.createTextNode(label);
  }
  const anchor = element(doc, 'a', label);
  anchor.setAttribute('href', target);
  if (isWeb) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
}

/**
 * Render inline text to nodes.
 * @param {Document} doc the document
 * @param {string} text the inline Markdown
 * @returns {Node[]} the nodes
 */
function inline(doc, text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) {
      nodes.push(doc.createTextNode(text.slice(last, match.index)));
    }
    const [, code, bold, italic, label, target] = match;
    if (code !== undefined) {
      nodes.push(element(doc, 'code', code));
    }
    else if (bold !== undefined) {
      const strong = doc.createElement('strong');
      strong.append(...inline(doc, bold));
      nodes.push(strong);
    }
    else if (italic !== undefined) {
      const emphasis = doc.createElement('em');
      emphasis.append(...inline(doc, italic));
      nodes.push(emphasis);
    }
    else {
      nodes.push(link(doc, label, target));
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(doc.createTextNode(text.slice(last)));
  }
  return nodes;
}

/**
 * Render the lines of a block: a list when every line is an item of one kind, otherwise a paragraph of plain inline text.
 * @param {Document} doc the document
 * @param {string[]} lines the trimmed lines of one block
 * @returns {HTMLElement[]} the elements
 */
function block(doc, lines) {
  const out = [];
  let list = null;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const node = doc.createElement('p');
      node.append(...inline(doc, paragraph.join(' ')));
      out.push(node);
      paragraph = [];
    }
  };
  for (const line of lines) {
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet ?? numbered;
    if (!item) {
      list = null;
      paragraph.push(line);
      continue;
    }
    flushParagraph();
    const tag = bullet ? 'ul' : 'ol';
    if (list?.tagName.toLowerCase() !== tag) {
      list = doc.createElement(tag);
      out.push(list);
    }
    const entry = doc.createElement('li');
    entry.append(...inline(doc, item[1]));
    list.append(entry);
  }
  flushParagraph();
  return out;
}

/**
 * Split Markdown into blocks by blank lines.
 * @param {string[]} lines the lines of one section
 * @returns {string[][]} the trimmed lines of each block
 */
function blocks(lines) {
  const out = [];
  let current = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      if (current.length > 0) {
        out.push(current);
      }
      current = [];
    }
    else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    out.push(current);
  }
  return out;
}

/**
 * Parse a help doc into its title, intro, and level-2 parts.
 * @param {string} text the Markdown text
 * @param {Document} [doc] the document that creates the nodes, the global one by default
 * @returns {{title: string, intro: Node[], parts: Array<{heading: string, body: Node[]}>}} the doc
 */
export function parseHelpDoc(text, doc = globalThis.document) {
  const result = { title: '', intro: [], parts: [] };
  let lines = [];
  let target = result.intro;
  const flush = () => {
    target.push(...blocks(lines).flatMap((lineBlock) => block(doc, lineBlock)));
    lines = [];
  };
  let seenTitle = false;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const title = /^#\s+(.+)$/.exec(line);
    const part = /^##\s+(.+)$/.exec(line);
    if (title && !seenTitle) {
      seenTitle = true;
      result.title = title[1].trim();
    }
    else if (part) {
      flush();
      const entry = { heading: part[1].trim(), body: [] };
      result.parts.push(entry);
      target = entry.body;
    }
    else {
      lines.push(line);
    }
  }
  flush();
  return result;
}
