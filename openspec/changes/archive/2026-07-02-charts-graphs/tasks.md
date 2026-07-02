# Charts & Graphs — Task Breakdown

## Phase 1: Dependencies

- [x] 1.1 Install recharts: `npm install recharts --legacy-peer-deps`
- [x] 1.2 Install shadcn chart component: `npx shadcn@latest add chart`

## Phase 2: Use Case Extension

- [x] 2.1 Extend `ObtenerMetricas` to compute `ventasDiarias` — group ventas by `fecha.toDateString()`, sum `ingresoTotal` per day, fill gaps for days with zero sales
- [x] 2.2 Extend `ObtenerMetricas` to compute `ingresosPorTipoCliente` — group ventas by client `tipo` (MAYORISTA/MINORISTA), sum `ingresoTotal` per type, fetch all relevant clients
- [x] 2.3 Extend `DashboardMetricasResponse` DTO with `ventasDiarias: VentasDiariasResponse[]` and `ingresosPorTipoCliente: IngresosPorTipoClienteResponse[]` + map in server action

## Phase 3: Chart Components

- [x] 3.1 Create revenue composition chart — stacked bar showing ingresos decomposed into costo mercancía, ganancia bruta, gastos fijos, ganancia neta
- [x] 3.2 Create daily sales trend chart — area chart with daily revenue for period, X-axis dates, Y-axis AR$, zero-value points for days without sales
- [x] 3.3 Create top clients bar chart — horizontal bar, top 5 by revenue, client names on Y-axis
- [x] 3.4 Create inventory donut chart — DOBLE_CREMA vs SEMISALADO stock value, total in center
- [x] 3.5 Create client type donut chart — MAYORISTA vs MINORISTA revenue, total in center

## Phase 4: Dashboard Integration

- [x] 4.1 Add chart grid layout to `dashboard-client-page.tsx` — 3 rows below KPI cards: Row 1 full-width revenue composition, Row 2 daily trend (left) + top clients (right), Row 3 inventory donut (left) + client type donut (right)
- [x] 4.2 Wire chart data to PeriodSelector — charts refresh when period changes (same state flow as KPI cards, no additional wiring needed beyond passing `metricas` fields)

## Phase 5: Empty States & Polish

- [x] 5.1 Add "Sin datos para este período" empty state to all charts — centered message when data array is empty, match existing DataTable empty state pattern
- [x] 5.2 Spanish labels on all axes, legends, tooltips — currency format AR$ using `toLocaleString('es-AR')`, date format "DD/MM"

## Phase 6: Verification

- [x] 6.1 Run `npx tsc --noEmit` and verify zero type errors
- [x] 6.2 Run `npx vitest run` and verify all tests pass (add unit tests for `ventasDiarias` and `ingresosPorTipoCliente` computation in `ObtenerMetricas`)

---

## Review Workload Forecast

- **Estimated changed lines**: 400–600
- **400-line budget risk**: Medium (charts add significant JSX)
- **Delivery strategy**: `size:exception` (single PR, solo developer)
- **Chain strategy**: N/A — single PR