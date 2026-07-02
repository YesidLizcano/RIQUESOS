# Dashboard Metrics — Technical Design

## Architecture Decisions

### AD-01: Enrich ObtenerMetricas Use Case

Add all new metric calculations to the existing `ObtenerMetricas.execute()` method rather than creating separate use cases. Rationale: all metrics share the same period context and data sources. A single use case call avoids redundant queries.

New calculations added after existing financial metrics:
- `ventasCount`: count of ventas from `findByDateRange` (already fetched for topClientes)
- `clientesActivos`: `new Set(ventas.map(v => v.clienteId)).size`
- `kgVendidos`: sum of `venta.cantidadVendidaKg` from ventas
- `margenBrutoPct`: `gananciaBruta / ingresoTotal * 100` (or "N/A" if zero)
- `margenNetoPct`: `gananciaNeta / ingresoTotal * 100` (or "N/A" if zero)
- `inventarioValor`: sum of `lote.costoRealCalculadoKg × lote.stockDisponibleKg` across active lotes (already fetched)

### AD-02: MetricCard Descriptions

Each existing and new MetricCard receives a `description` string computed in the dashboard page component. The MetricCard component already supports `description?: string` — no interface change needed. Descriptions are derived from the DTO response data.

### AD-03: Period Selector Component

Create `PeriodSelector` as a client component (`'use client'`) with two `<Select>` dropdowns (month 1-12, year current-2 to current). On change, it calls `getMetricas(month, year)` Server Action and passes the result up via callback.

### AD-04: Dashboard Restructure — Server + Client Split

Current `page.tsx` is a server component. Restructure into:
- `page.tsx` (server component) — fetches initial data, renders `<DashboardClient>` with initial data
- `dashboard-client-page.tsx` (client component) — receives initial data as props, manages period state, calls Server Action on period change, renders all MetricCards + PeriodSelector

This follows Next.js Server Actions pattern: server component provides initial load, client component handles interactivity.

### AD-05: Batch N+1 Fix — findByIds

Add `findByIds(ids: string[]): Promise<Cliente[]>` to `ClienteRepository` port. Implement in `PrismaClienteRepo` using `prisma.cliente.findMany({ where: { id: { in: ids } } })`. Replace the per-client loop in `ObtenerMetricas` with a single `findByIds` call + Map lookup.

### AD-06: Expanded DTO

Extend `MetricasPeriodoResponse` with new fields:

```typescript
interface MetricasPeriodoResponse {
  // existing
  ingresoTotal: string;
  costoMercancia: string;
  gananciaBruta: string;
  gastosFijos: string;
  gananciaNeta: string;
  // new
  ventasCount: number;
  clientesActivos: number;
  kgVendidos: string;
  margenBrutoPct: string;   // "32.5" or "N/A"
  margenNetoPct: string;    // "15.2" or "N/A"
}
```

Add new `InventarioResumenResponse`:

```typescript
interface InventarioResumenResponse {
  valorTotal: string;       // sum of stockKg × costoRealKg
  lotesActivos: number;
}
```

Extend `DashboardMetricasResponse` to include `inventarioResumen: InventarioResumenResponse`.

### AD-07: No Chart Library

This change adds only numeric MetricCards. Charts require a separate decision (bundle size, library choice).

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/application/use-cases/ObtenerMetricas.ts` | MODIFY | Add new metric calculations, batch topClientes, expand return type |
| `src/domain/ports/ClienteRepository.ts` | MODIFY | Add `findByIds(ids: string[]): Promise<Cliente[]>` |
| `src/domain/ports/index.ts` | MODIFY | (no change needed — already exports ClienteRepository) |
| `src/infrastructure/repositories/PrismaClienteRepo.ts` | MODIFY | Implement `findByIds()` using `findMany({ where: { id: { in: ids } } })` |
| `src/presentation/dtos/dashboard.dto.ts` | MODIFY | Expand MetricasPeriodoResponse, add InventarioResumenResponse |
| `src/presentation/dtos/index.ts` | MODIFY | Add InventarioResumenResponse export |
| `src/presentation/actions/dashboard.ts` | MODIFY | Map new DTO fields from use case output |
| `src/components/dashboard-metric-card.tsx` | NO CHANGE | Already supports `description` prop |
| `src/components/period-selector.tsx` | CREATE | Month/year selector client component |
| `src/app/(dashboard)/dashboard-client-page.tsx` | CREATE | Client component for period changes |
| `src/app/(dashboard)/page.tsx` | MODIFY | Restructure to server wrapper + client component, add new MetricCards with descriptions |

---

## Data Flow

```
page.tsx (server)
  → getMetricas(currentMonth, currentYear)
  → render <DashboardClientPage initialMetricas={...} />

DashboardClientPage (client)
  → renders MetricCards with descriptions + PeriodSelector
  → onPeriodChange(month, year)
    → getMetricas(month, year) [Server Action]
    → setState(newMetricas)
    → re-render MetricCards
```