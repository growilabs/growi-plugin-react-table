import { useTable } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Pagination } from '../footer/Pagination';
import { TableInfo } from '../footer/TableInfo';
import { FiltersRow } from '../toolbar/FiltersRow';
import { Toolbar } from '../toolbar/Toolbar';
import { INITIAL_TOOLBAR_UI } from '../toolbar/toolbarState';
import type { TableComponent, TableComponentProps } from '../types';
import { BodyRows } from './BodyRows';
import { computeColumnFacets } from './facets';
import { features } from './features';
import { HeaderCell } from './HeaderCell';
import { columnId, type ParsedTable } from './parseTable';
import { pinnedStyleFor } from './pinning';
import type { RowRecord } from './tableTypes';

/**
 * Above this many rows a table stops being readable in one pass, so it gets paginated.
 * Shorter tables show every row, the way a markdown table normally does.
 */
const PAGINATION_THRESHOLD = 200;
const DEFAULT_PAGE_SIZE = 100;

type Props = {
  Table: TableComponent;
  tableProps: Omit<TableComponentProps, 'children'>;
  parsed: ParsedTable;
};

export const EnhancedTable = ({ Table, tableProps, parsed }: Props) => {
  const [ui, setUi] = useState(INITIAL_TOOLBAR_UI);

  /*
   * TanStack Table only ever sees text. The rendered cells stay exactly as GROWI
   * produced them and are looked up by row index below — that is what keeps links, code
   * spans and GROWI's own cell components alive through a sort or a filter.
   */
  const data = useMemo<RowRecord[]>(
    () =>
      parsed.rows.map((row, index) => {
        const record = { __index: index } as RowRecord;
        row.values.forEach((value, column) => {
          /*
           * A column whose every cell is a number is stored as numbers, which buys a true
           * numeric sort and a meaningful total when the table is grouped. Mixed columns
           * ("2.4m") stay text and get the natural sort instead.
           */
          record[columnId(column)] = parsed.headers[column]?.isNumeric && value !== '' ? Number(value) : value;
        });
        return record;
      }),
    [parsed],
  );

  const facets = useMemo(() => computeColumnFacets(parsed), [parsed]);

  const columns = useMemo(
    () =>
      parsed.headers.map((header) => ({
        id: header.id,
        accessorKey: header.id,
        header: header.label,
        sortFn: header.isNumeric ? ('basic' as const) : ('alphanumeric' as const),
        // Text columns get no aggregate: the group header already carries the row count.
        ...(header.isNumeric ? { aggregationFn: 'sum' as const } : {}),
        /*
         * A dropdown offers whole values, so it matches whole values: with substring
         * matching, choosing "draft" would also keep "final draft". Typed filters stay
         * substring searches, which is what typing implies.
         */
        filterFn: facets.has(header.id) ? ('equalsString' as const) : ('includesString' as const),
      })),
    [parsed, facets],
  );

  const initialState = useMemo(
    () => ({
      pagination: {
        pageIndex: 0,
        /*
         * "No pagination" has to be an unreachable page size rather than exactly the row
         * count: grouping adds header rows to the paginated model, and a page sized to the
         * original row count would push the last group's rows onto a second page.
         */
        pageSize: parsed.rows.length > PAGINATION_THRESHOLD ? DEFAULT_PAGE_SIZE : Number.MAX_SAFE_INTEGER,
      },
      /*
       * Grouped rows are expanded from the start. TanStack collapses them by default,
       * which would make choosing "Group by" look like the table had thrown its contents
       * away; expanded, grouping only *adds* the header rows.
       *
       * Set here rather than alongside setGrouping so the two are never applied in the
       * wrong order — and harmless until something is actually grouped.
       */
      expanded: true as const,
    }),
    [parsed],
  );

  const table = useTable({
    features,
    data,
    columns,
    initialState,
    // The toolbar's search box looks across every column.
    globalFilterFn: 'includesString' as const,
    /*
     * Every column cycles ascending -> descending -> unsorted. TanStack starts numeric
     * columns descending by default, which would mean the same click did different things
     * depending on the column — and this plugin documents one cycle, not two.
     */
    sortDescFirst: false,
    columnResizeMode: 'onChange' as const,
  });

  const headersById = useMemo(() => new Map(parsed.headers.map((header) => [header.id, header])), [parsed]);
  const labels = useMemo(() => new Map(parsed.headers.map((header) => [header.id, header.label])), [parsed]);

  const columnSizing = table.state.columnSizing ?? {};
  const hasPinnedColumn = (table.state.columnPinning?.start?.length ?? 0) > 0;
  // One extra column carries both per-row controls, and only while one is switched on.
  const showControls = ui.rowSelection || ui.rowPinning;

  return (
    <div className="growi-plugin-react-table" data-growi-plugin-react-table="active">
      <Toolbar table={table} ui={ui} onUiChange={setUi} labels={labels} />

      {/*
       * The scroll box only appears once a column is pinned.
       *
       * Sticky positioning needs a scroll container to mean anything, so pinning has to
       * create one. But GROWI does not put wide tables in a scroll container today — they
       * overflow and the page scrolls — and switching that on for every table would also
       * drag GROWI's absolutely-positioned "edit this table" button out of view as soon as
       * a reader scrolled sideways. Tying the container to pinning keeps the default
       * layout exactly as GROWI renders it, and only changes it when asked.
       *
       * The toolbar stays outside, so its dropdown panels are never clipped.
       */}
      <div className={hasPinnedColumn ? 'grt-scroll grt-scroll--active' : 'grt-scroll'}>
        <Table {...tableProps}>
          <thead {...parsed.theadProps}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {showControls && <th className="grt-controls" aria-label="Row controls" />}
                {headerGroup.headers.map((header) => {
                  const source = headersById.get(header.column.id);
                  return source == null ? null : (
                    <HeaderCell
                      key={header.id}
                      original={source.element}
                      header={header}
                      label={source.label}
                      width={columnSizing[header.column.id]}
                      pinnedStyle={pinnedStyleFor(header.column)}
                    />
                  );
                })}
              </tr>
            ))}
            {ui.filters && <FiltersRow table={table} facets={facets} labels={labels} leadingCell={showControls} />}
          </thead>
          <tbody {...parsed.tbodyProps}>
            <BodyRows table={table} parsed={parsed} showControls={showControls} selectable={ui.rowSelection} pinnable={ui.rowPinning} />
          </tbody>
        </Table>
      </div>

      <TableInfo table={table} totalRows={parsed.rows.length} />
      <Pagination table={table} />
    </div>
  );
};
