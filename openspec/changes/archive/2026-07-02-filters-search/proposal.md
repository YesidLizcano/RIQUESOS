# Proposal: filters-search

## Intent

Add search and filter capabilities to all 5 entity list pages (Clientes, Proveedores, Lotes, Ventas, Gastos) to improve data navigation. Users currently must visually scan entire lists; this change enables instant client-side filtering.

## Scope In

- **Global search Input** per entity — text search on primary fields (nombre, concepto, domiciliario, telefono).
- **Entity-specific Select filters**: Clientes (tipo: MAYORISTA/MINORISTA), Lotes (producto, estado, proveedor), Ventas (cliente, producto).
- **Toolbar component** (`DataTableToolbar`) above DataTable containing search + filters.
- **TanStack Table `getFilteredRowModel()`** for client-side filtering — no backend round-trips.
- **Lotes `findAll()`** repository method to enable AGOTADO filtering (currently `findActive()` only returns ACTIVO).
- **FK resolution maps** (proveedorId → nombre, clienteId → nombre) using data already fetched for creation dialogs.

## Scope Out

- Server-side filtering or new API endpoints (beyond Lotes `findAll()`).
- Column header filters (inline per-column).
- Saved filter presets or advanced search syntax.
- Date range filters (separate change).
- URL param persistence for filter state.
- Venta date-range expansion beyond current month.

## Approach

Client-side filtering with TanStack Table. Each list page composes `<DataTableToolbar>` above `<DataTable>`. Search uses `globalFilterFn` (case-insensitive includes); Select filters use `columnFilters`. AND logic: a row must match ALL active filters. Lotes page switches from `findActive()` to `findAll()` to show both ACTIVO and AGOTADO records.

## Rollback

1. Remove `<DataTableToolbar>` from all list pages.
2. Remove `getFilteredRowModel` and filter state from `DataTable`.
3. Revert Lotes page to `findActive()`.
4. Delete `DataTableToolbar` component and `findAll()` repository method.