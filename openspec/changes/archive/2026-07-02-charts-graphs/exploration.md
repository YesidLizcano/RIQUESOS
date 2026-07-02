# Charts & Graphs — Exploration Document

## 1. Current State Analysis

### 1.1 Dashboard Layout (`src/app/(dashboard)/dashboard-client-page.tsx`)

The dashboard is a **client component** that receives `initialMetricas` from the server page and manages period state locally. Current layout (top to bottom):

1. **Header row** — "Dashboard" title + `PeriodSelector` (month/year dropdowns)
2. **Financial Summary** — 5 `MetricCard`s in `grid-cols-1 md:3 lg:5`:
   - Ingresos, Costo Mercancía, Ganancia Bruta, Gastos Fijos, Ganancia Neta
3. **Sales & Inventory** — 5 `MetricCard`s in same grid:
   - Inventario Valor, Ventas, Clientes Activos, Kg Vendidos, Lotes Activos
4. **Data Tables** — 2-column grid:
   - Left: Inventario por Producto (DataTable)
   - Right: Top Clientes (DataTable)

**Key observation:** The server page (`page.tsx`) also renders a separate **Lotes** table below `DashboardClientPage`. This means the dashboard client page is nested inside a parent that appends more content.

### 1.2 Available Data (`DashboardMetricasResponse`)

The current DTO returns:

```typescript
interface DashboardMetricasResponse {
  periodo: MetricasPeriodoResponse;
  //   ingresoTotal, costoMercancia, gananciaBruta, gastosFijos, gananciaNeta,
  //   ventasCount, clientesActivos, kgVendidos, margenBrutoPct, margenNetoPct
  inventario: InventarioPorProductoResponse[];
  //   { producto, stockDisponibleKg, lotesActivos }[]
  inventarioResumen: InventarioResumenResponse;
  //   { valorTotal, lotesActivos }
  topClientes: TopClienteResponse[];
  //   { clienteId, nombre, ingresoTotal }[]
}
```

### 1.3 Domain Model & Query Capabilities

**Entities relevant to charts:**

| Entity | Key Fields for Charts |
|--------|-----------------------|
| **Venta** | `fecha`, `clienteId`, `loteId`, `cantidadVendidaKg`, `precioVentaKg`, `ingresoTotal`, `costoAplicado`, `gananciaBruta`, `valorDomicilio` |
| **Lote** | `producto` (DOBLE_CREMA / SEMISALADO), `stockDisponibleKg`, `costoRealCalculadoKg`, `estado` (ACTIVO / AGOTADO) |
| **Cliente** | `tipo` (MAYORISTA / MINORISTA), `nombre` |
| **GastoFijo** | `fecha`, `concepto`, `valor` |

**Prisma Schema enums:**
- `TipoProducto`: `DOBLE_CREMA`, `SEMISALADO` (only 2 product types — this is important for chart design)
- `TipoCliente`: `MAYORISTA`, `MINORISTA` (only 2 client types)
- `EstadoLote`: `ACTIVO`, `AGOTADO`

**Current repository methods that support charts:**
- `VentaRepository.findByDateRange(inicio, fin)` — returns full `Venta[]` with all fields
- `VentaRepository.sumIngresosByPeriod(inicio, fin)` — single aggregate
- `VentaRepository.sumCostosByPeriod(inicio, fin)` — single aggregate
- `LoteRepository.findActive()` — returns all active lotes with product type
- `ClienteRepository.findByIds(ids)` — batch name resolution

### 1.4 What Data is Already Available for Charts (No New Queries)

These chart data sources can be computed from **existing query results** already fetched by `ObtenerMetricas`:

| Chart Data | Source | How to Derive |
|------------|--------|---------------|
| **Top clients by revenue** | `topClientes[]` | Direct — already sorted, top 5 |
| **Inventory by product** | `inventario[]` | Direct — product name + stock Kg |
| **Revenue vs. cost breakdown** | `periodo` object | `ingresoTotal`, `costoMercancia`, `gananciaBruta`, `gastosFijos`, `gananciaNeta` — waterfall or stacked bar |

### 1.5 What Data Requires New Queries or Computation

