# Exploration: export-reportes

## Current State Analysis

### What Exists

**5 entity list pages**, each with a client-side component managing its own state:

| Page | Route | Component | PeriodSelector | Filters | ShowDeleted |
|------|-------|-----------|---------------|---------|-------------|
| Clientes | `/clientes` | `ClientesClientPage` | No | Tipo (MAYORISTA/MINORISTA) | Yes |
| Proveedores | `/proveedores` | `ProveedoresClientPage` | No | None | Yes |
| Lotes | `/lotes` | `LotesClientPage` | No | Producto, Estado, Proveedor | Yes |
| Ventas | `/ventas` | `VentasClientPage` | Yes (month/year) | Cliente, Producto | No |
| Gastos | `/gastos` | `GastosClientPage` | Yes (month/year) | None (search only) | Yes |

**1 Dashboard page** (`DashboardClientPage`) with:
- 10 MetricCards (financial + operational)
- Revenue composition bar chart
- Daily sales area chart
- Top 5 clients bar chart
- Inventory donut chart
- Client type donut chart
- Inventory by product table
- Top clients table

### Data Architecture

- **All monetary values** use Prisma `Decimal` → serialized as `string` in DTOs
- **Server Actions** are the data-fetching layer; all return `{ success, data[], error? }`
- **Soft delete**: entities have `deletedAt: string | null`; `showDeleted` toggle fetches via separate action (`get*IncludeDeleted`)
- **Period filtering**: Ventas and Gastos fetch by `month/year`; Dashboard fetches metricas by `month/year`
- **`month === -1`** means "Todos" (all dates, no filter)
- **Client-side filtering**: `DataTableToolbar` uses TanStack Table's `globalFilterFn: 'includesString'` for search and column-level `filterFn` for dropdowns

### What's Missing

- No export libraries in `package.json` (no xlsx, exceljs, jspdf, etc.)
- No export button or UI affordance anywhere in the codebase
- No server-side route handlers for file generation
- No API routes at all — everything is Server Actions

---

## Data Shape per Entity (from DTOs + Column Definitions)

### Clientes — `ClienteResponse`
| Field | Column Header | Type | Notes |
|-------|--------------|------|-------|
| nombre | Nombre | string | |
| tipo | Tipo | TipoCliente enum | MAYORISTA/MINORISTA |
| precioDobleCrema | Precio Doble Crema | string (Decimal) | null → "—" |
| precioSemisalado | Precio Semisalado | string (Decimal) | null → "—" |

### Proveedores — `ProveedorResponse`
| Field | Column Header | Type | Notes |
|-------|--------------|------|-------|
| nombre | Nombre | string | |
| telefono | Teléfono | string | null → "—" |

### Lotes — `LoteResponse`
| Field | Column Header | Type | Notes |
|-------|--------------|------|-------|
| producto | Producto | TipoProducto enum | Display: Doble Crema/Semisalado |
| proveedorId → proveedorNombre | Proveedor | string (resolved via Map) | FK resolved client-side |
| cantidadCompradaKg | Cant. Comprada (Kg) | string (Decimal) | |
| precioCompraBaseKg | Precio Base/Kg | string (Decimal) | |
| costoRealCalculadoKg | Costo Real/Kg | string (Decimal) | |
| stockDisponibleKg | Stock Disp. (Kg) | string (Decimal) | |
| estado | Estado | EstadoLote enum | ACTIVO/AGOTADO |
| fechaIngreso | *(not shown in columns)* | string (ISO date) | Available in DTO |

### Ventas — `VentaResponse` (+ enriched `producto`)
| Field | Column Header | Type | Notes |
|-------|--------------|------|-------|
| fecha | Fecha | string (ISO date) | Display: es-AR locale |
| clienteId → clienteNombre | Cliente | string (resolved via Map) | FK resolved client-side |
| domiciliario | Domiciliario | string | |
| producto | Producto | TipoProducto enum | Enriched from loteId |
| cantidadVendidaKg | Cantidad (Kg) | string (Decimal) | |
| precioVentaKg | Precio/Kg | string (Decimal) | |
| ingresoTotal | Ingreso Total | string (Decimal) | |
| gananciaBruta | Ganancia Bruta | string (Decimal) | Color-coded in UI |

### Gastos — `GastoResponse`
| Field | Column Header | Type | Notes |
|-------|--------------|------|-------|
| concepto | Concepto | string | |
| valor | Valor | string (Decimal) | |
| fecha | Fecha | string (ISO date) | Display: es-AR locale |

### Dashboard — `DashboardMetricasResponse`
- **Periodo**: ingresoTotal, costoMercancia, gananciaBruta, gastosFijos, gananciaNeta, ventasCount, clientesActivos, kgVendidos, margenBrutoPct, margenNetoPct
- **Inventario**: product, stockDisponibleKg, lotesActivos (per product)
- **TopClientes**: nombre, ingresoTotal
- **VentasDiarias**: fecha, total
- **IngresosPorTipoCliente**: tipo, total

