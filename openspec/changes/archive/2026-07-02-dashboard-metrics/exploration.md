# Dashboard Metrics — Exploration Document

## 1. Current State Analysis

### 1.1 Dashboard Page (`src/app/(dashboard)/page.tsx`)

The dashboard page is a **server component** that:

1. Requires authentication (redirects to `/login` if no session)
2. Calls two Server Actions in parallel: `getMetricas()` and `getLotes()`
3. Renders three sections:
   - **Financial Summary** — 5 MetricCards in a responsive grid (`grid-cols-1 md:grid-cols-3 lg:grid-cols-5`):
     - Ingresos (revenue)
     - Costo Mercancía (COGS)
     - Ganancia Bruta (gross profit)
     - Gastos Fijos (fixed expenses)
     - Ganancia Neta (net profit, with `destructive` variant if negative)
   - **Inventory + Top Clients** — two side-by-side DataTables:
     - Inventario por Producto (product, stock in Kg, active lotes count)
     - Top Clientes (name, revenue)
   - **Active Lotes** — full-width DataTable (product, stock Kg, real cost/Kg, status badge)

The page already receives real data from the use case via Server Actions. **There is NO placeholder/static data** — the dashboard is already wired to live data.

### 1.2 MetricCard Component (`src/components/dashboard-metric-card.tsx`)

Simple, well-structured component with:
- `title: string` — card header
- `value: string` — big number display
- `description?: string` — optional subtitle (currently unused on dashboard)
- `variant: 'default' | 'success' | 'warning' | 'destructive'` — color coding

The `description` prop is defined but **never used** in the dashboard — this is a missed opportunity for contextual info (e.g., "vs. mes anterior", "% del total").

### 1.3 ObtenerMetricas Use Case (`src/application/use-cases/ObtenerMetricas.ts`)

Already computes:

| Metric | Data Source | Method |
|--------|-----------|--------|
| ingresoTotal | Venta | `ventaRepo.sumIngresosByPeriod()` |
| costoMercancia | Venta | `ventaRepo.sumCostosByPeriod()` |
| gananciaBruta | Calculated | ingresoTotal - costoMercancia |
| gastosFijos | GastoFijo | `gastoFijoRepo.sumByPeriod()` |
| gananciaNeta | Calculated | gananciaBruta - gastosFijos |
| inventario (by product) | Lote | `loteRepo.findActive()` → in-memory aggregation |
| topClientes | Venta + Cliente | `ventaRepo.findByDateRange()` → in-memory grouping, N+1 for names |

**What it does well:**
- Uses `Dinero` value object for all monetary arithmetic (no floating point errors)
- Computes gross profit and net profit correctly
- Aggregates inventory across active lotes by product type
- Supports configurable `topN` for client ranking

**What's missing:**
- No count metrics (total ventas, total active lotes, total clientes)
- No percentage/ratio metrics (profit margin %, gross margin %)
- No time comparison (vs. previous period)
- No domicilio/delivery metrics (valorDomicilio is captured but not aggregated)
- N+1 query in topClientes resolution (one `clienteRepo.findById()` per top client)
- No stock value metric (stock × costoRealCalculadoKg = inventory asset value)
- No breakdown by product type (Doble Crema vs. Semisalado)
- No breakdown by client type (Mayorista vs. Minorista)

### 1.4 Server Action (`src/presentation/actions/dashboard.ts`)

- `getMetricas(month?, year?)` — defaults to current month
- Handles auth via `requireSession()`
- Maps domain output to DTO response
- Error handling with pino logger
- Returns `{ success: true, metricas }` or `{ success: false, error }`

**What's missing:**
- No period selector UI (month/year params exist but no UI to change them)
- No previous period data for comparison
- No total counts

### 1.5 Domain Entities & Business Rules

| Entity | Key Business Logic |
|--------|--------------------|
| **Lote** | Calculates `costoRealCalculadoKg = (precioBase × cantidad + flete + tajado + empaques) / cantidad`. Status transitions ACTIVO → AGOTADO when stock reaches 0. Optimistic locking via `version` field. |
| **Venta** | Calculates `ingresoTotal = cantidadVendidaKg × precioVentaKg`. Calculates `costoAplicado = costoAplicadoKg × cantidadVendidaKg`. Calculates `gananciaBruta = ingresoTotal - costoAplicado`. Immutable — no update/delete. |
| **Cliente** | Has type (MAYORISTA/MINORISTA) with custom pricing per product type. `resolvePrecio()` selects price based on client type and product. |
| **GastoFijo** | Simple entity with concepto + valor + fecha. No business rules beyond validation. |

