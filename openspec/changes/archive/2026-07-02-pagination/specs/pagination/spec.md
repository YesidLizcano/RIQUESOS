# Pagination — Specification

## Functional Requirements

### FR-01: DataTable pagination
The DataTable component SHALL support pagination via TanStack Table's `getPaginationRowModel()`. Page size SHALL default to 20 rows. Users SHALL be able to select page size from {10, 20, 50}. When `pagination` prop is `false`, the table SHALL render all rows without pagination controls.

### FR-02: Pagination controls
Each paginated DataTable SHALL display pagination controls below the table containing: Previous button, Next button, and a page indicator (e.g., "Página 1 de 5"). A page size selector SHALL appear above the table, top-right, with label "Filas por página" and options {10, 20, 50}.

### FR-03: Page size persistence
Selected page size SHALL persist in the browser via URL query parameter `pageSize` (e.g., `?pageSize=20`). When the page loads, DataTable SHALL read `pageSize` from the URL; if absent, default to 20. Changing page size SHALL update the URL parameter without full page reload.

### FR-04: Gastos total
The Gastos page footerRow SHALL display the sum of ALL expense values across the entire dataset, not only the rows visible on the current page.

### FR-05: Dashboard exemption
Dashboard DataTable instances (inventory, top clients, active lots) SHALL NOT display pagination controls. They SHALL render all rows as they do today.

### FR-06: Ventas inline columns
Ventas columns currently defined inline in `ventas/page.tsx` SHALL be extracted to `src/components/columns/venta-columns.tsx` consistent with other entity column files (cliente, proveedor, lote, gasto).

## Non-Functional Requirements

### NFR-01: Client-side only
Pagination SHALL be client-side. No server round-trips SHALL occur when navigating between pages or changing page size.

### NFR-02: Keyboard accessibility
Pagination controls SHALL be keyboard-navigable. Users SHALL be able to Tab to pagination buttons and activate them with Enter or Space.

### NFR-03: Spanish labels
All pagination UI text SHALL be in Spanish: "Página X de Y", "Anterior", "Siguiente", "Filas por página".

## Scenarios

**Scenario 1**: Given a table with 50 rows and pageSize=20, When the page loads, Then rows 1-20 are visible and the indicator shows "Página 1 de 3".

**Scenario 2**: Given a paginated table, When the user clicks "Siguiente", Then the next page of rows is displayed and the page indicator increments.

**Scenario 3**: Given a paginated table on page 1, When the user clicks "Anterior", Then the button is disabled and the page does not change.

**Scenario 4**: Given the Gastos page with 30 expenses, When pageSize=10, Then the footerRow shows the total of all 30 expenses, not just the 10 visible.

**Scenario 5**: Given the Dashboard page, When DataTable renders, Then no pagination controls appear and all rows are visible.

**Scenario 6**: Given a table with URL `?pageSize=50`, When the page loads, Then the page size selector shows 50 selected and 50 rows are displayed per page.