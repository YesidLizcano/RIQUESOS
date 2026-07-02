# Exploration: edit-update-forms

**Date:** 2026-07-01
**Change:** Add edit/update functionality to existing CRUD entities

---

## 1. Current State Analysis

### What Exists

| Layer | Cliente | GastoFijo | Proveedor | Lote | Venta |
|-------|---------|-----------|-----------|------|-------|
| **Domain Entity** | `Cliente` — has `updateNombre()`, `updatePrecio()` methods | `GastoFijo` — has `updateConcepto()`, `updateValor()` methods | `Proveedor` — has `updateNombre()`, `updateTelefono()` methods | `Lote` — **NO** update methods; has `deductStock()`, `markAsAgotado()` | `Venta` — **explicitly immutable** (comment: "Venta is immutable — no update or delete methods") |
| **Use Case** | `GestionarClientes` — has `actualizar()`, `eliminar()` | `GestionarGastos` — has `actualizar()`, `eliminar()` | `GestionarProveedores` — **NO** update/delete methods (only `crear`, `obtenerPorId`, `obtenerTodos`) | `CrearLote` — **NO** update use case | `RegistrarVenta` — **NO** update/delete (by design) |
| **Server Action** | `actualizarCliente()` + `eliminarCliente()` exist | `actualizarGasto()` + `eliminarGasto()` exist | **NO** update/delete actions | **NO** update/delete actions | **NO** update/delete actions |
| **Repository** | `PrismaClienteRepo` — `save()` upserts, `delete()` exists | `PrismaGastoFijoRepo` — `save()` upserts, `delete()` exists | `PrismaProveedorRepo` — `save()` upserts, `delete()` exists | `PrismaLoteRepo` — `save()` upserts, `deductStock()` with optimistic locking | `PrismaVentaRepo` — `save()` only, no delete; `registrarVentaAtomico()` |
| **Zod Schema** | `crearClienteSchema` only | `crearGastoFijoSchema` only | `crearProveedorSchema` only | `crearLoteSchema` only | `registrarVentaSchema` only |
| **DTO** | `CrearClienteRequest` + `ActualizarClienteRequest` | `CrearGastoRequest` + `ActualizarGastoRequest` | `CrearProveedorRequest` only | `CrearLoteRequest` only | `RegistrarVentaRequest` only |
| **Form Component** | `CrearClienteDialog` only | `CrearGastoFijoDialog` only | `CrearProveedorDialog` only | `CrearLoteDialog` only | `RegistrarVentaDialog` only |
| **List Page** | DataTable, no action column | DataTable, no action column | DataTable, no action column | DataTable, no action column | DataTable, no action column |

### Key Patterns

1. **All creation forms** are shadcn Dialog modals with controlled state + `FormData` pattern
2. **Server Actions** use `'use server'`, `requireSession()`, Zod validation, then delegate to use cases
3. **Repositories** use Prisma with upsert pattern in `save()` (create if no `id`, update if `id` exists)
4. **Domain entities** use immutable value objects — updates return new instances via domain methods
5. **Lote** uses optimistic locking via `version` field (incremented on every `deductStock`)
6. **Venta registration** is atomic with concurrency retry (3 retries on `ConcurrencyError`)

---

## 2. Editability Matrix Per Entity

### Lote

| Field | Editable? | Rationale |
|-------|-----------|-----------|
| `producto` (TipoProducto) | **NO** | Changing product type after creation makes no sense — all related Ventas reference this product type for pricing |
| `proveedorId` | **NO** | The supplier is a creation-time fact; changing it would break historical traceability |
| `cantidadCompradaKg` | **MAYBE — with caution** | Changing purchased quantity after Ventas have been deducted is dangerous. Only makes sense if NO Ventas exist yet. Recalculates `costoRealCalculadoKg`. Risk: stock math becomes inconsistent |
| `precioCompraBaseKg` | **YES** | Cost correction (e.g., supplier invoice arrived with different price). Recalculates `costoRealCalculadoKg`. **However**: existing Ventas already locked in the old `costoAplicado`, so this only affects future Ventas |
| `costoFlete` | **YES** | Same rationale as `precioCompraBaseKg` — cost correction |
| `costoTajado` | **YES** | Same rationale |
| `costoEmpaques` | **YES** | Same rationale |
| `stockDisponibleKg` | **NO — managed by system** | Only modified via `deductStock()` during Venta registration |
| `estado` | **NO — managed by system** | Transitions: ACTIVO → AGOTADO (automatic when stock reaches 0) |
| `fechaIngreso` | **NO** | Creation timestamp |
| `version` | **NO — managed by system** | Optimistic locking token |

