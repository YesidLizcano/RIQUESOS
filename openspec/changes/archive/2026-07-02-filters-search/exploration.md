# Exploration: filters-search

## 1. Current State Analysis

### What Exists

- **DataTable** (`src/components/data-table.tsx`): A generic, client-side paginated table using TanStack Table v8.21.3. Supports sorting, pagination with URL-synced `pageSize`, and page size selector. No filtering or search capability exists.
- **5 Column definition files** in `src/components/columns/`: Each defines `ColumnDef` arrays with `accessorKey`-based columns and action buttons (edit/delete). No column-level filter metadata.
- **5 List pages** in `src/app/(dashboard)/`: Server Components that call server actions to fetch ALL records, then pass them to `DataTable`. No search params for filtering.
- **Server Actions** (`src/presentation/actions/`): `getXxx()` functions call `useCase.obtenerTodos()` or `repo.findActive()`, returning all records with no filter parameters.
- **Repository ports** (`src/domain/ports/`): Only `findAll()` / `findActive()` methods. No filter/query methods exist.
- **Prisma repos** (`src/infrastructure/repositories/`): `findMany()` with basic `orderBy` and `where: { estado: ACTIVO }` for Lotes. No dynamic filtering.
- **Domain enums** (`src/domain/enums.ts`): `TipoProducto` (DOBLE_CREMA, SEMISALADO), `TipoCliente` (MAYORISTA, MINORISTA), `EstadoLote` (ACTIVO, AGOTADO), `RolUsuario`.
- **Prisma schema**: SQLite database with 6 models. All text searches would use `contains` (case-insensitive by default in Prisma/SQLite).
- **shadcn/ui components available**: Input, Select, Button, Dialog, Card, Label, Badge, Separator, Tooltip, DropdownMenu, Sheet, Skeleton, AlertDialog, Breadcrumb, Pagination, Table.
- **No existing search/filter library** in `package.json` — no fuse.js, no debouncer, nothing.

### What Is Missing

1. **No filter state** in DataTable — no `ColumnFilter` or `globalFilter` integration.
2. **No search input** on any list page.
3. **No filter dropdowns** (select by tipo, estado, producto).
4. **No server-side filtering** — all data is fetched at once. For small datasets this is fine; for larger ones it will become a performance problem.
5. **No filter URL sync** — current pattern syncs `pageSize` to URL, but no filter params.
6. **Lote column shows raw `proveedorId` UUID** — needs a join/resolution to show the proveedor name, which also impacts search UX.
7. **Venta columns show raw `clienteId` and `loteId` UUIDs** — same issue.
8. **No relationship data in responses** — VentaResponse/LoteResponse return foreign key IDs without the related entity names.

---

## 2. Per-Entity Filter/Search Matrix

### Lotes

| Field | Type | Text Searchable | Select Filterable | Notes |
|---|---|---|---|---|
| producto | TipoProducto (enum) | No | Yes (DOBLE_CREMA / SEMISALADO) | Currently shows as badge-style label |
| proveedorId | String (FK) | No | Yes (dropdown of proveedores) | Shows raw UUID — needs name resolution |
| estado | EstadoLote (enum) | No | Yes (ACTIVO / AGOTADO) | Current `findActive()` only returns ACTIVO; need to fetch all if filtering by AGOTADO |
| cantidadCompradaKg | Decimal | No | No | Numeric range filter possible but low priority |
| precioCompraBaseKg | Decimal | No | No | Numeric range filter possible but low priority |
| costoRealCalculadoKg | Decimal | No | No | Numeric range filter possible but low priority |
| stockDisponibleKg | Decimal | No | No | Numeric range filter possible but low priority |
| fechaIngreso | DateTime | No | No | Date range filter possible but low priority |

### Clientes

| Field | Type | Text Searchable | Select Filterable | Notes |
|---|---|---|---|---|
| nombre | String | Yes | No | Primary search field |
| tipo | TipoCliente (enum) | No | Yes (MAYORISTA / MINORISTA) | Currently shows as badge |
| precioDobleCrema | Decimal? | No | No | Numeric — low priority for filter |
| precioSemisalado | Decimal? | No | No | Numeric — low priority for filter |