| Chart Data | New Query Needed | Complexity |
|------------|-----------------|------------|
| **Daily sales trend (per day in month)** | Yes — need `ventas` grouped by day within period. Currently `findByDateRange` returns all ventas but they're only used for topClientes aggregation. Need to group by `fecha.toDateString()`. | Low — can compute client-side from existing `findByDateRange` result |
| **Revenue by product type** (Doble Crema vs. Semisalado) | Yes — need to join Venta → Lote to get `producto` type. Currently not in the use case. | Medium — requires modifying `ObtenerMetricas` or adding a new query method |
| **Revenue by client type** (Mayorista vs. Minorista) | Yes — need to join Venta → Cliente to get `tipo`. Currently not in the use case. | Medium — requires modifying `ObtenerMetricas` or adding a new query method |
| **Monthly trend** (last 6-12 months) | Yes — need to call metrics for multiple months. Currently only one period at a time. | Medium — new use case or multiple calls |
| **Gastos breakdown by concepto** | Yes — need `GastoFijoRepository` to group by concepto. Currently only `sumByPeriod` exists. | Medium — new repository method |

### 1.6 No Chart Library Installed

Current `package.json` dependencies include **no charting library**. The project uses:
- React 19.1
- Next.js 15.4.2
- Tailwind CSS 4.3.2
- shadcn/ui 4.12.0 (with `@base-ui/react` as base)
- Prisma 6.13 + SQLite

---

## 2. Chart Type Recommendations for a Cheese Distributor Backoffice

### 2.1 Priority 1 — Charts That Use Existing Data

#### Chart 1: Revenue Composition (Waterfall / Stacked Bar)

**Why:** The owner needs to see at a glance how revenue breaks down into cost of goods and profit margins. This is the most critical financial visualization for a small business.

**Data:** Already in `periodo` object:
- `ingresoTotal`, `costoMercancia`, `gananciaBruta`, `gastosFijos`, `gananciaNeta`

**Chart type:** Waterfall chart (revenue → subtract COGS → gross profit → subtract fixed costs → net profit) or simple stacked bar.

**Where:** Below the financial MetricCards, full width.

#### Chart 2: Top Clients Bar Chart

**Why:** Visual comparison is faster than scanning a table. Shows revenue concentration risk (e.g., 80% revenue from 2 clients).

**Data:** Already in `topClientes[]` — `nombre` + `ingresoTotal`.

**Chart type:** Horizontal bar chart (client name on Y-axis, revenue on X-axis).

**Where:** Replace or augment the Top Clients DataTable.

#### Chart 3: Inventory Distribution (Donut / Pie)

**Why:** With only 2 product types (Doble Crema, Semisalado), a donut chart immediately shows stock proportions. Simple and effective.

**Data:** Already in `inventario[]` — `producto` + `stockDisponibleKg`.

**Chart type:** Donut/pie chart. Center text shows total stock Kg.

**Where:** Replace or augment the Inventory DataTable.

### 2.2 Priority 2 — Charts Requiring Minor New Computation

#### Chart 4: Daily Sales Trend (Line Chart)

**Why:** See which days have the most sales within the selected month. Spot slow periods and peak days.

**Data:** Currently `findByDateRange` returns all `Venta[]` with `fecha`. We can group them client-side by day without a new repository method.

**Chart type:** Line chart with daily data points. X-axis = days 1-28/30/31, Y-axis = daily revenue.

**Where:** Below the financial cards, full width.

**Implementation note:** The `ObtenerMetricas` use case already calls `ventaRepo.findByDateRange()` — it just doesn't return the individual ventas to the DTO. Two options:
1. Add a `ventasDiarias` field to the response that groups ventas by day (computed in the use case)
2. Create a new use case or add a new server action specifically for chart data

Option 1 is simpler but increases response payload. Option 2 is cleaner (separation of concerns) but adds more files.

**Recommendation:** Option 2 — a lightweight `ObtenerVentasDiarias` use case or just a new server action that computes daily aggregation. Keeps the existing DTO clean.

#### Chart 5: Client Type Breakdown (Donut)

**Why:** Understand what proportion of revenue comes from wholesale (Mayorista) vs. retail (Minorista) clients.

