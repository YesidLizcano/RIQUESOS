# Proposal: edit-update-forms

**Date:** 2026-07-01
**Status:** Draft

## Intent

Add edit/update and delete functionality for four backoffice entities (Cliente, GastoFijo, Proveedor, Lote) so users can correct data and remove records without leaving the list page. Venta is excluded — it is immutable by domain design.

## Scope In

- Edit Dialog forms for Cliente (nombre, precios; tipo immutable), GastoFijo (concepto, valor), Proveedor (nombre, telefono), and Lote cost correction (precioBase, cantidad, flete, tajado, empaques; producto and proveedorId immutable)
- Delete confirmation Dialog for all four entities with FK constraint error handling
- DataTable action columns (edit/delete icons) on all four list pages
- Proveedor update/delete backend: use case methods, Server Actions, DTO, Zod schema
- Lote cost correction backend: entity `updateCosts()` method, use case with optimistic locking, Server Action, Zod schema
- Zod validation for existing Cliente and GastoFijo update actions (currently missing)

## Scope Out

- Venta edit/delete (immutable by domain rule)
- Inline editing or bulk operations
- Soft delete or audit trail
- Separate edit pages (using Dialog modals instead)
- Changing Cliente tipo or Lote producto/proveedorId (immutable fields)

## Approach

- Dialog modals consistent with existing creation pattern (shadcn Dialog)
- Edit forms pre-populated from fetched data, passed as props to client components
- Optimistic locking for Lote via `version` field (same pattern as `deductStock`)
- FK constraint errors caught at Server Action level and returned as user-friendly Spanish messages
- Delete confirmation via reusable shadcn AlertDialog component
- Zod schemas separate from create schemas (different validation rules for updates)

## Rollback

Remove Dialog components, action columns, Proveedor/Lote update infrastructure, and Zod update schemas. Revert Server Actions to pre-Zod state. No database migrations required — all changes are additive.