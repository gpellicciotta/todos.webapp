import { expect, test } from '@playwright/test';

const GALLERY = '/demo/visual-style-gallery.html';

for (const theme of ['light', 'dark']) {
  test(`danger elements draw their focus ring in the danger color in the ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(GALLERY);
    await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark' }).check();

    const colors = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-danger)';
      document.body.append(probe);
      const danger = getComputedStyle(probe).color;
      probe.remove();
      const ring = (element) => {
        element.focus({ focusVisible: true });
        return getComputedStyle(element).outlineColor;
      };
      return {
        danger,
        button: ring(document.querySelector('#button .button--danger:not(.is-focus):not(:disabled)')),
        forced: getComputedStyle(document.querySelector('#button .button--danger.is-focus')).outlineColor,
        field: ring(document.querySelector('.field__control[aria-invalid="true"]')),
        plain: ring(document.querySelector('#button .button:not(.button--danger):not(:disabled)')),
      };
    });

    expect(colors.button).toBe(colors.danger);
    expect(colors.forced).toBe(colors.danger);
    expect(colors.field).toBe(colors.danger);
    expect(colors.plain).not.toBe(colors.danger);
  });
}