**Data:** Requires joining Venta → Cliente.tipo. Currently not available. Need to either:
- Enrich `topClientes` with `tipo` field
- Add a new `ventasPorTipoCliente` aggregation in `ObtenerMetricas`

**Chart type:** Donut chart with 2 segments (Mayorista revenue %, Minorista revenue %).

**Where:** Next to the inventory donut, in a 2-column grid.

### 2.3 Priority 3 — Charts Requiring Significant New Work

#### Chart 6: Monthly Revenue Trend (Multi-line)

**Why:** Compare revenue, cost, and profit across multiple months to spot seasonal patterns.

**Data:** Requires calling metrics for 6-12 months. This is a new feature entirely.

**Chart type:** Multi-line chart (revenue line, cost line, profit line) with month on X-axis.

**Where:** Full width, top of dashboard (above current cards).

**Complexity:** High — needs a new `ObtenerTendenciaMensual` use case, potentially caching, and careful handling of empty months.

#### Chart 7: Product Type Revenue Breakdown (Bar)

**Why:** See which product type generates more revenue and track the mix over time.

**Data:** Requires Venta → Lote join to get `producto` type. New repository query needed.

**Chart type:** Grouped bar chart (Doble Crema vs. Semisalado revenue per month, or just for the current period).

---

## 3. Chart Library Comparison

### 3.1 recharts

| Aspect | Assessment |
|--------|-----------|
| **Bundle size** | ~180KB minified, ~55KB gzipped (tree-shakeable) |
| **React 19 compat** | Official support since v2.12+. May require `--legacy-peer-deps` or `--force` on install due to peer dep declarations. |
| **Next.js 15 SSR** | Requires `'use client'` directive. No native RSC support. Must wrap in dynamic import with `ssr: false` to avoid hydration mismatches from computed SVG dimensions. |
| **shadcn/ui integration** | shadcn/ui officially provides chart components built ON TOP of recharts (`shadcn@latest add chart`). This is the path of least resistance. |
| **Chart types** | Line, Bar, Area, Pie, Donut, Radar, Radial, Composed — all the types needed. |
| **Customization** | Excellent — full access to SVG props, responsive containers, tooltips, legends. |
| **Community** | Largest React chart library (23K+ GitHub stars). Most examples and tutorials. |
| **TypeScript** | Good type support, though some advanced compositions require manual typing. |

### 3.2 chart.js + react-chartjs-2

| Aspect | Assessment |
|--------|-----------|
| **Bundle size** | ~70KB min+gzip (core + common charts), but less tree-shakeable than recharts |
| **React 19 compat** | `react-chartjs-2` v5 has React 18 peer dep. May need `--force`. |
| **Next.js 15 SSR** | Canvas rendering — needs `ssr: false` dynamic import. No RSC. |
| **shadcn/ui integration** | No official shadcn chart components. Would need custom wrappers. |
| **Chart types** | All standard types plus many plugins. |
| **Customization** | Very customizable, but imperative API (options object) is less React-idiomatic. |
| **Community** | Huge (65K+ GitHub stars for chart.js itself). |
| **TypeScript** | Type definitions available but less intuitive than recharts for React. |

### 3.3 visx (by Airbnb)

| Aspect | Assessment |
|--------|-----------|
| **Bundle size** | ~30-40KB per component (tree-shakeable, you only import what you use) |
| **React 19 compat** | Maintained by Airbnb. React 19 compat unclear — last major release was 2022. |
| **Next.js 15 SSR** | SVG-based, needs `'use client'`. No RSC. |
| **shadcn/ui integration** | None. You build everything from low-level primitives. |
| **Chart types** | Low-level primitives only — you compose your own charts. |
| **Customization** | Maximum flexibility, but requires significant effort per chart. |
| **Community** | Smaller community (18K stars). Fewer examples. |
| **TypeScript** | Written in TypeScript, excellent types. |

### 3.4 Recommendation: recharts

**Why recharts wins for this project:**

1. **shadcn/ui has official chart components built on recharts.** Running `shadcn@latest add chart` gives you pre-built, styled chart wrappers that match the project's design system perfectly. This eliminates 70% of the styling and responsiveness work.

