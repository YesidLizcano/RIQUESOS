# Proposal: Soft Delete & Audit Trail

**Change ID:** soft-delete-audit
**Date:** 2026-07-02
**Status:** Proposed

## Intent

Add soft delete and audit trail to all mutable entities (Proveedor, Lote, Cliente, GastoFijo, Usuario) for data integrity and traceability. Currently, deleting a record is permanent and irreversible — no way to recover or know who did it.

## Problem

- **Hard deletes** physically remove rows from SQLite, breaking FK references (Proveedor→Lote, Cliente→Venta, Lote→Venta)
- **No audit trail** — no record of who created, updated, or deleted what
- **Irreversible** — accidental deletes cannot be undone
- Venta is immutable by domain design and MUST NOT be deleted, even softly

## Scope In

- Add `deletedAt DateTime?` field to Proveedor, Lote, Cliente, GastoFijo, Usuario in Prisma schema
- Create centralized `AuditLog` Prisma model (entityType, entityId, action, userId, changes JSON, timestamp)
- Prisma client extension to auto-filter `deletedAt: null` on all queries (with `{ includeDeleted: true }` opt-out for FK resolution)
- Update all find* queries to respect soft delete (exclude deleted records)
- Update all `delete()` repository methods to set `deletedAt` instead of hard deleting
- Add `restore()` method to repository ports and implementations
- Add "Restaurar" button on list pages for soft-deleted records
- Audit trail recording for CREATE, UPDATE, DELETE, RESTORE actions (userId from session)
- Update delete confirmation dialog text (no longer "permanent")

## Scope Out

- Venta delete/soft-delete (immutable by domain design)
- Full audit log UI page (separate future change)
- Audit log export (CSV/PDF)
- Rollback mechanism (undo a batch of changes)

## Approach

- **Soft delete:** `deletedAt DateTime?` field on each mutable entity. `null` = active, timestamp = deleted. Simple, Prisma-idiomatic, supports null filtering.
- **Audit trail:** Centralized `AuditLog` table. One table for all entity types. Stores `entityType`, `entityId`, `action` (CREATE/UPDATE/DELETE/RESTORE), `userId`, `changes` (JSON string), `createdAt`.
- **Auto-filtering:** Prisma client extension (`$extends`) adds `where: { deletedAt: null }` to all `findMany`/`findFirst` calls. FK resolution queries pass `{ includeDeleted: true }` to bypass the filter.
- **Restore:** New `restore()` method on repositories sets `deletedAt` back to `null`.

## Rollback

- Remove `deletedAt` fields via additive migration (set all `deletedAt` values to null first)
- Remove `AuditLog` model and migration
- Revert repository methods to hard delete
- Remove Prisma client extension