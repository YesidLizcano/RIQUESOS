# Tasks: edit-update-forms

**Date:** 2026-07-01

---

## Phase 1: Proveedor Update/Delete Backend

- [x] 1.1 Add `ActualizarProveedorRequest` DTO to `src/presentation/dtos/proveedor.dto.ts`
- [x] 1.2 Add `actualizar()` and `eliminar()` methods to `GestionarProveedores` use case (`src/application/use-cases/GestionarProveedores.ts`)
- [x] 1.3 Add `actualizarProveedorSchema` and `eliminarProveedorSchema` to `src/presentation/validations/proveedor.schema.ts`
- [x] 1.4 Create `actualizarProveedor` Server Action in `src/presentation/actions/proveedores.ts` with Zod validation
- [x] 1.5 Create `eliminarProveedor` Server Action in `src/presentation/actions/proveedores.ts` with FK constraint error handling (P2003)
- [x] 1.6 Export new DTOs from `src/presentation/dtos/index.ts`

## Phase 2: Lote Cost Correction Backend

- [x] 2.1 Add `updateCosts(props)` method to `Lote` entity (`src/domain/entities/Lote.ts`) — returns new Lote with updated cost fields and recalculated `costoRealCalculadoKg`
- [x] 2.2 Add `updateCosts(id: string, lote: Lote, expectedVersion: number)` method to `LoteRepository` port (`src/domain/ports/LoteRepository.ts`)
- [x] 2.3 Implement `updateCosts()` in `PrismaLoteRepo` (`src/infrastructure/repositories/PrismaLoteRepo.ts`) using optimistic locking with `updateMany({ where: { id, version } })`
- [x] 2.4 Create `ModificarLote` use case (`src/application/use-cases/ModificarLote.ts`) — fetches Lote, verifies version, calls `updateCosts()`, saves with version increment
- [x] 2.5 Add `ActualizarLoteRequest` DTO to `src/presentation/dtos/lote.dto.ts`
- [x] 2.6 Add `actualizarLoteSchema` to `src/presentation/validations/lote.schema.ts` (id + version required, cost fields optional)
- [x] 2.7 Create `modificarLote` Server Action in `src/presentation/actions/lotes.ts` with Zod validation and ConcurrencyError handling
- [x] 2.8 Register `ModificarLote` use case export in `src/application/use-cases/index.ts`

## Phase 3: Zod Validation for Existing Updates

- [x] 3.1 Add `actualizarClienteSchema` to `src/presentation/validations/cliente.schema.ts` (id required, nombre optional non-empty, precios optional non-negative)
- [x] 3.2 Refactor `actualizarCliente` Server Action to use Zod validation instead of raw FormData parsing
- [x] 3.3 Add `actualizarGastoFijoSchema` to `src/presentation/validations/gasto-fijo.schema.ts` (id required, concepto optional non-empty, valor optional non-negative)
- [x] 3.4 Refactor `actualizarGasto` Server Action to use Zod validation instead of raw FormData parsing

## Phase 4: Delete Infrastructure

- [x] 4.1 Install shadcn AlertDialog: `npx shadcn@latest add alert-dialog`
- [x] 4.2 Create reusable `DeleteConfirmDialog` component (`src/components/forms/delete-confirm-dialog.tsx`) — accepts entityName, onConfirm callback, children trigger
- [x] 4.3 Add FK constraint error handling to `eliminarCliente` Server Action (catch P2003, return Spanish message)
- [x] 4.4 Add FK constraint error handling to `eliminarGasto` Server Action (catch P2003, return Spanish message) — GastoFijo has no FK constraints but defensive coding
- [x] 4.5 Add `eliminarProveedor` Server Action with FK constraint error handling
- [x] 4.6 Add `eliminarLote` Server Action with FK constraint error handling (Ventas referencing Lote)
- [x] 4.7 Create FK error utility function in `src/presentation/actions/utils.ts` — `handlePrismaError(error): string | null`

## Phase 5: Edit Form Components

- [x] 5.1 Create `EditarClienteDialog` component (`src/components/forms/editar-cliente-dialog.tsx`) — nombre, precioDobleCrema, precioSemisalado editable; tipo read-only
- [x] 5.2 Create `EditarGastoFijoDialog` component (`src/components/forms/editar-gasto-fijo-dialog.tsx`) — concepto, valor editable; fecha read-only
- [x] 5.3 Create `EditarProveedorDialog` component (`src/components/forms/editar-proveedor-dialog.tsx`) — nombre, telefono editable
- [x] 5.4 Create `EditarLoteDialog` component (`src/components/forms/editar-lote-dialog.tsx`) — cost fields editable; producto, proveedor read-only; hidden version field

## Phase 6: DataTable Integration

- [x] 6.1 Add Actions column (Pencil + Trash2 icons) to Clientes page (`src/app/(dashboard)/clientes/page.tsx`) — edit opens EditarClienteDialog, delete opens DeleteConfirmDialog
- [x] 6.2 Add Actions column to Gastos page (`src/app/(dashboard)/gastos/page.tsx`) — edit opens EditarGastoFijoDialog, delete opens DeleteConfirmDialog
- [x] 6.3 Add Actions column to Proveedores page (`src/app/(dashboard)/proveedores/page.tsx`) — edit opens EditarProveedorDialog, delete opens DeleteConfirmDialog
- [x] 6.4 Add Actions column to Lotes page (`src/app/(dashboard)/lotes/page.tsx`) — edit opens EditarLoteDialog, delete opens DeleteConfirmDialog

## Phase 7: Verification

- [x] 7.1 Add unit tests for ModificarLote use case (optimistic locking success + version mismatch error)
- [x] 7.2 Add unit tests for Proveedor update/delete use case methods
- [x] 7.3 Run `npx tsc --noEmit` and verify zero errors
- [x] 7.4 Run `npx vitest run` and verify all tests pass

---

## Review Workload Forecast

- **Estimated changed lines**: 600–900
- **400-line budget risk**: High (size:exception already approved for UI changes)
- **Delivery strategy**: size:exception (solo developer, single PR)
- **Chained PRs recommended**: No