2. **The project uses shadcn/ui 4.12.0 and `@base-ui/react`** — recharts via shadcn charts is the intended path.

3. **Chart types needed are basic** (bar, line, donut, waterfall). Recharts handles all of these natively. We don't need visx's low-level primitives.

4. **Bundle size is acceptable.** 55KB gzipped for the most common chart types. For a backoffice app (not a public-facing marketing site), this is fine. Tree-shaking means we only pay for what we import.

5. **The SSR concern is solvable.** Charts will be in a `'use client'` component anyway (the dashboard client page already is). Use `next/dynamic` with `ssr: false` for chart wrappers to avoid hydration issues.

**Installation:**
```bash
npm install recharts
npx shadcn@latest add chart
```

This gives us `src/components/ui/chart.tsx` with pre-styled `ChartContainer`, `ChartTooltip`, `ChartLegend`, and chart config helpers.

---

## 4. Recommended Dashboard Layout with Chart Placement

### 4.1 Layout Overview

```
┌─────────────────────────────────────────────────────┐
│  Dashboard Title                     [PeriodSelector] │
├─────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │Rev │ │COGS│ │Gross│ │Fix │ │Net │  Financial KPIs │
│  └────┘ └────┘ └────┘ └────┘ └────┘                 │
├─────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │Inv │ │Vtas│ │Cli │ │Kg  │ │Lots│  Operational KPIs │
│  └────┘ └────┘ └────┘ └────┘ └────┘                 │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐    │
│  │  Revenue Composition Chart (Waterfall/Stack) │    │
│  │  Shows: Revenue → -COGS → Gross → -Fixed → Net│   │
│  └──────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌───────────────────────┐│
│  │  Daily Sales Trend     │ │  Top Clients Bar       ││
│  │  (Line chart)          │ │  (Horizontal bar)      ││
│  └───────────────────────┘ └───────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌───────────────────────┐│
│  │  Inventory Donut       │ │  Client Type Donut     ││
│  │  (Doble Crema vs Semi) │ │  (Mayorista vs Minor)  ││
│  └───────────────────────┘ └───────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌───────────────────────┐│
│  │  Inventory Table       │ │  Top Clients Table      ││
│  │  (existing)            │ │  (existing)             ││
│  └───────────────────────┘ └───────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐    │
│  │  Lotes Table (existing, from server page)     │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 4.2 Component Architecture

```
dashboard-client-page.tsx
  ├── PeriodSelector (existing)
  ├── MetricCards x10 (existing, 2 rows)
  ├── RevenueCompositionChart (NEW — 'use client')
  │     └── uses recharts BarChart with waterfall style
  ├── DailySalesTrendChart (NEW — 'use client')
  │     └── uses recharts LineChart / AreaChart
  ├── TopClientsBarChart (NEW — 'use client')
  │     └── uses recharts BarChart (horizontal)
  ├── InventoryDonutChart (NEW — 'use client')
  │     └── uses recharts PieChart
  ├── ClientTypeDonutChart (NEW — 'use client')
  │     └── uses recharts PieChart
  └── DataTables (existing)
