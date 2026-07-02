# Spec: Soft Delete & Audit Trail

**Change ID:** soft-delete-audit
**Date:** 2026-07-02

## Functional Requirements

### FR-01: Soft delete field
Each mutable entity (Proveedor, Lote, Cliente, GastoFijo, Usuario) SHALL have a `deletedAt DateTime?` field in the Prisma schema. When `deletedAt` is null, the record is active. When set to a timestamp, the record is soft-deleted. Venta SHALL NOT have a `deletedAt` field.

### FR-02: Auto-filter soft-deleted records
All `findMany` and `findFirst` queries SHALL exclude soft-deleted records by default (`where: { deletedAt: null }`). FK resolution queries (e.g., resolving Proveedor name for a Lote, Cliente name for a Venta) SHALL be exempt from this filter via `{ includeDeleted: true }` opt-out. The Prisma client extension SHALL implement this filtering transparently.

### FR-03: Soft delete action
Server Action delete methods SHALL set `deletedAt` to the current timestamp instead of performing a hard delete. The repository `delete()` method SHALL be replaced with `softDelete()` that performs an update: `{ deletedAt: new Date() }`.

### FR-04: Restore action
A "Restaurar" action SHALL be available for each soft-deletable entity. Restore SHALL set `deletedAt` back to null. Each repository port SHALL include `restore(id: string): Promise<void>`. Restore SHALL only be available for records where `deletedAt` is not null.

### FR-05: View deleted records toggle
Each list page SHALL have a "Mostrar eliminados" toggle. When disabled (default), only active records display. When enabled, soft-deleted records SHALL appear with muted styling (line-through + opacity) and a "Restaurar" button replacing the "Eliminar" button.

### FR-06: AuditLog model
A centralized `AuditLog` Prisma model SHALL record all CREATE, UPDATE, DELETE, and RESTORE actions. Each entry SHALL contain: `id` (UUID), `entityType` (String: "Proveedor", "Lote", etc.), `entityId` (String: UUID of the affected record), `action` (String: "CREATE", "UPDATE", "DELETE", "RESTORE"), `userId` (String?, nullable for system actions), `changes` (String?, JSON-encoded field changes), `createdAt` (DateTime). Indexes SHALL be added on `[entityType, entityId]`, `[entityType, action]`, and `[userId]`.

### FR-07: Audit recording
Every Server Action that creates, updates, deletes, or restores an entity SHALL create an AuditLog entry. The `userId` SHALL come from the authenticated user's session via `requireSession()`. The `changes` field SHALL contain a JSON string of changed fields (e.g., `{ "nombre": { "old": "X", "new": "Y" } }`).

### FR-08: Venta immutability
Venta records SHALL never be deleted, not even softly. VentaRepository SHALL NOT have a `delete()` or `softDelete()` method. If `softDelete()` is called on a Venta, the repository SHALL throw a domain error. The Venta list page SHALL NOT display a delete button.

## Non-Functional Requirements

### NFR-01: Additive-only migrations
Prisma migrations SHALL be additive-only (add columns, not remove). SQLite does not support `DROP COLUMN` in all versions. Rolling back means setting `deletedAt` to null, not removing the column.

### NFR-02: FK constraint preservation
Soft-deleted records SHALL remain in the database so FK constraints (Proveedor→Lote, Cliente→Venta, Lote→Venta) continue to resolve. This eliminates the FK error messages that hard deletes currently trigger.

### NFR-03: Default active-only display
List pages SHALL default to showing only active records. Viewing deleted records is opt-in via the "Mostrar eliminados" toggle.

### NFR-04: Aggregation exclusion
Dashboard aggregations (sumByPeriod, sumIngresosByPeriod, etc.) SHALL exclude soft-deleted GastoFijo records from totals.

## Scenarios

**Scenario 1: Soft delete a Proveedor with associated Lotes**
Given a Proveedor with 3 associated Lotes
When the user deletes the Proveedor
Then `deletedAt` is set to the current timestamp
And the Proveedor no longer appears in the active list
And the 3 Lotes still resolve their Proveedor FK (Proveedor row still exists)
And the Proveedor appears with muted styling when "Mostrar eliminados" is enabled

**Scenario 2: Restore a soft-deleted Cliente**
Given a soft-deleted Cliente with `deletedAt` set
When the user clicks "Restaurar"
Then `deletedAt` is set back to null
And the Cliente reappears in the active list
And an AuditLog entry with action "RESTORE" is created with the current userId

**Scenario 3: Audit trail for entity creation**
Given an authenticated user with session.user.id
When the user creates a new Lote
Then an AuditLog entry is created with action "CREATE", entityType "Lote", and the userId

**Scenario 4: Venta cannot be deleted**
Given any Venta record
When any code attempts to delete or soft-delete the Venta
Then the operation SHALL be rejected (no delete method on VentaRepository)

**Scenario 5: Dashboard excludes deleted GastoFijo**
Given a soft-deleted GastoFijo within a date range
When the dashboard calculates total gastos for that period
Then the soft-deleted GastoFijo is excluded from the sum