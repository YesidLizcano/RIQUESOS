# Dashboard Metrics — Change Proposal

## Intent

Enrich the existing dashboard with operational metrics, contextual descriptions on MetricCards, and a period selector — transforming the dashboard from raw financial numbers into actionable business insights.

## Problem

The dashboard displays 5 financial MetricCards with dollar amounts but no context (no margins, no counts, no period reference). The `description` prop on MetricCard exists but is unused. Operational metrics (inventory value, sales count, active clients, kg sold) are missing. The Server Action accepts `month`/`year` params but there is no UI to change the period.

## Scope In

- Add 6 new metrics: inventory value, sales count, active clients, kg sold, gross margin %, net margin %
- Fill in MetricCard descriptions with contextual info (e.g., "15 ventas", "Margen bruto: 32%")
- Period selector component (month/year) — client component that calls Server Action with updated params
- Enrich ObtenerMetricas use case with new metric calculations
- Fix N+1 in topClientes — batch-resolve client names with `findByIds()`

## Scope Out

- Charts/graphs (separate change — requires chart library decision)
- Date range filters (beyond single month/year)
- Real-time updates or caching
- Product/client type breakdowns
- Period-over-period comparison deltas
- Delivery (domicilio) metrics

## Approach

1. **Enrich existing use case** — Add new calculations to `ObtenerMetricas` using existing repository methods. Compute margins via Dinero value objects. Inventory value from active lotes' `costoRealPorKg × cantidadDisponible`. Sales count, kg sold, active clients from existing `findByDateRange` venta data.
2. **Expand DTO** — Add new fields to `MetricasPeriodoResponse` and add `InventarioResumenResponse` for inventory value/lotes count.
3. **Fill descriptions** — Pass calculated context strings to MetricCard `description` prop (already exists, just unused).
4. **Period selector** — New client component `PeriodSelector` with month/year selects. Dashboard restructured as server wrapper + client component for reactivity.
5. **Batch N+1 fix** — Add `findByIds(ids: string[])` to `ClienteRepository` port and `PrismaClienteRepo`. Replace per-client loop in topClientes resolution.

## Rollback

- Remove new MetricCards from dashboard page
- Remove PeriodSelector component
- Revert page.tsx to server-only component
- Remove `findByIds` from repository port and implementation
- Revert DTO additions (new fields become optional or are removed)
- Revert use case additions (new calculations removed)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Margin % division by zero (zero revenue) | Medium | Low | Return "N/A" or "0%" when ingresoTotal is zero |
| Period selector causes full re-render | Low | Medium | Server Action call re-fetches only metricas data |
| N+1 fix breaks existing topClientes | Low | Medium | findByIds returns same entities; fallback to findById if empty |

## Estimated Effort

- Use case enrichment: ~1.5h
- DTO + repository changes: ~45min
- Server Action updates: ~30min
- UI components (PeriodSelector, descriptions, restructuring): ~2h
- **Total: ~4-5h, ~250-400 lines changed**