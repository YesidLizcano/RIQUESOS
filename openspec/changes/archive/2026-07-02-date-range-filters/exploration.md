# Exploration: Date Range Filters

**Change ID:** date-range-filters  
**Date:** 2026-07-02  
**Status:** Explored

---

## 1. Current State Analysis

### 1.1 Existing Filter Infrastructure

The project has a `DataTableToolbar` component (`src/components/data-table-toolbar.tsx`) that supports:
- **Global search** via `globalFilter` (text search across all columns)
- **Column select filters** via `FilterConfig[]` — dropdown `<Select>` filters for discrete values (e.g., estado, producto, cliente)

All filtering is **client-side** — data is fetched from the server, then TanStack Table's `getFilteredRowModel` filters in memory. This works because the current data volumes are small (single-month scope for Ventas, all-time for Gastos/Lotes).

### 1.2 Ventas — Current Date Filtering

- **Server Action `getVentas()`** (`src/presentation/actions/ventas.ts:70-83`): Hardcodes current month (`new Date(now.getFullYear(), now.getMonth(), 1)` → `now`). Calls `ventaRepo.findByDateRange(inicio, now)`.
- **Server Action `getVentasByDateRange(inicio, fin)`** (line 85-96): Already exists and accepts arbitrary date range. Currently unused by the Ventas list page.
- **Server page** (`src/app/(dashboard)/ventas/page.tsx`): Calls `getVentas()` with no parameters — always current month.
- **Client page** (`ventas-client-page.tsx`): No date selector. Shows "Registro de ventas del período actual" subtitle. No way to change the period.
- **Repository** `PrismaVentaRepo.findByDateRange(inicio, fin)` uses Prisma `where: { fecha: { gte, lte } }`.

### 1.3 Gastos — No Date Filtering

- **Server Action `getGastos()`**: Returns ALL gastos via `useCase.obtenerTodos()` — no date filtering.
- **Server Action `getResumenMensual(inicio, fin)`**: EXISTS but is only used by the dashboard. Returns `{ total, gastos }` for a period.
- **PrismaGastoFijoRepo**: Has `sumByPeriod(inicio, fin)` but NO `findByDateRange`. The `findAll()` method returns everything ordered by `createdAt DESC`.
- **Client page**: No filters at all (just global search).

### 1.4 Lotes — No Date Filtering

- **Server Action `getLotes()`**: Returns ALL lotes via `loteRepo.findAll()`.
- **PrismaLoteRepo**: Only `findAll()`, `findActive()`, `findByProveedor()`. No date range query.
- **Client page**: Has filters for `producto`, `estado`, `proveedorNombre` — all client-side select filters.
- **Date field**: `fechaIngreso` (DateTime, defaults to `now()`) and `createdAt` (DateTime, defaults to `now()`).

### 1.5 Dashboard — Period Selector Pattern

- `PeriodSelector` component (`src/components/period-selector.tsx`): Month + Year dropdown selects.
- Used by `DashboardClientPage` which calls `getMetricas(month, year)` on change.
- This is a **server-side pattern**: the dashboard refetches data from the server when the period changes.

### 1.6 Proveedores / Clientes — No Date Fields

- `Proveedor` has only `createdAt` and `updatedAt` — no business-meaningful date field.
- `Cliente` has only `createdAt` and `updatedAt` — same.
- These entities do NOT need date range filtering.

---

## 2. Date Field Matrix Per Entity

| Entity | Date Field | Type | Default | Business Meaning | Filterable? |
|--------|-----------|------|---------|-----------------|-------------|
| **Venta** | `fecha` | DateTime | `now()` | Date the sale occurred | **YES** — primary filter |
| **GastoFijo** | `fecha` | DateTime | `now()` | Date the expense was recorded | **YES** — primary filter |
| **GastoFijo** | `createdAt` | DateTime | `now()` | Record creation timestamp | No (low value) |
| **Lote** | `fechaIngreso` | DateTime | `now()` | Date the batch was received | **MAYBE** — useful for tracking |
| **Lote** | `createdAt` | DateTime | `now()` | Record creation timestamp | No (low value) |
| **Proveedor** | `createdAt` | DateTime | `now()` | Record creation | No |
| **Cliente** | `createdAt` | DateTime | `now()` | Record creation | No |

**Verdict**: Venta.fecha and GastoFijo.fecha are the primary candidates. Lote.fechaIngreso is secondary — useful but less critical since lotes are typically filtered by estado (active/expired).

---

## 3. Approach Comparison

### 3.1 Option A: Month/Year Selector (Like Dashboard)

**How it works**: Reuse `PeriodSelector` component. User picks a month and year. Server refetches data for that period.

**Pros**:
- Already implemented — `PeriodSelector` exists and is battle-tested on the dashboard
- Server-side filtering — only relevant data is sent to the client
- Consistent UX with dashboard
- Simple to implement for Ventas (already has `findByDateRange` and `getVentasByDateRange`)
- Matches the business pattern (cheese distributor reviews data by month)

