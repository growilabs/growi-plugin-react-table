/**
 * Which of the toolbar's optional pieces are showing.
 *
 * Kept out of the TanStack table state: these are about what the reader can see, not
 * about the rows. They live in EnhancedTable so the filter row (rendered inside `<thead>`)
 * and the toolbar can agree on them.
 */
export type ToolbarUiState = {
  search: boolean;
  filters: boolean;
  rowSelection: boolean;
  rowPinning: boolean;
};

export const INITIAL_TOOLBAR_UI: ToolbarUiState = {
  search: false,
  filters: false,
  rowSelection: false,
  rowPinning: false,
};
