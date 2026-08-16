import {
  aggregationFn_sum,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * The TanStack Table features this plugin registers.
 *
 * v9 installs state and APIs only for features listed here, so this is both the feature
 * switch and the thing that decides how much of table-core ends up in the bundle. A
 * markdown table inside an article is something people mostly *read*, so the set is
 * chosen to stay useful without turning every table into an application UI.
 */
export const features = tableFeatures({
  /*
   * `alphanumeric` is a natural sort: it splits digit runs out of the string, so
   * "2.4m" < "4.5m" < "10.9m" rather than the lexicographic "10.9m" < "2.4m".
   * That matches what growi-plugin-datatables achieved with its "natural" plugin.
   *
   * The asc -> desc -> unsorted cycle needs no configuration: `enableSortingRemoval`
   * defaults to true, and with an empty sorting state the rows keep their source order.
   */
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  // `basic` is for the columns EnhancedTable stores as numbers; see parseTable's isNumeric.
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },

  /*
   * Two filter functions: substring for free-text columns, exact match for the
   * select-style filters built from faceted values.
   */
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
  },

  globalFilteringFeature,

  /*
   * Faceting drives the per-column filter UI: a column with few distinct values gets a
   * dropdown of those values instead of a text box.
   */
  columnFacetingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),

  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,

  /*
   * Registered, but off for ordinary tables: the initial page size is the whole table.
   * Only tables long enough to be unreadable get split (see EnhancedTable).
   */
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),

  /*
   * Registered but dormant: nothing below shows up until a reader turns it on from the
   * toolbar's "More" menu. A wiki table is read far more often than it is analysed, so
   * checkboxes and grouping controls have to be asked for, not offered by default.
   */
  rowSelectionFeature,
  rowPinningFeature,

  columnGroupingFeature,
  groupedRowModel: createGroupedRowModel(),
  // Grouping produces parent rows, which need expanding to be reachable.
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),

  /*
   * Only `sum`, and only for columns whose cells are all numbers — EnhancedTable detects
   * those and stores their values as numbers. A text column gets no aggregate at all:
   * the group header already shows how many rows it holds.
   */
  rowAggregationFeature,
  aggregationFns: { sum: aggregationFn_sum },
});

export type Features = typeof features;