**Recommended editable fields**: `precioCompraBaseKg`, `costoFlete`, `costoTajado`, `costoEmpaques`

**Optimistic locking concern**: Lote updates MUST use the `version` field for optimistic locking, same as `deductStock`. This means the update Server Action must send `version` and the repo must check it.

### Cliente

| Field | Editable? | Rationale |
|-------|-----------|-----------|
| `nombre` | **YES** | Name corrections, business name changes |
| `tipo` | **NO** | Changing from MAYORISTA to MINORISTA (or vice versa) would retroactively affect pricing rules. Domain entity has NO `updateTipo()` method |
| `precioDobleCrema` | **YES** | Price adjustments for mayorista clients |
| `precioSemisalado` | **YES** | Price adjustments for mayorista clients |

**Recommended editable fields**: `nombre`, `precioDobleCrema`, `precioSemisalado`

**Note**: Changing custom prices does NOT retroactively affect past Ventas — those are already recorded with locked-in prices.

### Proveedor

| Field | Editable? | Rationale |
|-------|-----------|-----------|
| `nombre` | **YES** | Name corrections |
| `telefono` | **YES** | Contact info changes |

**Recommended editable fields**: `nombre`, `telefono` (all non-id fields)

### GastoFijo

| Field | Editable? | Rationale |
|-------|-----------|-----------|
| `concepto` | **YES** | Description corrections |
| `valor` | **YES** | Amount corrections |
| `fecha` | **NO** | Creation timestamp, not editable |

**Recommended editable fields**: `concepto`, `valor` (all non-id, non-fecha fields)

### Venta

| Field | Editable? | Rationale |
|-------|-----------|-----------|
| ALL | **NO** | Venta is explicitly immutable by design. Comment on entity: *"Venta is immutable — no update or delete methods. To 'modify' a Venta, create a new one and handle it at the use-case level."* |

**Venta should NOT have edit/update forms.** This is a financial record — once recorded, it should not change. If a mistake was made, the correct approach is cancellation/credit (a future feature), not editing.

---

## 3. What Already Supports Update/Delete

### Fully Implemented (Backend)

These entities have complete update+delete support at all layers (entity methods, use case, server action, repository):

1. **Cliente** — `GestionarClientes.actualizar()` / `.eliminar()`, server action `actualizarCliente()` / `eliminarCliente()`, entity has `updateNombre()`, `updatePrecio()`, DTO has `ActualizarClienteRequest`
2. **GastoFijo** — `GestionarGastos.actualizar()` / `.eliminar()`, server action `actualizarGasto()` / `eliminarGasto()`, entity has `updateConcepto()`, `updateValor()`, DTO has `ActualizarGastoRequest`

**Missing for these**: Front-end edit forms and delete buttons in DataTable action columns.

### Partially Implemented (Backend supports update via `save()` upsert)

3. **Proveedor** — Repository `save()` does upsert, `delete()` exists, entity has `updateNombre()` + `updateTelefono()`. But NO use case method, NO server action, NO update DTO, NO Zod update schema.

### Not Implemented

4. **Lote** — No update method on entity, no update use case, no update server action, no update DTO/schema. Repository `save()` upserts but no domain method to validate what can change.
5. **Venta** — **Intentionally immutable.** No update support at any layer, and none should be added.

---

## 4. Recommended Approach

### UI Pattern: Dialog Modals (same as creation)

**Why Dialog over separate page:**

1. Consistency — all creation forms are already Dialog modals
2. These entities are simple (3-7 fields) — no need for a full page
3. The backoffice is a lightweight management tool, not a complex workflow app
4. Reduces navigation complexity

**Implementation strategy:**

- Create `Editar[Entity]Dialog` components alongside the existing `Crear[Entity]Dialog`
- Or refactor to a single `[Entity]Dialog` that accepts an optional entity prop (edit mode when prop is present, create mode when absent)
- Add an "Actions" column to each DataTable with Edit (pencil icon) and Delete (trash icon) buttons

### Priority Order

| Priority | Entity | Effort | Justification |
|----------|--------|--------|---------------|
| **P1** | Cliente | **LOW** | Backend fully complete. Only need front-end form + action column |
| **P1** | GastoFijo | **LOW** | Backend fully complete. Only need front-end form + action column |
| **P2** | Proveedor | **MEDIUM** | Need: use case `actualizar()` / `eliminar()`, server actions, update Zod schema, update DTO, front-end form + action column |
| **P3** | Lote | **MEDIUM-HIGH** | Need: entity update method (cost correction only), use case, server action, optimistic locking in update, update Zod schema, update DTO, front-end form + action column |
| **—** | Venta | **N/A** | Immutable by design. No edit form. Future: cancellation/void feature |

