#!/usr/bin/env node
/**
 * Stage the GitHub Pages artifact: `src/` plus the help files at their served paths.
 *
 * It uses Node.js built-ins only, so it runs right after cloning without `npm install`.
 *
 * Usage: node scripts/stage-site.mjs <out-dir>
 */

import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { HELP_FILES } from './site-files.mjs';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));

const USAGE = `Usage: node scripts/stage-site.mjs <out-dir>

Copy src/ into <out-dir>, then each help file to its served path (help/*.md).
The output folder must not exist, or must be empty.

Options:
  -h, --help  show this help message and exit

Exit codes: 0 success, 1 failure (missing source, non-empty folder), 2 usage error`;

/**
 * Tell whether a path is an existing file.
 * @param {string} path the path
 * @returns {Promise<boolean>} true for a regular file
 */
async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  }
  catch {
    return false;
  }
}

/**
 * Copy the app and the help files into an output folder.
 * @param {{repoRoot?: string, outDir: string}} options the repository root and the output folder
 * @returns {Promise<void>} resolves once the folder is staged
 * @throws {Error} when a help source is missing, or the output folder exists and is not empty
 */
export async function stageSite({ repoRoot = REPO_ROOT, outDir }) {
  const out = resolve(outDir);
  for (const source of Object.values(HELP_FILES)) {
    if (!(await isFile(join(repoRoot, source)))) {
      throw new Error(`Missing help source file: ${source}`);
    }
  }
  try {
    if ((await readdir(out)).length > 0) {
      throw new Error(`Output folder is not empty: ${out}`);
    }
  }
  catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  await mkdir(out, { recursive: true });
  await cp(join(repoRoot, 'src'), out, { recursive: true });
  for (const [served, source] of Object.entries(HELP_FILES)) {
    const target = join(out, served);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(repoRoot, source), target);
  }
}

/**
 * Run the script from the command line.
 * @param {string[]} argv command-line arguments after the script name
 * @returns {Promise<number>} the exit code
 */
async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: { help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
  }
  catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (parsed.values.help) {
    console.log(USAGE);
    return 0;
  }
  if (parsed.positionals.length !== 1) {
    console.error(`Expected exactly one output folder.\n\n${USAGE}`);
    return 2;
  }
  try {
    await stageSite({ outDir: parsed.positionals[0] });
  }
  catch (error) {
    console.error(error.message);
    return 1;
  }
  console.log(`Staged the site in ${resolve(parsed.positionals[0])}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
