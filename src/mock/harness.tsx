/*
 * Mock harness that drives the plugin the way GROWI does.
 *
 * growi-plugin-datatables' mocks import the wrapper directly. That skips the part of the
 * lifecycle that is most likely to break here: the plugin module is evaluated *before*
 * `growiFacade.react` exists (GROWI emits it as a <script type="module"> in <head>,
 * while `registerGrowiFacade` runs later from GrowiPluginsActivator's effect).
 *
 * So this harness reproduces the real order:
 *
 *   1. evaluate client-entry.tsx        — registers window.pluginActivators
 *   2. publish window.growiFacade       — including GROWI's React instance
 *   3. call activate()                  — the plugin hooks the options generators
 *   4. render through the returned options
 *
 * Files under src/mock are excluded from the React redirect in
 * vite/growi-react-resolver.ts, so the `react` imported here is the genuine module —
 * this file plays GROWI's part and hands that instance to the plugin.
 */
import '../../client-entry';

import type { ReactElement } from 'react';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import rehypeParse from 'rehype-parse';
import rehypeReact from 'rehype-react';
import { type Plugin, unified } from 'unified';
import { PLUGIN_NAME } from '../../client-entry';
import type { GrowiFacade, PluginActivator, RendererOptions, TableComponent } from '../types';

type MockWindow = typeof globalThis & {
  growiFacade?: GrowiFacade;
  pluginActivators?: Record<string, PluginActivator>;
};

const mockWindow = globalThis as MockWindow;

export type MockRendererKind = 'view' | 'preview';

type SetupOptions = {
  /** Stands in for GROWI's `components.table`. Leave unset to mimic the preview renderer. */
  tableComponent?: TableComponent;
};

let activated = false;

const install = ({ tableComponent }: SetupOptions): void => {
  if (activated) {
    return;
  }

  const baseOptions = (): RendererOptions => ({
    rehypePlugins: [],
    components: tableComponent == null ? {} : { table: tableComponent },
  });

  mockWindow.growiFacade = {
    react: React,
    markdownRenderer: {
      optionsGenerators: {
        generateViewOptions: baseOptions,
        generatePreviewOptions: baseOptions,
      },
    },
  };

  const activator = mockWindow.pluginActivators?.[PLUGIN_NAME];
  if (activator == null) {
    throw new Error(`${PLUGIN_NAME}: the plugin did not register a pluginActivator`);
  }
  activator.activate();
  activated = true;
};

const optionsFor = (kind: MockRendererKind): RendererOptions => {
  const generators = mockWindow.growiFacade?.markdownRenderer?.optionsGenerators;
  const generate = kind === 'view' ? generators?.customGenerateViewOptions : generators?.customGeneratePreviewOptions;
  if (generate == null) {
    throw new Error(`${PLUGIN_NAME}: the plugin did not install a custom options generator for "${kind}"`);
  }
  return generate();
};

/**
 * Renders an HTML fragment through the plugin-modified renderer options and mounts it.
 *
 * The fragment stands in for the HTML that GROWI's remark/rehype pipeline produces from
 * markdown; going through rehype-parse keeps the component boundary identical.
 */
export const renderWithPlugin = (target: HTMLElement | string, html: string, setup: SetupOptions & { kind?: MockRendererKind } = {}): void => {
  install(setup);

  const options = optionsFor(setup.kind ?? 'view');

  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(options.rehypePlugins as Plugin[])
    .use(rehypeReact, {
      Fragment: jsxRuntime.Fragment,
      jsx: jsxRuntime.jsx,
      jsxs: jsxRuntime.jsxs,
      // react-markdown hands `node` to components; GROWI's table component reads it.
      passNode: true,
      components: options.components,
    });

  const element = processor.processSync(html).result as ReactElement;

  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (container == null) {
    throw new Error(`${PLUGIN_NAME}: mount target not found: ${String(target)}`);
  }

  createRoot(container).render(element);
};

/** The React instance the harness published on the facade. Used by the bridge coverage test. */
export const hostReact = React;
