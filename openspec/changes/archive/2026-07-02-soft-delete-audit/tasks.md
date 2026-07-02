# Tasks: Soft Delete & Audit Trail

**Change ID:** soft-delete-audit
**Date:** 2026-07-02

## Phase 1: Schema & Migration

- [x] 1.1 Add `deletedAt DateTime?` field to Proveedor, Lote, Cliente, GastoFijo, Usuario models in `prisma/schema.prisma`
- [x] 1.2 Add `AuditLog` model to `prisma/schema.prisma` (id, entityType, entityId, action, userId, changes, createdAt) with indexes
- [x] 1.3 Run `npx prisma migrate dev --name add_soft_delete_and_audit` and `npx prisma generate`

## Phase 2: Domain Layer

- [x] 2.1 Add `deletedAt: Date | null` field to entity classes: Proveedor, Cliente, Lote, GastoFijo, Usuario (props interface + class property + `softDelete()` and `restore()` methods)
- [x] 2.2 Create `src/domain/entities/AuditLog.ts` — AuditLog entity with id, entityType, entityId, action, userId, changes, createdAt
- [x] 2.3 Create `src/domain/ports/AuditLogRepository.ts` — port with `save(entry)`, `findByEntity(entityType, entityId)`, `findAll()` methods
- [x] 2.4 Update repository ports: replace `delete()` with `softDelete(id: string): Promise<void>`, add `restore(id: string): Promise<void>`, add `findDeleted(): Promise<T[]>` on ClienteRepository, GastoFijoRepository, ProveedorRepository
- [x] 2.5 Update LoteRepository port: replace `delete()` with `softDelete()`, add `restore()`, add `findAllIncludeDeleted()`
- [x] 2.6 Update GastoFijoRepository port: `findByDateRange()` and `sumByPeriod()` SHALL exclude soft-deleted records (document in port comment)
- [x] 2.7 Update UsuarioRepository port: add `softDelete()`, `restore()`, `findDeleted()`
- [x] 2.8 Update barrel exports in `src/domain/entities/index.ts` and `src/domain/ports/index.ts`

## Phase 3: Prisma Client Extension

- [x] 3.1 Create Prisma client soft-delete filtering in `src/infrastructure/db.ts` — manually add `deletedAt: null` to all findMany/findFirst/findUnique calls on soft-delete models instead of Prisma extension
- [x] 3.2 Add `includeDeleted` bypass for FK resolution queries — handled by omitting `deletedAt: null` filter in findByIds() and findAllIncludeDeleted()
- [x] 3.3 Apply manual filtering approach instead of Prisma client extension for type safety

## Phase 4: Infrastructure Layer

- [x] 4.1 Create `src/infrastructure/repositories/PrismaAuditLogRepo.ts` — implement AuditLogRepository port
- [x] 4.2 Update `PrismaProveedorRepo` — implement `softDelete()`, `restore()`, `findDeleted()`, update `toEntity()` to map `deletedAt`
- [x] 4.3 Update `PrismaClienteRepo` — implement `softDelete()`, `restore()`, `findDeleted()`, update `findByIds()` to NOT filter deleted for FK resolution, update `toEntity()`
- [x] 4.4 Update `PrismaLoteRepo` — implement `softDelete()`, `restore()`, update `findActive()` to filter `deletedAt: null`, update `findAll()` to filter `deletedAt: null`, add `findAllIncludeDeleted()`, update `toEntity()`
- [x] 4.5 Update `PrismaGastoFijoRepo` — implement `softDelete()`, `restore()`, `findDeleted()`, update `findByDateRange()` and `sumByPeriod()` to exclude deleted, update `toEntity()`
- [x] 4.6 Update `PrismaUsuarioRepo` — implement `softDelete()`, `restore()`, `findDeleted()`, update `findByEmail()` to exclude deleted users, update `toEntity()`
- [x] 4.7 Ensure Venta repository has no delete/softDelete method — JSDoc comment added stating immutability

## Phase 5: Use Cases & Server Actions

- [x] 5.1 Update `GestionarProveedores` — replace `eliminar()` with soft delete, add `restaurar()`
- [x] 5.2 Update `GestionarClientes` — replace `eliminar()` with soft delete, add `restaurar()`
- [x] 5.3 Update `GestionarGastos` — replace `eliminar()` with soft delete, add `restaurar()`
- [x] 5.4 Update `CrearLote` — add audit call (CREATE) with userId parameter
- [x] 5.5 Update `ModificarLote` — add audit call (UPDATE) with userId, add soft delete and restore methods
- [x] 5.6 Update Server Actions: modify delete actions to call soft delete, add restore actions (restaurarProveedor, restaurarCliente, restaurarGasto, restaurarLote), pass userId from `requireSession()` for audit
- [x] 5.7 Update DTOs: add `deletedAt` field to entity response DTOs
- [x] 5.8 Add audit recording Server Action helper to reduce boilerplate in action files

## Phase 6: UI Updates

- [x] 6.1 Add "Mostrar eliminados" toggle to `src/components/data-table-toolbar.tsx` — a Checkbox that controls whether to fetch and show deleted records
- [x] 6.2 Update `src/components/forms/delete-confirm-dialog.tsx` — change text to "El registro será marcado como eliminado. Podrás restaurarlo desde la lista."
- [x] 6.3 Add "Restaurar" button to column definitions — appears when entity is deleted, styled with RotateCcw icon from lucide-react
- [x] 6.4 Update list pages (proveedores, clientes, gastos, lotes) to accept `showDeleted` state and fetch deleted records when enabled

## Phase 7: Verification

- [x] 7.1 Run `npx prisma migrate dev` and verify migration works. Then run `npx tsc --noEmit` and verify zero errors.
- [x] 7.2 Run `npx vitest run` and verify all tests pass. Update test mocks that reference repository delete methods.

---

## Review Workload Forecast

- **Estimated changed lines:** 500–800 (26 files touched)
- **400-line budget risk:** High
- **Delivery strategy:** size:exception (single PR, solo developer)
- **Chain strategy:** N/A — single PR accepted