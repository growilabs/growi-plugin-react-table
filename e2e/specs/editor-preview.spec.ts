import { BASIC_TABLE_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

/*
 * The editor's preview goes through `generatePreviewOptions`, a different code path from
 * the page view — and one where GROWI leaves `components.table` unset, so the plugin has
 * to supply the table element itself.
 *
 * The round trip matters too. GROWI keeps the view mounted and merely hides it while
 * editing, which is what broke growi-plugin-datatables: it had rehomed the table's DOM
 * node, so React could no longer insert siblings around it.
 */
test.describe('編集モード', () => {
  test('プレビューでも表が描画される', async ({ page, consoleErrors }) => {
    await page.goto(`${BASIC_TABLE_PAGE.path}#edit`);

    const preview = page.locator('[data-growi-plugin-react-table="active"]').first();
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await expect(preview.getByRole('table')).toBeVisible();

    expectNoReactFailures(consoleErrors);
  });

  test('ビューと編集を往復しても壊れない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]').first()).toBeVisible();

    await page.goto(`${BASIC_TABLE_PAGE.path}#edit`);
    await expect(page.locator('[data-growi-plugin-react-table="active"]').first()).toBeVisible({ timeout: 30_000 });

    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]').first()).toBeVisible();

    // Still interactive after the round trip, not just present.
    const nameHeader = page.locator('thead th', { hasText: 'Name' }).first();
    await nameHeader.getByRole('button').click();
    await expect(page.locator('table tbody tr td:first-child').first()).toHaveText('Anaconda');

    expectNoReactFailures(consoleErrors);
  });
});