---

## Export Format Comparison

| Criterion | Excel (.xlsx) | CSV | PDF |
|-----------|--------------|------|-----|
| **Library size (client)** | xlsx ~900KB | None (native) | jspdf + jspdf-autotable ~500KB |
| **Library size (server)** | exceljs ~2MB | None (native) | pdfkit ~1.5MB |
| **Implementation complexity** | Medium | Low | High |
| **Formatting support** | Full (colors, borders, formulas) | None | Full |
| **Monetary value formatting** | Native number format | String | Must render manually |
| **Spanish locale headers** | Yes | Yes | Yes |
| **User expectation (backoffice)** | High — standard for business | Medium — quick & dirty | Low-medium — for printing |
| **Multi-sheet support** | Yes | No | N/A |
| **Risk for small datasets** | None | None | Layout complexity |

### Recommendation: **Excel-only (xlsx) for V1**

Reasons:
1. This is a business backoffice — Excel is the universal language for data sharing with accountants
2. Single library addition (`xlsx`), client-side, no server route needed
3. CSV is too primitive for monetary formatting and Spanish locale
4. PDF is complex, rarely needed, and can be deferred to V2
5. xlsx supports multiple sheets (e.g., one Dashboard export could have separate sheets for metrics vs. daily data)

---

## Export Approach Comparison

### Client-Side Export (from current table state)

**How it works**: The React Table instance already holds filtered/sorted data. We extract rows from `table.getFilteredRowModel().rows` and generate an xlsx file in the browser.

**Pros**:
- Respects current filters and search automatically (what you see is what you export)
- Respects period selection (Ventas/Gastos data is already filtered by month/year)
- No new server actions needed
- Instant — no network round-trip
- Works offline after initial page load
- Simpler implementation (no new API routes)

**Cons**:
- Only exports data currently loaded in the browser
- For Ventas/Gastos, this is already period-filtered, which is fine
- Large datasets would already be performance issues in the table itself

### Server-Side Export (new Server Action / API route)

**How it works**: New server action that queries the DB with the same filters, generates file, returns download URL or blob.

**Pros**:
- Can export ALL data regardless of pagination
- Can generate files without rendering the page first

**Cons**:
- Must duplicate all filter logic server-side (month/year, showDeleted, search)
- Need file serving mechanism (streaming or temp files)
- More complex implementation
- Adds server dependencies (exceljs or similar)
- Currently all data fits in client anyway (SQLite, small business)

### Recommendation: **Client-side for V1**

The dataset is small (SQLite backoffice for a single cheese distributor). The entire Ventas/Gastos dataset for a month easily fits in browser memory. Client-side export from TanStack Table's filtered row model is the simplest, most correct approach:

- What the user sees = what they export (no filter drift)
- No new server actions needed
- No file serving infrastructure needed
- Period selector already filters data before rendering

---

## Per-Entity Export Matrix

### 1. Clientes Export

| Aspect | Detail |
|--------|--------|
| **Button location** | In `DataTableToolbar`, next to search/filters |
| **Export columns** | Nombre, Tipo, Precio Doble Crema, Precio Semisalado |
| **Respects filters** | Yes (tipo filter, search, showDeleted) |
| **Respects period** | N/A (no period selector) |
| **Special handling** | Show deleted items if `showDeleted` is active; translate tipo enum to labels |
| **Decimal formatting** | `$X.XXX` es-AR format |

### 2. Proveedores Export

| Aspect | Detail |
|--------|--------|
| **Button location** | In `DataTableToolbar` |
| **Export columns** | Nombre, Teléfono |
| **Respects filters** | Yes (search, showDeleted) |
| **Respects period** | N/A |
| **Special handling** | Show deleted items if `showDeleted` is active |

### 3. Lotes Export

| Aspect | Detail |
|--------|--------|
| **Button location** | In `DataTableToolbar` |
| **Export columns** | Producto, Proveedor, Cant. Comprada (Kg), Precio Base/Kg, Costo Real/Kg, Stock Disp. (Kg), Estado, Fecha Ingreso |
| **Respects filters** | Yes (producto, estado, proveedor filters, search, showDeleted) |
| **Respects period** | N/A |
| **Special handling** | Resolve proveedorId → nombre; translate enums; include fechaIngreso (not in columns but available) |

### 4. Ventas Export

| Aspect | Detail |
|--------|--------|
| **Button location** | In `DataTableToolbar` (after PeriodSelector) |
| **Export columns** | Fecha, Cliente, Domiciliario, Producto, Cantidad (Kg), Precio/Kg, Ingreso Total, Ganancia Bruta |
| **Respects filters** | Yes (cliente, producto filters, search) |
| **Respects period** | **Yes** — exports only data for the selected month/year |
| **Special handling** | Resolve clienteId → nombre; translate producto enum; format money |

### 5. Gastos Export

