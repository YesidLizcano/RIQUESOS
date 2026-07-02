# Design: Soft Delete & Audit Trail

**Change ID:** soft-delete-audit
**Date:** 2026-07-02

## Architecture Decisions

### AD-01: `deletedAt DateTime?` field on mutable entities

Add `deletedAt DateTime?` to Proveedor, Lote, Cliente, GastoFijo, Usuario models. `null` = active, timestamp = soft-deleted. Venta gets no such field (immutable by domain design). This is the simplest Prisma-idiomatic approach — nullable DateTime supports efficient null filtering.

### AD-02: Prisma client extension for auto-filtering

Use `Prisma.defineExtension()` to add `where: { deletedAt: null }` to all `findMany`/`findFirst` calls by default. Provide `{ includeDeleted: true }` opt-out for FK resolution queries (e.g., looking up a Proveedor name for a Lote's display). This centralizes the filtering logic and prevents forgotten `where` clauses.

```typescript
// src/infrastructure/db.ts — extension approach
const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      findMany(args) { /* inject deletedAt: null into where */ },
      findFirst(args) { /* inject deletedAt: null into where */ },
    },
  },
});
```

Models that lack `deletedAt` (Venta) are excluded from the extension via a model whitelist or try/catch on the column check.

### AD-03: Centralized AuditLog table

Single `AuditLog` Prisma model for all entity types. Scales better than per-entity audit fields, keeps domain entities clean (Clean Architecture — don't pollute entities with infrastructural concerns). SQLite stores JSON as String; the infrastructure layer handles stringify/parse.

### AD-04: AuditLog recording in use cases

Each use case method (crear, actualizar, eliminar, restaurar) calls `auditLogRepo.create()` at the end of a successful operation. The `userId` comes from `requireSession()` in the Server Action, passed down as a parameter. This keeps audit recording in the application layer, not scattered across infrastructure.

### AD-05: Delete confirmation dialog updated

Update `delete-confirm-dialog.tsx` text: "Esta acción no se puede deshacer" → "El registro será marcado como eliminado. Podrás restaurarlo desde la lista." Button label stays "Eliminar" but context changes from permanent to soft-delete.

### AD-06: "Mostrar eliminados" toggle in DataTableToolbar

Add a checkbox/toggle to `data-table-toolbar.tsx` that controls whether deleted records appear. When enabled, the list page fetches with `includeDeleted: true` and renders deleted records with `line-through + opacity-50` styling. Deleted records show "Restaurar" button instead of "Eliminar".

### AD-07: Venta delete prevention

VentaRepository has no `delete()` method and no `softDelete()`. This is enforced at the port level. The Venta list page has no delete button. The domain comment "Venta is immutable" is the authority.

## File Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | ADD `deletedAt DateTime?` to 5 models; ADD `AuditLog` model |
| `src/infrastructure/db.ts` | ADD Prisma client extension for soft-delete filtering |
| `src/domain/entities/Proveedor.ts` | ADD `deletedAt: Date \| null` to props and class |
| `src/domain/entities/Cliente.ts` | ADD `deletedAt: Date \| null` to props and class |
| `src/domain/entities/Lote.ts` | ADD `deletedAt: Date \| null` to props and class |
| `src/domain/entities/GastoFijo.ts` | ADD `deletedAt: Date \| null` to props and class |
| `src/domain/entities/Usuario.ts` | ADD `deletedAt: Date \| null` to props and class |
| `src/domain/entities/AuditLog.ts` | NEW — AuditLog domain entity |
| `src/domain/ports/ProveedorRepository.ts` | REPLACE `delete()` with `softDelete()`, ADD `restore()` |
| `src/domain/ports/ClienteRepository.ts` | REPLACE `delete()` with `softDelete()`, ADD `restore()`, `findDeleted()` |
| `src/domain/ports/LoteRepository.ts` | REPLACE `delete()` with `softDelete()`, ADD `restore()` |
| `src/domain/ports/GastoFijoRepository.ts` | REPLACE `delete()` with `softDelete()`, ADD `restore()`, `findDeleted()` |
| `src/domain/ports/UsuarioRepository.ts` | ADD `softDelete()`, `restore()`, `findDeleted()` |
| `src/domain/ports/AuditLogRepository.ts` | NEW — AuditLog repository port |
| `src/infrastructure/repositories/PrismaProveedorRepo.ts` | IMPLEMENT softDelete/restore, UPDATE toEntity |
| `src/infrastructure/repositories/PrismaClienteRepo.ts` | IMPLEMENT softDelete/restore, UPDATE toEntity |
| `src/infrastructure/repositories/PrismaLoteRepo.ts` | IMPLEMENT softDelete/restore, UPDATE toEntity |
| `src/infrastructure/repositories/PrismaGastoFijoRepo.ts` | IMPLEMENT softDelete/restore, UPDATE toEntity, EXCLUDE deleted from sumByPeriod |
| `src/infrastructure/repositories/PrismaUsuarioRepo.ts` | IMPLEMENT softDelete/restore, UPDATE toEntity, EXCLUDE deleted from findByEmail |
| `src/infrastructure/repositories/PrismaAuditLogRepo.ts` | NEW — AuditLog Prisma implementation |
| `src/application/use-cases/GestionarProveedores.ts` | REPLACE `eliminar()` → soft delete, ADD `restaurar()`, ADD audit calls |
| `src/application/use-cases/GestionarClientes.ts` | REPLACE `eliminar()` → soft delete, ADD `restaurar()`, ADD audit calls |
| `src/application/use-cases/GestionarGastos.ts` | REPLACE `eliminar()` → soft delete, ADD `restaurar()`, ADD audit calls |
| `src/application/use-cases/CrearLote.ts` | ADD audit call on create |
| `src/application/use-cases/ModificarLote.ts` | ADD audit call on update, soft delete, restore |
| `src/presentation/actions/*.ts` | UPDATE delete actions, ADD restore actions, PASS userId for audit |
| `src/components/data-table-toolbar.tsx` | ADD "Mostrar eliminados" toggle |
| `src/components/forms/delete-confirm-dialog.tsx` | UPDATE text for soft-delete language |
| `src/components/columns/*.tsx` | ADD "Restaurar" button for deleted records |

## Data Flow

### Soft Delete Flow
1. User clicks "Eliminar" → Server Action calls `useCase.eliminar(id)`
2. Use case calls `repo.softDelete(id)` → sets `deletedAt = new Date()`
3. Use case calls `auditLogRepo.create({ action: 'DELETE', entityType, entityId, userId })`
4. Prisma extension auto-filters deleted records from subsequent queries

### Restore Flow
1. User clicks "Restaurar" → Server Action calls `useCase.restaurar(id)`
2. Use case calls `repo.restore(id)` → sets `deletedAt = null`
3. Use case calls `auditLogRepo.create({ action: 'RESTORE', entityType, entityId, userId })`
4. Record reappears in active list

### FK Resolution Flow
1. Venta list page needs Cliente/Lote names → Server Action calls with `includeDeleted: true`
2. Prisma extension skips `deletedAt: null` filter for these queries
3. Even deleted Proveedores/Clientes resolve correctly for historical Venta data