# Proposal: Alertas y Notificaciones

## Intent

Add visual alerts on the dashboard for low stock and old inventory lotes, plus inline badges on the Lotes table. Users need at-a-glance awareness of inventory risks without navigating away from the dashboard.

## Scope In

- **Dashboard alert section**: Rendered between page header and MetricCards using shadcn Alert banners. One banner per active alert type, showing count and summary of affected lotes.
- **ObtenerAlertas use case**: Pure computation on active Lote data. Returns an array of `AlertaLote` objects with alert type, severity, and lote details. No new repository methods — uses existing `LoteRepository.findActive()`.
- **getAlertas Server Action**: Thin controller in `src/presentation/actions/dashboard.ts` that wires the use case and returns alert data to the server component.
- **Alert severity levels**: `warning` (amber styling) for stock bajo and inventario antiguo; `critical` (red/destructive styling) for stock crítico and inventario muy antiguo.
- **Inline badges on Lotes table**: Amber Badge for warning conditions, red/destructive Badge for critical conditions on the stock and age columns.
- **Hardcoded thresholds (Phase 1)**:
  - `STOCK_BAJO_KG = 50` — stock below 50 Kg triggers warning
  - `STOCK_CRITICO_KG = 20` — stock below 20 Kg triggers critical
  - `STOCK_CRITICO_PCT = 0.20` — stock below 20% of original purchase triggers critical
  - `DIAS_ANTIGUO = 30` — age over 30 days triggers warning
  - `DIAS_MUY_ANTIGUO = 60` — age over 60 days triggers critical
- **Deduplication**: If a lote triggers STOCK_CRITICO, do NOT also show STOCK_BAJO. Higher severity wins per dimension (stock, age).

## Scope Out

- Configurable thresholds from DB (Phase 3)
- Toast/push notifications — alerts are persistent on the dashboard, not transient
- Email alerts
- Real-time WebSocket updates
- Per-product-type thresholds
- New Prisma schema changes or migrations
- New repository methods

## Approach

1. Create `ObtenerAlertas` use case following the existing pattern (constructor-injected `LoteRepository`, pure business logic, typed result). Computation is O(n) on active lotes — trivial for <50 records.
2. Add `getAlertas()` server action alongside `getMetricas()` in `dashboard.ts`. Call in parallel with existing dashboard queries.
3. Create `DashboardAlertSection` component using shadcn `Alert` with custom amber/warning variant. Critical alerts appear first, then warnings.
4. Add stock and age badge indicators to `lote-columns.tsx` — amber for warning, red/destructive for critical.
5. Add `warning` variant to shadcn Alert component for amber styling.
6. No schema changes, no new repository methods. All data comes from `findActive()`.

## Rollback

- Remove `<DashboardAlertSection>` from `page.tsx`
- Remove `getAlertas` call from `page.tsx`
- Remove `DashboardAlertSection` component file
- Remove badge logic from `lote-columns.tsx`
- Remove `ObtenerAlertas` use case and test file
- Remove `AlertaLoteResponse` DTO
- Remove `warning` variant from Alert component
- Remove `getAlertas` action from `dashboard.ts`