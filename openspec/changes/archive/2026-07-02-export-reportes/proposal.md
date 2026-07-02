# Proposal: export-reportes

## Intent

Add Excel (.xlsx) export capability to all entity list pages (Clientes, Proveedores, Lotes, Ventas, Gastos) and the Dashboard, enabling business data analysis and sharing with accountants and stakeholders.

## Scope In

- Install `xlsx` library (SheetJS community edition) with dynamic import to avoid ~900KB initial bundle impact
- "Exportar Excel" button on each entity list page, placed in `DataTableToolbar`
- "Exportar Excel" button on Dashboard page (multi-sheet: Resumen, Ventas Diarias, Top Clientes, Inventario)
- Export respects all current filters: search text, column select filters, period selection (Ventas/Gastos), and showDeleted toggle — what you see is what you export
- Spanish column headers matching UI labels (Nombre, Tipo, Precio Doble Crema, etc.)
- Monetary values (Prisma Decimal strings) converted to numbers in Excel cells
- File naming: `{Entity}_{YYYY-MM-DD}.xlsx` (e.g., `Clientes_2026-07-02.xlsx`), period-aware for Ventas/Gastos

## Scope Out

- PDF export (separate change)
- CSV export
- Print view
- Scheduled or email-delivered exports
- Server-side export endpoints
- Chart image embedding

## Approach

Client-side export using `xlsx` with dynamic `import()`. Data comes from TanStack Table's `getFilteredRowModel().rows`, which already holds the filtered, sorted data the user sees. Each list page provides a column-header mapping; the hook transforms `row.original` data and triggers a browser download. Dashboard uses a separate multi-sheet function that creates 4 sheets from dashboard metrics data.

## Rollback

- Remove `xlsx` from `package.json`
- Remove export buttons from `DataTableToolbar` and all client pages
- Remove `use-export-excel.ts` and `export-dashboard.ts` hooks
- No database or server-side changes to undo