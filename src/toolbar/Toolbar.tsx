import { useEffect, useRef } from 'react';
import type { PluginTable } from '../table/tableTypes';
import { ColumnsMenu } from './ColumnsMenu';
import { ExportMenu } from './ExportMenu';
import { CloseIcon, FilterIcon, SearchIcon, SortResetIcon } from './icons';
import { MoreMenu } from './MoreMenu';
import type { ToolbarUiState } from './toolbarState';

type Props = {
  table: PluginTable;
  ui: ToolbarUiState;
  onUiChange: (next: ToolbarUiState) => void;
  /** Header labels by column id, for menus that have to name a column. */
  labels: Map<string, string>;
};

/**
 * The controls above the table.
 *
 * A table in a wiki article is mostly read, so the resting state has to look close to a
 * plain table: one compact row of icon buttons, and nothing expanded until asked.
 * growi-plugin-datatables arrived at the same shape after finding that a permanent
 * search box and row counter crowd the prose around the table.
 *
 * Closing a control clears what it was filtering by. A filter you cannot see is a table
 * that is silently hiding rows, which is much worse than having to re-type a query.
 */
export const Toolbar = ({ table, ui, onUiChange, labels }: Props) => {
  const searchInput = useRef<HTMLInputElement>(null);

  const globalFilter = (table.state.globalFilter as string | undefined) ?? '';
  const isSorted = (table.state.sorting?.length ?? 0) > 0;
  const isFiltered = (table.state.columnFilters?.length ?? 0) > 0;

  useEffect(() => {
    if (ui.search) {
      searchInput.current?.focus();
    }
  }, [ui.search]);

  const toggleSearch = () => {
    if (ui.search) {
      table.setGlobalFilter('');
    }
    onUiChange({ ...ui, search: !ui.search });
  };

  const toggleFilters = () => {
    if (ui.filters) {
      table.resetColumnFilters();
    }
    onUiChange({ ...ui, filters: !ui.filters });
  };

  return (
    <div className="grt-toolbar" role="toolbar" aria-label="Table controls">
      <button
        type="button"
        className={`grt-toolbar__button${ui.search ? ' grt-toolbar__button--active' : ''}`}
        onClick={toggleSearch}
        aria-expanded={ui.search}
        aria-label={ui.search ? 'Close search' : 'Search'}
        title={ui.search ? 'Close search' : 'Search'}
      >
        {ui.search ? <CloseIcon /> : <SearchIcon />}
      </button>

      {ui.search && (
        <input
          ref={searchInput}
          type="search"
          className="grt-search"
          value={globalFilter}
          placeholder="Search this table"
          aria-label="Search this table"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              toggleSearch();
            }
          }}
        />
      )}

      <button
        type="button"
        className={`grt-toolbar__button${ui.filters ? ' grt-toolbar__button--active' : ''}`}
        onClick={toggleFilters}
        aria-expanded={ui.filters}
        aria-label={ui.filters ? 'Close column filters' : 'Column filters'}
        title={ui.filters ? 'Close column filters' : 'Column filters'}
      >
        <FilterIcon />
      </button>

      <ColumnsMenu table={table} labels={labels} />
      <MoreMenu table={table} ui={ui} onUiChange={onUiChange} labels={labels} />
      <ExportMenu table={table} labels={labels} />

      {/* Only worth offering once there is something to undo. */}
      {isSorted && (
        <button type="button" className="grt-toolbar__button" onClick={() => table.resetSorting()} aria-label="Reset sorting" title="Reset sorting">
          <SortResetIcon />
        </button>
      )}

      {isFiltered && !ui.filters && (
        /*
         * Filters can stay applied while the filter row is collapsed. Saying so — and
         * offering the way out — is what keeps hidden rows from looking like missing data.
         */
        <span className="grt-toolbar__note">
          filtered
          <button type="button" className="grt-toolbar__link" onClick={() => table.resetColumnFilters()}>
            clear
          </button>
        </span>
      )}
    </div>
  );
};
