# Alertas y Notificaciones — Exploration Document

## 1. Current State Analysis

### 1.1 Dashboard Page (`src/app/(dashboard)/page.tsx`)

The dashboard is a **server component** that:

1. Requires auth, redirects to `/login` if unauthenticated
2. Calls `getMetricas(currentMonth, currentYear)` and `getLotes()` in parallel
3. Passes `initialMetricas` to the client component `DashboardClientPage`
4. Below the client page, renders a **full Lotes table** with columns: Producto, Stock (Kg), Costo Real/Kg, Estado (ACTIVO/AGOTADO badge)
5. Has an error state with amber-colored border banner (inline Tailwind, not shadcn Alert)

**Key observation:** The dashboard already receives **all active lotes data** via `getLotes()`. Each lote has `stockDisponibleKg` and `fechaIngreso` — everything needed to compute low-stock and old-inventory alerts is already available in the server component. No new queries are needed.

### 1.2 Dashboard Client Page (`src/app/(dashboard)/dashboard-client-page.tsx`)

A `'use client'` component that:
- Receives `initialMetricas` (DashboardMetricasResponse) and renders:
  - Period selector + Export button (top bar)
  - 5 financial MetricCards (row 1)
  - 5 operational MetricCards including "Lotes Activos" (row 2)
  - Revenue Composition bar chart (row 3)
  - Daily Sales Area + Top Clients bar (row 4)
  - Inventory donut + Client type donut (row 5)
  - Inventory table + Top Clients table (row 6)

**The Lotes table is NOT in this client component** — it's rendered in the parent server component (`page.tsx`) below `<DashboardClientPage />`.

This means: alert data computed from lotes is available in the server component, but the **visual alert component** needs to be either:
- (A) Rendered server-side in `page.tsx` (alongside the Lotes table), or
- (B) Passed as props to a new client component

### 1.3 Lote Entity (`src/domain/entities/Lote.ts`)

| Field | Type | Relevance to Alerts |
|-------|------|---------------------|
| `stockDisponibleKg` | `Kilogramo` | **LOW STOCK**: Compare against threshold |
| `cantidadCompradaKg` | `Kilogramo` | **LOW STOCK**: Calculate remaining percentage |
| `fechaIngreso` | `Date` | **OLD INVENTORY**: Days since ingreso |
| `estado` | `EstadoLote` | Filter: only ACTIVO lotes matter for alerts |
| `costoRealCalculadoKg` | `Dinero` | Could show financial risk of old inventory |
| `producto` | `TipoProducto` | Group alerts by product type |

Key methods:
- `stockDisponibleKg` — current stock in Kg
- `cantidadCompradaKg` — original purchased quantity (for % calculation)
- `fechaIngreso` — date the lot entered inventory (defaults to `new Date()`)

### 1.4 ObtenerMetricas Use Case (`src/application/use-cases/ObtenerMetricas.ts`)

Already computes:
- `inventarioResumen.lotesActivos` — count of active lotes
- `inventario[].stockDisponibleKg` — stock per product type
- `inventarioResumen.valorTotal` — total inventory value (stock × costoReal)

**Does NOT compute:** per-lote stock levels, per-lote age, or alert data. This is correct — alert logic belongs in a separate use case.

### 1.5 Lote Repository (`src/domain/ports/LoteRepository.ts`)

Available methods:
- `findActive()` — returns all ACTIVO lotes (non-deleted). **This is what we need.**
- `findAll()` — all lotes including AGOTADO (not needed for alerts)
- `findById(id)` — single lote (not needed)

The `findActive()` method already returns full `Lote` entities with `stockDisponibleKg`, `fechaIngreso`, and `cantidadCompradaKg`. **No new repository methods are needed.**

### 1.6 Prisma Schema (`prisma/schema.prisma`)

Lote model fields:
```prisma
model Lote {
  id                   String       @id @default(uuid())
  producto             TipoProducto
  fechaIngreso         DateTime     @default(now())
  proveedorId          String
  cantidadCompradaKg   Decimal      @default("0")
  precioCompraBaseKg   Decimal      @default("0")
  costoFlete           Decimal      @default("0")
  costoTajado          Decimal      @default("0")
  costoEmpaques        Decimal      @default("0")
  costoRealCalculadoKg Decimal      @default("0")
  stockDisponibleKg    Decimal      @default("0")
  estado               EstadoLote   @default(ACTIVO)
  version              Int          @default(1)
  deletedAt            DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
}
```

