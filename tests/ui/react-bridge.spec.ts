import { expect, test } from '@playwright/test';
import type { BridgeProbes } from '../../src/mock/bridge-probe';

declare global {
  interface Window {
    __growiReactBridge?: BridgeProbes;
  }
}

/*
 * The React bridge is what makes hooks usable inside a GROWI plugin at all
 * (see src/growi-react/index.ts). Everything else in this plugin is built on it, so it
 * gets its own spec rather than being implied by the feature tests.
 */
test.describe('React ブリッジ', () => {
  test('プラグインはホストの React インスタンスを使う', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__growiReactBridge != null);

    // A bundled second copy of React would make every hook throw.
    expect(await page.evaluate(() => window.__growiReactBridge?.usesHostReact())).toBe(true);
  });

  test('ブリッジは React の公開 API を取りこぼさない', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__growiReactBridge != null);

    // Hand-written re-exports drift when React is upgraded; TypeScript cannot see it.
    expect(await page.evaluate(() => window.__growiReactBridge?.missingExports())).toEqual([]);
  });

  test('フックを使うラッパーがコンソールエラー無しで描画される', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/index.html');
    await expect(page.locator('#mock-basic [data-growi-plugin-react-table="active"]')).toBeVisible();

    // "Invalid hook call" leaves a partly rendered page rather than a blank one,
    // so asserting on the DOM alone would not catch it.
    expect(errors).toEqual([]);
  });
});