### Component Architecture

**Option A: Separate Dialog Components (Recommended for simplicity)**

```
src/components/forms/
  crear-cliente-dialog.tsx    (existing)
  editar-cliente-dialog.tsx  (new)
  crear-gasto-fijo-dialog.tsx    (existing)
  editar-gasto-fijo-dialog.tsx   (new)
  crear-proveedor-dialog.tsx    (existing)
  editar-proveedor-dialog.tsx   (new)
  crear-lote-dialog.tsx    (existing)
  editar-lote-dialog.tsx   (new)
```

**Option B: Unified Dialog (more DRY but more complex)**

Refactor to a single `<ClienteFormDialog cliente?: ClienteResponse />` that switches between create/edit mode.

**Recommendation**: Start with Option A for P1 (quick wins for Cliente/GastoFijo), then evaluate Option B refactor if the pattern repeats well.

---

## 5. Risks and Constraints

### Optimistic Locking for Lote

The Lote entity uses a `version` field for optimistic locking during stock deduction (`deductStock`). Any update to Lote costs MUST also respect this version field to prevent race conditions between cost corrections and concurrent sales.

**Implementation requirement**: The Lote update Server Action must:
1. Send the current `version` from the client
2. The use case/repo must check `version` matches before updating
3. Increment `version` on successful update
4. Return `ConcurrencyError` on mismatch

**This is critical** — if a cost is being corrected while a Venta is being registered, the two operations must not corrupt each other.

### Domain Invariants

- **Cliente tipo is immutable**: No `updateTipo()` method exists, and for good reason — changing a client's type would make historical pricing inconsistent
- **Lote producto is immutable**: The product type determines pricing rules; changing it would break past Venta records
- **Lote proveedorId is immutable**: The supplier is a fact about the batch, not a mutable attribute
- **Venta is fully immutable**: Financial records must not change after creation

### Referential Integrity for Delete

- **Deleting a Proveedor** that has associated Lotes will fail due to FK constraint. Should show a meaningful error or soft-delete.
- **Deleting a Cliente** that has associated Ventas will fail due to FK constraint. Same concern.
- **Lote deletion**: Should probably not be allowed if Ventas exist. Consider soft-deactivate only.
- **GastoFijo deletion**: No FK constraints, safe to delete.

### Missing Zod Update Schemas

- Only `crearXSchema` schemas exist. Update schemas need to handle:
  - Partial fields (only send what changed)
  - Include `id` field (required for update)
  - Different validation rules (e.g., `tipo` is not editable for Cliente updates)
  - For Lote: include `version` field for optimistic locking

---

## 6. Estimated Scope

### P1 — Cliente + GastoFijo Edit/Delete (Backend exists)

| Task | Files |
|------|-------|
| Edit Cliente Dialog | `src/components/forms/editar-cliente-dialog.tsx` (new) |
| Edit GastoFijo Dialog | `src/components/forms/editar-gasto-fijo-dialog.tsx` (new) |
| Update Zod schemas | `src/presentation/validations/cliente.schema.ts` (add `actualizarClienteSchema`) |
| Update Zod schemas | `src/presentation/validations/gasto-fijo.schema.ts` (add `actualizarGastoFijoSchema`) |
| DataTable actions column | All 5 list pages get action column with Edit/Delete buttons |
| Wire server actions into forms | Use existing `actualizarCliente()`, `actualizarGasto()` |
| Delete confirmation | Dialog or toast confirmation before calling `eliminarCliente()`/`eliminarGasto()` |

**Effort**: ~2-3 days

### P2 — Proveedor Edit/Delete

| Task | Files |
|------|-------|
| Use case `actualizar()` + `eliminar()` | `src/application/use-cases/GestionarProveedores.ts` |
| Server actions | `src/presentation/actions/proveedores.ts` (add `actualizarProveedor()`, `eliminarProveedor()`) |
| Update Zod schema | `src/presentation/validations/proveedor.schema.ts` (add `actualizarProveedorSchema`) |
| Update DTO | `src/presentation/dtos/proveedor.dto.ts` (add `ActualizarProveedorRequest`) |
| Edit Proveedor Dialog | `src/components/forms/editar-proveedor-dialog.tsx` (new) |
| DataTable actions column | `src/app/(dashboard)/proveedores/page.tsx` |

**Effort**: ~1 day (pattern is clear from Cliente/GastoFijo)

### P3 — Lote Cost Correction

