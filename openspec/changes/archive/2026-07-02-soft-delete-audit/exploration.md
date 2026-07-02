# Exploration: Soft Delete & Audit Trail

**Change ID:** soft-delete-audit  
**Date:** 2026-07-02  
**Status:** Explored

---

## 1. Current State Analysis

### 1.1 Prisma Schema (6 models)

| Model | Key Fields | Relations | Has `version`? | Has `estado`? |
|-------|-----------|-----------|---------------|---------------|
| **Proveedor** | id, nombre, telefono, createdAt, updatedAt | → Lote[] | No | No |
| **Lote** | id, producto (enum), fechaIngreso, proveedorId, cantidadCompradaKg, precioCompraBaseKg, costos*, stockDisponibleKg, estado (ACTIVO/AGOTADO), version | ← Proveedor, → Venta[] | **Yes** | **Yes** |
| **Cliente** | id, nombre, tipo (enum), precioDobleCrema?, precioSemisalado?, createdAt, updatedAt | → Venta[] | No | No |
| **Venta** | id, fecha, clienteId, loteId, cantidadVendidaKg, precioVentaKg, ingresoTotal, costoAplicado, gananciaBruta, valorDomicilio, domiciliario, createdAt | ← Cliente, ← Lote | No | No |
| **GastoFijo** | id, fecha, concepto, valor, createdAt, updatedAt | None | No | No |
| **Usuario** | id, email, passwordHash, role (enum), createdAt, updatedAt | None | No | No |

**Key observations:**
- Lote already has `estado` (ACTIVO/AGOTADO) and `version` for optimistic locking
- Lote uses `updateMany` with version check for concurrent modifications (deductStock, updateCosts)
- Venta has NO `updatedAt` — it is intentionally immutable (domain entity comment: "Venta is immutable — no update or delete methods")
- All entities except Venta and Usuario have `createdAt` / `updatedAt` timestamps
- No `deletedAt` field exists on any model
- No audit/log table exists

### 1.2 Domain Entities

| Entity | Mutable? | Has delete logic? | Notes |
|--------|---------|-------------------|-------|
| **Proveedor** | Yes (updateNombre, updateTelefono) | No domain method, delete via repo | Simple entity, FK to Lote |
| **Lote** | Yes (deductStock, markAsAgotado, updateCosts) | No domain method, delete via repo + action check | Complex: version, estado, cost calculations |
| **Cliente** | Yes (updateNombre, updatePrecio) | No domain method, delete via repo | Has custom pricing per product type |
| **Venta** | **Immutable** | **No delete at all** | Created once, never modified |
| **GastoFijo** | Yes (updateConcepto, updateValor) | No domain method, delete via repo | Simple expense record |
| **Usuario** | Yes (updateRole) | No delete method on repo | Auth entity, no delete() in port |

### 1.3 Repository Ports — delete() Signatures

| Repository | delete(id: string) | Other relevant methods |
|-----------|-------------------|----------------------|
| **ClienteRepository** | ✅ `delete(id: string): Promise<void>` | findById, findByIds, findAll, save |
| **GastoFijoRepository** | ✅ `delete(id: string): Promise<void>` | findById, findAll, findByDateRange, save, sumByPeriod |
| **LoteRepository** | ✅ `delete(id: string): Promise<void>` | findById, findActive, findAll, findByProveedor, save, deductStock, updateCosts |
| **ProveedorRepository** | ✅ `delete(id: string): Promise<void>` | findById, findAll, save |
| **VentaRepository** | ❌ **No delete method** | save, findByDateRange, findByCliente, sumIngresosByPeriod, sumCostosByPeriod, registrarVentaAtomico |
| **UsuarioRepository** | ❌ **No delete method** | findByEmail, save |

### 1.4 Prisma Repository Implementations — Hard Delete

All 4 repositories with `delete()` use `prisma.model.delete({ where: { id } })` — this is a hard delete that physically removes the row from SQLite.

Key behaviors:
- **Cliente**: Hard delete; FK constraint from Venta catches errors, shown as "No se puede eliminar un cliente con ventas asociadas"
- **GastoFijo**: Hard delete; no FK constraints, so deletion always succeeds
- **Lote**: Hard delete with pre-check — action `eliminarLote` verifies `stockDisponibleKg === cantidadCompradaKg` before deleting; FK constraint from Venta catches remaining errors
- **Proveedor**: Hard delete; FK constraint from Lote catches errors