### Proveedores

| Field | Type | Text Searchable | Select Filterable | Notes |
|---|---|---|---|---|
| nombre | String | Yes | No | Primary search field |
| telefono | String? | Yes | No | Secondary search field |

### Ventas

| Field | Type | Text Searchable | Select Filterable | Notes |
|---|---|---|---|---|
| fecha | DateTime | No | No (date range possible) | Currently filtered to current month server-side |
| clienteId | String (FK) | No | Yes (dropdown of clientes) | Shows raw UUID — needs name resolution |
| loteId | String (FK) | No | Yes (dropdown of lotes, grouped by producto) | Shows raw UUID — needs name resolution |
| cantidadVendidaKg | Decimal | No | No | Low priority |
| precioVentaKg | Decimal | No | No | Low priority |
| ingresoTotal | Decimal | No | No | Low priority |
| gananciaBruta | Decimal | No | No | Low priority |
| valorDomicilio | Decimal | No | No | Low priority |
| domiciliario | String | Yes | No | Text search on domiciliario name |

### Gastos Fijos

| Field | Type | Text Searchable | Select Filterable | Notes |
|---|---|---|---|---|
| concepto | String | Yes | No | Primary search field |
| valor | Decimal | No | No | Low priority |
| fecha | DateTime | No | No | Date range possible |

---

## 3. Approach Comparison: Client-Side vs Server-Side Filtering

### Option A: Client-Side Filtering (Recommended for Phase 1)

**How it works**: Fetch all records via existing server actions, then use TanStack Table's built-in `getFilteredRowModel()` to filter rows in the browser.

