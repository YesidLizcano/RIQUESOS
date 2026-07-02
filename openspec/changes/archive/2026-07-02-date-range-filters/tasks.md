# Tasks: Date Range Filters

**Change ID:** date-range-filters
**Date:** 2026-07-02
**Status:** Ready

---

## Review Workload Forecast

- Estimated changed lines: 200-350
- 400-line budget risk: Low
- Delivery strategy: single PR
- Chained PRs recommended: No

---

## Phase 1: Gastos Infrastructure

- [x] 1.1 Add `findByDateRange(inicio: Date, fin: Date): Promise<GastoFijo[]>` to `GastoFijoRepository` port (`src/domain/ports/GastoFijoRepository.ts`)
- [x] 1.2 Implement `findByDateRange` in `PrismaGastoFijoRepo` (`src/infrastructure/repositories/PrismaGastoFijoRepo.ts`) — use `where: { fecha: { gte: inicio, lte: fin } }` with `orderBy: { createdAt: 'desc' }`
- [x] 1.3 Add `getGastosByDateRange(month: number, year: number)` Server Action in `src/presentation/actions/gastos.ts` — compute inicio/fin from month/year, call repo, return `GastoResponse[]`. When `month === -1`, return all gastos (no date filter).

## Phase 2: PeriodSelector Enhancement

- [x] 2.1 Add "Todos" option to `PeriodSelector` (`src/components/period-selector.tsx`) — add `SelectItem` with value `"-1"` and label "Todos" at the top of the month dropdown
- [x] 2.2 Verify `PeriodSelector` `onPeriodChange` callback already passes `month` and `year` (it does — no change needed)

## Phase 3: Ventas Page Restructure

- [x] 3.1 Restructure `ventas/page.tsx` — compute current month/year, call `getVentasByDateRange` with computed dates for current month, fetch `clientes` and `lotes`, pass `initialVentas`, `clientes`, `lotes`, `initialMonth`, `initialYear` to `VentasClientPage`
- [x] 3.2 Add `PeriodSelector` to `ventas-client-page.tsx` — add state for `ventas`, `month`, `year`, `loading`. On period change, call `getVentasByDateRange(month, year)`. Preserve existing filters, search, and columns. Update page subtitle to show selected period.

## Phase 4: Gastos Page Restructure

- [x] 4.1 Restructure `gastos/page.tsx` — compute current month/year, call `getGastosByDateRange` for current month, pass `initialGastos`, `initialMonth`, `initialYear` to `GastosClientPage`
- [x] 4.2 Add `PeriodSelector` to `gastos-client-page.tsx` — add state for `gastos`, `month`, `year`, `loading`. On period change, call `getGastosByDateRange(month, year)`. Preserve existing total calculation and table. Update page subtitle to show selected period.

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` and verify zero type errors
- [x] 5.2 Run `npx vitest run` and verify all existing tests pass