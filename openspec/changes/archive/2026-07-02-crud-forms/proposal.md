# Proposal: crud-forms

**Change**: crud-forms
**Date**: 2026-07-01
**Status**: Proposed

---

## Intent

Add CRUD creation forms for all 5 entities (Lote, Cliente, Venta, GastoFijo, Proveedor) using shadcn/ui Dialog modals triggered by "Agregar" buttons on each list page. Forms use native HTML `<form action={serverAction}>` with zod server-side validation, matching the existing Server Action pattern (all mutations accept `FormData`).

## Problem

All list pages are read-only DataTable views with no way to create records from the UI. Proveedor lacks a Server Action, use case, and DTO entirely — only the domain entity and Prisma repository exist. Users currently manage data through Prisma Studio or database seeds.

## Scope In

- 5 creation dialogs: Lote, Cliente, Venta, GastoFijo, Proveedor
- Proveedor infrastructure: Server Action, use case, DTO, zod schema (currently missing)
- Zod validation schemas for all 5 entities (server-side only)
- shadcn Dialog + Select components installation
- "Agregar" button on each list page header opening the creation dialog
- Sonner toast notifications for success/error feedback

## Scope Out

- Edit/update forms for existing records (defer to follow-up change)
- Delete confirmation dialogs (defer)
- Mobile responsive polish for dialogs (defer)
- react-hook-form integration (defer — use zod server-side validation only)
- DataTable action columns (edit/delete row buttons)

## New Capabilities

- **crud-forms**: Creation forms for all 5 entities via Dialog modals with Server Actions and zod validation

## Approach

1. Install shadcn `dialog` and `select` components, add `zod` dependency
2. Create Proveedor Server Action + use case + DTO (infrastructure gap)
3. Create zod validation schemas for all 5 entities
4. Build 5 Client Component dialogs (`'use client'`) embedded in Server Component pages
5. Each dialog wraps a native `<form action={serverAction}>` with named inputs
6. Server Actions validate with zod before delegating to use cases
7. Pages remain Server Components that fetch data for selects and pass as props
8. Add "Agregar" Button to each list page header

## Rollback Plan

Remove all `src/components/forms/crear-*-dialog.tsx` files, remove Dialog imports from pages, remove Proveedor Server Action/use case/DTO, remove zod schemas, uninstall dialog/select components. Pages revert to read-only state.