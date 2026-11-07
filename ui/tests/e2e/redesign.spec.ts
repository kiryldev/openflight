import { test, expect } from '@playwright/test';
import { gotoApp, KIOSK_VIEWPORTS, resetSession, withControlSocket } from './helpers';

for (const viewport of [...KIOSK_VIEWPORTS, { width: 1440, height: 900 }]) {
  test.describe(`redesigned workspace at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true });

    test('keeps navigation, all metrics, and the simulation action within reach', async ({ page }) => {
      await withControlSocket(resetSession);
      await gotoApp(page);
      await page.getByRole('button', { name: 'Close Select club' }).click();
      await page.getByRole('button', { name: 'Simulate shot' }).tap();
      const cards = page.locator('.live-panel__grid .metric-card');
      await expect(cards).toHaveCount(10);
      for (const card of await cards.all()) await expect(card).toBeInViewport({ ratio: 1 });
      const action = page.getByRole('button', { name: 'Simulate shot' });
      await expect(action).toBeInViewport({ ratio: 1 });
      const gridBox = await page.locator('.live-panel__grid').boundingBox();
      const actionBox = await action.boundingBox();
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(gridBox!.y);

      const nav = page.getByRole('navigation', { name: 'Panels' });
      await expect(nav.getByRole('button')).toHaveCount(6);
      for (const button of await nav.getByRole('button').all()) {
        await expect(button).toBeInViewport({ ratio: 1 });
      }
      await nav.getByRole('button', { name: 'Stats', exact: true }).tap();
      await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible();
      await expect(page.locator('.stats-panel__grid .metric-card').first()).toContainText('1');
    });
  });
}

for (const viewport of [
  { width: 1024, height: 600 },
  { width: 1440, height: 900 },
]) {
  test(`club picker opens centered on screen without animating at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await gotoApp(page);
    await page.getByRole('button', { name: 'Close Select club' }).click();
    await expect(page.getByRole('dialog', { name: 'Select club' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Change club' }).click();

    const dialog = page.getByRole('dialog', { name: 'Select club' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    const box = await dialog.boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.y + box!.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(2);
  });
}

test('selecting a club closes the picker and applies the club', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await gotoApp(page);
  const dialog = page.getByRole('dialog', { name: 'Select club' });
  await dialog.getByRole('button', { name: 'Irons' }).click();
  await dialog.getByRole('button', { name: '7i', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Change club' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Select club' }).getByRole('button', { name: '7i', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('club selection keeps Tab inside the dialog and Escape returns focus to the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await page.getByRole('button', { name: 'Close Select club' }).click();
  const trigger = page.getByRole('button', { name: 'Change club' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Select club' });
  await expect(dialog).toBeVisible();
  const close = page.getByRole('button', { name: 'Close Select club' });
  await close.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button').nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button').nth(2)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('a narrow window can scroll to and select the final metric', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await withControlSocket(resetSession);
  await gotoApp(page);
  await page.getByRole('button', { name: 'Close Select club' }).click();
  await page.getByRole('button', { name: 'Simulate shot' }).click();
  await expect(page.locator('.live-panel__grid .metric-card')).toHaveCount(10);
  await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'Club AoA' }).click();
  await expect(page.locator('.live-panel__hero')).toContainText('Club AoA');
  await expect(page.locator('.live-panel__grid .metric-card--selected')).toContainText('Club AoA');
  await expect(page.locator('.live-panel__grid .metric-card').first()).toContainText('Ball speed');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('both appearances keep metric labels and action text readable', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Close Select club' }).click();
  await page.getByRole('button', { name: 'Simulate shot' }).click();
  for (const theme of ['Dark', 'Light']) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.getByRole('button', { name: 'Close menu' }).click();
    const contrast = await page.locator('.metric-card__label, .simulate-bubble, .panel-action--secondary').evaluateAll((elements) => {
      const context = document.createElement('canvas').getContext('2d')!;
      const rgba = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      const luminance = (rgb: number[]) => {
        const values = rgb.slice(0, 3).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      return elements.map((element) => {
        let parent: Element | null = element;
        let background = [255, 255, 255, 255];
        while (parent) {
          const color = rgba(getComputedStyle(parent).backgroundColor);
          if (color[3] === 255) { background = color; break; }
          parent = parent.parentElement;
        }
        const text = luminance(rgba(getComputedStyle(element).color));
        const surface = luminance(background);
        return { label: element.textContent, ratio: (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05) };
      });
    });
    for (const pair of contrast) expect(pair.ratio, `${theme}: ${pair.label}`).toBeGreaterThanOrEqual(4.5);
  }
});
