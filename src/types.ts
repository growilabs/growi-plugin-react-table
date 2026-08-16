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

type OptionsGenerator = (...args: unknown[]) => RendererOptions;

export type GrowiFacade = {
  markdownRenderer?: {
    optionsGenerators?: {
      generateViewOptions?: OptionsGenerator;
      customGenerateViewOptions?: OptionsGenerator;
      generatePreviewOptions?: OptionsGenerator;
      customGeneratePreviewOptions?: OptionsGenerator;
    };
  };
  react?: unknown;
};

export type PluginActivator = {
  activate: () => void;
  deactivate: () => void;
};
