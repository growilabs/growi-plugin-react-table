import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, STORAGE_STATE } from './e2e/config.ts';

/**
 * Tests against a real GROWI (see e2e/docker-compose.yaml).
 *
 * These are kept apart from the mock-page suite (playwright.config.ts) because they need
 * a container stack and take a minute or two to come up. `pnpm test` stays fast; this is
 * what CI and a deliberate local run use.
 *
 * The stack is not started here on purpose: docker is not available inside the
 * devcontainer, so bringing it up is always an explicit step (`pnpm e2e:up`).
 */
export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-e2e' }]] : [['list']],

  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'guest',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.guest\.spec\.ts/,
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      testIgnore: /.*\.guest\.spec\.ts/,
    },
  ],
});