**Important:** `fechaIngreso` has `@default(now())` — if not explicitly set, it defaults to creation time. This means some older lotes might have `fechaIngreso = createdAt`, which is fine for age calculations.

### 1.7 shadcn/ui Alert Component (`src/components/ui/alert.tsx`)

Already installed! Provides:
- `<Alert>` — container with `variant="default"` or `variant="destructive"`
- `<AlertTitle>` — bold heading
- `<AlertDescription>` — descriptive text
- `<AlertAction>` — action button slot

**Limitation:** Only has `default` and `destructive` variants. For 3-level severity (warning/info/critical), we'd need to extend with a custom `warning` variant or use custom styling.

### 1.8 Badge Component (`src/components/ui/badge.tsx`)

Has variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. Useful for inline alert indicators on table rows.

### 1.9 MetricCard Component (`src/components/dashboard-metric-card.tsx`)

Simple card with `title`, `value`, `description`, `variant` ('default' | 'success' | 'warning' | 'destructive'). **Already has `warning` variant** — can be reused for alert metric cards.

### 1.10 Lotes List Page (`src/app/(dashboard)/lotes/lotes-client-page.tsx`)

Has columns: Producto, Proveedor, Cant. Comprada (Kg), Precio Base/Kg, Costo Real/Kg, Stock Disp. (Kg), Estado, Acciones.

**Currently no visual indicators for low stock or old inventory.** The Estado column just shows ACTIVO/AGOTADO as a badge.

---

## 2. Alert Definition Matrix

### 2.1 Alert Types

| # | Alert | Trigger | Severity | Location |
|---|-------|---------|----------|----------|
| A1 | **Stock Bajo** — individual lote below absolute threshold | `stockDisponibleKg < UMBRAL_STOCK_BAJO_KG` (default: 50 Kg) | **Warning** (amber) | Dashboard alert section + Lotes table badge |
| A2 | **Stock Critico** — individual lote near depletion | `stockDisponibleKg < UMBRAL_STOCK_CRITICO_KG` (default: 20 Kg) OR `stockDisponibleKg / cantidadCompradaKg < 0.20` | **Critical** (red) | Dashboard alert section + Lotes table badge |
| A3 | **Inventario Antiguo** — lote in inventory for too long | `daysSince(fechaIngreso) > UMBRAL_DIAS_ANTIGUO` (default: 30 days) | **Warning** (amber) | Dashboard alert section + Lotes table badge |
| A4 | **Inventario Muy Antiguo** — lote in inventory way too long | `daysSince(fechaIngreso) > UMBRAL_DIAS_MUY_ANTIGUO` (default: 60 days) | **Critical** (red) | Dashboard alert section + Lotes table badge |

### 2.2 Threshold Recommendations

| Threshold | Default Value | Rationale | Configurable? |
|-----------|--------------|-----------|---------------|
| `STOCK_BAJO_KG` | 50 Kg | Cheese wheels are typically 20-40 Kg. 50 Kg means ~1-2 wheels left. | **Phase 1: hardcoded** / Phase 2: DB config |
| `STOCK_CRITICO_KG` | 20 Kg | Less than one typical wheel. Urgent reorder needed. | **Phase 1: hardcoded** / Phase 2: DB config |
| `STOCK_BAJO_PCT` | 20% | If less than 20% of original purchase remains, flag it. | **Phase 1: hardcoded** |
| `DIAS_ANTIGUO` | 30 days | Cheese is perishable. 30 days in cold storage is a concern. | **Phase 1: hardcoded** / Phase 2: DB config |
| `DIAS_MUY_ANTIGUO` | 60 days | Serious freshness risk. Likely needs discounting or disposal. | **Phase 1: hardcoded** / Phase 2: DB config |

### 2.3 Alert Logic (Pseudocode)

```
for each lote where estado === ACTIVO:
  daysInInventory = daysBetween(lote.fechaIngreso, today)
  remainingPct = lote.stockDisponibleKg / lote.cantidadCompradaKg

  if lote.stockDisponibleKg < STOCK_CRITICO_KG OR remainingPct < STOCK_BAJO_PCT:
    alerts.push({ type: STOCK_CRITICO, lote, days: daysInInventory, remainingPct })
  else if lote.stockDisponibleKg < STOCK_BAJO_KG:
    alerts.push({ type: STOCK_BAJO, lote, days: daysInInventory, remainingPct })

  if daysInInventory > DIAS_MUY_ANTIGUO:
    alerts.push({ type: INVENTARIO_MUY_ANTIGUO, lote, days: daysInInventory })
  else if daysInInventory > DIAS_ANTIGUO:
    alerts.push({ type: INVENTARIO_ANTIGUO, lote, days: daysInInventory })
```