### 1.5 Server Actions — Delete Flow

| Action | Entity | Pre-delete Check | Error Handling |
|--------|--------|-----------------|----------------|
| `eliminarCliente` | Cliente | None (relies on FK) | `handlePrismaError` → "No se puede eliminar un cliente con ventas asociadas" |
| `eliminarGasto` | GastoFijo | None | `handlePrismaError` → generic message |
| `eliminarLote` | Lote | Stock check: `stockDisponibleKg !== cantidadCompradaKg` → error | `handlePrismaError` → FK error message |
| `eliminarProveedor` | Proveedor | None (relies on FK) | `handlePrismaError` → FK error message |

### 1.6 Delete Confirmation Dialog

`delete-confirm-dialog.tsx` is a reusable AlertDialog with:
- Title: "¿Estás seguro?"
- Description: "Esta acción no se puede deshacer. Se eliminará permanentemente {entityName}."
- Cancel / Eliminar buttons
- Loading state during deletion
- **Current message says "permanently" — will need to change for soft delete**

### 1.7 Auth & User Identity

- Auth via NextAuth (JWT strategy) with Credentials provider
- Session available in Server Actions via `requireSession()` which returns `session.user` containing `{ id, email, role }`
- **The user ID is available for audit trail** — it comes from `session.user.id`

### 1.8 No Existing Audit Trail

- No AuditLog model in Prisma schema
- No audit-related code in any layer
- No tracking of who created, updated, or deleted what

---

## 2. Soft Delete Approach Comparison

### Option A: `deletedAt` Timestamp (nullable DateTime)

| Aspect | Assessment |
|--------|-----------|
| **How it works** | Add `deletedAt DateTime?` to each model. `null` = active, non-null = soft-deleted |
| **Query filtering** | Every `findMany` and `findById` needs `where: { deletedAt: null }` |
| **Prisma middleware** | Can use `$extends` or client extensions to auto-filter — reduces boilerplate |
| **Restore** | Set `deletedAt = null` — simple |
| **Schema change** | 5 models need `deletedAt` (not Venta, not Usuario) |
| **SQLite impact** | No issue; nullable DateTime works fine |
| **Relation handling** | Soft-deleted Proveedor should still resolve for Venta FK lookups |
| **Pros** | Simple, standard, easy to understand, Prisma-native |
| **Cons** | Must remember to filter in every query; no "why deleted" info |

### Option B: `estado` Enum Field (Active/Inactive/Deleted)

| Aspect | Assessment |
|--------|-----------|
| **How it works** | Add `estado` enum field to each model (ACTIVO, INACTIVO, ELIMINADO) |
| **Query filtering** | Every `findMany` needs `where: { estado: 'ACTIVO' }` |
| **Restore** | Change estado back to ACTIVO |
| **Schema change** | New enums per model or generic EstadoRegistro enum |
| **Pros** | More semantic; can distinguish "inactive" from "deleted" |
| **Cons** | More complex; Lote already has `estado` for ACTIVO/AGOTADO — conflicting meanings; enum proliferation in SQLite |

### Option C: Separate `DeletedRecords` Table

| Aspect | Assessment |
|--------|-----------|
| **How it works** | Move deleted records to a separate table with deletion metadata |
| **Query filtering** | No filtering needed — deleted records simply aren't in the main table |
| **Restore** | Move record back from deleted table |
| **Schema change** | New tables mirroring each model |
| **Pros** | Clean main tables; no query filtering; performance |
| **Cons** | Schema duplication; restore requires moving records back; relations break (FK references); complex |

### **Recommendation: Option A — `deletedAt` timestamp**

Rationale:
- Simplest to implement in Clean Architecture
- Prisma supports nullable DateTime natively with SQLite
- Lote already has `estado` for business status (ACTIVO/AGOTADO) — don't conflate with deletion status
- Can add Prisma client extension for automatic filtering
- Easy to query deleted records for admin/audit purposes
- Restore is trivial: set `deletedAt = null`

---

## 3. Audit Trail Approach Comparison

### Option A: Per-Entity Audit Fields

Add `createdBy`, `updatedBy`, `deletedBy` (String?) fields to each model.

| Aspect | Assessment |
|--------|-----------|
| **What it tracks** | Who last modified each record + who deleted it |
| **Schema impact** | 3-4 new nullable fields per model |
| **Pros** | Simple; no joins needed to see who changed a record |
| **Cons** | No history — only last change; no creation details if updatedBy overwrites; can't answer "what changed at what time" |