| Aspect | Detail |
|--------|--------|
| **Button location** | In `DataTableToolbar` |
| **Export columns** | Concepto, Valor, Fecha |
| **Respects filters** | Yes (search, showDeleted) |
| **Respects period** | **Yes** — exports only data for the selected month/year |
| **Special handling** | Include total row in export; show deleted if active |

### 6. Dashboard Export

| Aspect | Detail |
|--------|--------|
| **Button location** | Next to PeriodSelector in header |
| **Export format** | Multi-sheet Excel |
| **Sheet 1: Resumen** | Period metrics (ingresoTotal, costoMercancia, gananciaBruta, gastosFijos, gananciaNeta, margenBrutoPct, margenNetoPct, ventasCount, clientesActivos, kgVendidos) |
| **Sheet 2: Ventas Diarias** | Fecha, Total |
| **Sheet 3: Top Clientes** | Cliente, Ingresos |
| **Sheet 4: Inventario** | Producto, Stock (Kg), Lotes Activos |
| **Respects period** | **Yes** — exports metrics for the selected month/year |
| **Special handling** | Multiple sheets; metric labels in Spanish |

---

## Architecture for Export Feature

### Shared Component: `ExportButton`

A reusable button component that:
1. Receives the `Table` instance from TanStack Table
2. Receives an `exportConfig` defining column headers and formatters
3. Generates an xlsx file from `table.getFilteredRowModel().rows`
4. Triggers browser download with a filename like `ventas_2025-07.xlsx`

### Column Export Mapping

Each list page defines an `exportColumns` config that maps `accessorKey` to:
- Spanish header name
- Value formatter (for Decimals, dates, enums)

This mirrors the column definition pattern already used (`createVentaColumns`, etc.) but focused on export semantics (plain text, no JSX).

### Key Design Decision: Export from Table State

The `useReactTable` instance already holds:
- **Filtered rows** (respects search, column filters)
- **Sorted rows** (respects sort)
- **Original data** (the full DTO objects, not just rendered cells)

We can iterate `table.getFilteredRowModel().rows` and extract `row.original` to get the full DTO data, then format it for export using our export column config.

### What about `showDeleted`?

When `showDeleted` is toggled on, the `data` state in the client page already includes deleted records. So `table.getFilteredRowModel().rows` will include them. No special handling needed — the export respects the current view state.

### What about Ventas' enriched `producto` field?

The `enrichedVentas` array in `VentasClientPage` already includes the `producto` field derived from the lote map. The table data includes this enrichment. We just need to include it in the export config.

### Filename Convention

- `clientes_YYYY-MM-DD.xlsx`
- `proveedores_YYYY-MM-DD.xlsx`
- `lotes_YYYY-MM-DD.xlsx`
- `ventas_MMMM_YYYY.xlsx` (e.g., `ventas_Julio_2025.xlsx` or `ventas_Todos.xlsx`)
- `gastos_MMMM_YYYY.xlsx`
- `dashboard_MMMM_YYYY.xlsx`

---

## Risks and Constraints

| Risk | Mitigation |
|------|-----------|
| **Large datasets** — xlsx library memory usage | SQLite for a small business; typical dataset < 1000 rows per page. Not a realistic concern. |
| **Decimal precision loss** — converting Prisma Decimal strings to numbers | Format as strings in Excel cells; use xlsx `z` format for locale-aware number display, or just export formatted strings. |
| **Filter state not reflected** — if export doesn't use table state | Use `table.getFilteredRowModel().rows` directly; this guarantees filter consistency. |
| **Period selector data not in table** — Ventas/Gastos data is loaded per-period | The table data IS the period-filtered data. No issue. |
| **FK resolution missing in export** — clienteId, proveedorId, loteId are UUIDs | The client pages already resolve these via Maps (clienteMap, proveedorMap). Include resolved names in export. |
| **xlsx bundle size** — ~900KB added to client bundle | Use dynamic import (`import('xlsx')`) so it's code-split and only loaded on button click. |
| **showDeleted toggle requires separate server fetch** | When toggled, data is already re-fetched. The table reflects the current state. Export captures it as-is. |

---

## Estimated Scope

### V1 — Excel Export from List Pages

| Task | Est. |
|------|------|
| Install `xlsx` dependency | 0.5h |
| Create `ExportButton` component with dynamic import | 1h |
| Create `exportColumns` config for each of 5 entities | 2h |
| Create `exportColumns` config for Dashboard (multi-sheet) | 1.5h |
| Integrate `ExportButton` into `DataTableToolbar` (4 pages) | 1h |
| Integrate `ExportButton` into Ventas/Gastos toolbar (2 pages, with period in filename) | 1h |
| Add Dashboard export button | 1h |
| Handle edge cases (empty data, decimal formatting, enum labels) | 1h |
| Testing (unit + e2e) | 2h |
| **Total** | **~11h** |

### V2 — Potential Additions (NOT in scope for V1)
- PDF export (for printing / formal reports)
- Server-side export for very large datasets (API route + streaming)
- Scheduled report generation (email)
- Export with charts as images embedded in Excel