**Cons**:
- Cannot select arbitrary date ranges (e.g., "last 15 days" or "Q1 2025")
- Less flexible for edge cases (partial months, cross-month queries)

### 3.2 Option B: Date Range Picker (From-To)

**How it works**: Two date pickers (start date, end date). User selects arbitrary range. Server refetches.

**Pros**:
- Maximum flexibility — any range possible
- Standard pattern for backoffice applications
- Better for ad-hoc queries ("show me data from Jan 15 to Mar 3")

**Cons**:
- Requires installing `date-picker` shadcn component (depends on `react-day-picker` + `date-fns`)
- More complex UI — two pickers + validation (from ≤ to)
- Overkill for a monthly-review business pattern
- No shadcn/ui calendar or popover component installed yet

### 3.3 Option C: Hybrid (Month/Year Default + Optional Custom Range)

**How it works**: Default to month/year selector. "Custom range" toggle reveals date pickers.

**Pros**:
- Best of both worlds
- Common monthly pattern with escape hatch for special cases

**Cons**:
- Most complex to implement
- Two UI modes to maintain and test

---

## 4. Recommended UI Pattern

**Recommendation: Option A (Month/Year Selector) — with Option B as future enhancement.**

**Rationale**:
1. The business (cheese distributor) naturally thinks in monthly periods — the dashboard already proves this pattern works.
2. `PeriodSelector` is already built and working — zero new UI components needed.
3. Server-side infrastructure already exists for Ventas (`findByDateRange`) and can be trivially added for Gastos (`sumByPeriod` pattern already exists in `PrismaGastoFijoRepo`).
4. Lotes filtering by date is lower priority — estado/producto/proveedor filters are more useful.
5. Avoids the dependency and complexity of `react-day-picker` + `date-fns` + `Popover` + `Calendar` components.
6. The current pattern (server refetch on period change) is already established in the dashboard.

**For the future**: If users need custom ranges, we can add a `DatePicker` component later without breaking the month/year pattern.

---

## 5. Implementation Scope

### 5.1 Ventas Page

**Current**: Hardcoded current month. No way to change period.

**Changes needed**:
1. **Server page** (`ventas/page.tsx`): Replace `getVentas()` call with `getVentasByDateRange(inicio, fin)`, computing dates from optional `searchParams` (month/year).
2. **Client page** (`ventas-client-page.tsx`): Add `PeriodSelector` in the header. On period change, call server action `getVentasByDateRange(inicio, fin)` and refresh the data.
3. **Or** (simpler): Make the client component call `getVentasByDateRange` directly on period change, similar to how the dashboard calls `getMetricas`.

**Key decision**: Should the Ventas page switch from server-side rendering (RSC) to client-side data fetching? Currently, data is fetched in RSC and passed as props. With date filtering, we need client-side state changes to trigger refetches.

**Recommended approach**: Convert to client-side data fetching pattern (like dashboard). Initial load fetches current month, then `PeriodSelector` changes trigger `getVentasByDateRange` server action calls.

### 5.2 Gastos Page

**Current**: Shows ALL gastos, no date filtering.

**Changes needed**:
1. **Repository**: Add `findByDateRange(inicio, fin)` to `GastoFijoRepository` port and `PrismaGastoFijoRepo` impl.
2. **Server Action**: Add `getGastosByDateRange(inicio, fin)` (or modify `getGastos` to accept optional dates).
3. **Use Case**: The `GestionarGastos` use case has `obtenerTodos()` and `resumenMensual()`. We may need a `obtenerPorPeriodo(inicio, fin)` method, or just use the repo directly in the action.
4. **Client page**: Add `PeriodSelector`. Default to current month. Call server action on period change.
5. **Default behavior**: Change from showing all gastos to showing current month's gastos.

### 5.3 Lotes Page

**Current**: Shows ALL lotes with estado/producto/proveedor filters.

**Changes needed** (LOWER PRIORITY):
1. **Repository**: Add `findByDateRange(inicio, fin)` querying `fechaIngreso` field.
2. **Server Action**: Add optional date range parameters to `getLotes()`.
3. **Client page**: Optionally add a period filter. Less critical because lotes are typically filtered by status.

### 5.4 DataTableToolbar Enhancement

The `DataTableToolbar` currently supports:
- Global search (text)
- Column select filters (dropdown)

To add date filtering, we need to decide: **server-side or client-side**?

**Current filtering model**: Client-side (TanStack Table filters). Date filtering for Ventas/Gastos needs to be **server-side** because:
- We don't fetch all records — we fetch a subset by date range
- Client-side date filtering would require fetching ALL historical data, which defeats the purpose

**Recommended**: Date filtering should NOT go into `DataTableToolbar`. Instead, it should be a separate `PeriodSelector` component in the page header (like the dashboard), because it controls **which data gets fetched**, not **how fetched data gets displayed**.

---

## 6. Risks and Constraints

### 6.1 Client-Side to Server-Side Shift

Currently, Ventas and Gastos pages use RSC (server components) to fetch data and pass it to client components. With period selectors, the client needs to trigger refetches.

