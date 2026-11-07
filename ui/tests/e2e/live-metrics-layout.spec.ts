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

test('shows the last-shot count in the header before the first shot', async ({ page }) => {
  await gotoApp(page);
  await dismissPicker(page);
  await expect(page.locator('.panel-app__topbar .panel-header__meta')).toHaveText('Last shot · 0');
});

test('keeps visual labels compact on a large full-screen display', async ({ page }) => {
  await page.setViewportSize({ width: 3320, height: 1286 });
  await withControlSocket(async (socket) => {
    await simulateShot(socket);
  });

  await gotoApp(page);
  await dismissPicker(page);
  await page.getByRole('button', { name: 'Show club impact' }).click();

  const labelHeights = await page.locator('.club-impact svg text').evaluateAll((labels) =>
    labels.map((label) => label.getBoundingClientRect().height)
  );
  expect(labelHeights).toHaveLength(7);
  expect(Math.max(...labelHeights)).toBeLessThanOrEqual(32);
});

test('uses the upper space for the main stat and gives the desktop grid more height', async ({ page }) => {
  await page.setViewportSize({ width: 3414, height: 1102 });
  await withControlSocket(async (socket) => {
    await simulateShot(socket);
  });

  await gotoApp(page);
  await dismissPicker(page);

  await expect(page.locator('.panel-app__topbar .panel-header__meta')).toContainText('Last shot');
  await expect(page.locator('.live-panel__context')).toHaveCount(0);
  const heroValueSize = await page.locator('.live-panel__hero .metric-card__value-row').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  const rootSize = await page.locator('html').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(heroValueSize).toBeCloseTo(rootSize * 7, 0);

  const body = await page.locator('.live-panel__body--hero-expanded').boundingBox();
  const hero = await page.locator('.live-panel__hero').boundingBox();
  const label = await page.locator('.live-panel__hero .metric-card__label').boundingBox();
  const grid = await page.locator('.live-panel__grid').boundingBox();
  expect(body).toBeTruthy();
  expect(hero).toBeTruthy();
  expect(label).toBeTruthy();
  expect(grid).toBeTruthy();
  expect(hero!.height / body!.height).toBeLessThanOrEqual(0.26);
  expect(grid!.height / body!.height).toBeGreaterThanOrEqual(0.72);
  expect(label!.y - hero!.y).toBeLessThanOrEqual(hero!.height * 0.28);

  await page.evaluate(async () => {
    const { useShotStore } = await import('/src/stores/useShotStore.ts');
    const shot = useShotStore.getState().latestShot;
    if (shot) {
      useShotStore.getState().updateShot({ ...shot, carry_spin_adjusted: shot.estimated_carry_yards });
    }
  });
  await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'Carry' }).click();
  const value = await page.locator('.live-panel__hero .metric-card__value-row').boundingBox();
  const caption = await page.locator('.live-panel__hero .metric-card__subtext').boundingBox();
  expect(value).toBeTruthy();
  expect(caption).toBeTruthy();
  expect(caption!.y).toBeGreaterThanOrEqual(value!.y + value!.height - 1);
  expect(caption!.y + caption!.height).toBeLessThanOrEqual(hero!.y + hero!.height + 1);

  await page.setViewportSize({ width: 1024, height: 768 });
  const shorterHero = await page.locator('.live-panel__hero').boundingBox();
  const shorterValue = await page.locator('.live-panel__hero .metric-card__value-row').boundingBox();
  const shorterCaption = await page.locator('.live-panel__hero .metric-card__subtext').boundingBox();
  expect(shorterHero).toBeTruthy();
  expect(shorterValue).toBeTruthy();
  expect(shorterCaption).toBeTruthy();
  expect(shorterCaption!.y).toBeGreaterThanOrEqual(shorterValue!.y + shorterValue!.height - 1);
  expect(shorterCaption!.y + shorterCaption!.height).toBeLessThanOrEqual(shorterHero!.y + shorterHero!.height + 1);
});