**Note:** A single lote can trigger both a stock alert AND an age alert simultaneously.

### 2.4 Deduplication Rule

If a lote triggers STOCK_CRITICO, do NOT also show STOCK_BAJO for the same lote (higher severity wins). Same for INVENTARIO_MUY_ANTIGUO over INVENTARIO_ANTIGUO.

---

## 3. UI Approach Comparison

### 3.1 Option A: Alert Banner Section (Recommended)

**What:** A dedicated section between the page header and the MetricCards, showing all active alerts in a vertical list.

**Pros:**
- Immediate visibility — the user sees alerts before any other dashboard content
- Groups all alerts in one place for quick scanning
- Uses shadcn `<Alert>` component (already installed)
- Easy to extend with new alert types
- Works well with the existing layout

**Cons:**
- Takes vertical space — could push charts below the fold on mobile
- Requires a client component or server-side rendering

**Implementation:**
```tsx
{/* Alert Section — between header and MetricCards */}
{alertas.length > 0 && (
  <div className="space-y-2">
    {alertas.map(alerta => (
      <Alert key={alerta.id} variant={alerta.severity === 'critical' ? 'destructive' : 'default'}>
        <AlertTitle>{alerta.title}</AlertTitle>
        <AlertDescription>{alerta.description}</AlertDescription>
      </Alert>
    ))}
  </div>
)}
```

### 3.2 Option B: Alert Summary Cards

**What:** Dedicated MetricCard-style cards that show counts (e.g., "2 Lotes con Stock Bajo", "1 Lote Antiguo").

**Pros:**
- Consistent with existing dashboard visual language
- Compact — no additional vertical space for 0 alerts
- Reuses MetricCard with `warning`/`destructive` variants

**Cons:**
- Less detail — needs drill-down to see WHICH lotes
- Doesn't leverage the shadcn Alert component
- Harder to show per-lote information

### 3.3 Option C: Toast Notifications

**What:** Show toast notifications via sonner (already used in the project) when the page loads.

**Pros:**
- Non-intrusive, disappears after a few seconds
- Already have the sonner library installed

**Cons:**
- **Transient** — the user can't refer back to alerts
- Not suitable for operational dashboards where alerts should persist on screen
- No way to show multiple alerts simultaneously
- Bad UX for something the user needs to ACT on

**Verdict:** Toasts are for confirmations, not for actionable alerts. **Do not use for this feature.**

### 3.4 Option D: Inline Badges on Lotes Table

**What:** Add colored badges to the Lotes table rows that trigger alert conditions.

**Pros:**
- Contextual — the alert is right next to the data
- Doesn't add a new UI section
- Easy to implement (add a cell renderer)

**Cons:**
- Not visible on the dashboard — user must navigate to Lotes page
- No summary — can't see "how many" at a glance
- Table could get cluttered with multiple badge columns

### 3.5 Recommended Approach: **A + D Combined**

**Dashboard:** Alert banner section (Option A) — shows a summary of all active alerts at the top of the dashboard with actionable information.

**Lotes table:** Inline badges (Option D) — show per-row alert indicators on the Lotes list page for contextual awareness.

This gives the user:
1. **At-a-glance awareness** on the dashboard (banners)
2. **Per-row context** on the Lotes page (badges)

---

## 4. Architecture Design

### 4.1 New Use Case: `ObtenerAlertas`

**Location:** `src/application/use-cases/ObtenerAlertas.ts`

```typescript
interface AlertaLote {
  loteId: string;
  producto: TipoProducto;
  tipo: 'STOCK_BAJO' | 'STOCK_CRITICO' | 'INVENTARIO_ANTIGUO' | 'INVENTARIO_MUY_ANTIGUO';
  severidad: 'warning' | 'critical';
  stockDisponibleKg: string;
  cantidadCompradaKg: string;
  porcentajeRestante: number;  // 0-100
  diasEnInventario: number;
  fechaIngreso: Date;
  mensaje: string;
}

interface AlertasResult {
  alertas: AlertaLote[];
  resumen: {
    stockBajo: number;
    stockCritico: number;
    inventarioAntiguo: number;
    inventarioMuyAntiguo: number;
    total: number;
  };
}
```

