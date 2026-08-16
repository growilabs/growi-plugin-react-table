import { calcTable } from './src/calc/CalcTable';
import { isGrowiReactAvailable } from './src/growi-react';
import { wrapReactTable } from './src/table/wrapReactTable';
import type { GrowiFacade, PluginActivator, RendererOptions, TableComponent } from './src/types';

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

const activate = (): void => {
  const optionsGenerators = pluginWindow.growiFacade?.markdownRenderer?.optionsGenerators;
  if (optionsGenerators == null) {
    return;
  }

  // For page view
  const originalCustomGenerateViewOptions = optionsGenerators.customGenerateViewOptions;
  optionsGenerators.customGenerateViewOptions = (...args) => {
    const generate = originalCustomGenerateViewOptions ?? optionsGenerators.generateViewOptions;
    return applyTo(generate!(...args));
  };

  // For the editor preview
  const originalCustomGeneratePreviewOptions = optionsGenerators.customGeneratePreviewOptions;
  optionsGenerators.customGeneratePreviewOptions = (...args) => {
    const generate = originalCustomGeneratePreviewOptions ?? optionsGenerators.generatePreviewOptions;
    return applyTo(generate!(...args));
  };
};

const deactivate = (): void => {};

if (pluginWindow.pluginActivators == null) {
  pluginWindow.pluginActivators = {};
}
pluginWindow.pluginActivators[PLUGIN_NAME] = { activate, deactivate };
