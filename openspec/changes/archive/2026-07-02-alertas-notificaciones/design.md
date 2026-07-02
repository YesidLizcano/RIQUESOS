# Design: Alertas y Notificaciones

## AD-01: ObtenerAlertas use case

**Decision**: Pure computation use case, no new repository methods.

**Rationale**: All necessary data (`stockDisponibleKg`, `cantidadCompradaKg`, `fechaIngreso`, `estado`) is already available on the `Lote` entity returned by `LoteRepository.findActive()`. The use case constructor takes `LoteRepository` and `ProveedorRepository` (for resolving proveedor names). It iterates active lotes, applies threshold logic, and returns typed `AlertasResult`.

**File**: `src/application/use-cases/ObtenerAlertas.ts`

```typescript
// Key types (in ObtenerAlertas.ts):
export enum AlertaTipo { STOCK_BAJO, STOCK_CRITICO, ANTIGUO, MUY_ANTIGUO }
export enum AlertaSeveridad { WARNING = 'warning', CRITICAL = 'critical' }

export interface AlertaLote {
  loteId: string; tipoProducto: string; proveedorNombre: string;
  stockDisponibleKg: string; cantidadCompradaKg: string;
  porcentajeRestante: number; diasEnInventario: number;
  alertType: AlertaTipo; severity: AlertaSeveridad; mensaje: string;
}

export interface AlertasResult {
  alertas: AlertaLote[];
  resumen: { stockBajo: number; stockCritico: number; antiguo: number; muyAntiguo: number; total: number; };
}
```

Logic: For each active lote, check stock thresholds (absolute and percentage) and age thresholds. Higher severity wins per dimension. Sort results by severity (critical first), then by type priority.

## AD-02: Hardcoded thresholds as constants

**Decision**: Constants at the top of `ObtenerAlertas.ts`.

```typescript
const UMBRALES = {
  STOCK_BAJO_KG: 50,
  STOCK_CRITICO_KG: 20,
  STOCK_CRITICO_PCT: 0.20,
  DIAS_ANTIGUO: 30,
  DIAS_MUY_ANTIGUO: 60,
} as const;
```

**Rationale**: Hardcoded constants are sufficient for Phase 1. Defined at the top of the use case file for easy discovery and future extraction. No DB config needed yet.

## AD-03: Alert section on dashboard

**Decision**: Server component rendering between `</div>` (header) and `<DashboardClientPage />`.

**Rationale**: `page.tsx` is a server component that already fetches data. Adding `getAlertas()` call in parallel with `getMetricas()` and `getLotes()` avoids extra waterfall. The `DashboardAlertSection` receives pre-computed `AlertaLoteResponse[]` and renders shadcn `<Alert>` banners.

**File**: `src/components/dashboard-alert-section.tsx`

The component groups alerts by type, displays count per type, and lists affected lote summaries. Critical alerts render with `variant="destructive"`, warning alerts with custom amber styling via `variant="warning"` (added to Alert).

## AD-04: Alert banner sorting

**Decision**: Sort by severity (critical first), then by type priority (STOCK_CRITICO > MUY_ANTIGUO > STOCK_BAJO > ANTIGUO).

**Rationale**: Most urgent alerts should be at the top. Stock running out is more actionable than old inventory, so stock alerts take priority within the same severity level.

## AD-05: Inline badges on Lotes table

**Decision**: Modify `lote-columns.tsx` to add badges on `stockDisponibleKg` and add a `diasEnInventario` column.

**Rationale**: The Lotes table already shows `stockDisponibleKg` and `estado`. Adding a visual badge (amber for warning, red/destructive for critical) provides per-row context. A new `diasEnInventario` column shows the age with a badge when it exceeds thresholds.

**Implementation**: The `createLoteColumns` function receives an optional `alertMap: Map<string, AlertaInfo>` mapping loteId to its alert info. Stock column cells render `Badge` alongside the value. New `diasEnInventario` column shows days count with badge when applicable.

```typescript
interface AlertaInfo { stockSeverity?: 'warning' | 'critical'; ageSeverity?: 'warning' | 'critical'; }
```

## AD-06: Server action getAlertas

**Decision**: Add `getAlertas()` to `src/presentation/actions/dashboard.ts`.

**Rationale**: Follows the existing pattern (`getMetricas` is in the same file). Thin controller: instantiate repos, instantiate use case, call `execute()`, map to DTOs, return `{ success: true, alertas, resumen }`.

```typescript
export async function getAlertas() {
  await requireSession();
  const loteRepo = new PrismaLoteRepo();
  const proveedorRepo = new PrismaProveedorRepo();
  const useCase = new ObtenerAlertas(loteRepo, proveedorRepo);
  const result = await useCase.execute();
  return { success: true, alertas: result.alertas.map(toDTO), resumen: result.resumen };
}
```

## AD-07: Alerts only for ACTIVO lotes

**Decision**: Use `findActive()` which already filters `estado === ACTIVO AND deletedAt === null`.

**Rationale**: The `LoteRepository.findActive()` method already returns only active, non-deleted lotes. No additional filtering needed in the use case.

## File Changes Summary

| File | Action | What |
|------|--------|------|
| `src/application/use-cases/ObtenerAlertas.ts` | CREATE | Use case with threshold constants, types, and computation logic |
| `src/application/use-cases/ObtenerAlertas.test.ts` | CREATE | Unit tests for all alert scenarios |
| `src/presentation/dtos/alerta.dto.ts` | CREATE | AlertaLoteResponse, AlertaTipo, AlertaSeveridad types |
| `src/presentation/dtos/index.ts` | MODIFY | Add alerta DTO barrel export |
| `src/presentation/actions/dashboard.ts` | MODIFY | Add `getAlertas()` server action |
| `src/components/dashboard-alert-section.tsx` | CREATE | Alert banner section with amber/red styling |
| `src/app/(dashboard)/page.tsx` | MODIFY | Fetch alertas, pass to alert section |
| `src/components/columns/lote-columns.tsx` | MODIFY | Add stock/age badges, diasEnInventario column |
| `src/components/ui/alert.tsx` | MODIFY | Add `warning` variant with amber styling |