# Pagination — Change Proposal

## Intent

Add client-side pagination to all entity list pages (Lotes, Clientes, Ventas, Gastos, Proveedores) so users can navigate large datasets without scrolling through unbounded tables. Dashboard summary tables remain unpaginated.

## Scope In

- Enable TanStack Table pagination via `getPaginationRowModel()` in `DataTable`
- Add shadcn Pagination component for Previous/Next and page indicator controls
- Add page size selector (10/20/50 rows per page) with default of 20
- Apply pagination to 5 entity list pages
- Dashboard DataTable instances pass `pagination={false}` to stay unpaginated
- Gastos footerRow computes total across ALL records, not just the current page
- Extract Ventas inline columns to `src/components/columns/venta-columns.tsx`
- Spanish labels for pagination UI (Página, Anterior, Siguiente, Filas por página)

## Scope Out

- Server-side pagination (skip/take/count at repository level)
- Cursor-based pagination or infinite scroll
- Search/filter functionality (separate change)
- Data export
- Backend DTO or port changes

## Approach

Client-side pagination using TanStack Table's built-in `getPaginationRowModel()`. All data is still fetched at once via existing Server Actions. DataTable gains an optional `pagination` prop (default: true) controlling whether pagination UI renders. This is the simplest, fastest approach — sufficient for current dataset sizes (<1K records per entity). Clean Architecture boundaries make future server-side migration a targeted, per-entity change.

## Rollback

Remove the `pagination` prop from DataTable, remove the Pagination UI component, and revert to all-rows display. Delete `venta-columns.tsx` and restore inline columns in Ventas page if needed.