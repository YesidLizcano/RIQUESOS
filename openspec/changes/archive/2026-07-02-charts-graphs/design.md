# Charts & Graphs — Design

## Architecture Decisions

### AD-01: Recharts via shadcn/ui Chart Components

**Choice**: Use `npx shadcn@latest add chart` to install recharts + pre-styled wrappers.
**Rationale**: shadcn/ui provides official chart wrappers that match the project's design system (shadcn 4.12 + `@base-ui/react`). Alternative (raw recharts) would require manual styling to match the Card/badge theme. The generated `src/components/ui/chart.tsx` provides `ChartContainer`, `ChartTooltip`, `ChartLegend`, and config helpers that integrate with shadcn's CSS variables for colors.
**Consequence**: Bundle adds ~55KB gzipped for recharts. Acceptable for a backoffice dashboard.

### AD-02: Chart Layout — 3-Row Grid Below KPI Cards

**Layout** (below existing MetricCard rows):
- **Row 1**: Revenue composition stacked bar (full width)
- **Row 2**: Daily sales trend (left 60%) + Top clients bar (right 40%)
- **Row 3**: Inventory donut (left 50%) + Client type donut (right 50%)

Each chart wrapped in a shadcn `Card` with `CardHeader` (title) and `CardContent` (chart). Grid uses `grid-cols-1 lg:grid-cols-2` with `gap-6`.

### AD-03: Use Case Extension — ventasDiarias and ingresosPorTipoCliente

**Choice**: Extend `ObtenerMetricas` to compute and return `ventasDiarias` and `ingresosPorTipoCliente`.
**Rationale**: The use case already calls `ventaRepo.findByDateRange()` which returns all `Venta[]` for the period. `ventasDiarias` is a simple group-by-date aggregation. `ingresosPorTipoCliente` requires joining each Venta's `clienteId` to `Cliente.tipo` — the use case already fetches clients via `clienteRepo.findByIds()`.
**New types in use case**:
```typescript
interface VentaDiaria { fecha: string; total: string; }
interface IngresoPorTipoCliente { tipo: string; total: string; }
```
**ventasDiarias computation**: Group `ventas` by `fecha.toDateString()`, sum `ingresoTotal` per day. Fill gaps (days with zero sales) by iterating all days in the period range.
**ingresosPorTipoCliente computation**: From `ventas`, group by client's `tipo` (MAYORISTA/MINORISTA), sum `ingresoTotal`. Need all clients for the period, not just top 5 — use a broader `findByIds` or aggregate from the ventas map.

### AD-04: All Charts in DashboardClientPage

**Choice**: Inline chart JSX in `dashboard-client-page.tsx` rather than separate component files.
**Rationale**: Each chart is ~30-50 lines of JSX. Creating 5 separate files for tiny components adds indirection without benefit. If charts grow complex (interactivity, drill-down), extract them then.
**Consequence**: `dashboard-client-page.tsx` will grow from ~185 lines to ~350-400 lines. Manageable for a single cohesive dashboard view.

### AD-05: Data Flow

```
ObtenerMetricas.execute() → MetricasDashboard (with ventasDiarias + ingresosPorTipoCliente)
    ↓
Server Action getMetricas() → DashboardMetricasResponse (mapped)
    ↓
DashboardClientPage state (metricas)
    ↓
Chart JSX (inline, receives metricas fields as props)
```

Same pattern as existing KPI cards. No additional fetch calls or state management.

### AD-06: Empty State

When a chart's data array is empty, render a centered `<p>` inside the Card: "Sin datos para este período". Use `text-muted-foreground text-center py-8` classes (matches existing empty state pattern in data tables).

### AD-07: Spanish Labels, Currency Formatting

All chart labels, axis tick formatters, tooltip labels, and legend labels in Spanish. Currency values use `Number(value).toLocaleString('es-AR')` with `$` prefix. Date axis formats as "DD/MM".

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | MODIFY | Add `recharts` dependency |
| `src/components/ui/chart.tsx` | CREATE | shadcn chart component (via `npx shadcn add chart`) |
| `src/application/use-cases/ObtenerMetricas.ts` | EXTEND | Add `ventasDiarias` and `ingresosPorTipoCliente` computation |
| `src/presentation/dtos/dashboard.dto.ts` | EXTEND | Add `VentasDiariasResponse`, `IngresosPorTipoClienteResponse`, and new fields to `DashboardMetricasResponse` |
| `src/presentation/actions/dashboard.ts` | EXTEND | Map new fields from use case result to DTO |
| `src/app/(dashboard)/dashboard-client-page.tsx` | MODIFY | Add chart grid and 5 inline chart sections |
| `src/app/(dashboard)/page.tsx` | MINOR | No changes needed (passes through `metricas` as-is) |

**Estimated total**: ~400-500 changed lines across 6 files (plus 1 new generated file).

## Dependency Note

recharts may require `--legacy-peer-deps` due to React 19 peer dependency declaration. Recharts 2.15+ works with React 19 in practice. Install command: `npm install recharts --legacy-peer-deps`.