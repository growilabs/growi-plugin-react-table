import { test as base, expect } from '@playwright/test';

/**
 * Console-error capture, available to every integration spec.
 *
 * A broken React bridge does not blank the page — React unwinds the failing subtree and
 * the rest of the article still renders. So a DOM assertion can pass while hooks are
 * actually throwing. The console is the reliable signal.
 *
 * Only React's own failure modes are matched: a real GROWI logs plenty of unrelated
 * errors (missing Elasticsearch, blocked third-party requests), and failing on those
 * would make the suite useless.
 */
const REACT_FAILURE = /Invalid hook call|Minified React error|Rendered more hooks than during the previous render|Should have a queue/i;

type Fixtures = {
  /** Everything the page logged at error level, plus uncaught exceptions. */
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await use(errors);
  },
});

/** Fails if React itself complained — see REACT_FAILURE for what counts. */
export const expectNoReactFailures = (consoleErrors: string[]): void => {
  expect(consoleErrors.filter((message) => REACT_FAILURE.test(message))).toEqual([]);
};

export { expect };