for (const viewport of KIOSK_VIEWPORTS) {
  test.describe(`live metrics at ${viewport.width}×${viewport.height}`, () => {
    test.use({ hasTouch: true, viewport });

    test('keeps live controls in a footer-height top bar outside the data card', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });
      await gotoApp(page);
      await dismissPicker(page);

      const topBar = page.locator('.panel-app__topbar');
      const main = page.locator('.panel-app__main');
      const footer = page.locator('.panel-footer');
      await expect(topBar.getByRole('button', { name: 'Change club' })).toBeVisible();
      await expect(topBar.getByRole('button', { name: 'Simulate shot' })).toBeVisible();
      await expect(topBar.locator('.panel-header__subtitle')).toHaveText('Profile 1');
      await expect(main.locator('.panel-header')).toHaveCount(0);

      const titleBox = await topBar.locator('.panel-header__title').boundingBox();
      const logoBox = await footer.locator('.panel-footer__menu svg').boundingBox();
      const clubBox = await topBar.locator('.panel-header__club').boundingBox();
      expect(titleBox).toBeTruthy();
      expect(logoBox).toBeTruthy();
      expect(clubBox).toBeTruthy();
      expect(Math.abs(titleBox!.x - logoBox!.x)).toBeLessThanOrEqual(2);
      const actions = topBar.locator('.panel-header__actions > button');
      await expect(actions).toHaveCount(2);
      const actionSizes = await actions.evaluateAll((buttons) => buttons.map((button) => ({
        hitHeight: button.getBoundingClientRect().height,
        visualHeight: Number.parseFloat(getComputedStyle(button, '::before').height),
      })));
      expect(actionSizes.every(({ hitHeight, visualHeight }) =>
        hitHeight >= 44 && Math.abs(visualHeight - clubBox!.height) <= 2
      )).toBe(true);

      const headerBox = await topBar.boundingBox();
      const mainBox = await main.boundingBox();
      const footerBox = await footer.boundingBox();
      expect(headerBox).toBeTruthy();
      expect(mainBox).toBeTruthy();
      expect(footerBox).toBeTruthy();
      expect(Math.abs(headerBox!.height - footerBox!.height)).toBeLessThanOrEqual(2);
      expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(mainBox!.y + 1);
    });

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

    test('shows a bounded club-impact view with a five-wide draggable metric row', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await page.getByRole('button', { name: 'Show club impact' }).click();

      const body = page.locator('.live-panel__body--club-view');
      const impact = page.locator('.club-impact');
      const row = page.locator('.live-panel__grid--single-row');
      await expect(body).toBeVisible();
      await expect(impact).toBeVisible();
      await expect(row.locator('.metric-card')).toHaveCount(9);
      await expect(row.locator('.metric-card__label').filter({ hasText: /^Ball speed$/ })).toHaveCount(0);

      const visualTextStyles = await impact.locator('svg text').evaluateAll((labels) => {
        const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
        return labels.map((label) => ({
          transform: getComputedStyle(label).textTransform,
          relativeSize: Number.parseFloat(getComputedStyle(label).fontSize) / rootSize,
          weight: Number.parseInt(getComputedStyle(label).fontWeight, 10),
        }));
      });
      expect(visualTextStyles).toHaveLength(7);
      expect(visualTextStyles.every(({ transform, relativeSize, weight }) =>
        transform === 'uppercase' && relativeSize <= 0.45 && weight >= 700
      )).toBe(true);

      const pathLabel = await impact.locator('g[aria-label="Top view"] text').filter({ hasText: /^Club path / }).boundingBox();
      const topHead = await impact.locator('g[aria-label="Top view"] image').boundingBox();
      expect(pathLabel).toBeTruthy();
      expect(topHead).toBeTruthy();
      expect(pathLabel!.y + pathLabel!.height).toBeLessThan(topHead!.y);

      const heroBox = await body.locator('.live-panel__hero .metric-card').boundingBox();
      const layoutBox = await body.locator('.live-panel__impact-layout').boundingBox();
      const topBox = await impact.locator('g[aria-label="Top view"]').boundingBox();
      const sideBox = await impact.locator('g[aria-label="Side view"]').boundingBox();
      expect(heroBox).toBeTruthy();
      expect(layoutBox).toBeTruthy();
      expect(topBox).toBeTruthy();
      expect(sideBox).toBeTruthy();
      expect(heroBox!.y + heroBox!.height).toBeLessThan(topBox!.y);
      expect(heroBox!.y + heroBox!.height).toBeLessThan(sideBox!.y);
      expect(topBox!.x + topBox!.width).toBeLessThan(sideBox!.x);
      expect(Math.abs(heroBox!.x + heroBox!.width / 2 - layoutBox!.x - layoutBox!.width / 2)).toBeLessThan(2);

      await row.locator('.metric-card__label').filter({ hasText: /^Spin(?:Estimated)?$/ }).click();
      const hero = body.locator('.live-panel__hero');
      await expect(hero.locator('.metric-card__label')).toHaveText('Spin');
      await expect(row.locator('.metric-card__label').filter({ hasText: /^Spin(?:Estimated)?$/ })).toHaveCount(0);
      await expect(row.locator('.metric-card').first()).toContainText('Ball speed');
      await expect(row.locator('.metric-card')).toHaveCount(9);
      await expect(hero.locator('.metric-card__meta')).not.toBeEmpty();
      const bands = await hero.evaluate((element) => {
        const rect = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
        const center = (box: DOMRect) => box.left + box.width / 2;
        const card = rect('.metric-card');
        const label = rect('.metric-card__label');
        const value = rect('.metric-card__value-row');
        const detail = rect('.metric-card__meta');
        return { center: center(card), label: { center: center(label), bottom: label.bottom }, value: { center: center(value), top: value.top, bottom: value.bottom }, detail: { center: center(detail), top: detail.top } };
      });
      expect(bands.value.top).toBeGreaterThanOrEqual(bands.label.bottom - 1);
      expect(bands.detail.top).toBeGreaterThanOrEqual(bands.value.bottom - 1);
      expect(Math.abs(bands.label.center - bands.center)).toBeLessThanOrEqual(2);
      expect(Math.abs(bands.value.center - bands.center)).toBeLessThanOrEqual(2);
      expect(Math.abs(bands.detail.center - bands.center)).toBeLessThanOrEqual(2);

      const visibleCount = await row.locator('.metric-card').evaluateAll((cards) => {
        const rowBox = cards[0]?.parentElement?.getBoundingClientRect();
        if (!rowBox) return 0;
        return cards.filter((card) => {
          const box = card.getBoundingClientRect();
          return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
        }).length;
      });
      expect(visibleCount).toBe(5);

      const impactBox = await impact.boundingBox();
      expect(impactBox).toBeTruthy();
      expect(impactBox!.x).toBeGreaterThanOrEqual(0);
      expect(impactBox!.y).toBeGreaterThanOrEqual(0);
      expect(impactBox!.x + impactBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(impactBox!.y + impactBox!.height).toBeLessThanOrEqual(viewport.height);

      const selectedBefore = await hero.locator('.metric-card__label').textContent();
      const before = await row.evaluate((node) => node.scrollLeft);
      const rowBox = await row.boundingBox();
      expect(rowBox).toBeTruthy();
      await page.mouse.move(rowBox!.x + rowBox!.width - 20, rowBox!.y + rowBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(rowBox!.x + 20, rowBox!.y + rowBox!.height / 2, { steps: 12 });
      await page.mouse.up();

      await expect.poll(async () => row.evaluate((node) => node.scrollLeft)).toBeGreaterThan(before);
      expect(await hero.locator('.metric-card__label').textContent()).toBe(selectedBefore);

      await row.getByRole('button', { name: /Spin axis/ }).click();
      await expect(hero.locator('.metric-card__label')).toHaveText('Spin axis');
      await expect(row.getByRole('button', { name: /Spin axis/ })).toHaveCount(0);

      await page.getByRole('button', { name: 'Hide club impact' }).click();
      await expect(page.locator('.live-panel__grid--single-row')).toHaveCount(0);
      await expect(page.locator('.live-panel__grid')).toHaveCSS('grid-template-rows', /.+ .+/);
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

    test('keeps the full-screen carry caption beneath its value', async ({ page }) => {
      await withControlSocket(async (socket) => {
        await simulateShot(socket);
      });

      await gotoApp(page);
      await dismissPicker(page);
      await page.evaluate(async () => {
        const { useShotStore } = await import('/src/stores/useShotStore.ts');
        const shot = useShotStore.getState().latestShot;
        if (shot) {
          useShotStore.getState().updateShot({ ...shot, carry_spin_adjusted: shot.estimated_carry_yards });
        }
      });
      await page.locator('.live-panel__grid .metric-card').filter({ hasText: 'Carry' }).click();

      const hero = page.locator('.live-panel__hero');
      const caption = hero.locator('.metric-card__subtext');
      await expect(caption).toHaveText('Spin-adjusted');

      const valueBox = await hero.locator('.metric-card__value-row').boundingBox();
      const captionBox = await caption.boundingBox();
      const heroBox = await hero.boundingBox();
      expect(valueBox).toBeTruthy();
      expect(captionBox).toBeTruthy();
      expect(heroBox).toBeTruthy();
      expect(captionBox!.y).toBeGreaterThanOrEqual(valueBox!.y + valueBox!.height - 1);
      expect(Math.abs(captionBox!.x + captionBox!.width / 2 - heroBox!.x - heroBox!.width / 2)).toBeLessThanOrEqual(2);
      expect(captionBox!.y + captionBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height + 1);
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
