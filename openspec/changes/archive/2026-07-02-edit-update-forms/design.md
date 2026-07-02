# Design: edit-update-forms

**Date:** 2026-07-01

---

## Architecture Decisions

### AD-01: Edit forms use Dialog modals
All edit forms use shadcn Dialog modals, consistent with the existing `CrearXDialog` pattern. This keeps the user in context on the list page. Each edit Dialog is a separate client component (`EditarXDialog`) that receives pre-fetched entity data as props from the Server Component page.

### AD-02: DataTable Actions column with lucide-react icons
Each list page's `columns` array gets a new `Actions` column rendering Pencil (edit) and Trash2 (delete) icons. The column cell renders a client-side wrapper that manages Dialog open/close state. The actions column is defined per-page (not inside the generic `DataTable` component) to keep DataTable generic.

### AD-03: Lote uses optimistic locking via version field
The `ModificarLote` use case reads the Lote, checks the `version` field matches the client-sent version, calls `lote.updateCosts()`, and persists via `PrismaLoteRepo.updateCosts()` which uses `updateMany({ where: { id, version } })` with `version: { increment: 1 }`. On version mismatch, throws `ConcurrencyError`. The Edit Lote Dialog sends the current `version` as a hidden field.

### AD-04: Delete uses shadcn AlertDialog confirmation
A reusable `DeleteConfirmDialog` component wraps shadcn AlertDialog with "¿Estás seguro?" text and Cancel/Confirm buttons. It accepts an `onConfirm` callback and entity name for the message. Installed via `npx shadcn@latest add alert-dialog`.

### AD-05: FK constraint errors return Spanish messages
Delete Server Actions catch Prisma errors with code `P2003` (FK constraint) and return structured `{ success: false, error: "No se puede eliminar X con Y asociados" }` messages. The client displays these via `toast.error()`.

### AD-06: Proveedor update/delete backend
Add `actualizar()` and `eliminar()` methods to `GestionarProveedores` use case. Add `ActualizarProveedorRequest` DTO. Create `actualizarProveedor` and `eliminarProveedor` Server Actions with Zod validation.

### AD-07: Lote cost correction backend
Add `updateCosts(props)` method to `Lote` entity — returns a new Lote with updated cost fields and recalculated `costoRealCalculadoKg`. Create `ModificarLote` use case with version check. Add `ActualizarLoteRequest` DTO. Create `modificarLote` Server Action with Zod validation. Add `updateCosts()` to `PrismaLoteRepo` using optimistic locking (same pattern as `deductStock`).

### AD-08: Edit forms pre-populated via Server Component data fetch
List pages are Server Components that fetch entity data. When the user clicks edit, the Dialog client component already has the row data from the table — no additional fetch needed. The `version` field for Lote is included in the `LoteResponse` DTO (already present). Delete actions pass the entity `id` via hidden form field.

---

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `src/components/forms/editar-cliente-dialog.tsx` | Edit Cliente Dialog (nombre, precios; tipo read-only) |
| `src/components/forms/editar-gasto-fijo-dialog.tsx` | Edit GastoFijo Dialog (concepto, valor; fecha read-only) |
| `src/components/forms/editar-proveedor-dialog.tsx` | Edit Proveedor Dialog (nombre, telefono) |
| `src/components/forms/editar-lote-dialog.tsx` | Edit Lote Dialog (cost fields; producto/proveedor read-only) |
| `src/components/forms/delete-confirm-dialog.tsx` | Reusable AlertDialog for delete confirmation |
| `src/components/ui/alert-dialog.tsx` | shadcn AlertDialog component |
| `src/application/use-cases/ModificarLote.ts` | Use case for Lote cost correction with optimistic locking |

### Modified Files
| File | Change |
|------|--------|
| `src/domain/entities/Lote.ts` | Add `updateCosts()` method |
| `src/domain/ports/LoteRepository.ts` | Add `updateCosts(id, lote, expectedVersion)` method |
| `src/infrastructure/repositories/PrismaLoteRepo.ts` | Implement `updateCosts()` with version check |
| `src/application/use-cases/GestionarProveedores.ts` | Add `actualizar()` and `eliminar()` methods |
| `src/presentation/dtos/proveedor.dto.ts` | Add `ActualizarProveedorRequest` |
| `src/presentation/dtos/lote.dto.ts` | Add `ActualizarLoteRequest` |
| `src/presentation/dtos/index.ts` | Export new DTOs |
| `src/presentation/validations/cliente.schema.ts` | Add `actualizarClienteSchema` |
| `src/presentation/validations/gasto-fijo.schema.ts` | Add `actualizarGastoFijoSchema` |
| `src/presentation/validations/proveedor.schema.ts` | Add `actualizarProveedorSchema`, `eliminarProveedorSchema` |
| `src/presentation/validations/lote.schema.ts` | Add `actualizarLoteSchema` |
| `src/presentation/actions/clientes.ts` | Refactor `actualizarCliente` to use Zod, add FK error handling to `eliminarCliente` |
| `src/presentation/actions/gastos.ts` | Refactor `actualizarGasto` to use Zod |
| `src/presentation/actions/proveedores.ts` | Add `actualizarProveedor`, `eliminarProveedor` with FK error handling |
| `src/presentation/actions/lotes.ts` | Add `modificarLote` with ConcurrencyError handling |
| `src/app/(dashboard)/clientes/page.tsx` | Add Actions column, import EditarClienteDialog |
| `src/app/(dashboard)/gastos/page.tsx` | Add Actions column, import EditarGastoFijoDialog |
| `src/app/(dashboard)/proveedores/page.tsx` | Add Actions column, import EditarProveedorDialog |
| `src/app/(dashboard)/lotes/page.tsx` | Add Actions column, import EditarLoteDialog |

---

## Data Flow

```
User clicks edit icon → Client component sets Dialog open=true
  → Dialog shows pre-populated form (data from DataTable row)
  → User edits and submits → FormData to Server Action
  → Server Action validates with Zod → delegates to use case
  → Use case calls domain method → saves via repository
  → revalidatePath → toast success / toast error
```

```
User clicks delete icon → Client component sets AlertDialog open=true
  → User confirms → FormData with id to Server Action
  → Server Action delegates to use case.eliminar()
  → If Prisma P2003 → return Spanish FK error message
  → revalidatePath → toast success / toast error
```