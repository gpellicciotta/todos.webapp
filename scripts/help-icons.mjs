/**
 * Icon files of the help docs: standalone copies of sprite symbols, so the docs also show their icons outside the app.
 * Inside the app, the help draws the sprite symbol itself, which follows the theme (see src/js/ui/markdown.js).
 */

/** A mid gray that shows on light and dark pages alike. */
const INK = '#64748b';

/**
 * Build the standalone SVG file of a sprite symbol.
 * @param {string} sprite the text of src/img/icons.svg
 * @param {string} name the symbol identifier
 * @returns {string} the file text, with LF line ends
 * @throws {Error} when the sprite has no such symbol
 */
export function iconFile(sprite, name) {
  const symbol = sprite.replaceAll('\r\n', '\n').match(new RegExp(`<symbol id="${name}" viewBox="([^"]+)">\\n([\\s\\S]*?)\\n\\s*</symbol>`));
  if (!symbol) {
    throw new Error(`No symbol in the icon sprite: ${name}`);
  }
  const [, viewBox, shapes] = symbol;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="20" height="20" color="${INK}" fill="none" stroke="currentColor" `
    + `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n${shapes}\n</svg>\n`;
}