**Dependencies:** Only `LoteRepository.findActive()` — no new repo methods needed.

**Thresholds:** Initially hardcoded as constants. Marked for future extraction to config.

### 4.2 New DTO: `AlertaLoteResponse`

**Location:** `src/presentation/dtos/dashboard.dto.ts` (or new `alerta.dto.ts`)

### 4.3 New Server Action: `getAlertas()`

**Location:** `src/presentation/actions/dashboard.ts` (add alongside `getMetricas`)

### 4.4 New Component: `DashboardAlertSection`

**Location:** `src/components/dashboard-alert-section.tsx`

A server component or client component that receives alert data and renders shadcn Alert banners.

### 4.5 Modified Component: `lote-columns.tsx`

Add a new column or modify the existing `stockDisponibleKg` column to show alert badges.

### 4.6 Data Flow

```
page.tsx (server)
  ├── getMetricas(month, year) → metricas
  ├── getLotes() → lotes (existing)
  ├── getAlertas() → alertas (NEW)
  │
  ├── <DashboardAlertSection alertas={alertas} /> (NEW)
  ├── <DashboardClientPage initialMetricas={metricas} />
  └── <LotesSummaryTable lotes={lotes} />
```

The `getAlertas()` server action:
1. Calls `LoteRepository.findActive()`
2. Instantiates `ObtenerAlertas` use case
3. Computes alerts and summary
4. Maps to DTO response
5. Returns `{ success: true, alertas, resumen }`

---

## 5. Risks and Constraints

### 5.1 Performance

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `findActive()` called twice (once for metricas, once for alertas) | **Low** | Cache lotes in server action, or compute alerts from the lotes already loaded in `page.tsx`. The data is the same — just different computation. |
| Alert computation is O(n) where n = active lotes | **None** | For a cheese distributor, n < 50 at any time. Trivial. |
| Dashboard page now has 3 parallel queries | **Low** | Use `Promise.all([getMetricas(), getLotes(), getAlertas()])` — already the pattern. |

### 5.2 Threshold Accuracy

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Hardcoded thresholds may not match business reality | **Medium** | Hardcode sensible defaults (50Kg, 20Kg, 30d, 60d) in Phase 1. Document them clearly. Make them easy to change (constants at top of use case file). Phase 2: move to a Config model in DB if needed. |
| Cheese aging varies by type — Doble Crema vs Semisalado may have different freshness windows | **Medium** | Phase 1: single threshold for all types. Phase 2: per-product-type thresholds if business demands it. |
| Percentage-based low stock triggers on lotes where `cantidadCompradaKg` is very small (e.g., 5Kg test purchase) | **Low** | 20% of 5Kg = 1Kg. The absolute threshold (20Kg) already catches this. Use `OR` logic: trigger if absolute OR percentage threshold is met. |

### 5.3 UX Concerns

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Alert fatigue if too many lotes trigger warnings | **Medium** | Show summary counts first, expandable detail. Limit display to max 5 per category, with "y N más..." for overflow. |
| Alerts on dashboard don't link to the Lotes page | **Low** | Add a "Ver lotes" link/button in the AlertAction slot. |
| Mobile layout: alert section pushes charts too far down | **Medium** | Use collapsible alert section. Show summary (count) on mobile, expand for detail. |

### 5.4 Data Integrity

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `fechaIngreso` might not be accurate for old data (defaulted to `now()` on creation) | **Low** | If lotes were created before this feature, `fechaIngreso = createdAt`. This is acceptable — it reflects when the lot entered the system, which IS when inventory tracking started. |
| AGOTADO lotes should not trigger alerts | **None** | Use case already filters by `estado === ACTIVO` via `findActive()`. |
| Soft-deleted lotes should not trigger alerts | **None** | `findActive()` already filters `deletedAt: null`. |

---

## 6. Recommended Thresholds and Severity Levels

### 6.1 Threshold Constants (Phase 1 — Hardcoded)

```typescript
// src/application/use-cases/ObtenerAlertas.ts

const UMBRALES = {
  STOCK_BAJO_KG: 50,        // Less than 50 Kg → warning
  STOCK_CRITICO_KG: 20,     // Less than 20 Kg → critical
  STOCK_BAJO_PCT: 20,       // Less than 20% remaining → critical
  DIAS_ANTIGUO: 30,          // More than 30 days → warning
  DIAS_MUY_ANTIGUO: 60,     // More than 60 days → critical
} as const;
```