### 1.6 Prisma Schema (SQLite)

```
Proveedor → Lote (1:N)
Cliente → Venta (1:N)
Lote → Venta (1:N)
GastoFijo (standalone)
Usuario (standalone, auth)
```

Key observations:
- SQLite — no complex aggregates beyond SUM
- No indexes defined in schema (Prisma SQLite doesn't support explicit indexes well)
- All monetary values stored as `Decimal` (Prisma maps to SQLite's text-based decimal)
- `fecha` fields on Venta and GastoFijo enable period filtering
- `estado` on Lote enables filtering ACTIVO/AGOTADO
- `valorDomicilio` on Venta is tracked but not aggregated in dashboard

### 1.7 Repository Ports & Query Methods

| Repository | Available Methods | Missing for Dashboard |
|-----------|-------------------|----------------------|
| VentaRepository | `save`, `findByDateRange`, `findByCliente`, `sumIngresosByPeriod`, `sumCostosByPeriod`, `registrarVentaAtomico` | `countByPeriod`, `sumGananciaBrutaByPeriod`, `sumDomiciliosByPeriod` |
| LoteRepository | `findById`, `findActive`, `findAll`, `findByProveedor`, `save`, `deductStock`, `updateCosts`, `delete` | `countActive`, `sumStockByProduct` |
| GastoFijoRepository | `findById`, `findAll`, `save`, `delete`, `sumByPeriod` | `countByPeriod`, `groupByConcepto` |
| ClienteRepository | `findById`, `findAll`, `save`, `delete` | `countByTipo` |
| ProveedorRepository | `findById`, `findAll`, `save`, `delete` | — (no dashboard need) |

---

## 2. Business Metrics Matrix

### 2.1 Metrics Currently Implemented

| # | Metric | Calculation | Data Source | Status |
|---|--------|-------------|-------------|--------|
| M1 | Ingresos | `SUM(ingresoTotal)` for period | Venta.aggregate | ✅ Working |
| M2 | Costo Mercancía | `SUM(costoAplicado)` for period | Venta.aggregate | ✅ Working |
| M3 | Ganancia Bruta | M1 - M2 | Calculated in use case | ✅ Working |
| M4 | Gastos Fijos | `SUM(valor)` for period | GastoFijo.aggregate | ✅ Working |
| M5 | Ganancia Neta | M3 - M4 | Calculated in use case | ✅ Working |
| M6 | Inventario por Producto | Active lotes grouped by `producto` | Lote.findActive → in-memory | ✅ Working |
| M7 | Top Clientes | Ventas grouped by `clienteId`, sorted by revenue | Venta.findByDateRange → in-memory | ✅ Working (N+1) |
| M8 | Active Lotes table | All active lotes with stock, cost, status | Lote action (separate) | ✅ Working |

### 2.2 Metrics That Should Be Added

| # | Metric | Calculation | Data Source | Priority | Rationale |
|---|--------|-------------|-------------|----------|-----------|
| M9 | Total Ventas | `COUNT(*)` for period | Venta | **High** | Business volume indicator |
| M10 | Margen Bruto % | `(gananciaBruta / ingresoTotal) × 100` | Calculated | **High** | Key profitability KPI |
| M11 | Margen Neto % | `(gananciaNeta / ingresoTotal) × 100` | Calculated | **High** | Key profitability KPI |
| M12 | Valor del Inventario | `SUM(stockDisponibleKg × costoRealCalculadoKg)` across active lotes | Lote | **High** | Asset value — how much capital is in stock |
| M13 | Lotes Activos | `COUNT(*) WHERE estado = ACTIVO` | Lote | **Medium** | Quick health check |
| M14 | Total Domicilios | `SUM(valorDomicilio)` for period | Venta | **Medium** | Delivery cost visibility |
| M15 | Clientes Activos | `COUNT(DISTINCT clienteId)` in period | Venta | **Medium** | Customer engagement metric |
| M16 | Kg Vendidos | `SUM(cantidadVendidaKg)` for period | Venta | **Medium** | Volume indicator |
| M17 | Period comparison | Current period vs. previous period deltas | Calculated | **Medium** | Trend visibility |
| M18 | Breakdown by TipoProducto | Revenue/costs per Doble Crema vs. Semisalado | Venta + Lote join | **Low** | Product mix insight |
| M19 | Breakdown by TipoCliente | Revenue per Mayorista vs. Minorista | Venta + Cliente | **Low** | Customer mix insight |
| M20 | Average ticket | `ingresoTotal / count` per period | Venta | **Low** | Pricing sensitivity |

### 2.3 Metrics NOT Recommended (SQLite Limitations)

| Metric | Why Not |
|--------|---------|
| Daily revenue time series (30-day chart) | Requires GROUP BY date with good index — SQLite scans full table. Acceptable <1000 rows, slow at 10K+. |
| Real-time inventory snapshots | Not needed — current month is sufficient for a cheese distributor. |
| Running balances / cumulative metrics | Complex window functions — SQLite doesn't support them well. |

---

## 3. Recommended Dashboard Layout

### 3.1 Top Row: KPI Cards (5 cards, lg:grid-cols-5)

Keep the existing 5 financial cards, but **add description strings** with calculated percentages:

| Card | Value | Description |
|------|-------|-------------|
| Ingresos | `$X.XXX` | `X ventas este mes` |
| Costo Mercancía | `$X.XXX` | `XX% de ingresos` |
| Ganancia Bruta | `$X.XXX` | `XX% margen bruto` |
| Gastos Fijos | `$X.XXX` | — |
| Ganancia Neta | `$X.XXX` | `XX% margen neto`, destructive if negative |

### 3.2 Second Row: Context Cards (3 cards, lg:grid-cols-3)

New row with operational metrics:

| Card | Value | Description |
|------|-------|-------------|
| Valor del Inventario | `$X.XXX` | `X lotes activos` |
| Kg Vendidos | `X.XXX Kg` | `X.XXX Kg promedio/venta` |
| Clientes Activos | `X` | `de X total clientes` |

### 3.3 Third Row: Tables (2 columns, same as current)

Keep existing layout:
- Left: Inventario por Producto (add `costoRealCalculadoKg` column, add total stock row)
- Right: Top Clientes (add `cantidadVendidaKg` column)

### 3.4 Fourth Row: Active Lotes (full width)

Keep existing, no changes needed.

### 3.5 Period Selector (new, above cards)

Add a month/year selector at the top of the dashboard. The Server Action already accepts `month` and `year` params — just need UI. Use a simple `<Select>` for month (1-12) and current/previous years.

---

## 4. Risks and Constraints

### 4.1 SQLite Aggregate Performance

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SUM aggregates on Venta table | **Low** | SQLite handles SUM well even on 10K rows. Current `sumIngresosByPeriod` and `sumCostosByPeriod` use Prisma's `aggregate()` — efficient. |
| `findByDateRange` loads ALL ventas into memory for top clientes calculation | **Medium** | With N+1 on `clienteRepo.findById()`, this is O(topN+1) queries. For top 5 this is fine. At scale (1000+ ventas/month), consider a dedicated `findTopClientesByPeriod(topN)` query in VentaRepository that joins with Cliente. |
| `findActive()` loads all active lotes into memory | **Low** | Cheese distributor likely has <50 active lotes at any time. Fine. |
| No indexes on `fecha` or `estado` columns | **Low** | SQLite creates implicit indexes on primary keys. For the current scale (hundreds to low thousands of records), sequential scans are fast enough. If performance becomes an issue, add explicit indexes. |

### 4.2 Data Accuracy

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Venta.costoAplicado is stored as total (not per-Kg) | **None** | Correct — the entity recalculates `costoAplicado = costoAplicadoKg × cantidadVendidaKg`. DB stores the total. `sumCostosByPeriod` correctly sums this. |
| Ganancia Bruta in Venta entity vs. use case | **Low** | The entity stores `gananciaBruta = ingresoTotal - costoAplicado` per sale. The use case calculates `gananciaBruta = sumIngresos - sumCostos`. These should be equal, but could diverge if rounding differs. Use the use case calculation (it's already there). |
| Period boundaries | **Low** | Current code uses `new Date(year, month+1, 0, 23, 59, 59, 999)` — correct month-end boundary. No timezone issues since all dates are local. |

### 4.3 N+1 Query in Top Clientes

The `ObtenerMetricas` use case:
1. Fetches all ventas for the period (1 query)
2. Groups by clienteId in memory (O(n))
3. For each of the top N clients, calls `clienteRepo.findById()` (N queries)

**For top 5, this is 6 queries total** — acceptable. If N grows or scale increases, add a `findNombresByClienteIds(ids: string[])` method to ClienteRepository.

### 4.4 Real-Time vs. Cached

- **Current:** Every dashboard page load executes all queries fresh. For a small-scale cheese distributor (hundreds of records), this is fine.
- **Future concern:** If the dashboard gets hit frequently, consider:
  - Next.js `revalidate` with ISR (cache for 60 seconds)
  - A simple in-memory cache in the Server Action (LRU, 30-second TTL)
  - Not recommended: Redis for SQLite — overkill

---

## 5. Data Shape Analysis

### 5.1 Current MetricCard Props

```typescript
interface MetricCardProps {
  title: string;
  value: string;
  description?: string;     // UNUSED on dashboard
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}
```

### 5.2 Proposed Extended Interface (no breaking change)

The `description` prop already exists. We just need to **start using it**. No interface change needed.

For the period selector, we need a client component that calls the Server Action (or navigates with query params). Simplest approach: use URL search params (`?month=6&year=2026`) and make the dashboard page read those.

### 5.3 Proposed DTO Additions

```typescript
// Add to DashboardMetricasResponse:
interface MetricasPeriodoResponse {
  ingresoTotal: string;        // existing
  costoMercancia: string;      // existing
  gananciaBruta: string;       // existing
  gastosFijos: string;         // existing
  gananciaNeta: string;        // existing
  // NEW:
  totalVentas: number;         // count of ventas in period
  kgVendidos: string;          // total kg sold
  clientesActivos: number;     // distinct clients with sales
  margenBrutoPct: string;      // gananciaBruta / ingresoTotal * 100
  margenNetoPct: string;       // gananciaNeta / ingresoTotal * 100
}

// NEW:
interface InventarioResumenResponse {
  valorTotal: string;          // sum of (stockKg × costoRealKg) for active lotes
  lotesActivos: number;        // count of active lotes
  totalKg: string;             // total stock kg across all active lotes
}
```

---

## 6. Estimated Scope

### 6.1 Phase 1: Quick Wins (1-2 hours)

| Task | Effort | Files Changed |
|------|--------|---------------|
| Add `description` strings to existing MetricCards | 15 min | `page.tsx` |
| Add `totalVentas`, `clientesActivos`, `kgVendidos` to use case | 30 min | `ObtenerMetricas.ts`, `dashboard.ts` (action), `dashboard.dto.ts` |
| Add `margenBrutoPct`, `margenNetoPct` calculations | 15 min | `ObtenerMetricas.ts` |
| Add `InventarioResumen` (valor total, lotes activos count) | 30 min | `ObtenerMetricas.ts`, `page.tsx` |

### 6.2 Phase 2: Period Selector (2-3 hours)

| Task | Effort | Files Changed |
|------|--------|---------------|
| Create `PeriodSelector` client component | 1 hr | New `src/components/period-selector.tsx` |
| Add URL search params to dashboard page | 30 min | `page.tsx` |
| Add previous period calculation for comparison | 1 hr | `ObtenerMetricas.ts`, action, DTO |

### 6.3 Phase 3: N+1 Fix & Polish (1-2 hours)

| Task | Effort | Files Changed |
|------|--------|---------------|
| Add `findNombresByClienteIds` to ClienteRepository | 30 min | `ClienteRepository.ts`, `PrismaClienteRepo.ts` |
| Update `ObtenerMetricas` to use batch name resolution | 30 min | `ObtenerMetricas.ts` |
| Add `cantidadVendidaKg` to TopClientes DTO | 30 min | DTOs, use case, page columns |

### 6.4 Phase 4: Charts (Future, 4-6 hours)

| Task | Effort | Notes |
|------|--------|-------|
| Add chart library (recharts) | 1 hr | New dependency, bundle size impact |
| Monthly revenue trend chart | 2 hr | Requires multi-month query |
| Product mix pie chart | 1 hr | Requires breakdown by TipoProducto |
| Stock distribution bar chart | 1 hr | Uses existing inventory data |

**Recommendation:** Phase 4 only after Phase 1-3 are validated and there's real data volume. Charts without historical data are not useful.

---

## 7. Key Findings Summary

1. **Dashboard is already functional** — it shows real data from the database, not placeholders. The "connect to real metrics" work is DONE.

2. **The real gap is enrichment** — adding context to existing numbers (percentages, counts, descriptions) and operational metrics (inventory value, kg sold, active clients).

3. **N+1 in topClientes is acceptable** for top 5, but should be batch-resolved if N increases.

4. **SQLite is fine** for this scale. A cheese distributor will have hundreds to low-thousands of records. Aggregate queries are sub-millisecond.

5. **The `description` prop on MetricCard already exists** but is unused — the quickest win is populating it with calculated percentages.

6. **The Server Action already accepts `month` and `year` params** — a period selector just needs UI.

7. **No chart library is installed** (no recharts, chart.js, etc.) — adding charts is a separate decision with bundle size implications.
