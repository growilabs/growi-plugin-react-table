import { useMemo } from 'react';
import '../styles/ReactTable.css';
import type { TableComponent, TableComponentProps } from '../types';
import { EnhancedTable } from './EnhancedTable';
import { parseTable } from './parseTable';

/**
 * Stand-in for `components.table` when the renderer does not provide one.
 *
 * GROWI's preview renderer never sets `components.table`, so `node` arrives as a prop
 * with nowhere to go — it must not reach the DOM element.
 */
const DEFAULT_TABLE: TableComponent = ({ children, className }) => <table className={className}>{children}</table>;

/**
 * Wraps GROWI's table component so its tables gain TanStack Table behaviour.
 *
 * `Table` stays in the tree rather than being replaced by our own `<table>`. That is what
 * preserves GROWI's "edit this table" button, and it means the plugin never moves a DOM
 * node — the class of bug growi-plugin-datatables had to fight with a React/DOM bridge
 * and a ResizeObserver, because DataTables relocates the table into its own container.
 */
export const wrapReactTable = (Table: TableComponent | undefined): TableComponent => {
  const BaseTable = Table ?? DEFAULT_TABLE;

  const ReactTable = ({ children, ...tableProps }: TableComponentProps) => {
    const parsed = useMemo(() => parseTable(children), [children]);

    /*
     * Not every table is worth enhancing: no header row, ragged rows, or too few rows to
     * order meaningfully. Those render exactly as GROWI rendered them, with no toolbar
     * and no wrapper — a reader should not be able to tell the plugin is installed.
     */
    if (parsed == null) {
      return <BaseTable {...tableProps}>{children}</BaseTable>;
    }

    return <EnhancedTable Table={BaseTable} tableProps={tableProps} parsed={parsed} />;
  };
  ReactTable.displayName = 'GrowiPluginReactTable';

  return ReactTable;
};
