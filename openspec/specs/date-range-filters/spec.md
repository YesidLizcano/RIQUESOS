# Spec: Date Range Filters

**Change ID:** date-range-filters
**Date:** 2026-07-02
**Status:** Specified

---

## Functional Requirements

### FR-01: Ventas Period Filter

The Ventas list page SHALL display a `PeriodSelector` (month/year) above the `DataTableToolbar`. When the user changes the period, the page SHALL refetch ventas data from the server using `getVentasByDateRange(inicio, fin)`. The page SHALL default to the current month/year on initial load.

**Scenario**: User views past month's ventas
- Given the Ventas page is loaded with current month data
- When the user selects "Marzo" and "2025" in the PeriodSelector
- Then the page SHALL call `getVentasByDateRange(2025-03-01, 2025-03-31)` and display only March 2025 ventas

### FR-02: Gastos Period Filter

The Gastos list page SHALL display a `PeriodSelector` (month/year) above the `DataTableToolbar`. When the user changes the period, the page SHALL refetch gastos data from the server using `getGastosByDateRange(month, year)`. The page SHALL default to the current month/year on initial load.

**Scenario**: User filters gastos by period
- Given the Gastos page is loaded with current month data
- When the user selects "Enero" and "2026" in the PeriodSelector
- Then the page SHALL call `getGastosByDateRange(0, 2026)` and display only January 2026 gastos

### FR-03: Gastos findByDateRange Repository Method

The `GastoFijoRepository` port SHALL include `findByDateRange(inicio: Date, fin: Date): Promise<GastoFijo[]>`. `PrismaGastoFijoRepo` SHALL implement it using Prisma `where: { fecha: { gte: inicio, lte: fin } }`, ordering results by `createdAt DESC`.

**Scenario**: Repository returns gastos within date range
- Given gastos exist on Jan 15, Feb 10, and Mar 5
- When `findByDateRange(Jan 1, Jan 31)` is called
- Then only the Jan 15 gasto SHALL be returned

### FR-04: Gastos Server Action

A new `getGastosByDateRange(month: number, year: number)` Server Action SHALL exist, following the same pattern as `getVentasByDateRange`. It SHALL compute `inicio` and `fin` dates from the month/year parameters, call `gastoRepo.findByDateRange(inicio, fin)`, and return the results as `GastoResponse[]`.

**Scenario**: Server action returns filtered gastos
- Given `getGastosByDateRange(5, 2026)` is called (June 2026)
- Then the action SHALL compute inicio=2026-06-01, fin=2026-06-30
- And SHALL return only gastos within that date range

### FR-05: Period and Client-Side Filter Independence

Period selection (server-side data fetching) and `DataTableToolbar` filters (client-side search and column selects) SHALL operate independently. Changing the period SHALL preserve current text/search filter state. Changing text/search filters SHALL NOT trigger a server refetch.

**Scenario**: Period change preserves search
- Given the user has typed "queso" in the search bar on Ventas page
- When the user changes the period from June to May
- Then May ventas SHALL be fetched and displayed, with "queso" filter still applied

### FR-06: Default Period and "Todos" Option

Both Ventas and Gastos pages SHALL default to the current month/year on initial load. The `PeriodSelector` SHALL include a "Todos" option that fetches all records without date filtering. When "Todos" is selected, the Server Action SHALL skip the date `where` clause and return all records.

**Scenario**: User views all-time data
- Given the Ventas page shows current month data
- When the user selects "Todos" in the PeriodSelector
- Then `getVentasByDateRange` SHALL be called with a special flag (month=-1) indicating no date filter
- And all ventas SHALL be displayed

---

## Non-Functional Requirements

**NFR-01**: Date filtering SHALL be server-side (Prisma `where` clause), not client-side filtering of pre-fetched data.

**NFR-02**: Period changes SHALL use Server Actions for data refetch, not full page reloads.

**NFR-03**: The `PeriodSelector` component SHALL be reused from the dashboard implementation, not duplicated.