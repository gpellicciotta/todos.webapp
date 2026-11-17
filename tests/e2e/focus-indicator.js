/**
 * Install `window.focusIndicator(element)` in a page: whether the element draws a visible focus indicator.
 * The vendored design system draws focus as a glow: a solid box-shadow contour of --focus-ring-width plus a halo,
 * with a transparent outline that only forced colors mode paints. A transparent outline alone is no indicator.
 * An indicator is an opaque outline of at least 2 px, or an opaque zero-offset contour of at least 2 px,
 * either one in the focus or the danger color.
 * @param {import('@playwright/test').Page} page the page
 */
export async function installFocusIndicator(page) {
  await page.evaluate(() => {
    const probe = (token) => {
      const span = document.createElement('span');
      span.style.color = `var(${token})`;
      document.body.append(span);
      const color = getComputedStyle(span).color;
      span.remove();
      return color;
    };
    window.focusIndicator = (element) => {
      const colors = [probe('--color-focus'), probe('--color-danger')];
      const style = getComputedStyle(element);
      const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 && colors.includes(style.outlineColor);
      const contour = [...style.boxShadow.matchAll(/(rgb\(\d+, \d+, \d+\)) 0px 0px 0px (\d+(?:\.\d+)?)px/g)]
        .some(([, color, spread]) => colors.includes(color) && parseFloat(spread) >= 2);
      return outline || contour;
    };
  });
}
