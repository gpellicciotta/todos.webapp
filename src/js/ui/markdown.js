/**
 * Markdown renderer for the help docs of `docs/tutorial`: the subset of the T0309 specification, as DOM nodes.
 *
 * Supported: a level-1 title, level-2 parts, paragraphs, one level of `-` bullet and `1.` numbered lists, tables,
 * `**bold**`, `*italic*`, inline code, links, and two kinds of image. Anything else, such as raw HTML, shows as plain text.
 * Nodes come from `createElement` and `textContent` only, never `innerHTML`, so doc text never becomes markup.
 * A link to a route of the app, `#/…` or under the app's public address, stays in the tab, whatever serves the app;
 * the docs write the address, so their links also work outside the app. Another `https:` link opens in a new tab,
 * and any other link shows as its label.
 * An image `img/icons/{{name}}.svg` draws that icon of the app sprite, so it follows the theme; its text names it.
 * An image `img/{{name}}.png` on a line of its own is a screenshot, with `img/{{name}}-dark.png` for the dark theme.
 * Other images show as their text, so a doc never loads a file from elsewhere.
 */

import { DEFAULT_SERVER_URL } from '../core/preferences.js';

/** The start of a route of the app under its public address, which the docs write. */
const APP_ROUTE = `${DEFAULT_SERVER_URL}/#/`;
/** Inline constructs, in one pattern: code, bold, italic, image, then link. */
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*([^\s*][^*]*?)\*|!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const ICON = /^img\/icons\/([a-z0-9-]+)\.svg$/;
const SCREENSHOT = /^!\[([^\]]*)\]\(img\/([a-z0-9-]+)\.png\)$/;
/** The row of dashes under the headings of a table. */
const DELIMITER = /^\|(\s*:?-+:?\s*\|)+$/;
const SVG = 'http://www.w3.org/2000/svg';

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
 * Create the node of a link: an anchor for an app route or an `https:` target, otherwise the label as text.
 * @param {Document} doc the document
 * @param {string} label the label text
 * @param {string} target the link target
 * @returns {Node} the anchor or the text node
 */
function link(doc, label, target) {
  const route = target.startsWith(APP_ROUTE) ? target.slice(DEFAULT_SERVER_URL.length + 1) : target;
  const isWeb = /^https:\/\/[^\s/]/i.test(route);
  if (!isWeb && !route.startsWith('#/')) {
    return doc.createTextNode(label);
  }
  const anchor = element(doc, 'a', label);
  anchor.setAttribute('href', route);
  if (isWeb) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
}

/**
 * Create the node of an inline image: the icon of the app sprite it names, otherwise its text.
 * @param {Document} doc the document
 * @param {string} alt the text of the image
 * @param {string} target the image target
 * @returns {Node} the icon or the text node
 */
function image(doc, alt, target) {
  const name = ICON.exec(target)?.[1];
  if (!name) {
    return doc.createTextNode(alt);
  }
  const holder = element(doc, 'span');
  holder.className = 'help__icon';
  holder.dataset.icon = name;
  if (alt) {
    holder.setAttribute('role', 'img');
    holder.setAttribute('aria-label', alt);
  }
  else {
    holder.setAttribute('aria-hidden', 'true');
  }
  const svg = doc.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = doc.createElementNS(SVG, 'use');
  use.setAttribute('href', `img/icons.svg#${name}`);
  svg.append(use);
  holder.append(svg);
  return holder;
}

/**
 * Create the figure of a screenshot, with one image per theme; the stylesheet shows the one of the current theme.
 * @param {Document} doc the document
 * @param {string} alt the text of the screenshot
 * @param {string} name the file name without its extension
 * @returns {HTMLElement} the figure
 */
function screenshot(doc, alt, name) {
  const figure = element(doc, 'figure');
  figure.className = 'help__shot';
  for (const [theme, file] of [['light', name], ['dark', `${name}-dark`]]) {
    const picture = element(doc, 'img');
    picture.className = `help__shot-image help__shot-image--${theme}`;
    picture.setAttribute('src', `help/img/${file}.png`);
    picture.setAttribute('alt', alt);
    figure.append(picture);
  }
  return figure;
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
    const [, code, bold, italic, alt, source, label, target] = match;
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
    else if (alt !== undefined) {
      nodes.push(image(doc, alt, source));
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
 * Split a table row into its cells; `\|` stands for a pipe within a cell.
 * @param {string} line the trimmed row, which starts with a pipe
 * @returns {string[]} the trimmed cells
 */
function cells(line) {
  return line.replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.replaceAll('\\|', '|').trim());
}

/**
 * Render a table, in a wrapper that scrolls a table wider than the page.
 * @param {Document} doc the document
 * @param {string[]} lines the trimmed rows: the headings, the row of dashes, then the body
 * @returns {HTMLElement} the wrapper
 */
function table(doc, lines) {
  const headings = cells(lines[0]);
  const row = (texts, tag) => {
    const node = element(doc, 'tr');
    node.append(...headings.map((unused, index) => {
      const cell = element(doc, tag);
      if (tag === 'th') {
        cell.setAttribute('scope', 'col');
      }
      cell.append(...inline(doc, texts[index] ?? ''));
      return cell;
    }));
    return node;
  };
  const result = element(doc, 'table');
  result.className = 'help__table';
  const head = element(doc, 'thead');
  head.append(row(headings, 'th'));
  const body = element(doc, 'tbody');
  body.append(...lines.slice(2).map((line) => row(cells(line), 'td')));
  result.append(head, body);
  const wrapper = element(doc, 'div');
  wrapper.className = 'help__table-wrap';
  wrapper.append(result);
  return wrapper;
}

/**
 * Render the lines of a block: a table, a screenshot, a list when every line is an item of one kind, or else paragraphs.
 * @param {Document} doc the document
 * @param {string[]} lines the trimmed lines of one block
 * @returns {HTMLElement[]} the elements
 */
function block(doc, lines) {
  if (lines.length > 1 && lines.every((line) => line.startsWith('|')) && DELIMITER.test(lines[1])) {
    return [table(doc, lines)];
  }
  const shot = lines.length === 1 ? SCREENSHOT.exec(lines[0]) : null;
  if (shot) {
    return [screenshot(doc, shot[1], shot[2])];
  }
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
