# Charts & Graphs — Proposal

## Intent

Add data visualization charts to the dashboard so the business owner can grasp key metrics at a glance — revenue composition, daily sales trends, top clients, inventory split, and client type breakdown — without scanning tables or raw numbers.

## Scope In

- Install recharts via `npm install recharts` and shadcn/ui chart component via `npx shadcn@latest add chart`
- Revenue composition chart (stacked bar: ingresos decomposed into costo mercancía, gastos fijos, ganancia neta)
- Daily sales trend chart (area/line chart showing daily ingresos for the selected period)
- Top clients bar chart (horizontal bar, top 5 by revenue)
- Inventory donut chart (DOBLE_CREMA vs SEMISALADO stock value)
- Client type donut chart (MAYORISTA vs MINORISTA revenue share)
- Extend `ObtenerMetricas` use case to return `ventasDiarias` and `ingresosPorTipoCliente`
- Extend `DashboardMetricasResponse` DTO and server action mapping with new fields
- Chart grid layout below KPI cards in `dashboard-client-page.tsx`
- All charts respect PeriodSelector (same period as dashboard KPI cards)
- Empty state: "Sin datos para este período" message when no data for the period
- Spanish labels on all axes, legends, tooltips; AR$ currency format

## Scope Out

- Monthly trend comparison (multi-month view)
- Dark mode / theme support for charts
- Mobile-specific chart optimization
- Per-entity detail pages with charts
- Export charts as images
- Product type revenue breakdown chart (deferred — requires Venta → Lote join)
- Chart loading skeletons (follow-up polish)

## Approach

Use **recharts** via shadcn/ui's official chart wrappers (`npx shadcn@latest add chart`). The dashboard client page is already `'use client'`, so no SSR hydration issues. Extend the existing `ObtenerMetricas` use case to compute `ventasDiarias` (group ventas by day) and `ingresosPorTipoCliente` (group ventas by cliente.tipo). Both are derived from data already fetched by `findByDateRange` — just aggregate differently. Add the new fields to `DashboardMetricasResponse` and map them in the server action. All charts rendered inline in `DashboardClientPage`, no separate component files (charts are simple enough).

## Rollback

1. Remove chart JSX from `dashboard-client-page.tsx`
2. Revert `ObtenerMetricas`, DTO, and server action to remove `ventasDiarias` and `ingresosPorTipoCliente`
3. Remove `src/components/ui/chart.tsx`
4. `npm uninstall recharts`

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| recharts React 19 peer dep mismatch | Medium | Use `--legacy-peer-deps`; recharts 2.15+ works with React 19 in practice |
| SSR hydration mismatch | Low | Charts render inside existing `'use client'` component |
| Bundle size (~55KB gzipped) | Low | Backoffice app; tree-shaking reduces actual impact |
| Empty data states | High | All chart components handle `data.length === 0` with graceful message |