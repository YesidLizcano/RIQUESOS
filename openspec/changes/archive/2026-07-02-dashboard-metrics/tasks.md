# Dashboard Metrics — Task Breakdown

## Phase 1: Use Case Enrichment

- [x] 1.1 Add inventory value calculation to `ObtenerMetricas` — sum of active lotes' `costoRealCalculadoKg × cantidadDisponibleKg`, return as `inventarioValor`
- [x] 1.2 Add sales count, active clients count, and kg sold calculations to `ObtenerMetricas` — derive from existing `ventas` array: `ventas.length`, `new Set(ventas.map(v => v.clienteId)).size`, sum of `cantidadVendidaKg`
- [x] 1.3 Add gross margin % and net margin % calculations to `ObtenerMetricas` — `gananciaBruta / ingresoTotal * 100` and `gananciaNeta / ingresoTotal * 100`, return "N/A" when ingresoTotal is zero
- [x] 1.4 Fix N+1 in topClientes — add `findByIds(ids: string[])` to `ClienteRepository` port and `PrismaClienteRepo`, replace per-client loop with batch resolve

## Phase 2: DTO & Repository

- [x] 2.1 Expand `MetricasPeriodoResponse` in `dashboard.dto.ts` with: `ventasCount`, `clientesActivos`, `kgVendidos`, `margenBrutoPct`, `margenNetoPct`
- [x] 2.2 Add `InventarioResumenResponse` to `dashboard.dto.ts` with: `valorTotal`, `lotesActivos`; add `inventarioResumen` field to `DashboardMetricasResponse`
- [x] 2.3 Implement `findByIds()` in `PrismaClienteRepo` using `prisma.cliente.findMany({ where: { id: { in: ids } } })`

## Phase 3: Server Action

- [x] 3.1 Update `getMetricas` Server Action in `dashboard.ts` to map all new DTO fields from use case output (ventasCount, clientesActivos, kgVendidos, margenBrutoPct, margenNetoPct, inventarioResumen)

## Phase 4: UI Components

- [x] 4.1 Create `src/components/period-selector.tsx` — client component with month (0-11) and year dropdowns, calls `onPeriodChange(month, year)` callback
- [x] 4.2 Create `src/app/(dashboard)/dashboard-client-page.tsx` — client component receiving `initialMetricas` as props, managing period state, calling Server Action on period change, rendering all MetricCards with descriptions + PeriodSelector
- [x] 4.3 Restructure `src/app/(dashboard)/page.tsx` — server component fetches initial data, renders `<DashboardClientPage>` with descriptions on each MetricCard, adds new MetricCards (inventory value, kg sold, active clients)

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` and verify zero type errors
- [x] 5.2 Run `npx vitest run` and verify all tests pass (including ObtenerMetricas tests)

---

## Review Workload Forecast

- Estimated changed lines: 250-400
- 400-line budget risk: Low
- Delivery strategy: single PR