**Risk**: The dashboard already solved this — it uses client-side state + server action calls. But Ventas currently passes data as RSC props with richer structure (clientes, lotes for dropdowns).

**Mitigation**: The "reference data" (clientes, lotes for dropdowns) doesn't change with the period, so it can still be fetched once in RSC. Only the main entity (ventas/gastos) needs refetching on period change.

### 6.2 Gastos Total Calculation

The Gastos page currently shows a `totalGastos` footer calculated client-side from all displayed records. When we switch to date-filtered data, this will still work correctly (it sums only visible records). However, we need to ensure the total reflects the selected period.

### 6.3 SQLite Date Handling

SQLite stores dates as strings/numbers. Prisma handles this via `DateTime` type, but be aware:
- Date range queries with Prisma `gte`/`lte` work correctly on SQLite for ISO date strings
- The `fecha` field uses `@default(now())` which generates proper ISO timestamps

### 6.4 Missing shadcn/ui Components for Date Picker (Future)

If we ever want date range pickers (Option B), we'd need:
- `Popover` component (not installed)
- `Calendar` component (not installed)
- `date-fns` or `dayjs` dependency
- `react-day-picker` dependency

**Current status**: None of these are installed. The `components.json` uses `base-nova` style.

### 6.5 Existing `getVentasByDateRange` Already Works

The Server Action and repository method for Ventas date range already exist and are tested. This significantly reduces scope for Ventas.

---

## 7. Estimated Scope

| Task | Effort | Priority |
|------|--------|----------|
| Ventas: Add PeriodSelector + client-side refetch | S (2-3h) | P0 |
| Gastos: Add findByDateRange to repo + action + PeriodSelector | M (3-5h) | P0 |
| Gastos: Change default from "all time" to "current month" | S (1h) | P0 |
| Lotes: Add optional fechaIngreso date filter | S (1-2h) | P2 |
| DataTableToolbar: No changes needed (date filter is separate concern) | — | — |
| Documentation + testing | S (1-2h) | P1 |

**Total estimated effort**: ~1-2 days for Ventas + Gastos (P0). Lotes date filter is optional and can be deferred.

---

## 8. Key Files Inventory

| File | Role | Change Needed? |
|------|------|---------------|
| `src/components/data-table-toolbar.tsx` | Client-side table filter toolbar | No change (date filter is separate) |
| `src/components/period-selector.tsx` | Month/Year selector component | No change (reuse as-is) |
| `src/app/(dashboard)/ventas/page.tsx` | RSC page that fetches ventas data | Yes — accept searchParams or switch to client fetch |
| `src/app/(dashboard)/ventas/ventas-client-page.tsx` | Client page rendering ventas table | Yes — add PeriodSelector + refetch logic |
| `src/presentation/actions/ventas.ts` | Server actions for ventas | Minor — `getVentasByDateRange` already exists |
| `src/infrastructure/repositories/PrismaVentaRepo.ts` | Venta repository | No change — `findByDateRange` exists |
| `src/app/(dashboard)/gastos/page.tsx` | RSC page that fetches gastos data | Yes — add date parameters |
| `src/app/(dashboard)/gastos/gastos-client-page.tsx` | Client page rendering gastos table | Yes — add PeriodSelector + refetch logic |
| `src/presentation/actions/gastos.ts` | Server actions for gastos | Yes — add `getGastosByDateRange` |
| `src/infrastructure/repositories/PrismaGastoFijoRepo.ts` | Gasto repository | Yes — add `findByDateRange` method |
| `src/domain/ports/GastoFijoRepository.ts` | Repository port | Yes — add `findByDateRange` signature |
| `src/app/(dashboard)/lotes/lotes-client-page.tsx` | Client page for lotes | Optional — add fechaIngreso filter |
| `src/presentation/actions/lotes.ts` | Server actions for lotes | Optional — add date range params |
| `src/infrastructure/repositories/PrismaLoteRepo.ts` | Lote repository | Optional — add `findByDateRange` |
| `src/domain/ports/LoteRepository.ts` | Lote repository port | Optional — add `findByDateRange` signature |
| `src/app/(dashboard)/page.tsx` | Dashboard RSC page | No change |
| `src/app/(dashboard)/dashboard-client-page.tsx` | Dashboard client page | No change (reference pattern) |
| `prisma/schema.prisma` | Database schema | No change |

---

## 9. Architectural Decision: Server-Side Date Filtering

**Decision**: Date filtering MUST be server-side (Prisma `where` clause), not client-side (TanStack Table filter).

**Reasoning**:
- Ventas already fetches only current-month data — switching to client-side would require fetching ALL data first
- Gastos currently fetches all data, but over time this will grow unbounded
- Server-side filtering is the established pattern (see dashboard + `getVentasByDateRange`)
- Performance: SQLite is fine for small datasets now, but the pattern scales correctly
- The `PeriodSelector` pattern from the dashboard is proven and consistent

**This means**: The `DataTableToolbar` stays as-is for text/select column filters. The `PeriodSelector` is a separate page-level component that controls data fetching, not table display filtering.
