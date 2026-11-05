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

for (const theme of ['light', 'dark']) {
  test(`Delete controls use the danger color, and other controls do not, in the ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(GALLERY);
    await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark' }).check();

    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    const result = await page.evaluate(() => {
      const probe = (token) => {
        const span = document.createElement('span');
        span.style.color = `var(${token})`;
        document.body.append(span);
        const color = getComputedStyle(span).color;
        span.remove();
        return color;
      };
      const deletes = [...document.querySelectorAll('.button, .menu__item')]
        .filter((element) => /^Delete\b/.test(element.textContent.trim()) && element.checkVisibility() && !element.disabled && !element.matches('.is-hover, .is-active'));
      return {
        danger: probe('--color-danger'),
        onDanger: probe('--color-on-danger'),
        controls: deletes.map((element) => {
          const style = getComputedStyle(element);
          return {
            label: element.textContent.trim(),
            menu: element.classList.contains('menu__item'),
            secondary: element.classList.contains('button--secondary'),
            color: style.color,
            background: style.backgroundColor,
            border: style.borderTopColor,
          };
        }),
        plain: getComputedStyle(document.querySelector('#button .button:not(.button--danger):not(.button--secondary):not(:disabled)')).backgroundColor,
      };
    });

    expect(result.controls.length).toBeGreaterThanOrEqual(6);
    for (const control of result.controls) {
      if (control.menu) {
        expect(control.color, control.label).toBe(result.danger);
      }
      else if (control.secondary) {
        expect(control.border, control.label).toBe(result.danger);
      }
      else {
        expect(control.background, control.label).toBe(result.danger);
        expect(control.color, control.label).toBe(result.onDanger);
      }
    }
    expect(result.plain).not.toBe(result.danger);
  });
}
