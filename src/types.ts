import type { Element } from 'hast';
import type { FunctionComponent, ReactNode } from 'react';

/**
 * Props that GROWI's markdown renderer passes to `components.table`.
 *
 * In the view renderer the component is `TableWithEditButton`, which draws the
 * "edit this table" button and then a plain `<table>` around `children`.
 * The preview renderer leaves `components.table` unset, so the plugin has to be
 * able to stand in for it (see DEFAULT_TABLE in table/wrapReactTable.tsx).
 */
export type TableComponentProps = {
  children?: ReactNode;
  /** hast node for the `<table>`. GROWI uses `node.position` to locate the source lines. */
  node?: Element;
  className?: string;
};

export type TableComponent = FunctionComponent<TableComponentProps>;

/**
 * The parts of GROWI's `RendererOptions` that this plugin touches.
 */
export type RendererOptions = {
  rehypePlugins: unknown[];
  components?: Record<string, unknown>;
};

export type OptionsGenerator = (...args: unknown[]) => RendererOptions;

/**
 * Where GROWI keeps the renderer options builders a plugin may override.
 *
 * The `custom*` slots are the plugin-facing ones: GROWI calls them in preference to its
 * own `generate*` when they are set, which is how a plugin gets a say in the options
 * without GROWI knowing about it.
 */
export type OptionsGenerators = {
  generateViewOptions?: OptionsGenerator;
  customGenerateViewOptions?: OptionsGenerator;
  generatePreviewOptions?: OptionsGenerator;
  customGeneratePreviewOptions?: OptionsGenerator;
};

export type GrowiFacade = {
  markdownRenderer?: {
    optionsGenerators?: OptionsGenerators;
  };
  react?: unknown;
};

export type PluginActivator = {
  activate: () => void;
  deactivate: () => void;
};