### Option B: Centralized `AuditLog` Table

New model: `AuditLog { id, entityType, entityId, action (CREATE/UPDATE/DELETE), userId, timestamp, changes (JSON?) }`

| Aspect | Assessment |
|--------|-----------|
| **What it tracks** | Every mutation with full context |
| **Schema impact** | 1 new model, no changes to existing models |
| **Querying** | "Who deleted Cliente X?" → simple query |
| **Pros** | Complete history; single table; can track any model; no existing model pollution |
| **Cons** | JSON column for `changes` (SQLite supports this via String); requires writing to audit log in every use case or repo; query to get audit trail for an entity |
| **Clean Arch fit** | Audit logging is a cross-cutting concern — best as infrastructure interceptor or middleware |

### Option C: Event Sourcing

Store all state changes as immutable events; reconstruct state from event stream.

| Aspect | Assessment |
|--------|-----------|
| **What it tracks** | Complete event history |
| **Pros** | Perfect auditability; temporal queries |
| **Cons** | Massive over-engineering for a cheese distribution backoffice; complex event replay; Prisma + SQLite not ideal for this |

### **Recommendation: Option B — Centralized AuditLog table**

Rationale:
- Per-entity fields only track the last change, not the full history — the business asked for "who created/updated/deleted what and when"
- A centralized table keeps existing models clean (Clean Architecture principle: don't pollute domain entities with infrastructural concerns)
- SQLite supports String-based JSON for change tracking
- Can be implemented as a Prisma middleware or a domain service that the use cases call
- AuditLog is conceptually separate from the business entities — it belongs in infrastructure

**Hybrid approach**: Use `deletedAt` on entities for soft delete (query concern) + `AuditLog` table for audit trail (historical concern). These serve different purposes and complement each other.

---

## 4. Entity-by-Entity Analysis

### Proveedor

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ✅ Yes |
| **Reason** | Has FK relation to Lote. Currently cannot hard-delete if lotes exist. Soft delete allows "hiding" a provider while keeping lotes intact. |
| **deletedAt field** | Add `deletedAt DateTime?` |
| **Filtering** | `findAll()` should exclude `deletedAt: not null` |
| **Restore?** | Should be restorable |
| **Audit** | Track CREATE, UPDATE, DELETE |

### Lote

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ✅ Yes, with caveats |
| **Reason** | Already has `estado` (ACTIVO/AGOTADO). Currently only deletable when no stock sold. Soft delete would allow "removing" a bad entry while preserving ventas that reference it. |
| **deletedAt field** | Add `deletedAt DateTime?` |
| **Interaction with estado** | `deletedAt` and `estado` serve different purposes: `estado` = business lifecycle, `deletedAt` = admin removal |
| **Interaction with version** | Soft-deleted lotes should NOT participate in optimistic locking — `findById` for active lotes must filter by `deletedAt: null` |
| **Filtering** | `findActive()` and `findAll()` must exclude deleted. `findById()` for venta resolution should still work (soft-deleted proveedor/lote names needed for historical records) |
| **Restore?** | Should be restorable if no ventas reference was broken |
| **Audit** | Track CREATE, UPDATE (cost changes), DELETE |

### Cliente

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ✅ Yes |
| **Reason** | Has FK relation to Venta. Currently cannot hard-delete if ventas exist. Soft delete allows deactivating a client while keeping historical ventas intact. |
| **deletedAt field** | Add `deletedAt DateTime?` |
| **Filtering** | `findAll()` should exclude `deletedAt: not null` |
| **Venta FK resolution** | Ventas must still resolve to soft-deleted clientes for historical reports |
| **Restore?** | Should be restorable |
| **Audit** | Track CREATE, UPDATE, DELETE |

### Venta

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ❌ **No — Venta is immutable** |
| **Reason** | Domain entity explicitly states "Venta is immutable — no update or delete methods." Venta is a financial record. Deleting (even softly) would compromise accounting integrity. |
| **deletedAt** | NOT added |
| **What to do instead** | If a Venta was registered incorrectly, the correct pattern is to create a "reversal" Venta (credit note pattern) — but this is a separate change, not part of soft-delete |
| **Audit** | Track CREATE only (no UPDATE or DELETE) |

### GastoFijo

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ✅ Yes |
| **Reason** | No FK constraints currently. But for audit compliance, expenses should not disappear from the system. Soft delete preserves history. |
| **deletedAt field** | Add `deletedAt DateTime?` |
| **Filtering** | `findAll()` and `findByDateRange()` must exclude deleted |
| **Impact on sumByPeriod** | Must also exclude deleted gastos from aggregation |
| **Restore?** | Should be restorable |
| **Audit** | Track CREATE, UPDATE, DELETE |

### Usuario

| Aspect | Recommendation |
|--------|---------------|
| **Soft delete?** | ✅ Yes (or just deactivate) |
| **Reason** | Currently no delete() in repository port. But for user management, deactivating (soft delete) is better than hard delete. Active users should not lose their auth records. |
| **deletedAt field** | Add `deletedAt DateTime?` (or alternatively, add `activo Boolean @default(true)`) |
| **Login filtering** | Auth must only allow non-deleted users to log in |
| **Audit** | Track CREATE, UPDATE, DELETE |

---

## 5. Proposed Schema Changes

### 5.1 Soft Delete Fields (added to 5 models)

```prisma
model Proveedor {
  id        String   @id @default(uuid())
  nombre    String
  telefono  String?
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lotes     Lote[]
}

model Lote {
  id                   String       @id @default(uuid())
  producto             TipoProducto
  fechaIngreso         DateTime     @default(now())
  proveedorId          String
  proveedor            Proveedor    @relation(fields: [proveedorId], references: [id])
  cantidadCompradaKg   Decimal      @default("0")
  precioCompraBaseKg   Decimal      @default("0")
  costoFlete           Decimal      @default("0")
  costoTajado          Decimal      @default("0")
  costoEmpaques        Decimal      @default("0")
  costoRealCalculadoKg Decimal      @default("0")
  stockDisponibleKg    Decimal      @default("0")
  estado               EstadoLote   @default(ACTIVO)
  version              Int          @default(1)
  deletedAt            DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  ventas               Venta[]
}

model Cliente {
  id               String       @id @default(uuid())
  nombre            String
  tipo              TipoCliente
  precioDobleCrema  Decimal?
  precioSemisalado  Decimal?
  deletedAt         DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  ventas            Venta[]
}

model GastoFijo {
  id        String   @id @default(uuid())
  fecha     DateTime @default(now())
  concepto  String
  valor     Decimal  @default("0")
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Usuario {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String
  role         RolUsuario @default(ADMIN)
  deletedAt    DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

### 5.2 AuditLog Table (new model)

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  entityType String   // "Proveedor", "Lote", "Cliente", "Venta", "GastoFijo", "Usuario"
  entityId   String   // UUID of the affected record
  action     String   // "CREATE", "UPDATE", "DELETE", "RESTORE"
  userId     String?  // Who performed the action (nullable for system actions)
  changes    String?  // JSON string of changed fields: { "field": { "old": ..., "new": ... } }
  createdAt  DateTime @default(now())

  // Optional: index for faster lookups
  @@index([entityType, entityId])
  @@index([entityType, action])
  @@index([userId])
}
```

**Note on SQLite**: SQLite doesn't support native JSON columns, but Prisma's `String` type works fine for storing JSON-encoded strings. We parse/stringify in the infrastructure layer.

---

## 6. Risks and Constraints

### 6.1 SQLite Migration Limitations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SQLite doesn't support `ALTER TABLE DROP COLUMN` (pre-3.35.0) | Can't remove columns in rollback | Additive changes only (adding nullable columns is safe) |
| SQLite doesn't support adding constraints to existing columns | Can't make `deletedAt` required retroactively | Use nullable fields — this is what we want anyway |
| Prisma with SQLite uses `db push` instead of proper migrations | Schema changes are applied directly | No existing migration history to conflict with. First migration can use `prisma db push` |
| No concurrent write support | WAL mode helps but still single-writer | Audit log writes could block business writes briefly |

### 6.2 FK Constraint Interactions

| Scenario | Current Behavior | With Soft Delete |
|----------|-----------------|-----------------|
| Delete Proveedor with Lotes | FK error caught → Spanish message | Set `deletedAt` on Proveedor; Lotes remain. Proveedor still resolves for Venta display. |
| Delete Cliente with Ventas | FK error caught → Spanish message | Set `deletedAt` on Cliente; Ventas remain. Cliente still resolves for Venta display. |
| Delete Lote with Ventas | Pre-check + FK error | Pre-check still applies; if no stock sold, soft-delete. If ventas exist, soft-delete still works (Venta FK still resolves to soft-deleted Lote). |
| Delete GastoFijo | Always succeeds (no FK) | Soft-delete; no FK concerns |

**Critical**: After soft delete, FK constraints (Proveedor→Lote, Cliente→Venta, Lote→Venta) must still resolve. SQLite/Prisma FK checks won't care about `deletedAt` — the row still exists, so FK constraints are satisfied. This is a major advantage of soft delete over hard delete.

### 6.3 Query Filtering Complexity

Every `findMany` and `findById` query must be updated to filter out soft-deleted records, EXCEPT:

- **Venta resolution**: When displaying a Venta, we need the Cliente and Lote names even if they're soft-deleted
- **Dashboard aggregations**: Should soft-deleted gastos/ventas be included in totals? (No — they should be excluded from gastos; ventas are never deleted)
- **Audit log viewer**: Must show soft-deleted records

**Mitigation**: Use a Prisma client extension that auto-filters `deletedAt: null` on all models, with an opt-out for specific queries.

### 6.4 Lote `version` Field Interaction

Soft-deleted lotes must NOT participate in:
- `findActive()` — already filters by `estado: ACTIVO`, also needs `deletedAt: null`
- `deductStock()` — must check `deletedAt: null` before deducting
- `updateCosts()` — must check `deletedAt: null` before updating
- `registrarVentaAtomico()` — must check Lote's `deletedAt` is null before creating a Venta

### 6.5 Restore Operations

Soft delete implies the ability to restore. This means:
- New `restore()` method on repository ports
- New `restaurarProveedor`, `restaurarCliente`, etc. server actions
- Restore dialog in UI (or just a toggle in list pages)
- Need to validate that restore doesn't violate uniqueness constraints (e.g., reactivating a Usuario with an email that's now taken by another user)

