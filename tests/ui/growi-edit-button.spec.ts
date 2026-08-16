import { expect, test } from '@playwright/test';
import { columnOf, sortButton, tableIn } from '../helpers/table';

/*
 * growi.html renders through GROWI's own `components.table` (TableWithEditButton), which
 * is what the plugin wraps in production. index.html cannot stand in for it: the edit
 * button is absolutely positioned over the top-right of the table, so anything the plugin
 * puts near there can cover it — and a covered button looks like a working one.
 *
 * This is the failure mode growi-plugin-datatables shipped and then had to chase, because
 * DataTables moved the table into a container that sat over the button.
 */

const editButton = (page: import('@playwright/test').Page, mountId: string) =>
  page.locator(`#${mountId} .editable-with-handsontable .handsontable-modal-trigger`);

test.beforeEach(async ({ page }) => {
  await page.goto('/growi.html');
});

test.describe('GROWI の編集ボタンとの共存', () => {
  test('プラグインが GROWI のテーブル構造を保つ', async ({ page }) => {
    // The plugin must render *through* GROWI's component, not replace it.
    await expect(page.locator('#mock-growi-basic .editable-with-handsontable > table')).toHaveCount(1);
    await expect(page.locator('#mock-growi-basic [data-growi-plugin-react-table="active"]')).toBeVisible();
  });

  test('編集ボタンがツールバーに覆われていない', async ({ page }) => {
    const button = editButton(page, 'mock-growi-basic');
    const box = (await button.boundingBox())!;

    // Whatever is on top at the button's centre must be the button itself.
    const topmost = await page.evaluate(
      ({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        return element?.closest('.handsontable-modal-trigger') != null;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );

    expect(topmost, 'something is stacked over GROWI’s edit button').toBe(true);
  });

  test('編集ボタンがクリックできる', async ({ page }) => {
    const clicked = page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          document.querySelector('#mock-growi-basic .handsontable-modal-trigger')?.addEventListener('click', () => resolve(true), { once: true });
          setTimeout(() => resolve(false), 3000);
        }),
    );

    await editButton(page, 'mock-growi-basic').click();
    expect(await clicked).toBe(true);
  });

  test('ツールバーは編集ボタンの上に重ならない位置に出る', async ({ page }) => {
    const toolbar = page.locator('#mock-growi-basic .grt-toolbar');
    const toolbarBox = (await toolbar.boundingBox())!;
    const tableBox = (await page.locator('#mock-growi-basic table').boundingBox())!;

    // The toolbar sits above the table rather than floating over its top-right corner,
    // which is the whole reason the two do not fight.
    expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(tableBox.y + 1);
  });

  test('GROWI のテーブル配下でもソートが効く', async ({ page }) => {
    const table = tableIn(page, 'mock-growi-basic');
    await sortButton(table, 'Name').click();

    expect(await columnOf(table, 0)).toEqual(['Anaconda', 'Capybara', 'Giraffe', 'Meerkat', 'Zebra']);
  });

  test('横に長い表でも編集ボタンが押せる', async ({ page }) => {
    /*
     * The plugin only creates a horizontal scroll container when a column is pinned. Left
     * alone, a wide table overflows exactly as GROWI renders it today and the edit button
     * keeps its place — if that ever changes, the button scrolls away with the content.
     */
    await expect(page.locator('#mock-growi-wide .grt-scroll')).toHaveCSS('overflow-x', 'visible');
    await expect(editButton(page, 'mock-growi-wide')).toBeVisible();
  });
});
