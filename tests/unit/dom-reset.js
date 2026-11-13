// The vendored live region is shared per document and lives in the body, so a test that resets the body keeps it.

/**
 * Replace the body content with markup, keeping the shared live regions that the vendored live-region.js added.
 * @param {string} [html] the new body markup
 */
export function resetBody(html = '') {
  const regions = [...document.body.querySelectorAll(':scope > [data-live-region]')];
  document.body.innerHTML = html;
  document.body.append(...regions);
}