### 6.2 Severity Level Definitions

| Severity | Color | Icon (lucide) | shadcn Variant | Use Case |
|----------|-------|---------------|----------------|----------|
| **Warning** | Amber/Yellow | `AlertTriangle` | `default` (with custom amber styling) | Stock bajo, inventario antiguo |
| **Critical** | Red | `AlertOctagon` or `XCircle` | `destructive` | Stock critico, inventario muy antiguo |

### 6.3 Alert Priority (for display ordering)

1. STOCK_CRITICO (most urgent — about to run out)
2. INVENTARIO_MUY_ANTIGUO (financial risk — cheese may be unsellable)
3. STOCK_BAJO (needs attention soon)
4. INVENTARIO_ANTIGUO (monitor situation)

---

## 7. Estimated Scope

### 7.1 Phase 1: Dashboard Alert Banners (4-6 hours)

| Task | Effort | Files |
|------|--------|-------|
| Create `ObtenerAlertas` use case with hardcoded thresholds | 1.5 hr | `src/application/use-cases/ObtenerAlertas.ts` |
| Create `AlertaLoteResponse` DTO | 30 min | `src/presentation/dtos/alerta.dto.ts`, update `index.ts` |
| Add `getAlertas()` server action | 45 min | `src/presentation/actions/dashboard.ts` |
| Create `DashboardAlertSection` component with shadcn Alert | 1.5 hr | `src/components/dashboard-alert-section.tsx` |
| Integrate alert section into dashboard page | 30 min | `src/app/(dashboard)/page.tsx` |
| Add "Ver lotes" link in AlertAction | 15 min | Component above |
| Unit test for ObtenerAlertas use case | 45 min | `src/application/use-cases/ObtenerAlertas.test.ts` |

### 7.2 Phase 2: Lotes Table Inline Badges (2-3 hours)

| Task | Effort | Files |
|------|--------|-------|
| Add alert badge column to lote-columns | 1 hr | `src/components/columns/lote-columns.tsx` |
| Pass alert data to Lotes page | 30 min | `src/app/(dashboard)/lotes/page.tsx`, `lotes-client-page.tsx` |
| Add "days in inventory" column to Lotes table | 30 min | Same files |
| Style badges per severity | 30 min | Same files |

### 7.3 Phase 3: Configurable Thresholds (3-4 hours — Future)

| Task | Effort | Notes |
|------|--------|-------|
| Add `ConfigAlerta` model to Prisma schema | 1 hr | New model with threshold fields |
| Create CRUD for config | 2 hr | New use cases, actions, UI |
| Settings page for alert thresholds | 1 hr | New route |
| Migrate hardcoded thresholds to DB lookup | 30 min | Update use case |

**Recommendation:** Ship Phase 1 first. Validate alert thresholds with real data for 2-4 weeks before investing in Phase 3 (configurable thresholds).

---

## 8. Key Findings Summary

1. **All necessary data already exists** — `Lote.stockDisponibleKg`, `Lote.cantidadCompradaKg`, and `Lote.fechaIngreso` are sufficient for computing both stock and age alerts. No schema changes needed.

2. **No new repository methods needed** — `LoteRepository.findActive()` returns all the data we need. The alert logic is pure computation.

3. **shadcn Alert component is already installed** — at `src/components/ui/alert.tsx`. It supports `default` and `destructive` variants. For `warning`, we'll need custom amber styling.

4. **MetricCard already has a `warning` variant** — amber text, suitable for alert metric cards.

5. **The dashboard already loads all lotes** — `page.tsx` calls `getLotes()`. Computing alerts from the same data avoids a duplicate query.

6. **Architecture stays clean** — a new `ObtenerAlertas` use case follows the existing pattern (constructor-injected repo, pure business logic, returns typed result).

7. **Hardcoded thresholds are fine for Phase 1** — a cheese distributor's business doesn't change thresholds frequently. Start simple, add config later if needed.

8. **Two alert surfaces are recommended** — dashboard banners (for awareness) and lotes table badges (for per-row context). This matches how operational dashboards work in practice.

9. **The existing Lotes page (`lotes-client-page.tsx`) currently shows no alert indicators** — adding a `diasEnInventario` column and color-coded `stockDisponibleKg` cells would provide immediate value.

10. **Alert fatigue mitigation is important** — limit displayed alerts to 5 per category, show summary counts for the rest, and make the section collapsible on mobile.
