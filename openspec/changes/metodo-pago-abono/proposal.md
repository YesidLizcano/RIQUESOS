# Proposal: metodo-pago-abono — Track Payment Method for Initial Abono on CREDITO Sales

## Intent

Fix liquidity descuadre: when a CREDITO sale has an initial abono, that money disappears from the dashboard. The `flujoDinero` calculation groups by `Venta.metodoPago` — CREDITO ventas' `ingresoTotal` is excluded from Efectivo/Bancos, and `cuentasPorCobrar` only captures `saldo = ingresoTotal - abono`. The abono amount is invisible. Example: $50,000 CREDITO sale with $20,000 cash abono → $0 Efectivo, $0 Bancos, $30,000 Cuentas por Cobrar. The $20,000 is lost.

## Scope

### In Scope
- Add `metodoPagoAbono` field to Venta (Prisma model + domain entity) — values: EFECTIVO, NEQUI, BRE_B
- Add Zod validation: `metodoPagoAbono` required when `metodoPago === CREDITO && abono > 0`
- Update `registrar-venta-dialog.tsx`: show "Método de pago del Abono" selector when CREDITO + abono > 0
- Update `RegistrarVenta` use case: pass and validate `metodoPagoAbono`
- Update `EditarVenta` use case: support `metodoPagoAbono` changes
- Update `ObtenerMetricas` / `flujoDinero`: route CREDITO ventas' abonos to Efectivo/Bancos based on `metodoPagoAbono`; include `AbonoPago` records in liquidity by their `metodoPago`
- Update `PrismaVentaRepo`: new field mapping + queries for `sumIngresoByMetodoPago` adjustment
- Update dashboard DTO/action if `flujoDinero` shape changes
- Prisma migration for new column

### Out of Scope
- Changing `AbonoPago` model or its UI (already has `metodoPago`)
- Historic data migration (new column defaults to 'EFECTIVO')
- Changing `editar-venta-dialog` UI beyond the new field

## Capabilities

### New Capabilities
- `metodo-pago-abono`: Track payment method for the initial abono on CREDITO ventas, and route that money to the correct liquidity bucket (Efectivo or Bancos) in the dashboard.

### Modified Capabilities
- `venta-management`: Venta entity and creation flow now accept `metodoPagoAbono`; CREDITO ventas must specify how the initial abono was paid.
- `dashboard-metrics`: `flujoDinero` calculation changes to route CREDITO abonos and subsequent AbonoPago records into Efectivo/Bancos.

## Approach

Analogous to `AbonoPago.metodoPago` for subsequent payments: add `metodoPagoAbono` on `Venta` for the INITIAL abono. For liquidity: non-CREDITO ventas continue grouping by `metodoPago` as before. CREDITO ventas contribute their `abono` to Efectivo/Bancos based on `metodoPagoAbono`. `AbonoPago` records also contribute to Efectivo/Bancos based on their `metodoPago`. `cuentasPorCobrar` stays the same (saldo = ingresoTotal - totalAbonado).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `metodoPagoAbono` column to Venta model |
| `src/domain/entities/Venta.ts` | Modified | Add `metodoPagoAbono` property |
| `src/domain/enums.ts` | Modified | Add `MetodoPagoAbono` enum (EFECTIVO, NEQUI, BRE_B) or reuse MetodoPago |
| `src/application/use-cases/RegistrarVenta.ts` | Modified | Accept and validate `metodoPagoAbono` |
| `src/application/use-cases/EditarVenta.ts` | Modified | Accept and validate `metodoPagoAbono` |
| `src/application/use-cases/ObtenerMetricas.ts` | Modified | Route CREDITO abonos + AbonoPago records into flujoDinero |
| `src/domain/ports/VentaRepository.ts` | Modified | Update query methods if needed |
| `src/infrastructure/repositories/PrismaVentaRepo.ts` | Modified | New field mapping + adjusted queries |
| `src/presentation/validations/venta.schema.ts` | Modified | Add `metodoPagoAbono` validation |
| `src/presentation/dtos/venta.dto.ts` | Modified | Add `metodoPagoAbono` to DTO |
| `src/presentation/actions/ventas.ts` | Modified | Pass `metodoPagoAbono` through |
| `src/presentation/dtos/dashboard.dto.ts` | Modified | If flujoDinero shape changes |
| `src/presentation/actions/dashboard.ts` | Modified | If flujoDinero shape changes |
| `src/components/forms/registrar-venta-dialog.tsx` | Modified | Add "Método de pago del Abono" selector |
| `src/app/(dashboard)/dashboard-client-page.tsx` | Modified | If flujoDinero response shape changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing CREDITO ventas get default `EFECTIVO` which may be inaccurate | Medium | Document limitation; consider a one-time reconciliation script as future work |
| `flujoDinero` response shape change breaks dashboard client | Low | Keep `FlujoDinero` interface backward-compatible; only add fields if needed |
| Prisma migration on production DB | Low | Add column as nullable first, then set default; SQLite allows simple ADD COLUMN |

## Rollback Plan

1. Revert the Prisma migration (`npx prisma migrate reset` or manual `ALTER TABLE` to drop column)
2. Revert code changes in all affected files
3. The `flujoDinero` calculation will return to the old (buggy) behavior — abonos invisible in liquidity

## Dependencies

- Prisma migration must run before code deployment
- No external dependency changes

## Success Criteria

- [ ] CREDITO venta with cash abono shows that abono in "Efectivo" on dashboard
- [ ] CREDITO venta with Nequi abono shows that abono in "Bancos" on dashboard
- [ ] Non-CREDITO ventas unchanged in dashboard (efectivo/bancos totals same as before)
- [ ] `cuentasPorCobrar` still shows correct saldo (ingresoTotal - totalAbonado)
- [ ] Subsequent `AbonoPago` records also flow into Efectivo/Bancos correctly
- [ ] registrar-venta-dialog shows "Método de pago del Abono" only when CREDITO + abono > 0
- [ ] Zod validation rejects CREDITO venta with abono > 0 but no `metodoPagoAbono`