# Design: metodo-pago-abono

## Technical Approach

Add `metodoPagoAbono` as an optional nullable field on the Venta model to track how the initial abono on a CREDITO sale was paid. Reuse the existing `MetodoPago` enum values (minus CREDITO) via a dedicated `MetodoPagoAbono` type alias in the domain, since AbonoPago already restricts to EFECTIVO/NEQUI/BRE_B. For the dashboard, replace the simple `sumIngresoByMetodoPago` aggregation with a two-query strategy: (1) fetch non-CREDITO ventas grouped by metodoPago for their full ingresoTotal, (2) fetch CREDITO ventas with their abono + metodoPagoAbono, and (3) fetch AbonoPago records with their metodoPago. Combine these to compute efectivo/bancos/cuentasPorCobrar correctly. The FlujoDinero response shape stays unchanged.

## Architecture Decisions

### Decision: Nullable column with no default

**Choice**: `metodoPagoAbono String?` (nullable, no default)
**Alternatives considered**: Default 'EFECTIVO', non-nullable with sentinel
**Rationale**: Nullable is the correct semantic — the field only has meaning when metodoPago=CREDITO AND abono>0. A default would misrepresent existing data (we don't know how old CREDITO abonos were paid). Null = "not applicable" or "not recorded", which is accurate.

### Decision: Reuse MetodoPago values via MetodoPagoAbono type alias

**Choice**: Create a `MetodoPagoAbono` type in `enums.ts` as a union of EFECTIVO | NEQUI | BRE_B (same values as MetodoPago minus CREDITO). In the domain layer, use this type for the Venta.metodoPagoAbono property. In Zod, validate against the literal strings.
**Alternatives considered**: Reuse MetodoPago enum directly; create a separate Prisma enum
**Rationale**: Reusing MetodoPago would allow CREDITO as a value (semantically wrong). A separate Prisma enum adds migration complexity on SQLite. A type alias gives us compile-time safety without DB-level enforcement — the Zod schema and domain constructor enforce the valid values. AbonoPago already uses MetodoPago with the same restriction (EFECTIVO/NEQUI/BRE_B only in practice).

### Decision: Two-query strategy for flujoDinero

**Choice**: Replace `sumIngresoByMetodoPago` with two new repo methods: `findVentasForFlujoDinero(inicio, fin)` returning Venta rows with metodoPago + abono + metodoPagoAbono, and `findAbonoPagosForFlujoDinero(inicio, fin)` returning AbonoPago rows with monto + metodoPago. Compute efectivo/bancos in the use case.
**Alternatives considered**: Single raw SQL query with CASE WHEN; modify existing groupBy
**Rationale**: SQLite's Prisma client doesn't support CASE expressions in groupBy. A raw SQL query would bypass Prisma and make testing harder. Two simple findMany queries are easy to understand, test, and maintain. The computation is straightforward in the use case layer.

### Decision: Keep Venta immutability with metodoPagoAbono exception

**Choice**: Venta remains immutable except `metodoPagoAbono` can be updated via EditarVenta.
**Alternatives considered**: Make Venta fully mutable; create a separate MetodoPagoAbono entity
**Rationale**: The spec explicitly allows this exception. Creating a separate entity adds unnecessary complexity. Updating just `metodoPagoAbono` on an existing CREDITO venta is a simple column update — no stock, items, or financials change.

## Data Flow

```
registrar-venta-dialog.tsx
  │ metodoPago=CREDITO + abono > 0 → shows metodoPagoAbono selector
  │ submits { metodoPagoAbono: "EFECTIVO" | "NEQUI" | "BRE_B" }
  ▼
ventas.ts (server action)
  │ Zod validates: metodoPagoAbono required when CREDITO + abono > 0
  │ passes to RegistrarVenta input
  ▼
RegistrarVenta (use case)
  │ validates metodoPagoAbono business rule
  │ creates Venta entity with metodoPagoAbono
  ▼
PrismaVentaRepo.registrarVentaAtomico()
  │ persists metodoPagoAbono to DB
  ▼
Prisma Venta table (metodoPagoAbono String?)

For dashboard:
findVentasForFlujoDinero() ──┐
                               ├─► ObtenerMetricas
findAbonoPagosForFlujoDinero()┘     computes efectivo/bancos/cuentasPorCobrar
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `metodoPagoAbono String?` to Venta model |
| `src/domain/enums.ts` | Modify | Add `MetodoPagoAbono` type alias |
| `src/domain/entities/Venta.ts` | Modify | Add `metodoPagoAbono` property, constructor logic |
| `src/domain/labels.ts` | Modify | Add `metodoPagoAbonoLabel` map |
| `src/domain/ports/VentaRepository.ts` | Modify | Add `findVentasForFlujoDinero` and `findAbonoPagosForFlujoDinero` methods |
| `src/domain/ports/AbonoPagoRepository.ts` | Modify | Add `findByDateRange` method |
| `src/application/use-cases/RegistrarVenta.ts` | Modify | Accept and validate `metodoPagoAbono` in input |
| `src/application/use-cases/EditarVenta.ts` | Modify | Accept and validate `metodoPagoAbono` |
| `src/application/use-cases/ObtenerMetricas.ts` | Modify | Replace `sumIngresoByMetodoPago` with new flujoDinero calculation |
| `src/infrastructure/repositories/PrismaVentaRepo.ts` | Modify | Map metodoPagoAbono in toEntity/registrar/editar, add new query methods |
| `src/infrastructure/repositories/PrismaAbonoPagoRepo.ts` | Modify | Add `findByDateRange` implementation |
| `src/presentation/validations/venta.schema.ts` | Modify | Add conditional metodoPagoAbono validation |
| `src/presentation/dtos/venta.dto.ts` | Modify | Add metodoPagoAbono to request/response DTOs |
| `src/presentation/actions/ventas.ts` | Modify | Pass metodoPagoAbono through |
| `src/presentation/actions/dashboard.ts` | Modify | No change needed (FlujoDinero shape unchanged) |
| `src/components/forms/registrar-venta-dialog.tsx` | Modify | Add conditional metodoPagoAbono selector |

## Interfaces / Contracts

```typescript
// src/domain/enums.ts — new type
export type MetodoPagoAbono = Exclude<MetodoPago, MetodoPago.CREDITO>;
// Resolves to: 'EFECTIVO' | 'NEQUI' | 'BRE_B'

// src/domain/entities/Venta.ts — additions
export interface VentaProps {
  // ... existing ...
  metodoPagoAbono?: string;  // NEW
}

export class Venta {
  // ... existing ...
  readonly metodoPagoAbono: MetodoPagoAbono | null;  // NEW
}

// src/domain/ports/VentaRepository.ts — new methods
export interface VentaRepository {
  // ... existing ...
  /** Find ventas in date range with fields needed for flujoDinero calculation */
  findVentasForFlujoDinero(inicio: Date, fin: Date): Promise<
    Array<{ metodoPago: string; ingresoTotal: string; abono: string; metodoPagoAbono: string | null }>
  >;
}

// src/domain/ports/AbonoPagoRepository.ts — new method
export interface AbonoPagoRepository {
  // ... existing ...
  /** Find abono pagos in date range for flujoDinero */
  findByDateRange(inicio: Date, fin: Date): Promise<AbonoPago[]>;
}

// src/presentation/validations/venta.schema.ts — conditional validation
// Add metodoPagoAbono as optional string, validated against EFECTIVO|NEQUI|BRE_B
// SuperRefine: when metodoPago === CREDITO && abono > 0, metodoPagoAbono is required
// When metodoPago !== CREDITO or abono === 0, metodoPagoAbono is stripped

// ObtenerMetricas flujoDinero calculation (pseudocode):
// 1. efectivo = sum(non-CREDITO venta ingresoTotal where metodoPago=EFECTIVO)
//             + sum(CREDITO venta abono where metodoPagoAbono=EFECTIVO)
//             + sum(AbonoPago.monto where metodoPago=EFECTIVO)
// 2. bancos   = sum(non-CREDITO venta ingresoTotal where metodoPago IN (NEQUI, BRE_B))
//             + sum(CREDITO venta abono where metodoPagoAbono IN (NEQUI, BRE_B))
//             + sum(AbonoPago.monto where metodoPago IN (NEQUI, BRE_B))
// 3. cuentasPorCobrar = unchanged (saldo = ingresoTotal - totalAbonado for CREDITO ventas)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Venta constructor: metodoPagoAbono set only when CREDITO + abono > 0 | Direct instantiation with various combinations |
| Unit | Venta constructor: metodoPagoAbono null when non-CREDITO or abono=0 | Direct instantiation |
| Unit | Venta constructor: metodoPagoAbono rejects CREDITO value | Expect error |
| Unit | Zod schema: conditional validation of metodoPagoAbono | Test valid/invalid combinations |
| Unit | ObtenerMetricas: flujoDinero with CREDITO ventas routing abonos | Mock repos, verify efectivo/bancos sums |
| Unit | ObtenerMetricas: flujoDinero with AbonoPago records | Mock repos, verify routing by metodoPago |
| Integration | PrismaVentaRepo: findVentasForFlujoDinero returns correct fields | In-memory or test DB |
| Integration | PrismaVentaRepo: toEntity maps metodoPagoAbono correctly | Read/write round-trip |
| E2E | Register CREDITO venta with abono, verify flujoDinero | Full flow through server action |

## Migration / Rollout

1. Add `metodoPagoAbono String?` to Venta model in `schema.prisma`
2. Run `npx prisma migrate dev --name add-metodo-pago-abono`
3. Existing CREDITO ventas will have `metodoPagoAbono = NULL` — dashboard will correctly exclude their abonos from efectivo/bancos until manually corrected (accepted limitation per proposal)
4. Code deploy after migration completes

No data migration needed. Null values correctly mean "not applicable" or "unknown initial abono method."

## Open Questions

- [ ] Should we add a one-time reconciliation script to backfill metodoPagoAbono for existing CREDITO ventas? (Out of scope per proposal, but worth tracking)