### 6.6 Venta FK Resolution After Soft Delete

When a Proveedor or Cliente is soft-deleted, Ventas that reference them must still display their names. Two approaches:

1. **Include soft-deleted in FK lookups**: When building Venta detail views, `include: { cliente: true }` works because the row still exists
2. **Denormalize names**: Store `clienteNombre` on Venta at creation time (not currently done)

**Recommendation**: Approach 1 — just include the relation. Prisma doesn't filter by `deletedAt` unless we explicitly add it, so FK lookups in Venta queries will still work.

---

## 7. Implementation Scope Estimate

### 7.1 Files to Modify

| Layer | Files | Changes |
|-------|-------|---------|
| **Prisma Schema** | `prisma/schema.prisma` | Add `deletedAt DateTime?` to 5 models; Add `AuditLog` model |
| **Domain Entities** | `src/domain/entities/Proveedor.ts`, `Cliente.ts`, `Lote.ts`, `GastoFijo.ts`, `Usuario.ts` | Add `deletedAt?: Date \| null` to props and class |
| **Domain Enums** | `src/domain/enums.ts` | Add `AccionAudit` enum (CREATE, UPDATE, DELETE, RESTORE) |
| **Domain Ports** | `src/domain/ports/ProveedorRepository.ts`, `ClienteRepository.ts`, `LoteRepository.ts`, `GastoFijoRepository.ts`, `UsuarioRepository.ts` | Add `restore(id: string): Promise<void>`, modify `findAll()` contract to exclude deleted, add `findDeleted()` for admin |
| **New Domain Port** | `src/domain/ports/AuditLogRepository.ts` | New interface: `save(entry)`, `findByEntity()`, `findAll()` |
| **Infrastructure Repos** | 5 Prisma repos | Modify all queries to filter `deletedAt: null`; Implement `softDelete()` instead of `delete()`; Add `restore()`; Add AuditLog writes |
| **New Infra Repo** | `src/infrastructure/repositories/PrismaAuditLogRepo.ts` | Implement AuditLogRepository |
| **Use Cases** | `GestionarClientes.ts`, `GestionarProveedores.ts`, `GestionarGastos.ts` | Modify `eliminar()` to soft-delete; Add `restaurar()` |
| **New Use Case** | `src/application/use-cases/RegistrarAuditoria.ts` | New: write audit log entries |
| **Server Actions** | `clientes.ts`, `gastos.ts`, `lotes.ts`, `proveedores.ts` | Modify delete actions; Add restore actions; Pass userId to use cases |
| **UI Components** | `delete-confirm-dialog.tsx` | Update messaging; Add "restore" button variant |
| **UI Pages** | List pages for each entity | Add "show deleted" toggle; Add restore action |
| **Auth** | `auth.ts`, `requireSession()` | Already returns `session.user.id` — use for audit userId |

