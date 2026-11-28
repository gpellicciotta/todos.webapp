/**
 * Vendored from support.js: src/changelog-parser.mjs, version 3.1.0-pre, commit 3747182, copied unchanged below this comment.
 * MIT licensed by the same author as this app. Update by copying the file again and changing this comment.
 */

/**
 * Markdown CHANGELOG.md parser for extracting structured release and change models.
 *
 * @module changelog-parser
 */

/**
 * @typedef {Object} ChangelogEntry
 * @property {string} rawText - Original entry text
 * @property {string} text - Cleaned description text
 * @property {'feature'|'ux'|'fix'|'client'|'internal'} category - Classification category
 * @property {boolean} isUserFacing - Whether the item is intended for end-users
 * @property {boolean} isBreaking - Whether the item represents a breaking change
 */

/**
 * @typedef {Object} ChangelogRelease
 * @property {string} version - Semantic version number or release identifier, with any `-pre` suffix unless stripped
 * @property {boolean} isPreRelease - Whether the heading carried a `-pre` suffix
 * @property {string} tag - Tag or date string (e.g. '2026-08-24' or 'in development')
 * @property {boolean} isLatest - Whether this is the most recent release
 * @property {ChangelogEntry[]} entries - Parsed change items
 */

/**
 * Parses markdown changelog text into an array of release models.
 *
 * @param {string} markdownText - Raw markdown content
 * @param {Object} [options] - Parsing configuration options
 * @param {number} [options.maxReleases=20] - Max number of releases to parse
 * @param {boolean} [options.stripPreSuffix=false] - Drop the `-pre` suffix from `version`
 * @returns {ChangelogRelease[]} Array of parsed release descriptors.
 */
export function parseChangelog(markdownText, options = {}) {
  const maxReleases = options.maxReleases || 20;
  if (!markdownText || typeof markdownText !== 'string') { return []; }

  const lines = markdownText.split(/\r?\n/);
  const releases = [];
  let currentRelease = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match release header: "### vNext" or "### v1.0.2 [in development]" or "## v0.82.1-pre" or "### v0.23.0 [2023-08-14] - First Useable Version"
    // A "## " heading needs the "v" prefix, so "## Version History" or "## Next Steps" never start a release
    const versionMatch = line.match(
      /^(?:###\s+v?|##\s+v)([0-9]+[0-9a-zA-Z._-]*|next\b)(?:(?:\s+\[([^\]]+)\])+|\s+\(([^)]+)\)|\s*[:-]?\s*(.*))?/i,
    );
    if (versionMatch) {
      if (currentRelease) {
        releases.push(currentRelease);
        if (releases.length >= maxReleases) { break; }
      }

      const isPreRelease = /-pre$/i.test(versionMatch[1]);
      const version = options.stripPreSuffix ? versionMatch[1].replace(/-pre$/i, '') : versionMatch[1];
      let tag = '';

      // Extract all bracket tags or trailing text
      const allBrackets = line.match(/\[([^\]]+)\]/g);
      if (allBrackets && allBrackets.length > 0) {
        tag = allBrackets.map((b) => b.replace(/^\[|\]$/g, '')).join(' • ');
      }
      else if (versionMatch[3]) {
        tag = versionMatch[3].trim();
      }
      else if (versionMatch[4]) {
        tag = versionMatch[4].trim();
      }

      currentRelease = {
        version,
        isPreRelease,
        tag: tag || (isPreRelease || version.toLowerCase() === 'next' ? 'in development' : 'Released'),
        isLatest: releases.length === 0,
        entries: [],
      };
      continue;
    }

    // Parse bullet points inside a release section
    if (currentRelease && line.startsWith('- ')) {
      let rawText = line.substring(2).trim();
      if (!rawText) { continue; }

      let isBreaking = false;
      if (rawText.toLowerCase().includes('[breaking]')) {
        isBreaking = true;
        // Also strip the emphasis around "**[breaking]**", which would otherwise leave "****" in the text
        rawText = rawText.replace(/\s*\*{0,2}\[breaking\]\*{0,2}\s*/gi, ' ').trim();
      }

      // Check category prefix (e.g. "SPA:", "BackEnd:", "Clients:", "Feature:", "Fix:", "DevOps:", etc.)
      const prefixMatch = rawText.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
      let category = 'feature';
      let cleanText = rawText;
      let isUserFacing = true;

      if (prefixMatch) {
        const prefix = prefixMatch[1].toLowerCase();
        cleanText = prefixMatch[2].trim();

        switch (prefix) {
          case 'spa':
          case 'ui':
          case 'ux':
          case 'frontend':
            category = 'ux';
            isUserFacing = true;
            break;
          case 'feature':
          case 'feat':
          case 'new':
          case 'backend':
          case 'server':
          case 'api':
            category = 'feature';
            isUserFacing = true;
            break;
          case 'fix':
          case 'bug':
            category = 'fix';
            isUserFacing = true;
            break;
          case 'client':
          case 'clients':
          case 'cli':
          case 'sdk':
            category = 'client';
            isUserFacing = true;
            break;
          case 'test':
          case 'tests':
          case 'build':
          case 'devex':
          case 'devops':
          case 'docs':
          case 'doc':
          case 'adr':
          case 'tour':
          case 'ci':
          case 'chore':
          case 'refactor':
            category = 'internal';
            isUserFacing = false;
            break;
          default:
            category = 'feature';
            isUserFacing = true;
            break;
        }
      }

      currentRelease.entries.push({
        rawText: line.substring(2).trim(),
        text: cleanText,
        category,
        isUserFacing,
        isBreaking,
      });
      continue;
    }

    // Continuation line for a multi-line bullet point
    if (currentRelease && currentRelease.entries.length > 0 && /^\s{2,}\S/.test(lines[i])) {
      const continuation = line.trim();
      if (continuation) {
        const lastEntry = currentRelease.entries[currentRelease.entries.length - 1];
        lastEntry.rawText += ' ' + continuation;
        lastEntry.text += ' ' + continuation;
      }
      continue;
    }
  }

  if (currentRelease && releases.length < maxReleases) {
    releases.push(currentRelease);
  }

  return releases;
}
