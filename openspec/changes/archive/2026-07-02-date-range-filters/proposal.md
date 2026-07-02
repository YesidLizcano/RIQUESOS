# Proposal: Date Range Filters

**Change ID:** date-range-filters
**Date:** 2026-07-02
**Status:** Proposed

---

## Intent

Add monthly period filtering (month/year) to Ventas and Gastos list pages so users can view historical data by period instead of being locked to the current month (Ventas) or seeing all-time data (Gastos).

## Problem

- **Ventas**: Hardcoded to current month only — no way to view past months' data.
- **Gastos**: Shows all-time data with no date filtering — impractical as the dataset grows.
- **Dashboard**: Already uses `PeriodSelector` for monthly filtering — proven pattern not extended to list pages.

## Scope In

- Add `PeriodSelector` to Ventas list page, connected to existing `getVentasByDateRange` Server Action.
- Add `PeriodSelector` to Gastos list page, connected to new `getGastosByDateRange` Server Action.
- Add `findByDateRange(inicio, fin)` to `GastoFijoRepository` port and `PrismaGastoFijoRepo` implementation.
- Default both pages to current month/year on initial load.
- Add "Todos" option to `PeriodSelector` for all-time data access.
- Period changes trigger server-side data refetch; client-side DataTableToolbar filters (search, select) remain independent.

## Scope Out

- Lote date filtering (P2, separate change).
- Date range picker (from-to dates) — month/year is sufficient for this business.
- Dashboard changes (already has PeriodSelector).
- DataTableToolbar modifications (date filtering is a separate concern).

## Approach

1. **Reuse PeriodSelector**: Same month/year selector from dashboard, extended with "Todos" option.
2. **Server-side filtering**: Period controls which data Prisma fetches via `where` clause, not client-side table filtering.
3. **Restructure pages**: Ventas/Gastos pages become server+client wrappers (like dashboard). Server fetches initial data for current month; client handles period changes via Server Actions.
4. **Add Gastos infrastructure**: New `findByDateRange` method on GastoFijoRepository + new `getGastosByDateRange` Server Action.

## Rollback

- Remove `PeriodSelector` from Ventas/Gastos pages.
- Revert Ventas page to hardcoded current month via `getVentas()`.
- Revert Gastos page to all-time via `getGastos()`.
- Remove `getGastosByDateRange` Server Action.
- Remove `findByDateRange` from GastoFijoRepository port and PrismaGastoFijoRepo.
- PeriodSelector "Todos" option can remain (harmless) or be removed.