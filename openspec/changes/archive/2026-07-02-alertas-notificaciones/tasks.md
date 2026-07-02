# Tasks: Alertas y Notificaciones

## Phase 1: Domain & Use Case

- [x] 1.1 Create `src/presentation/dtos/alerta.dto.ts` — Define `AlertaTipo` enum, `AlertaSeveridad` enum, `AlertaLoteResponse` interface, and `AlertasResultResponse` interface. Update barrel export in `src/presentation/dtos/index.ts`.
- [x] 1.2 Create `src/application/use-cases/ObtenerAlertas.ts` — Implement the use case with hardcoded threshold constants (`UMBRAL_*`), `AlertaTipo`, `AlertaSeveridad`, `AlertaLote`, and `AlertasResult` types. Constructor takes `LoteRepository` and `ProveedorRepository`. Logic: iterate active lotes, apply stock and age thresholds, deduplicate (higher severity wins), sort by severity then type priority.
- [x] 1.3 Create `src/application/use-cases/ObtenerAlertas.test.ts` — Unit tests covering: stock bajo (between 20-50kg), stock crítico (below 20kg), stock crítico by percentage (<20%), deduplication (crítico supersedes bajo), antiguo (31-60 days), muy antiguo (>60 days), deduplication (muy antiguo supersedes antiguo), combined alerts (lote triggers both stock and age), empty lotes (no alerts), AGOTADO lotes excluded, zero-stock lotes.

## Phase 2: Server Action

- [x] 2.1 Add `getAlertas()` Server Action in `src/presentation/actions/dashboard.ts` — Instantiate `PrismaLoteRepo` and `PrismaProveedorRepo`, create `ObtenerAlertas` use case, call `execute()`, map domain results to `AlertaLoteResponse` DTOs, return `{ success: true, alertas, resumen }`. Add `requireSession()` call for auth. Import `PrismaProveedorRepo` and `ObtenerAlertas`.

## Phase 3: Dashboard UI

- [x] 3.1 Create `src/components/dashboard-alert-section.tsx` — Client component that receives `AlertaLoteResponse[]` and `AlertasResultResponse['resumen']`. Group alerts by type. Render one shadcn `<Alert>` banner per group with `<AlertTitle>` and `<AlertDescription>`. Use `variant="destructive"` for critical, `variant="warning"` (new) for warning. Include count per type in the title. Sort: critical first, then by type priority (STOCK_CRITICO > MUY_ANTIGUO > STOCK_BAJO > ANTIGUO). Show nothing if zero alerts.
- [x] 3.2 Modify `src/app/(dashboard)/page.tsx` — Add `getAlertas()` call to the `Promise.all` block. Render `<DashboardAlertSection>` between `DashboardClientPage` and the Lotes card. Pass `alertas` and `resumen` props. Update error state to also show alert section.
- [x] 3.3 Add `warning` variant to `src/components/ui/alert.tsx` — Add `warning` variant to the `alertVariants` cva with amber styling: `border-amber-500/50 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-800/80`.

## Phase 4: Lotes Table Badges

- [x] 4.1 Modify `src/components/columns/lote-columns.tsx` — Add `alertMap?: Map<string, AlertaInfo>` parameter to `createLoteColumns`. Add `diasEnInventario` column after `stockDisponibleKg`. Show Badge in stock column when alert severity exists (amber for warning, destructive for critical). Show Badge in age column when age severity exists. Define `AlertaInfo` type: `{ stockSeverity?: 'warning' | 'critical'; ageSeverity?: 'warning' | 'critical'; diasEnInventario: number }`. Updated Lotes page to pass alertas and compute alertMap.

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` and verify zero type errors. Run `npx vitest run` and verify all tests pass including new ObtenerAlertas tests.

---

## Review Workload Forecast

- Estimated changed lines: 300-450
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No
- Delivery strategy: single PR