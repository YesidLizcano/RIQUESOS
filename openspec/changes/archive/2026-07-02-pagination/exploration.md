# Pagination — Exploration Document

## 1. Current State Analysis

### 1.1 TanStack Table (react-table v8.21.3)

The project uses `@tanstack/react-table@^8.21.3`. Version 8 has **built-in pagination support** via `getPaginationRowModel()`, `getFilteredRowModel()`, and manual pagination modes. Key observations:

- Current `DataTable` (`src/components/data-table.tsx`) only uses `getCoreRowModel()` and `getSortedRowModel()`. No pagination model is configured.
- No `pageCount`, `pageIndex`, `pageSize`, or `manualPagination` props exist.
- The `DataTableProps` interface is minimal: `columns`, `data`, `footerRow?`.

### 1.2 List Pages (5 total)

All 5 list pages follow the same pattern:

| Page | File | Data Fetch | Records Pattern |
|------|------|-----------|----------------|
| Lotes | `src/app/(dashboard)/lotes/page.tsx` | `getLotes()` → `loteRepo.findActive()` | Active lots only (filtered) |
| Clientes | `src/app/(dashboard)/clientes/page.tsx` | `getClientes()` → `useCase.obtenerTodos()` | All clients |
| Ventas | `src/app/(dashboard)/ventas/page.tsx` | `getVentas()` → `ventaRepo.findByDateRange(current month)` | Current month sales |
| Gastos | `src/app/(dashboard)/gastos/page.tsx` | `getGastos()` → `useCase.obtenerTodos()` | All expenses |
| Proveedores | `src/app/(dashboard)/proveedores/page.tsx` | `getProveedores()` → `useCase.obtenerTodos()` | All suppliers |

**All data is fetched server-side via Server Actions that return ALL matching records with NO pagination parameters (skip/take/cursor/total).**

### 1.3 Server Actions

All 5 getter actions return `{ success: boolean, <entity>: <entity>[] }` with no pagination metadata:

- `getLotes()` → `{ success, lotes: LoteResponse[] }`
- `getClientes()` → `{ success, clientes: ClienteResponse[] }`
- `getVentas()` → `{ success, ventas: VentaResponse[] }`
- `getGastos()` → `{ success, gastos: GastoResponse[] }`
- `getProveedores()` → `{ success, proveedores: ProveedorResponse[] }`

No `page`, `pageSize`, `total`, or `hasMore` fields exist.

### 1.4 Prisma Repositories

None of the 5 repositories have pagination methods. All `findMany` calls return full result sets:

| Repository | Method | Prisma Query | Pagination? |
|-----------|--------|-------------|------------|
| PrismaLoteRepo | `findActive()` | `findMany({ where: { estado: ACTIVO }, orderBy: { createdAt: 'desc' } })` | No |
| PrismaClienteRepo | `findAll()` | `findMany({ orderBy: { createdAt: 'desc' } })` | No |
| PrismaVentaRepo | `findByDateRange()` | `findMany({ where: { fecha: { gte, lte } }, orderBy: { fecha: 'desc' } })` | No |
| PrismaGastoFijoRepo | `findAll()` | `findMany({ orderBy: { createdAt: 'desc' } })` | No |
| PrismaProveedorRepo | `findAll()` | `findMany({ orderBy: { createdAt: 'desc' } })` | No |

No `count()` calls exist. No `skip`/`take`/`cursor` usage.

### 1.5 Domain Ports (Repository Interfaces)

All ports return `Promise<T[]>` with no pagination abstraction:

- `LoteRepository.findActive(): Promise<Lote[]>`
- `ClienteRepository.findAll(): Promise<Cliente[]>`
- `VentaRepository.findByDateRange(inicio, fin): Promise<Venta[]>`
- `GastoFijoRepository.findAll(): Promise<GastoFijo[]>`
- `ProveedorRepository.findAll(): Promise<Proveedor[]>`

### 1.6 Use Cases

All use cases delegate directly to repository `findAll()`-style methods:

- `GestionarClientes.obtenerTodos()` → `this.clienteRepo.findAll()`
- `GestionarProveedores.obtenerTodos()` → `this.proveedorRepo.findAll()`
- `GestionarGastos.obtenerTodos()` → `this.gastoRepo.findAll()`
- Lotes: action directly calls `loteRepo.findActive()` (no dedicated use case for listing)

### 1.7 DTOs