### 7.2 New Files

| File | Purpose |
|------|---------|
| `src/domain/entities/AuditLog.ts` | AuditLog domain entity |
| `src/domain/ports/AuditLogRepository.ts` | AuditLog repository port |
| `src/infrastructure/repositories/PrismaAuditLogRepo.ts` | Prisma implementation |
| `src/application/use-cases/RegistrarAuditoria.ts` | Use case for writing audit entries |
| `src/presentation/actions/auditoria.ts` | Server action for querying audit log |
| `src/components/forms/restore-confirm-dialog.tsx` | Restore confirmation UI |
| `src/presentation/validations/audit-log.schema.ts` | Zod schemas for audit queries |

### 7.3 Estimated Effort

| Task | Complexity | Effort |
|------|-----------|--------|
| Prisma schema changes + `db push` | Low | 0.5h |
| Domain entity + port changes | Medium | 1.5h |
| Prisma repo soft-delete + filter updates | Medium-High | 3h |
| Prisma client extension for auto-filtering | Medium | 1h |
| AuditLog domain + infra + use case | Medium | 2h |
| Use case modifications (soft delete + audit) | Medium | 2h |
| Server action modifications | Low-Medium | 1.5h |
| UI: Update delete dialog messaging | Low | 0.5h |
| UI: Add restore actions | Medium | 2h |
| UI: Add audit log viewer page | Medium | 2h |
| Testing | Medium | 3h |
| **Total** | | **~19h** |

