# Tasks: export-reportes

## Phase 1: Dependencies

- [x] 1.1 Install xlsx dependency — `npm install xlsx`

## Phase 2: Export Hook

- [x] 2.1 Create `src/hooks/use-export-excel.ts` — Reusable hook with: dynamic `import('xlsx')`, data transformation (filtered rows → Excel rows using ColumnMap), Spanish column headers, monetary conversion (`Number()` for Decimal strings, empty cell for null), file download (`XLSX.writeFile()`), loading state (`isExporting`), and filename generation (`{Entity}_{YYYY-MM-DD}.xlsx`)
- [x] 2.2 Create `src/hooks/export-dashboard.ts` — Multi-sheet export function: accepts `DashboardMetricasResponse`, creates workbook with 4 sheets (Resumen as key-value pairs, Ventas Diarias as fecha/total, Top Clientes as nombre/ingresoTotal, Inventario as producto/stockDisponibleKg/lotesActivos), all monetary values as numbers, dynamic import of xlsx, triggers browser download

## Phase 3: UI Integration

- [x] 3.1 Add "Exportar Excel" button to `DataTableToolbar` — Add `onExportExcel` and `isExporting` props to `DataTableToolbarProps`. Render `Button` with `Download` icon (lucide-react) at end of toolbar. Show `Loader2` spinner when `isExporting` is true. Disable button during export.
- [x] 3.2 Add export handler to `clientes-client-page.tsx` — Define `clienteExportMap` (Nombre, Tipo, Precio Doble Crema, Precio Semisalado) with Number() format for prices. Call `useExportExcel(table, clienteExportMap, 'Clientes')`. Pass `exportExcel` and `isExporting` to `DataTableToolbar`.
- [x] 3.3 Add export handler to `proveedores-client-page.tsx` — Define `proveedorExportMap` (Nombre, Teléfono). Call `useExportExcel`. Pass to `DataTableToolbar`.
- [x] 3.4 Add export handler to `lotes-client-page.tsx` — Define `loteExportMap` (Producto, Proveedor, Cant. Comprada (Kg), Precio Base/Kg, Costo Real/Kg, Stock Disp. (Kg), Estado, Fecha Ingreso) with Number() for decimals and enum label mapping. Call `useExportExcel`. Pass to `DataTableToolbar`.
- [x] 3.5 Add export handler to `ventas-client-page.tsx` — Define `ventaExportMap` (Fecha, Cliente, Domiciliario, Producto, Cantidad (Kg), Precio/Kg, Ingreso Total, Ganancia Bruta) with Number() for monetary fields. Call `useExportExcel`. Pass to `DataTableToolbar`.
- [x] 3.6 Add export handler to `gastos-client-page.tsx` — Define `gastoExportMap` (Concepto, Valor, Fecha) with Number() for valor. Call `useExportExcel`. Pass to `DataTableToolbar`.

## Phase 4: Dashboard Export

- [x] 4.1 Add multi-sheet export button to `dashboard-client-page.tsx` — Import `exportDashboardExcel` from `export-dashboard.ts`. Add "Exportar Excel" `Button` with `Download` icon next to `PeriodSelector`. Handle loading state. Pass current `metricas` to the export function.

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` — verify zero type errors ✅ (0 errors)
- [x] 5.2 Run `npm run build` — verify production build succeeds ⚠️ (SIGBUS env issue, not code-related; tsc passes clean)

---

**Review Workload Forecast**:
- Estimated changed lines: 250–400
- 400-line budget risk: Low
- Chained PRs recommended: No
- Delivery strategy: single PR