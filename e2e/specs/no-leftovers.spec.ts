import type { Page } from '@playwright/test';
import { BASIC_TABLE_PAGE, type Fixture, RICH_CELL_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

/*
 * Nothing accumulates when the same table is rendered over and over.
 *
 * GROWI is a SPA: moving between pages, and switching between view and edit, re-runs the
 * renderer without reloading the document. The plugin hooks that renderer by *replacing*
 * `optionsGenerators.customGenerate*Options` with a wrapper (see client-entry.tsx), and
 * `applyTo` mutates the options it is handed — `rehypePlugins.push(calcTable)` and
 * `components.table = wrapReactTable(components.table)`. Anything that causes those to
 * run more than once per render compounds: a longer rehype chain, a wrapper around a
 * wrapper, and eventually a second toolbar over somebody's table.
 *
 * These tests navigate the way a reader does — clicking, never reloading — because a
 * `page.goto()` resets `window` and would reset exactly the state that leaks.
 *
 * The two layers below are not redundant, and the DOM one is the weaker of them.
 * Double-wrapping is *absorbed*: the inner wrapper's parseTable() declines children the
 * outer one already restructured and falls through to a plain table, so no second toolbar
 * and no nesting ever reach the DOM. Injecting a real leak (see the last test) leaves the
 * DOM perfectly singular. So the DOM tests guard what a reader would notice; only the
 * last test can see the chain itself growing.
 */

/** What a healthy, singular render looks like in the DOM. */
const expectSingleEnhancedTable = async (page: Page) => {
  await expect(page.locator('[data-growi-plugin-react-table="active"]')).toHaveCount(1);
  await expect(page.locator('.grt-toolbar')).toHaveCount(1);
  await expect(page.getByRole('table')).toHaveCount(1);

  /*
   * Cheap insurance rather than a live tripwire: today's wrapper absorbs nesting instead
   * of producing it, but a change to EnhancedTable that rendered the wrapper
   * unconditionally would show up here, and a plain count could not tell — both roots
   * carry the same attribute.
   */
  await expect
    .poll(() =>
      page
        .locator('[data-growi-plugin-react-table="active"]')
        .evaluateAll((roots) => roots.filter((root) => root.querySelector('[data-growi-plugin-react-table="active"]') != null).length),
    )
    .toBe(0);
};

/** GROWI emits these once, from retrieveAllPluginResourceEntries(). SPA nav must not re-add them. */
const expectSingleAssetTags = async (page: Page) => {
  await expect(page.locator('head script[src*="growi-plugin-react-table"]')).toHaveCount(1);
  await expect(page.locator('head link[rel="stylesheet"][href*="growi-plugin-react-table"]')).toHaveCount(1);
};

/*
 * Navigation is by clicking the page tree, so the label has to match the fixture. Derive
 * it from the path rather than repeating the string, or renaming a fixture in pages.ts
 * would leave this spec silently clicking nothing.
 */
const sidebarLink = (page: Page, fixture: Fixture) => page.getByRole('tree').getByRole('link', { name: fixture.path.split('/').pop()!, exact: true });

test.describe('繰り返しレンダリングしても残骸が出ない', () => {
  test('ページ間を SPA 遷移で往復しても二重にならない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expectSingleEnhancedTable(page);

    for (let round = 0; round < 3; round++) {
      await sidebarLink(page, RICH_CELL_PAGE).click();
      await expect(page.getByRole('heading', { name: 'Rich cells' })).toBeVisible();
      await expectSingleEnhancedTable(page);

      await sidebarLink(page, BASIC_TABLE_PAGE).click();
      await expect(page.getByRole('heading', { name: 'Basic table' })).toBeVisible();
      await expectSingleEnhancedTable(page);
    }

    await expectSingleAssetTags(page);

    // Still a working table, not just a singular one.
    const nameHeader = page.locator('thead th', { hasText: 'Name' }).first();
    await nameHeader.getByRole('button').click();
    await expect(page.locator('table tbody tr td:first-child').first()).toHaveText('Anaconda');

    expectNoReactFailures(consoleErrors);
  });

  test('ビューと編集を往復しても二重にならない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expectSingleEnhancedTable(page);

    for (let round = 0; round < 3; round++) {
      await page.getByRole('button', { name: 'edit_square Edit' }).click();

      /*
       * Edit mode legitimately holds two roots: GROWI keeps the view mounted but hidden
       * and adds the editor preview. Counting is only meaningful back in view mode, so
       * this just waits for the preview to prove the switch happened.
       */
      await expect(page.locator('.page-editor-preview-container [data-growi-plugin-react-table="active"]')).toBeVisible();

      await page.getByRole('button', { name: 'play_arrow View' }).click();
      await expect(page.locator('.page-editor-preview-container')).toBeHidden();

      await expectSingleEnhancedTable(page);
    }

    await expectSingleAssetTags(page);
    expectNoReactFailures(consoleErrors);
  });

  test('レンダラに登録されるフックは遷移とモード変更で増えない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    /*
     * `applyTo` pushes onto `options.rehypePlugins` in place. That is safe only because
     * GROWI hands it a fresh options object; if it ever memoized one, every render would
     * add another `calcTable` to the same array. Verified to bite: stubbing the base
     * generator to return a cached object makes this assertion fail with the chain
     * growing 12 → 13 → 14 → 15, while every DOM count above stays clean.
     *
     * Observed passively — the generators take a config this test has no way to build, so
     * it waits for GROWI to call them rather than calling them itself.
     *
     * Both generators the plugin wraps are watched, because they are re-invoked on very
     * different schedules and only measuring showed which:
     *   - view: once per client-side navigation, so page hopping samples it repeatedly
     *   - preview: once per page load. Re-entering edit mode does not re-invoke it, and
     *     neither does typing — GROWI reuses the options object for every preview
     *     re-render. That reuse is exactly why a non-idempotent applyTo would be
     *     dangerous here, and exactly why this path cannot drift on its own.
     *
     * Two deliberate choices about what is asserted:
     *   - the *length* of the chain, not plugin names: the bundle is minified, so
     *     function names are not stable
     *   - that the length is *constant*, not some literal: the baseline moves with GROWI's
     *     own plugin list, and pinning it would turn a version bump into a failure
     *
     * The blind spot: a second `activate()` wraps whatever is currently registered, so it
     * would land outside this spy and read as a stable (higher) number. That costs a
     * one-time +1 rather than per-render growth — real, but not what this test watches.
     */
    await page.evaluate(() => {
      type Options = { rehypePlugins?: unknown[] };
      type Generators = Record<string, ((...args: unknown[]) => Options) | undefined>;
      const spiedWindow = window as unknown as {
        growiFacade: { markdownRenderer: { optionsGenerators: Generators } };
        __rehypeCounts: { view: number[]; preview: number[] };
      };

      const generators = spiedWindow.growiFacade.markdownRenderer.optionsGenerators;
      spiedWindow.__rehypeCounts = { view: [], preview: [] };

      for (const [label, key] of [
        ['view', 'customGenerateViewOptions'],
        ['preview', 'customGeneratePreviewOptions'],
      ] as const) {
        const inner = generators[key];
        if (inner == null) {
          continue;
        }
        generators[key] = (...args: unknown[]) => {
          const options = inner(...args);
          spiedWindow.__rehypeCounts[label].push((options.rehypePlugins ?? []).length);
          return options;
        };
      }
    });

    for (let round = 0; round < 3; round++) {
      await sidebarLink(page, RICH_CELL_PAGE).click();
      await expect(page.getByRole('heading', { name: 'Rich cells' })).toBeVisible();

      await sidebarLink(page, BASIC_TABLE_PAGE).click();
      await expect(page.getByRole('heading', { name: 'Basic table' })).toBeVisible();
    }

    // Bring the preview generator into play as well.
    await page.getByRole('button', { name: 'edit_square Edit' }).click();
    await expect(page.locator('.page-editor-preview-container [data-growi-plugin-react-table="active"]')).toBeVisible();
    await page.getByRole('button', { name: 'play_arrow View' }).click();
    await expect(page.locator('.page-editor-preview-container')).toBeHidden();

    const counts = await page.evaluate(() => (window as unknown as { __rehypeCounts: { view: number[]; preview: number[] } }).__rehypeCounts);

    // Both wrapped generators must have actually run, or this test asserts nothing.
    expect(counts.view.length, 'the view generator was never re-invoked — the spy proved nothing').toBeGreaterThan(1);
    expect(counts.preview.length, 'the preview generator never ran — edit mode did not exercise it').toBeGreaterThan(0);

    for (const [label, samples] of Object.entries(counts)) {
      expect(new Set(samples).size, `the ${label} rehype chain grew: ${samples.join(' → ')}`).toBe(1);
    }

    expectNoReactFailures(consoleErrors);
  });
});