| Task | Files |
|------|-------|
| Entity `updateCostos()` method | `src/domain/entities/Lote.ts` (new method) |
| Use case `ActualizarLote` | `src/application/use-cases/ActualizarLote.ts` (new) |
| Repository optimistic lock update | `src/infrastructure/repositories/PrismaLoteRepo.ts` (add `updateCostos()` with version check) |
| LoteRepository port | `src/domain/ports/LoteRepository.ts` (add method) |
| Server action | `src/presentation/actions/lotes.ts` (add `actualizarLote()`) |
| Update Zod schema | `src/presentation/validations/lote.schema.ts` (add `actualizarLoteSchema`) |
| Update DTO | `src/presentation/dtos/lote.dto.ts` (add `ActualizarLoteRequest`) |
| Edit Lote Dialog | `src/components/forms/editar-lote-dialog.tsx` (new — limited fields) |
| DataTable actions column | `src/app/(dashboard)/lotes/page.tsx` |

**Effort**: ~2 days (optimistic locking adds complexity)

### Total Estimated Effort

| Phase | Scope | Effort |
|-------|-------|--------|
| P1 | Cliente + GastoFijo edit/delete | 2-3 days |
| P2 | Proveedor edit/delete | 1 day |
| P3 | Lote cost correction | 2 days |
| **Total** | | **5-6 days** |

---

## 7. Architectural Notes

### Pattern for Update Server Actions

The existing `actualizarCliente()` and `actualizarGasto()` Server Actions use raw `FormData` parsing without Zod validation:

```typescript
// clientes.ts — NO Zod validation on update!
export async function actualizarCliente(formData: FormData) {
  await requireSession();
  const request: ActualizarClienteRequest = {
    id: formData.get('id') as string,
    nombre: (formData.get('nombre') as string) || undefined,
    precioDobleCrema: (formData.get('precioDobleCrema') as string) || undefined,
    precioSemisalado: (formData.get('precioSemisalado') as string) || undefined,
  };
  // ...
}
```

**This is a gap** — creation actions use Zod validation but update actions do NOT. All new update actions should use Zod schemas for consistency and security.

### DataTable Action Column Pattern

The `DataTable` component is generic (`DataTableProps<TData, TValue>`). Adding an actions column requires:

1. Adding an `actions` column definition per page (not inside DataTable itself)
2. Each action column renders Edit/Delete buttons that invoke client-side Dialog open/close state
3. The Dialog components need the entity data pre-filled

### Delete Confirmation

All delete operations should include:
1. A confirmation Dialog ("Are you sure?")
2. FK constraint error handling (show user-friendly message if deletion fails due to related records)
3. `revalidatePath` after successful deletion (already done in existing delete actions)

---

## 8. Files to Create/Modify Summary

### New Files

- `src/components/forms/editar-cliente-dialog.tsx`
- `src/components/forms/editar-gasto-fijo-dialog.tsx`
- `src/components/forms/editar-proveedor-dialog.tsx`
- `src/components/forms/editar-lote-dialog.tsx`
- `src/components/delete-confirmation-dialog.tsx` (reusable confirmation modal)
- `src/application/use-cases/ActualizarLote.ts` (P3)

### Files to Modify

- `src/presentation/validations/cliente.schema.ts` — add `actualizarClienteSchema`
- `src/presentation/validations/gasto-fijo.schema.ts` — add `actualizarGastoFijoSchema`
- `src/presentation/validations/proveedor.schema.ts` — add `actualizarProveedorSchema`
- `src/presentation/validations/lote.schema.ts` — add `actualizarLoteSchema`
- `src/presentation/dtos/proveedor.dto.ts` — add `ActualizarProveedorRequest`
- `src/presentation/dtos/lote.dto.ts` — add `ActualizarLoteRequest`
- `src/presentation/actions/proveedores.ts` — add `actualizarProveedor()`, `eliminarProveedor()`, `getProveedorById()`
- `src/presentation/actions/lotes.ts` — add `actualizarLote()`
- `src/presentation/actions/clientes.ts` — add Zod validation to `actualizarCliente()`
- `src/presentation/actions/gastos.ts` — add Zod validation to `actualizarGasto()`
- `src/application/use-cases/GestionarProveedores.ts` — add `actualizar()`, `eliminar()`
- `src/domain/entities/Lote.ts` — add `updateCostos()` method
- `src/domain/ports/LoteRepository.ts` — add `updateCostos()` method
- `src/infrastructure/repositories/PrismaLoteRepo.ts` — add `updateCostos()` with version check
- `src/app/(dashboard)/clientes/page.tsx` — add actions column
- `src/app/(dashboard)/gastos/page.tsx` — add actions column
- `src/app/(dashboard)/proveedores/page.tsx` — add actions column
- `src/app/(dashboard)/lotes/page.tsx` — add actions column