**Pros**:
- Minimal code changes — no backend modifications needed.
- Instant, zero-latency filtering (no network round-trips).
- Clean Architecture is preserved — no new use cases or repository methods.
- Works well with current small dataset (a cheese distributor backoffice won't have 100k+ records).
- TanStack Table has first-class support for both global and column filters.

**Cons**:
- Does not scale to very large datasets (all records loaded in browser memory).
- Foreign key resolution (proveedor name in Lote, cliente name in Venta) requires pre-fetching related entities or denormalizing the response.

**Implementation**:
- Add `getFilteredRowModel` to DataTable.
- Create filter functions (text search = `includesString`, select = exact match).
- Add a `DataTableToolbar` component above the table with search input + filter selects.
- Pass filter configuration per entity from list pages.

### Option B: Server-Side Filtering

**How it works**: Add filter parameters to server actions, pass Prisma `where` clauses through the application layer, and only fetch matching records.

**Pros**:
- Scales to very large datasets.
- Less data transferred over the wire.

**Cons**:
- Requires significant changes across all layers: new repository methods, new use case parameters, new action parameters, new DTOs for filter requests.
- More complex URL sync (need to encode filter state in search params).
- Slower UX (network round-trip on each filter change).
- Over-engineering for a small backoffice with <1000 records per entity.

### Option C: Hybrid — Client-Side Now, Server-Side Later

**How it works**: Implement client-side filtering first. When/if dataset sizes grow, refactor specific entities to server-side filtering.

**Recommendation**: This is the pragmatic path. Start with Option A, keeping the filter interface abstract enough that server-side filtering can be swapped in later without changing the UI layer.

**Decision**: **Option A (Client-Side) for Phase 1**, with a clean abstraction so the data source can be swapped later.

---

## 4. Recommended UI Pattern

### Toolbar Above Table

```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Search...]  [Tipo ▼]  [Estado ▼]  [Producto ▼]       │
├─────────────────────────────────────────────────────────────┤
│  Table rows...                                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Paginación                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Why toolbar, not column headers or sidebar**:
- Consistent with typical backoffice UX patterns (admin panels, dashboards).
- shadcn/ui already provides Input and Select components that fit this pattern.
- Column header filters are great for power users but add complexity and are harder to make responsive.
- Sidebar filters take up too much horizontal space for a 5-entity backoffice.
- The toolbar pattern maps well to TanStack Table's `globalFilter` + `columnFilters` state.

### Component Architecture

```
<DataTableToolbar>
  <Input placeholder="Buscar..." />       ← globalFilter
  <Select> Tipo </Select>                 ← columnFilters on tipo
  <Select> Estado </Select>                ← columnFilters on estado
</DataTableToolbar>
<DataTable columns={...} data={...} />
```

- **Global search**: A single text Input that uses TanStack Table's `globalFilter` to search across all text columns. Uses `includesString` filter function (case-insensitive).
- **Select filters**: Use shadcn/ui `Select` for enum fields. Set `columnFilters` on the corresponding column.
- **Per-entity configuration**: Each list page passes a `filters` config to DataTableToolbar specifying which filters to show and their options.

### Filter Configuration Interface

```typescript
interface FilterConfig {
  key: string;                    // column accessorKey
  label: string;                  // display label
  type: 'select' | 'text';       // filter UI type
  options?: { label: string; value: string }[]; // for select filters
}

interface DataTableToolbarProps {
  globalSearchPlaceholder?: string;
  filters?: FilterConfig[];
  table: Table<any>;             // TanStack Table instance for state access
}
```

### DataTable Changes Required

1. Import `getFilteredRowModel` from `@tanstack/react-table`.
2. Add `globalFilterFn: 'includesString'` (or custom multi-column search).
3. Add `onColumnFiltersChange` and `onGlobalFilterChange` state.
4. Move `useReactTable` and its state OUT of DataTable and INTO a new `DataTableProvider` context, so both the toolbar and table can access the same table instance.
5. Alternatively, keep state in the list page component and pass down.

### Approach: Keep DataTable Generic, Add Toolbar Separately

The cleanest approach:
1. Enhance DataTable to accept and apply `globalFilter` and `columnFilters` state.
2. Create a new `DataTableToolbar` component that receives the same table instance or filter state setters.
3. Each list page composes: `<DataTableToolbar filters={config} />` + `<DataTable ... />`.
4. Filter state lives in the list page (or a custom hook) and is passed down.

---

## 5. Foreign Key Resolution

### Problem

- **Lotes** display `proveedorId` (UUID) instead of the proveedor name.
- **Ventas** display `clienteId` and `loteId` (UUIDs) instead of cliente/lote names.

### Impact on Filtering

- Filtering by "proveedor name" in Lotes requires resolving `proveedorId → nombre`.
- Filtering by "cliente name" in Ventas requires resolving `clienteId → nombre`.
- This means the response DTOs need to include related entity names, OR the client needs a lookup map.

### Solutions

**Option 1: Denormalize Responses (Recommended)**
- Extend `LoteResponse` to include `proveedorNombre: string`.
- Extend `VentaResponse` to include `clienteNombre: string` and `productoTipo: string` (or `loteProducto`).
- Modify the `loteToResponse` and `ventaToResponse` functions to join related data.
- This requires updating Prisma queries to `include` related entities.

**Option 2: Client-Side Lookup Map**
- The lotes page already fetches `proveedores` for the create dialog. Build a `Map<id, nombre>` and pass it to columns.
- Same pattern for ventas: already fetches `clientes` and `lotes`.
- Use `accessorFn` in column definitions to resolve the name from the map.

**Recommendation**: Option 2 for now (less disruption, reuses existing data). The lotes and ventas pages already fetch related entities for their dialogs, so building a lookup map is trivial. This also enables the select filter to use the same data.

---

## 6. Lote Estado Filtering Consideration

The current `getLotes()` action calls `loteRepo.findActive()` which only returns `ACTIVO` lotes. To filter by `AGOTADO` or show all statuses, we need:

- A new `findAll()` method on `LoteRepository` (or modify `findActive` to accept optional status filter).
- A new server action or parameter to fetch all lotes regardless of status.

For client-side filtering to work on `estado`, ALL lotes (including AGOTADO) must be loaded. This means:
- Either change `getLotes()` to return all statuses (and filter client-side by default to show only ACTIVO).
- Or add a separate `getAllLotes()` action and use it when the user selects "all" or "AGOTADO" status.

**Recommendation**: Add `findAll()` to the LoteRepository port and PrismaLoteRepo, create a new `getAllLotes()` action that returns all statuses, and use it in the lotes page. Default the estado filter to "ACTIVO" in the UI.

---

## 7. Risks and Constraints

| Risk | Impact | Mitigation |
|---|---|---|
| Client-side filtering loads all records into browser | Performance degradation on very large datasets | Acceptable for backoffice with <1000 records. Can migrate to server-side later. |
| Lote `findActive()` only returns ACTIVO lotes | Cannot filter by AGOTADO estado | Need new `findAll()` repository method + server action |
| Foreign keys displayed as UUIDs | Terrible UX, unusable for search/filter | Need lookup maps or denormalized responses |
| TanStack Table globalFilter default is column-specific | May not search across all columns correctly | Use custom `globalFilterFn` that searches designated text columns |
| Filter state lost on page navigation | Poor UX when navigating away and back | Sync filter state to URL search params (like `pageSize` already is) |
| Pagination interacts with filters | If 100 records, 10 per page, filter to 15 matching → should show 2 pages | TanStack handles this automatically when using `getFilteredRowModel` + `getPaginationRowModel` (filters apply before pagination) |
| Adding filters to DataTable may break existing usage | Regression on pages that don't need filters | Make filters opt-in via props; default to no filters |

---

## 8. Estimated Scope

### Phase 1: Client-Side Search + Select Filters

| Task | Files Changed | Est. Effort |
|---|---|---|
| Add `getFilteredRowModel` + filter state to DataTable | `data-table.tsx` | S |
| Create `DataTableToolbar` component | New: `src/components/data-table-toolbar.tsx` | S |
| Create `useDataTableFilters` hook | New: `src/hooks/use-data-table-filters.ts` | S |
| Add proveedor name resolution to Lote columns | `lote-columns.tsx`, lotes page | S |
| Add cliente/lote name resolution to Venta columns | `venta-columns.tsx`, ventas page | S |
| Add global search to Clientes page | `clientes/page.tsx` | S |
| Add global search + tipo filter to Clientes page | `clientes/page.tsx` | S |
| Add global search + producto/estado filters to Lotes page | `lotes/page.tsx` | M |
| Add global search + tipo filter to Proveedores page | `proveedores/page.tsx` | S |
| Add global search to Gastos page | `gastos/page.tsx` | S |
| Add cliente/producto filters to Ventas page | `ventas/page.tsx` | M |
| Add `findAll()` to LoteRepository + PrismaLoteRepo + action | Repository port, infra, actions | S |
| Add `findAllLotes()` server action | `lotes.ts` actions | S |
| URL sync for filter state (optional, nice-to-have) | All list pages | M |
| Tests for filter logic | New test files | M |

**Total estimated effort**: ~2-3 days for Phase 1.

### Phase 2 (Future): Server-Side Filtering

Only needed if dataset sizes grow significantly. Would involve:
- Adding filter parameters to repository interfaces
- Prisma `where` clause builders
- URL-based filter state sync
- Pagination moving server-side as well

Not recommended until there's a proven performance problem.

---

## 9. Key Decisions to Make

1. **Global search vs per-column search?** → Recommend global search (single search box). Simpler UX, sufficient for this backoffice.
2. **Client-side vs server-side filtering?** → Client-side for Phase 1. The data volumes are small.
3. **How to handle Lote's `findActive` limitation?** → Add `findAll()` method, use it when filtering by estado.
4. **How to resolve foreign keys (UUID → name)?** → Client-side lookup maps, reusing data already fetched for dialogs.
5. **Should filter state persist in URL?** → Yes, following the existing `pageSize` pattern. Nice-to-have for Phase 1.
6. **Default filter for Lotes estado?** → Default to "ACTIVO" to preserve current behavior, with an "All" option.
7. **Should Venta filtering expand beyond current month?** → No, keep the current month constraint for now. Add date range filtering as Phase 2.