Existing `*ListResponse` types are thin wrappers around arrays:
- `ClienteListResponse { clientes: ClienteResponse[] }`
- `LoteListResponse { lotes: LoteResponse[] }`
- `VentaListResponse { ventas: VentaResponse[] }`
- `GastoListResponse { gastos: GastoResponse[] }`
- `ProveedorListResponse { proveedores: ProveedorResponse[] }`

No `total`, `page`, `pageSize` metadata.

### 1.8 shadcn/ui Components

Available UI components: `alert-dialog`, `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `table`, `tooltip`.

**No `pagination` component exists yet.** shadcn/ui does ship a `Pagination` component (`npx shadcn@latest add pagination`) that renders page navigation with Previous/Next and page number buttons.

### 1.9 Ventas Page — Inline Columns

Ventas columns are defined inline in `src/app/(dashboard)/ventas/page.tsx` (lines 13-54), not in a separate `src/components/columns/` file. This will need to be extracted if pagination touches column definitions.

### 1.10 Gastos Page — Footer Row

The Gastos DataTable has a `footerRow` prop showing total expenses. Pagination must account for this — the total should always reflect ALL expenses, not just the current page.

### 1.11 Dashboard Page

The dashboard (`src/app/(dashboard)/page.tsx`) also uses DataTable for inventory, top clients, and active lots. These are summary tables that should NOT be paginated — they show aggregated data.

---

## 2. Pagination Approach Comparison

### 2.1 Client-Side Pagination

**How**: Fetch ALL records from server, paginate in the browser using TanStack Table's `getPaginationRowModel()`.

| Aspect | Assessment |
|--------|-----------|
| Implementation effort | **Low** — Add `getPaginationRowModel()` to DataTable, add pagination UI |
| Data layer changes | **None** — Repos, use cases, actions all stay the same |
| Performance today | Acceptable — SQLite with <1K records is instant |
| Performance at scale | **Degrades** — Every page load fetches ALL records; DB transfers grow linearly |
| Search/filter integration | Easy — TanStack Table handles filtering + pagination together |
| Consistency | Risk of stale data between page navigations (data fetched once) |
| SQLite suitability | Good — SQLite is fast for small datasets |

**Changes needed**:
1. Add `getPaginationRowModel()` to `DataTable`
2. Add pagination state (`pageIndex`, `pageSize`) to `DataTable`
3. Add shadcn `Pagination` component
4. Update 5 list pages to pass `pageSize` prop or default
5. Handle Gastos total footer (sum all, not just current page)

### 2.2 Server-Side Pagination

**How**: Add `skip`/`take`/`count` to Prisma queries. Server Actions accept `page`/`pageSize` params. Client fetches one page at a time.

| Aspect | Assessment |
|--------|-----------|
| Implementation effort | **High** — Changes across ALL layers: ports, repos, use cases, actions, DTOs, UI |
| Data layer changes | **Major** — Every repository needs new paginated methods, count queries, new port signatures |
| Performance today | Slightly worse — Extra count query per request |
| Performance at scale | **Excellent** — Constant-time queries regardless of dataset size |
| Search/filter integration | Complex — Every filter must be server-side, requiring new params at every layer |
| Consistency | Fresh data on every page change |
| SQLite suitability | Fine — skip/take works well in SQLite |

**Changes needed**:
1. New `PaginatedResult<T>` type with `data`, `total`, `page`, `pageSize`
2. New methods in all 5 repository ports: `findAllPaginated(params)` or similar
3. New Prisma implementations with `findMany({ skip, take })` + `count()`
4. New use case methods or parameter changes
5. Server Actions accept pagination params, return metadata
6. Server Components become Client Components (need state for page changes) OR use URL search params
7. DataTable refactored for manual pagination mode
8. shadcn `Pagination` component added
9. DTOs updated with pagination metadata

### 2.3 Hybrid (Recommended)

**How**: Client-side pagination NOW with a clean architecture that makes server-side pagination a surgical upgrade later.

| Aspect | Assessment |
|--------|-----------|
| Implementation effort | **Medium** — Client-side pagination + architectural prep for server-side |
| Data layer changes | **None initially** — Add pagination abstractions (types, interfaces) for future use |
| Performance today | Good — Same as client-side |
| Performance at scale | Upgrade path clear — Swap to server-side when needed |
| Search/filter integration | Start client-side, upgrade to server-side per entity |
| Future-proofing | **Best** — Clean separation allows per-entity migration |

---

## 3. Recommended Approach: Hybrid (Client-Side First + Server-Side Ready)

### Phase 1: Client-Side Pagination (This Change)

Add TanStack Table pagination to `DataTable` with shadcn Pagination UI. All data is still fetched at once. This solves the immediate UX problem (scrolling through long tables).

### Phase 2: Server-Side Pagination (Future)

When datasets grow (e.g., Ventas with months/years of history), migrate specific entities to server-side pagination using URL search params. The architecture already has clean layer boundaries making this a targeted change.

---

## 4. Recommended Page Sizes Per Entity

| Entity | Default Page Size | Rationale |
|--------|-----------------|-----------|
| Lotes | 10 | Medium-width rows (7 columns + actions), typically 5-20 active at a time |
| Clientes | 15 | Narrow rows (5 columns + actions), could grow to 50+ over time |
| Ventas | 20 | Narrow rows (7 columns), grows fastest (daily transactions), monthly filter already limits scope |
| Gastos | 10 | Few columns (4 + actions), typically <20 fixed expenses |
| Proveedores | 15 | Narrow rows (3 columns + actions), small stable set |

A **global default of 10** is also reasonable. Consider making `pageSize` configurable per table but defaulting to 10.

---

## 5. Risks and Constraints

### 5.1 SQLite Performance
- SQLite handles `SELECT *` on 1K rows in <5ms. Client-side pagination is fine for current scale.
- The breaking point is ~10K+ rows, at which point Ventas (the fastest-growing entity) needs server-side pagination.
- Mitigation: Ventas already has a date range filter (current month). This naturally limits result set.

### 5.2 Gastos Footer Total
- The Gastos page computes `totalGastos` from ALL records to show in the footer.
- With client-side pagination, the total is computed from all data (still available).
- With server-side pagination, a separate aggregation query would be needed.

### 5.3 Server Component Constraints
- Current list pages are **Server Components** that call Server Actions directly.
- Adding interactive pagination (page changes) requires either:
  - **Option A**: Convert pages to Client Components (lose Server Component benefits)
  - **Option B**: Use URL search params (`?page=2`) and keep Server Components (page changes = full navigation)
- **Recommendation**: Use URL search params (`?page=N`) to stay as Server Components. This is the Next.js-idiomatic approach and provides bookmarkable/shareable URLs.

### 5.4 Ventas Date Filtering
- Ventas already filters by current month via `findByDateRange`. Pagination should respect this filter.
- Future: Add date range picker that combines with pagination.

### 5.5 Dashboard Tables
- The dashboard has 3 DataTable instances (inventory, top clients, active lots). These should NOT be paginated — they show summary/aggregate data that fits on screen.

### 5.6 Inline Ventas Columns
- Ventas columns are defined inline in the page component. If pagination changes touch column definitions, this should be extracted to `src/components/columns/venta-columns.tsx` for consistency.

### 5.7 Dialog Forms and Data Freshness
- Create/Edit/Delete actions call `revalidatePath()` which triggers full page re-fetch.
- With client-side pagination, after a mutation the page reloads and pagination resets to page 1.
- This is acceptable behavior (standard in most CRUD apps).

---

## 6. Estimated Scope

### Phase 1: Client-Side Pagination (This Change)

| Task | Effort | Files Changed |
|------|--------|--------------|
| Add shadcn Pagination component | 5 min | `src/components/ui/pagination.tsx` (new) |
| Enhance DataTable with pagination | 30 min | `src/components/data-table.tsx` |
| Update 5 list pages with pageSize | 20 min | 5 page files |
| Extract Ventas columns to separate file | 10 min | New `venta-columns.tsx`, update `ventas/page.tsx` |
| Handle Gastos total (sum all, not per page) | 10 min | `gastos/page.tsx` |
| Add page size selector (optional) | 15 min | DataTable or list pages |
| Testing (manual) | 15 min | All 5 pages |
| **Total** | **~1.5-2 hours** | |

### Phase 2: Server-Side Pagination (Future)

| Task | Effort | Files Changed |
|------|--------|--------------|
| Create `PaginatedResult<T>` type | 10 min | New shared type |
| Add paginated methods to repository ports | 20 min | 5 port files |
| Implement in Prisma repos (skip/take/count) | 40 min | 5 repo files |
| Update or create new use cases | 30 min | Use case files |
| Update Server Actions with pagination params | 30 min | 5 action files |
| Update DTOs with pagination metadata | 20 min | 5 DTO files |
| Convert list pages to use URL search params | 40 min | 5 page files |
| Update DataTable for manual pagination mode | 20 min | data-table.tsx |
| **Total** | **~3-4 hours** | |

---

## 7. Architecture Decision Record

**Decision**: Start with client-side pagination using TanStack Table's `getPaginationRowModel()`.

**Rationale**:
1. Current dataset sizes (likely <500 records per entity) make client-side pagination performant.
2. Ventas already has a date range filter limiting monthly results.
3. Implementation is fast (1.5-2h vs 3-4h for server-side).
4. Clean Architecture boundaries make server-side migration surgical and per-entity.
5. shadcn/ui Pagination component provides consistent UI with minimal effort.

**Trigger for Phase 2**: When any entity exceeds ~1,000 records or when Ventas needs historical queries across months.

---

## 8. Key Files Inventory

| Layer | File | Role |
|-------|------|------|
| UI Component | `src/components/data-table.tsx` | TanStack Table wrapper, needs pagination model |
| UI Columns | `src/components/columns/cliente-columns.tsx` | Column definitions with actions |
| UI Columns | `src/components/columns/proveedor-columns.tsx` | Column definitions with actions |
| UI Columns | `src/components/columns/lote-columns.tsx` | Column definitions with actions |
| UI Columns | `src/components/columns/gasto-columns.tsx` | Column definitions with actions |
| UI Columns | `src/app/(dashboard)/ventas/page.tsx` | Inline columns (needs extraction) |
| Page | `src/app/(dashboard)/lotes/page.tsx` | Lotes list page |
| Page | `src/app/(dashboard)/clientes/page.tsx` | Clientes list page |
| Page | `src/app/(dashboard)/ventas/page.tsx` | Ventas list page (inline columns + footer) |
| Page | `src/app/(dashboard)/gastos/page.tsx` | Gastos list page (has footer row) |
| Page | `src/app/(dashboard)/proveedores/page.tsx` | Proveedores list page |
| Action | `src/presentation/actions/lotes.ts` | Server action: getLotes() |
| Action | `src/presentation/actions/clientes.ts` | Server action: getClientes() |
| Action | `src/presentation/actions/ventas.ts` | Server action: getVentas() |
| Action | `src/presentation/actions/gastos.ts` | Server action: getGastos() |
| Action | `src/presentation/actions/proveedores.ts` | Server action: getProveedores() |
| DTO | `src/presentation/dtos/lote.dto.ts` | LoteListResponse type |
| DTO | `src/presentation/dtos/cliente.dto.ts` | ClienteListResponse type |
| DTO | `src/presentation/dtos/venta.dto.ts` | VentaListResponse type |
| DTO | `src/presentation/dtos/gasto.dto.ts` | GastoListResponse type |
| DTO | `src/presentation/dtos/proveedor.dto.ts` | ProveedorListResponse type |
| Repo Port | `src/domain/ports/LoteRepository.ts` | findActive(): Promise<Lote[]> |
| Repo Port | `src/domain/ports/ClienteRepository.ts` | findAll(): Promise<Cliente[]> |
| Repo Port | `src/domain/ports/VentaRepository.ts` | findByDateRange(): Promise<Venta[]> |
| Repo Port | `src/domain/ports/GastoFijoRepository.ts` | findAll(): Promise<GastoFijo[]> |
| Repo Port | `src/domain/ports/ProveedorRepository.ts` | findAll(): Promise<Proveedor[]> |
| Repo Impl | `src/infrastructure/repositories/PrismaLoteRepo.ts` | No skip/take |
| Repo Impl | `src/infrastructure/repositories/PrismaClienteRepo.ts` | No skip/take |
| Repo Impl | `src/infrastructure/repositories/PrismaVentaRepo.ts` | No skip/take |
| Repo Impl | `src/infrastructure/repositories/PrismaGastoFijoRepo.ts` | No skip/take |
| Repo Impl | `src/infrastructure/repositories/PrismaProveedorRepo.ts` | No skip/take |
| Use Case | `src/application/use-cases/GestionarClientes.ts` | obtenerTodos() |
| Use Case | `src/application/use-cases/GestionarProveedores.ts` | obtenerTodos() |
| Use Case | `src/application/use-cases/GestionarGastos.ts` | obtenerTodos() |
| Package | `package.json` | @tanstack/react-table@^8.21.3 |
| Schema | `prisma/schema.prisma` | SQLite schema |
