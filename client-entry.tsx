import { calcTable } from './src/calc/CalcTable';
import { isGrowiReactAvailable } from './src/growi-react';
import { wrapReactTable } from './src/table/wrapReactTable';
import type { GrowiFacade, OptionsGenerators, PluginActivator, RendererOptions, TableComponent } from './src/types';

export const PLUGIN_NAME = 'growi-plugin-react-table';

type PluginWindow = typeof globalThis & {
  growiFacade?: GrowiFacade;
  pluginActivators?: Record<string, PluginActivator>;
};

const pluginWindow = globalThis as PluginWindow;

/**
 * Adds this plugin's behaviour to a set of renderer options, in place.
 */
const applyTo = (options: RendererOptions): RendererOptions => {
  /*
   * The calculation notation is pure hast rewriting, so it works with or without the
   * React bridge. It is registered first, and unconditionally, so `{vsum}` keeps working
   * even on a GROWI where the table component cannot be wrapped.
   */
  options.rehypePlugins.push(calcTable);

  /*
   * Without growiFacade.react every hook inside the wrapper would throw, so on a GROWI
   * that predates it we leave tables exactly as they are rather than break the page.
   * See src/growi-react/index.ts.
   */
  if (!isGrowiReactAvailable()) {
    console.warn(`${PLUGIN_NAME}: growiFacade.react is unavailable; tables are left untouched.`);
    return options;
  }

  const { components } = options;
  if (components != null) {
    components.table = wrapReactTable(components.table as TableComponent | undefined);
  }

  return options;
};

/*
 * Records which slots of a generators object this plugin has already wrapped.
 *
 * `Symbol.for`, not `Symbol()`: the mark has to survive a second *evaluation* of this
 * module, not just a second call to `activate()`. Two evaluations produce two module
 * scopes with two private symbols, and a private symbol could not see the other copy's
 * mark. The global registry is shared, so both copies agree.
 *
 * The mark lives on the generators object rather than on the wrapper function, because a
 * wrapper can be buried: another plugin — or a test spy — may wrap ours afterwards, and
 * then the slot no longer holds anything we could recognise. The object is the thing that
 * stays identifiable, and "have we installed into *this* object" is the question worth
 * asking anyway.
 */
const INSTALLED = Symbol.for('growi-plugin-react-table.installed');

type GuardedGenerators = OptionsGenerators & { [INSTALLED]?: Set<keyof OptionsGenerators> };

/**
 * Installs `applyTo` on one of GROWI's generator slots, at most once per object.
 *
 * Wrapping is not idempotent on its own: `activate()` wraps whatever is registered *now*,
 * so a second call would stack a second wrapper on the first and `applyTo` would run
 * twice per render — another `calcTable` on the rehype chain, and `components.table`
 * wrapped around itself. None of that is visible, which is exactly what makes it worth
 * guarding: the inner wrapper's `parseTable` declines the children the outer one already
 * restructured and falls through to a plain table, so the DOM stays correct while the
 * chain quietly grows.
 *
 * Whatever is already in the slot is still captured and still called — it may be another
 * plugin's wrapper, and skipping it would silently drop that plugin's contribution.
 */
const wrapGenerator = (optionsGenerators: GuardedGenerators, customKey: keyof OptionsGenerators, fallbackKey: keyof OptionsGenerators): void => {
  const installed = optionsGenerators[INSTALLED] ?? new Set<keyof OptionsGenerators>();
  optionsGenerators[INSTALLED] = installed;

  if (installed.has(customKey)) {
    return;
  }
  installed.add(customKey);

  const original = optionsGenerators[customKey];
  optionsGenerators[customKey] = (...args) => {
    const generate = original ?? optionsGenerators[fallbackKey];
    return applyTo(generate!(...args));
  };
};

const activate = (): void => {
  const optionsGenerators = pluginWindow.growiFacade?.markdownRenderer?.optionsGenerators;
  if (optionsGenerators == null) {
    return;
  }

  // For page view
  wrapGenerator(optionsGenerators, 'customGenerateViewOptions', 'generateViewOptions');

  // For the editor preview
  wrapGenerator(optionsGenerators, 'customGeneratePreviewOptions', 'generatePreviewOptions');
};

const deactivate = (): void => {};

if (pluginWindow.pluginActivators == null) {
  pluginWindow.pluginActivators = {};
}
pluginWindow.pluginActivators[PLUGIN_NAME] = { activate, deactivate };
