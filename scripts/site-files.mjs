/**
 * Files outside `src/` that the app serves, shared by the development server and the Pages staging script.
 *
 * Each key is the served path, relative to the app root; each value is the repository-relative source file.
 * The list is explicit, not a glob, so no other repository file is ever served.
 */
export const HELP_FILES = Object.freeze({
  'help/welcome.md': 'docs/tutorial/welcome.md',
  'help/getting-started.md': 'docs/tutorial/getting-started.md',
  'help/faq.md': 'docs/tutorial/faq.md',
  'help/CHANGELOG.md': 'CHANGELOG.md',
});