### 7.4 Recommended Implementation Order

1. **Prisma schema** — Add `deletedAt` fields + AuditLog model; `prisma db push`
2. **Prisma client extension** — Auto-filter `deletedAt: null` on all queries (opt-out with `includeDeleted: true`)
3. **Domain entities** — Add `deletedAt` to props/classes
4. **Repository ports** — Add `softDelete()`, `restore()`, `findDeleted()`; remove or deprecate `delete()`
5. **Prisma repositories** — Implement soft-delete (update `deletedAt`), restore, filtering
6. **AuditLog** — New entity, port, repo, use case
7. **Use cases** — Modify `eliminar()` to call `softDelete()` + audit; Add `restaurar()`
8. **Server actions** — Pass `userId` from session; Add restore actions; Add audit log action
9. **UI** — Update delete dialog; Add restore button; Add audit log page
10. **Tests** — Unit tests for soft-delete logic; Integration tests for filtering

---

## 8. Key Design Decisions (Open Questions)

| # | Question | Recommended Answer | Needs Discussion |
|---|----------|-------------------|-----------------|
| 1 | Should `findAll()` always exclude soft-deleted, or should there be a toggle? | Always exclude by default; add `findDeleted()` for admin | No — standard pattern |
| 2 | Should soft-deleted records be visible in a separate "trash" view? | Yes — add a "Ver eliminados" toggle/filter on list pages | Yes — UX decision |
| 3 | Should audit trail track WHO made the change (userId)? | Yes — `userId` from `session.user.id` is available | No — clear requirement |
| 4 | Should audit track field-level changes (old/new values)? | Yes — store as JSON string in `changes` column | Maybe — adds complexity; could start with action-only |
| 5 | Should Venta ever be soft-deleted? | No — Venta is immutable by domain design | No — clear principle |
| 6 | Should GastoFijo soft-delete affect monthly aggregations? | Yes — `sumByPeriod` and `findByDateRange` must exclude deleted | No — obvious |
| 7 | Should we use Prisma middleware or client extensions for auto-filtering? | Client extensions (`$extends`) — more type-safe, better DX | No — modern Prisma approach |
| 8 | Should restore validate business rules (e.g., unique email for Usuario)? | Yes — restore should go through domain validation | Yes — specific rules per entity |
| 9 | What about the `handlePrismaError` FK error messages? | Still needed for edge cases, but soft-delete eliminates most FK error scenarios | No — defensive |
| 10 | Should audit log be queryable via the UI? | Yes — add an "Auditoría" section in the backoffice | Yes — UX decision |
