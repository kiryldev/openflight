import { test } from '@playwright/test';
import {
  expect,
  gotoApp,
  KIOSK_VIEWPORTS,
  liveMetricValueFontSizes,
  overflowingLiveMetricMetadata,
  overflowingLiveMetricValues,
  simulateShot,
  WIDEST_LIVE_METRIC_VALUE,
  withControlSocket,
} from './helpers';

/** Dismiss the club picker that opens on every load, keeping the default club. */
async function dismissPicker(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Close Select club' }).click();
}

for (const viewport of KIOSK_VIEWPORTS) {
  test.describe(`live metrics at ${viewport.width}×${viewport.height}`, () => {
    test.use({ hasTouch: true, viewport });

    test('keeps metric value text inside each live tile', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);

      await expect(page.locator('.live-panel__grid .metric-card')).toHaveCount(10);

      const sizes = await liveMetricValueFontSizes(page);
      expect(sizes.length).toBe(10);
      expect(new Set(sizes.map((size) => size.toFixed(2))).size).toBe(1);

      await page.locator('.live-panel__grid .metric-card__value').evaluateAll((values, widest) => {
        for (const value of values) {
          value.textContent = widest;
        }
      }, WIDEST_LIVE_METRIC_VALUE);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

      expect(await overflowingLiveMetricValues(page)).toEqual([]);
    });

    test('centers each tile and spreads label, value, and caption top to bottom', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await expect(page.locator('.live-panel__grid .metric-card')).toHaveCount(10);

      const tiles = await page.locator('.live-panel__grid .metric-card').evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect();
          const centerX = (rect: DOMRect) => rect.left + rect.width / 2;
          const contentRect = (selector: string) => {
            const rects = Array.from(card.querySelectorAll<HTMLElement>(selector), (el) => el.getBoundingClientRect())
              .filter((rect) => rect.width > 0);
            if (rects.length === 0) return null;
            const left = Math.min(...rects.map((rect) => rect.left));
            const right = Math.max(...rects.map((rect) => rect.right));
            const top = Math.min(...rects.map((rect) => rect.top));
            const bottom = Math.max(...rects.map((rect) => rect.bottom));
            return new DOMRect(left, top, right - left, bottom - top);
          };
          const label = card.querySelector('.metric-card__label')!.getBoundingClientRect();
          const value = contentRect('.metric-card__value, .metric-card__unit')!;
          const meta = contentRect('.metric-card__meta > *');
          return {
            label: card.querySelector('.metric-card__label')!.textContent,
            tileCenter: centerX(box),
            labelCenter: centerX(label),
            valueCenter: centerX(value),
            metaCenter: meta ? centerX(meta) : null,
            labelTopGap: label.top - box.top,
            valueMiddleOffset: value.top + value.height / 2 - (box.top + box.height / 2),
            metaBottomGap: meta ? box.bottom - meta.bottom : null,
            height: box.height,
          };
        })
      );

      for (const tile of tiles) {
        expect(Math.abs(tile.labelCenter - tile.tileCenter), `${tile.label} label`).toBeLessThanOrEqual(2);
        expect(Math.abs(tile.valueCenter - tile.tileCenter), `${tile.label} value`).toBeLessThanOrEqual(2);
        if (tile.metaCenter !== null) {
          expect(Math.abs(tile.metaCenter - tile.tileCenter), `${tile.label} caption`).toBeLessThanOrEqual(2);
          expect(tile.metaBottomGap!, `${tile.label} caption sits at the bottom`).toBeLessThanOrEqual(tile.height * 0.2);
        }
        expect(tile.labelTopGap, `${tile.label} label sits at the top`).toBeLessThanOrEqual(tile.height * 0.2);
        expect(Math.abs(tile.valueMiddleOffset), `${tile.label} value is vertically centered`).toBeLessThanOrEqual(
          tile.height * 0.12
        );
      }
    });

    test('shows metric titles in large capitals that fit their tiles', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await expect(page.locator('.live-panel__grid .metric-card')).toHaveCount(10);

      const labels = await page.locator('.live-panel__grid .metric-card__label, .live-panel__hero .metric-card__label').evaluateAll(
        (nodes) =>
          nodes.map((node) => {
            const style = getComputedStyle(node);
            const card = node.closest('.metric-card')!.getBoundingClientRect();
            const box = node.getBoundingClientRect();
            return {
              text: node.textContent,
              transform: style.textTransform,
              fontSize: parseFloat(style.fontSize),
              fits: box.left >= card.left - 0.5 && box.right <= card.right + 0.5 && node.scrollWidth <= node.clientWidth + 1,
            };
          })
      );

      expect(labels.length).toBe(11);
      for (const label of labels) {
        expect(label.transform, `${label.text} is capitalized`).toBe('uppercase');
        expect(label.fontSize, `${label.text} is large`).toBeGreaterThanOrEqual(12);
        expect(label.fits, `${label.text} fits its tile`).toBe(true);
      }
    });

    test('shows tile captions large enough to read at a glance', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'V. launch' }).click();
      await expect(page.locator('.live-panel__grid .metric-card')).toHaveCount(10);

      const captions = await page
        .locator(
          '.live-panel__grid .metric-card__meta .metric-card__confidence-label, .live-panel__hero .metric-card__meta .metric-card__confidence-label'
        )
        .evaluateAll((nodes) =>
          nodes.map((node) => ({ text: node.textContent, fontSize: parseFloat(getComputedStyle(node).fontSize) }))
        );
      const dots = await page
        .locator('.live-panel__grid .metric-card__confidence-dots .dot')
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));

      expect(captions.length).toBeGreaterThan(0);
      for (const caption of captions) {
        expect(caption.fontSize, `${caption.text} caption`).toBeGreaterThanOrEqual(12);
      }
      expect(dots.length).toBeGreaterThan(0);
      for (const width of dots) {
        expect(width).toBeGreaterThanOrEqual(7);
      }
    });

    test('centers the full-screen label, value, and caption', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'V. launch' }).click();
      const hero = page.locator('.live-panel__hero');
      await expect(hero.locator('.metric-card__label')).toContainText('V. launch');

      const centers = await hero.evaluate((el) => {
        const centerX = (rect: DOMRect) => rect.left + rect.width / 2;
        const union = (selector: string) => {
          const rects = Array.from(el.querySelectorAll(selector), (node) => node.getBoundingClientRect()).filter(
            (rect) => rect.width > 0
          );
          const left = Math.min(...rects.map((rect) => rect.left));
          const right = Math.max(...rects.map((rect) => rect.right));
          return (left + right) / 2;
        };
        return {
          hero: centerX(el.getBoundingClientRect()),
          label: centerX(el.querySelector('.metric-card__label')!.getBoundingClientRect()),
          valueAndCaption: union('.metric-card__value, .metric-card__unit, .metric-card__meta > *'),
        };
      });

      expect(Math.abs(centers.label - centers.hero)).toBeLessThanOrEqual(2);
      expect(Math.abs(centers.valueAndCaption - centers.hero)).toBeLessThanOrEqual(2);
    });

    test('keeps the full-screen caption fully visible', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'V. launch' }).click();
      const hero = page.locator('.live-panel__hero');
      await expect(hero.locator('.metric-card__label')).toContainText('V. launch');

      const clipped = await hero.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return Array.from(el.querySelectorAll('.metric-card__label, .metric-card__value-row, .metric-card__meta > *'))
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.top < bounds.top - 0.5 ||
              box.bottom > bounds.bottom + 0.5 ||
              box.left < bounds.left - 0.5 ||
              box.right > bounds.right + 0.5
            );
          })
          .map((node) => node.className);
      });

      expect(clipped).toEqual([]);
    });

    test('keeps long metric subtitles readable inside each live tile', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);

      const subtitles = [
        'spin-adjusted',
        'camera assisted (experimental)',
        'camera fused (experimental)',
        'rejected: insufficient post trigger frames',
        'player + implement',
        '99 swings',
        '99 readings',
        '199.9 mph trigger',
        'straight',
        'candidate',
      ];
      await page.locator('.live-panel__grid .metric-card').evaluateAll((cards, text) => {
        cards.forEach((card, index) => {
          const meta = card.querySelector('.metric-card__meta');
          if (!(meta instanceof HTMLElement)) return;

          const subtitle = document.createElement('span');
          subtitle.className = 'metric-card__subtext metric-card__confidence-label';
          subtitle.textContent = text[index];
          meta.replaceChildren(subtitle);

          if (index === 2 || index === 3) {
            const confidence = document.createElement('div');
            confidence.className = 'metric-card__confidence metric-card__confidence--high';
            confidence.innerHTML =
              '<span class="metric-card__confidence-dots"><span class="dot filled"></span><span class="dot filled"></span><span class="dot filled"></span></span><span class="metric-card__confidence-label">experimental</span>';
            meta.append(confidence);
          }
        });
      }, subtitles);

      expect(await overflowingLiveMetricMetadata(page)).toEqual([]);
    });
  });
}
