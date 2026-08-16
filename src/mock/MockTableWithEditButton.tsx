import type { TableComponent } from '../types';

/**
 * A copy of GROWI's `components.table`
 * (`apps/app/src/client/components/ReactMarkdownComponents/TableWithEditButton.tsx`).
 *
 * The plugin does not wrap a bare `<table>` in production — it wraps this. Anything that
 * goes wrong between the plugin's toolbar and GROWI's edit button is invisible to a mock
 * that renders a plain table, which is why this copy exists.
 *
 * Only the markup matters here; the real component decides whether to show the button
 * from the current user's permissions. `growi.html` carries the matching styles.
 *
 * **Keep this in sync when GROWI's component changes.**
 */
export const MockTableWithEditButton: TableComponent = ({ children, className }) => (
  <div className="editable-with-handsontable">
    <button type="button" className="handsontable-modal-trigger">
      <span className="material-symbols-outlined">edit_square</span>
    </button>
    <table className={className}>{children}</table>
  </div>
);