```

Each chart component:
- Receives data as props (no internal fetching)
- Is a `'use client'` component (required for recharts)
- Uses shadcn/ui `ChartContainer` wrapper
- Has responsive container (`ResponsiveContainer` from recharts)

### 4.3 Chart-PeriodSelector Interaction

All charts within `DashboardClientPage` automatically respond to period changes because:
1. `DashboardClientPage` holds `metricas` state
2. `handlePeriodChange` calls `getMetricas(month, year)` Server Action
3. On response, `setMetricas(newData)` triggers re-render
4. All child components (cards + charts) receive new data via props

**For daily trend data**, the server action needs to return daily breakdown. Options:
- Add a `ventasDiarias` field to the existing `DashboardMetricasResponse`
- Create a separate `getVentasDiarias(month, year)` server action

**Recommendation:** Extend the existing DTO with a new `VentasDiariasResponse` array. This avoids an extra network round-trip.

---

## 5. Risks and Constraints

### 5.1 SSR / Hydration

| Risk | Severity | Mitigation |
|------|----------|-----------|
| recharts uses DOM calculations for SVG sizing | **High** | Wrap all chart components in `next/dynamic` with `ssr: false`, OR ensure they're only rendered in client components (the dashboard client page already is `'use client'`) |
| Recharts `ResponsiveContainer` needs a parent with defined height | **Medium** | Always set explicit `height` on chart container div (e.g., `h-[300px]`) |
| Hydration mismatch from computed styles | **Low** | Use `suppressHydrationWarning` if needed, but dynamic import with `ssr: false` avoids this entirely |

### 5.2 Bundle Size

| Library | Minified | Gzipped | Tree-shakeable |
|---------|----------|---------|----------------|
| recharts (full) | ~450KB | ~110KB | Partial |
| recharts (used charts only) | ~180KB | ~55KB | Yes |
| shadcn chart helpers | ~5KB | ~2KB | Yes |

**Impact:** For a backoffice app, 55KB gzipped is acceptable. The app is not a public-facing marketing page where every KB matters. The charts add genuine business value.

### 5.3 Mobile Responsiveness

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Charts unreadable on small screens | **Medium** | Use `ResponsiveContainer` with `minHeight` instead of fixed height. On mobile, stack charts vertically. Use `hidden md:block` for less critical charts on small screens. |
| Donut charts with 2 segments are fine on mobile | **Low** | Recharts PieChart renders well at 300px width. |

### 5.4 Data Freshness

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Charts show stale data after period change | **Low** | Already handled by the existing `loading` state in `DashboardClientPage`. Add a loading skeleton for charts. |
| No real-time updates | **None** | A cheese distributor's backoffice doesn't need real-time. Period selector refresh is sufficient. |

### 5.5 Empty Data States

| Risk | Severity | Mitigation |
|------|----------|-----------|
| New month with no sales | **High** | All chart components must handle `data.length === 0` gracefully — show an empty state message ("No hay datos para este período") instead of a broken chart. |
| Single data point | **Low** | Line chart with 1 point looks odd but doesn't break. Show "Not enough data for a trend" message for < 2 points. |

### 5.6 React 19 Compatibility

| Risk | Severity | Mitigation |
|------|----------|-----------|
| recharts peer dependency declares React 18 | **Medium** | Use `npm install recharts --legacy-peer-deps` or `--force`. Recharts 2.15+ works with React 19 in practice. Check for updates. |
| shadcn/ui chart components may need React 19 adjustment | **Low** | shadcn 4.12+ supports React 19. Chart components are generated into `src/components/ui/chart.tsx` — we can modify if needed. |

---

## 6. New Data Structures Needed

### 6.1 Daily Sales Breakdown (for trend line chart)

```typescript
// Add to dashboard.dto.ts
export interface VentasDiariasResponse {
  fecha: string;        // "2026-07-01"
  ingresoTotal: string;  // daily revenue
  costoTotal: string;    // daily COGS
  gananciaBruta: string; // daily gross profit
  ventasCount: number;   // number of sales that day
  kgVendidos: string;    // daily kg sold
}
```

### 6.2 Revenue by Product Type (for product breakdown chart)

```typescript
export interface IngresosPorTipoProductoResponse {
  tipoProducto: string;  // "DOBLE_CREMA" | "SEMISALADO"
  ingresoTotal: string;
  costoTotal: string;
  kgVendidos: string;
}
```

### 6.3 Revenue by Client Type (for client type donut)

```typescript
export interface IngresosPorTipoClienteResponse {
  tipoCliente: string;   // "MAYORISTA" | "MINORISTA"
  ingresoTotal: string;
  clientesCount: number;
}
```

### 6.4 Extended DashboardMetricasResponse

```typescript
export interface DashboardMetricasResponse {
  periodo: MetricasPeriodoResponse;           // existing
  inventario: InventarioPorProductoResponse[]; // existing
  inventarioResumen: InventarioResumenResponse; // existing
  topClientes: TopClienteResponse[];           // existing
  // NEW:
  ventasDiarias: VentasDiariasResponse[];
  ingresosPorProducto: IngresosPorTipoProductoResponse[];
  ingresosPorTipoCliente: IngresosPorTipoClienteResponse[];
}
```

---

## 7. Implementation Scope Estimate

### 7.1 Phase 1: Foundation + Existing Data Charts (4-6 hours)

| Task | Effort | Files |
|------|--------|-------|
| Install recharts + shadcn chart components | 15 min | `package.json`, `src/components/ui/chart.tsx` |
| Create `RevenueCompositionChart` (waterfall/stacked bar from `periodo` data) | 1.5 hr | New `src/components/charts/revenue-composition-chart.tsx` |
| Create `TopClientsBarChart` (horizontal bar from `topClientes`) | 1 hr | New `src/components/charts/top-clients-bar-chart.tsx` |
| Create `InventoryDonutChart` (donut from `inventario`) | 1 hr | New `src/components/charts/inventory-donut-chart.tsx` |
| Update `dashboard-client-page.tsx` layout to include charts | 1 hr | Modify existing |
| Handle empty states for all charts | 30 min | In each chart component |
| Basic responsive testing | 30 min | Manual |

### 7.2 Phase 2: New Data — Daily Trend + Client Type (4-6 hours)

| Task | Effort | Files |
|------|--------|-------|
| Add `ventasDiarias` computation to `ObtenerMetricas` use case | 1.5 hr | `ObtenerMetricas.ts` |
| Add `ingresosPorTipoCliente` computation (Venta → Cliente.tipo join) | 1.5 hr | `ObtenerMetricas.ts`, `ClienteRepository` (need `findByIds` with tipo) |
| Extend DTOs with new response types | 30 min | `dashboard.dto.ts` |
| Extend server action to map new fields | 30 min | `dashboard.ts` |
| Create `DailySalesTrendChart` (line/area chart) | 1.5 hr | New `src/components/charts/daily-sales-trend-chart.tsx` |
| Create `ClientTypeDonutChart` | 1 hr | New `src/components/charts/client-type-donut-chart.tsx` |
| Update dashboard layout | 30 min | `dashboard-client-page.tsx` |

### 7.3 Phase 3: Polish (2-3 hours)

| Task | Effort | Files |
|------|--------|-------|
| Chart loading skeletons | 30 min | Chart components |
| Color theming (dark mode support) | 30 min | Chart config |
| Mobile responsiveness polish | 1 hr | Chart components, dashboard layout |
| Accessibility (chart descriptions, screen reader) | 30 min | Chart components |

### 7.4 Phase 4: Advanced — Monthly Trend (3-4 hours)

| Task | Effort | Notes |
|------|--------|-------|
| Create `ObtenerTendenciaMensual` use case (12-month metrics) | 2 hr | New use case, needs careful period iteration |
| Create `MonthlyTrendChart` (multi-line) | 1.5 hr | New chart component |
| Add month navigation to PeriodSelector or separate control | 30 min | |

---

## 8. Key Findings Summary

1. **The dashboard is fully functional with MetricCards and DataTables** — charts add visualization, not fundamentally new data.

2. **3 of 6 proposed charts can be built from existing data** (revenue composition, top clients bar, inventory donut) — no new queries needed.

3. **Daily trend and client type breakdown require extending the use case** — `ObtenerMetricas` needs `ventasDiarias` and `ingresosPorTipoCliente` fields. The `findByDateRange` result already has all the data; we just need to aggregate differently.

4. **Recharts via shadcn/ui chart components is the clear choice** — lowest effort, best integration, official shadcn support, adequate chart types.

5. **SSR/hydration is the main technical risk** — all charts must be in client components with `ssr: false` dynamic imports or inside the existing `'use client'` dashboard page.

6. **The domain model is simple** — only 2 product types and 2 client types. Donut charts with 2 segments are meaningful and visually clear.

7. **Empty data states are critical** — a cheese distributor may have months with zero sales (vacation, off-season). Every chart must handle `data.length === 0` gracefully.

8. **The PeriodSelector already drives data refresh** — charts will automatically update when the user changes the month/year. No additional wiring needed.

9. **Bundle size impact (55KB gzipped for recharts)** is acceptable for a backoffice app where the dashboard is the most visited page.

10. **Monthly trend (Phase 4) is a nice-to-have** — requires a fundamentally different query pattern (12 periods at once) and should be deferred until the basic charts prove valuable.
