# Tasks: metodo-pago-abono

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + Domain + Repo (backend foundation) | PR 1 | Base branch; includes migration |
| 2 | Application + Validation + Actions + DTO (backend wiring) | PR 2 | Depends on Unit 1 |
| 3 | Dashboard flujoDinero redesign + UI selector | PR 3 | Depends on Unit 2 |

## Phase 1: Schema & Domain Foundation

- [ ] 1.1 Add `metodoPagoAbono String?` column to Venta model in `prisma/schema.prisma` and run `npx prisma migrate dev --name add-metodo-pago-abono`
- [ ] 1.2 Add `MetodoPagoAbono` type alias (`Exclude<MetodoPago, MetodoPago.CREDITO>`) in `src/domain/enums.ts`
- [ ] 1.3 Add `metodoPagoAbono` property to `VentaProps` and `Venta` entity in `src/domain/entities/Venta.ts` — nullable, set only when CREDITO + abono > 0
- [ ] 1.4 Add `metodoPagoAbonoLabel` map in `src/domain/labels.ts` (EFECTIVO→Efectivo, NEQUI→Nequi, BRE_B→Bre-B)

## Phase 2: Repository Layer

- [ ] 2.1 Add `findVentasForFlujoDinero(inicio, fin)` method to `VentaRepository` port — returns `{ metodoPago, ingresoTotal, abono, metodoPagoAbono }[]`
- [ ] 2.2 Add `findByDateRange(inicio, fin)` method to `AbonoPagoRepository` port
- [ ] 2.3 Implement `findVentasForFlujoDinero` in `PrismaVentaRepo` — `findMany` with select for flujoDinero fields
- [ ] 2.4 Implement `findByDateRange` in `PrismaAbonoPagoRepo`
- [ ] 2.5 Update `PrismaVentaRepo.toEntity()` to map `metodoPagoAbono` field
- [ ] 2.6 Update `PrismaVentaRepo.save()`, `registrarVentaAtomico()`, and `editarVentaAtomico()` to persist `metodoPagoAbono`

## Phase 3: Application & Validation

- [ ] 3.1 Add `metodoPagoAbono` to `VentaProps` in DTO: `src/presentation/dtos/venta.dto.ts` — both request and response
- [ ] 3.2 Add conditional Zod validation for `metodoPagoAbono` in `src/presentation/validations/venta.schema.ts` — required when CREDITO + abono > 0, strip otherwise
- [ ] 3.3 Add `metodoPagoAbono` to `RegistrarVentaInput` in `src/application/use-cases/RegistrarVenta.ts` — validate business rule
- [ ] 3.4 Add `metodoPagoAbono` to `EditarVentaInput` in `src/application/use-cases/EditarVenta.ts` — validate and pass to Venta entity
- [ ] 3.5 Pass `metodoPagoAbono` through server actions: `src/presentation/actions/ventas.ts` — registrarVenta and editarVenta

## Phase 4: Dashboard flujoDinero Redesign

- [ ] 4.1 Replace `sumIngresoByMetodoPago` in `ObtenerMetricas` with two-query strategy: `findVentasForFlujoDinero` + `findByDateRange` for AbonoPago
- [ ] 4.2 Compute efectivo/bancos: non-CREDITO ventas by metodoPago + CREDITO abonos by metodoPagoAbono + AbonoPago records by metodoPago. Keep cuentasPorCobrar unchanged.
- [ ] 4.3 Inject `AbonoPagoRepository` into `ObtenerMetricas` constructor and wire in `dashboard.ts`

## Phase 5: UI — Metodo Pago Abono Selector

- [ ] 5.1 Add conditional "Método de pago del Abono" selector in `src/components/forms/registrar-venta-dialog.tsx` — visible only when metodoPago === CREDITO && abono > 0
- [ ] 5.2 Reset `metodoPagoAbono` to undefined when metodoPago changes away from CREDITO or abono drops to 0
- [ ] 5.3 Display `metodoPagoAbono` label in venta detail view (if applicable)