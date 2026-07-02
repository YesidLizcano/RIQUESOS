# Design: export-reportes

## Architecture Decisions

### AD-01: xlsx library (SheetJS community edition) with dynamic import

**Choice**: Use `xlsx` (SheetJS) for Excel generation.
**Rationale**: Mature, well-documented, handles `.xlsx` format correctly. Dynamic `import('xlsx')` ensures ~900KB is code-split and only loaded on button click.
**Alternatives considered**: `exceljs` (2MB, server-oriented), native CSV (no formatting support).

### AD-02: Client-side export from TanStack Table filtered rows

**Choice**: Extract data from `table.getFilteredRowModel().rows`, using `row.original` for the full DTO object.
**Rationale**: The table already holds filtered, sorted data. This guarantees "what you see = what you export" without duplicating filter logic.
**Key insight**: When `showDeleted` is toggled, the data state already includes deleted records — no special handling needed.

### AD-03: Reusable `useExportExcel` hook

**Choice**: Create `src/hooks/use-export-excel.ts` — a hook that accepts a `Table<TData>` instance and a column-header map, and returns `{ exportExcel, isExporting }`.
**Rationale**: All 5 entity list pages share the same export pattern (get filtered rows → map to Excel rows → download). The hook encapsulates dynamic import, data transformation, and file download. Each page only provides its column mapping.
**Interface**:
```ts
type ColumnMap<T> = { accessorKey: keyof T; header: string; format?: (value: unknown) => unknown }[];
function useExportExcel<T>(table: Table<T>, columnMap: ColumnMap<T>, filename: string): {
  exportExcel: () => Promise<void>;
  isExporting: boolean;
}
```

### AD-04: Column header mapping per entity

**Choice**: Each entity page defines a `ColumnMap` with `accessorKey` → Spanish `header` + optional `format` function.
**Rationale**: TanStack Table column definitions use JSX renderers (`cell` props). The export hook needs plain value mappings. A separate `ColumnMap` provides clean separation between display and export formatting.
**Key mappings**: Monetary fields use `format: (v) => Number(v)`, enum fields use label maps (e.g., `DOBLE_CREMA` → `"Doble Crema"`), null values become empty cells.

### AD-05: Monetary conversion via `Number()`

**Choice**: Prisma Decimal strings are converted with `Number()` before writing to Excel cells.
**Rationale**: `Number()` correctly handles the string-to-number conversion for Prisma Decimal values. Excel will format them as numbers, enabling formulas and aggregation. Null/undefined monetary values are exported as empty cells (not 0).
**Edge case**: Very large Decimal values could lose precision — but this app deals with cheese pricing (small numbers), so `Number()` is safe.

### AD-06: Dashboard multi-sheet export function

**Choice**: Separate `exportDashboardExcel()` function in `src/hooks/export-dashboard.ts` (not a hook — no table instance needed).
**Rationale**: Dashboard doesn't use TanStack Table for its data. It has `DashboardMetricasResponse` with nested arrays. The function creates a workbook with 4 sheets directly from this data structure.
**Sheets**:
- Resumen: key-value pairs (Métrica, Valor)
- Ventas Diarias: fecha, total (as number)
- Top Clientes: nombre, ingresoTotal (as number)
- Inventario: producto, stockDisponibleKg (as number), lotesActivos

### AD-07: Export button in DataTableToolbar

**Choice**: Add an "Exportar Excel" button with `Download` icon (from lucide-react) to `DataTableToolbar`. Pass `onExport` callback prop. The button shows a `Loader2` spinner while `isExporting` is true.
**Rationale**: DataTableToolbar is already the shared toolbar across all list pages. Adding the export button here means zero per-page layout changes — each page only provides the export handler.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `xlsx` dependency |
| `src/hooks/use-export-excel.ts` | Created | Reusable export hook: dynamic import, data transformation, file download |
| `src/hooks/export-dashboard.ts` | Created | Multi-sheet dashboard export function |
| `src/components/data-table-toolbar.tsx` | Modified | Add "Exportar Excel" button with `Download` icon and loading state |
| `src/app/(dashboard)/clientes/clientes-client-page.tsx` | Modified | Add export handler with cliente column map |
| `src/app/(dashboard)/proveedores/proveedores-client-page.tsx` | Modified | Add export handler with proveedor column map |
| `src/app/(dashboard)/lotes/lotes-client-page.tsx` | Modified | Add export handler with lote column map |
| `src/app/(dashboard)/ventas/ventas-client-page.tsx` | Modified | Add export handler with venta column map |
| `src/app/(dashboard)/gastos/gastos-client-page.tsx` | Modified | Add export handler with gasto column map |
| `src/app/(dashboard)/dashboard-client-page.tsx` | Modified | Add multi-sheet export button |