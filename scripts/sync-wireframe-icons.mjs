/**
 * Copy the icons of the app and of its look into the UI wireframe page, docs/design/ui-wireframes.html.
 *
 * Browsers block references to a sprite file on a page opened from disk, so the page holds the symbols itself.
 * Each identifier gets the prefix `app-` or `look-`, since both sprites name some icons alike.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'docs', 'design', 'ui-wireframes.html');
const APP_SPRITE = join(ROOT, 'src', 'img', 'icons.svg');
const LOOK_SPRITE = join(ROOT, 'src', 'vendor', 'design', 'looks', 'neutral', 'icons.svg');
const BEGIN = '<!-- icons:begin -->';
const END = '<!-- icons:end -->';

const USAGE = `Usage: node scripts/sync-wireframe-icons.mjs [--help]

Copy the icon symbols of the app and of its look into docs/design/ui-wireframes.html.

Options:
  -h, --help   show this help message and exit

Exit codes: 0 success, 1 failure, 2 invalid arguments.`;

/**
 * Build the block of the wireframe page that holds the icons.
 * @param {string} appSprite the text of src/img/icons.svg
 * @param {string} lookSprite the text of the icon sprite of the look
 * @returns {string} the block, with its two marker comments and LF line ends
 * @throws {Error} when a sprite holds no symbol
 */
export function iconBlock(appSprite, lookSprite) {
  const symbols = [['app', appSprite], ['look', lookSprite]].flatMap(([prefix, sprite]) => {
    const found = sprite.replaceAll('\r\n', '\n').match(/<symbol\b[\s\S]*?<\/symbol>/g);
    if (!found) {
      throw new Error(`No symbol in the ${prefix} icon sprite`);
    }
    return found.map((symbol) => `  ${symbol.replace('<symbol id="', `<symbol id="${prefix}-`)}`);
  });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position: absolute" aria-hidden="true">';
  return `${BEGIN}\n<template id="wf-sprite">${svg}\n${symbols.join('\n')}\n</svg></template>\n${END}`;
}

/**
 * Put a block of icons in place of the one a page holds.
 * @param {string} page the text of the page, with LF line ends
 * @param {string} block the block of {@link iconBlock}
 * @returns {string} the new text
 * @throws {Error} when the page lacks a marker
 */
export function replaceIconBlock(page, block) {
  const start = page.indexOf(BEGIN);
  const end = page.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error(`The page lacks the markers ${BEGIN} and ${END}`);
  }
  return `${page.slice(0, start)}${block}${page.slice(end + END.length)}`;
}

/**
 * Run the script from the command line.
 * @param {string[]} argv the arguments after the script name
 * @returns {Promise<number>} the exit code
 */
async function main(argv) {
  try {
    const { values } = parseArgs({ args: argv, options: { help: { type: 'boolean', short: 'h' } } });
    if (values.help) {
      console.log(USAGE);
      return 0;
    }
  }
  catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  const [page, app, look] = await Promise.all([PAGE, APP_SPRITE, LOOK_SPRITE].map((path) => readFile(path, 'utf8')));
  const crlf = page.includes('\r\n');
  const updated = replaceIconBlock(page.replaceAll('\r\n', '\n'), iconBlock(app, look));
  const text = crlf ? updated.replaceAll('\n', '\r\n') : updated;
  if (text === page) {
    console.log('The icons of the wireframe page are up to date.');
    return 0;
  }
  await writeFile(PAGE, text);
  console.log(`Updated the icons of ${PAGE}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
