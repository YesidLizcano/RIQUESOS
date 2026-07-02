# Design: Date Range Filters

**Change ID:** date-range-filters
**Date:** 2026-07-02
**Status:** Designed

---

## Architecture Decisions

### AD-01: Reuse PeriodSelector Component

**Decision**: Reuse the existing `PeriodSelector` component from the dashboard, extended with a "Todos" option.

**Rationale**: The dashboard already uses a month/year selector that triggers server-side refetches. Duplicating this pattern would violate DRY. Adding "Todos" is a small extension (one extra `SelectItem`).

**Alternative rejected**: New DatePicker component — requires `react-day-picker`, `date-fns`, `Popover`, `Calendar` — none installed. Overkill for a monthly-review business.

### AD-02: Server-Side Date Filtering

**Decision**: `PeriodSelector` controls which data gets fetched from the server (Prisma `where` clause), not which rows are shown in the table.

**Rationale**: `DataTableToolbar` filters displayed rows (client-side). Period filtering controls which rows exist in the dataset (server-side). These are separate concerns — the period changes the data source, not the display filter.

**Impact**: Period changes trigger a Server Action call that refetches data. Client-side search/select filters are preserved across period changes because they operate on the `useReactTable` state, which persists.

### AD-03: Ventas Page Restructure — Server + Client Wrapper

**Decision**: Restructure `ventas/page.tsx` as a server wrapper that fetches initial current-month data, passing it + `initialMonth`/`initialYear` to `VentasClientPage`. Client component handles period changes via `getVentasByDateRange`.

**Pattern**: Same as dashboard (`page.tsx` → `DashboardClientPage` with `initialMetricas`, `initialMonth`, `initialYear`).

**Implementation**:
- `page.tsx`: Compute current month/year, call `getVentasByDateRange(inicio, fin)` + `getClientes()` + `getLotes()`, pass as initial props.
- `ventas-client-page.tsx`: Add `PeriodSelector` in header. `handlePeriodChange` calls `getVentasByDateRange` and updates state. Client search/filters preserved across refetches.

### AD-04: Gastos Page Restructure — Same Pattern

**Decision**: Apply AD-03 pattern to Gastos page. `gastos/page.tsx` fetches initial current-month data, `gastos-client-page.tsx` handles period changes via `getGastosByDateRange`.

### AD-05: Gastos Repository Addition

**Decision**: Add `findByDateRange(inicio: Date, fin: Date): Promise<GastoFijo[]>` to `GastoFijoRepository` port. Implement in `PrismaGastoFijoRepo` using `where: { fecha: { gte: inicio, lte: fin } }` with `orderBy: { createdAt: 'desc' }`.

**Rationale**: `sumByPeriod` already queries by date range — the pattern is proven. The `findAll()` method returns all records unordered by date, so a targeted method is cleaner than filtering client-side.

### AD-06: Gastos Server Action

**Decision**: Add `getGastosByDateRange(month: number, year: number)` Server Action to `src/presentation/actions/gastos.ts`.

**Implementation**: Compute `inicio = new Date(year, month, 1)` and `fin = new Date(year, month + 1, 0, 23, 59, 59, 999)`. Call `gastoRepo.findByDateRange(inicio, fin)`. Map results to `GastoResponse[]`.

### AD-07: "Todos" Period Option

**Decision**: `PeriodSelector` gets a "Todos" `SelectItem` in the month dropdown (value `"-1"`). When month is `-1`, Server Actions skip date filtering and return all records.

**Implementation**: `getVentasByDateRange` and `getGastosByDateRange` accept `month=-1` as "all time". When `month === -1`, skip the date `where` clause and call `findAll()` (or `findByDateRange` without date constraint).

---

## Data Flow

### Period Change Sequence (Ventas)

```
User selects month/year → PeriodSelector.onPeriodChange(month, year)
→ VentasClientPage calls getVentasByDateRange(month, year)
→ Server Action: compute inicio/fin from month/year
→ PrismaVentaRepo.findByDateRange(inicio, fin)
→ Response mapped to VentaResponse[]
→ Client setState(ventas) → table re-renders with new data
→ DataTableToolbar filters (search, column selects) preserved in table state
```

### Period Change Sequence (Gastos)

Same pattern, using `getGastosByDateRange` → `GastoFijoRepository.findByDateRange` → `PrismaGastoFijoRepo`.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/ports/GastoFijoRepository.ts` | MODIFY | Add `findByDateRange(inicio, fin)` |
| `src/infrastructure/repositories/PrismaGastoFijoRepo.ts` | MODIFY | Implement `findByDateRange` with Prisma where clause |
| `src/presentation/actions/gastos.ts` | MODIFY | Add `getGastosByDateRange(month, year)` |
| `src/presentation/actions/ventas.ts` | MODIFY | Update `getVentasByDateRange` to accept `(month, year)` instead of `(Date, Date)` for "Todos" support |
| `src/components/period-selector.tsx` | MODIFY | Add "Todos" option (value `-1`) |
| `src/app/(dashboard)/ventas/page.tsx` | MODIFY | Restructure: compute current month/year, fetch initial data |
| `src/app/(dashboard)/ventas/ventas-client-page.tsx` | MODIFY | Add PeriodSelector, state management, server refetch |
| `src/app/(dashboard)/gastos/page.tsx` | MODIFY | Restructure: compute current month/year, fetch initial data |
| `src/app/(dashboard)/gastos/gastos-client-page.tsx` | MODIFY | Add PeriodSelector, state management, server refetch |