# Spec: export-reportes

## Functional Requirements

### FR-01: List Page Export

Each entity list page (Clientes, Proveedores, Lotes, Ventas, Gastos) SHALL have an "Exportar Excel" button in the `DataTableToolbar`. Clicking the button SHALL download an `.xlsx` file containing the currently visible (filtered) data. The export SHALL use `table.getFilteredRowModel().rows` as the data source, ensuring that search, column select filters, and showDeleted toggle are respected.

### FR-02: Dashboard Export

The Dashboard page SHALL have an "Exportar Excel" button next to the PeriodSelector. The exported file SHALL contain four sheets:
- **Resumen**: period metrics (ingresoTotal, costoMercancia, gananciaBruta, gastosFijos, gananciaNeta, margenBrutoPct, margenNetoPct, ventasCount, clientesActivos, kgVendidos)
- **Ventas Diarias**: fecha, total
- **Top Clientes**: nombre, ingresoTotal
- **Inventario**: producto, stockDisponibleKg, lotesActivos

### FR-03: Filter Respect

The export SHALL respect all current filters applied by the user:
- Global search text filter
- Column-level select filters (Tipo, Producto, Estado, Proveedor, Cliente)
- Period selection (Ventas and Gastos)
- showDeleted toggle

Only data visible in the table SHALL be exported. No additional server round-trip SHALL occur.

### FR-04: Column Headers

Excel column headers SHALL be in Spanish, matching the UI labels exactly. For example: "Nombre" (not "nombre"), "Tipo" (not "tipo"), "Precio Doble Crema" (not "precioDobleCrema"), "Precio/Kg" (not "precioVentaKg").

### FR-05: Monetary Formatting

All monetary values (prices, costs, totals) SHALL be formatted as numbers in Excel cells, not strings. Prisma Decimal values (serialized as strings in DTOs) SHALL be converted to JavaScript `Number()` before writing to cells. Null monetary values SHALL be exported as empty cells.

### FR-06: File Naming

Exported files SHALL be named using the pattern `{Entity}_{YYYY-MM-DD}.xlsx`. Examples:
- `Clientes_2026-07-02.xlsx`
- `Ventas_2026-07-02.xlsx`

For Ventas and Gastos, the file name MAY include the period label.

### FR-07: Dynamic Import

The `xlsx` library SHALL be loaded via dynamic `import()` when the user clicks the export button. A loading state (spinner or disabled button) SHALL be shown while the library loads. The library SHALL NOT be included in the initial bundle.

## Non-Functional Requirements

### NFR-01: Client-Side Only

Export SHALL be entirely client-side. No server round-trip SHALL occur for the export operation itself.

### NFR-02: Performance

Export SHALL complete without noticeable browser lag for datasets up to 10,000 rows.

### NFR-03: Decimal Precision

Monetary values SHALL use proper decimal formatting in Excel. Scientific notation (e.g., `1e3`) SHALL NOT appear in exported cells.

## Scenarios

**Scenario 1: Filtered export**
- Given the user has applied a "Tipo: MAYORISTA" filter on the Clientes page
- When the user clicks "Exportar Excel"
- Then the downloaded file SHALL contain only MAYORISTA clients with Spanish headers

**Scenario 2: Dashboard multi-sheet**
- Given the user is viewing the Dashboard for "Junio 2026"
- When the user clicks "Exportar Excel"
- Then the file SHALL contain 4 sheets with June 2026 data

**Scenario 3: Dynamic import loading**
- Given the xlsx library has not yet been loaded
- When the user clicks "Exportar Excel"
- Then the button SHALL show a loading indicator until the library is ready
- And the download SHALL begin immediately after loading completes