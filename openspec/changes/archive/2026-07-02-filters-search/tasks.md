# Tasks: filters-search

## Phase 1: Infrastructure

- [x] 1.1 Add `getFilteredRowModel()` and `globalFilterFn: 'includesString'` to DataTable — modify `src/components/data-table.tsx` to accept a `Table` instance prop instead of creating one internally; support `getFilteredRowModel`, `globalFilterFn`, `onColumnFiltersChange`, and `onGlobalFilterChange` state
- [x] 1.2 Create `DataTableToolbar` component — new file `src/components/data-table-toolbar.tsx` with search Input + dynamic Select filters; accepts `Table` instance and `FilterConfig[]`; "Todos" clears each filter
- [x] 1.3 Add `findAll()` to `LoteRepository` port — add `findAll(): Promise<Lote[]>` to `src/domain/ports/LoteRepository.ts`
- [x] 1.4 Implement `findAll()` in `PrismaLoteRepo` — add `findAll()` method in `src/infrastructure/repositories/PrismaLoteRepo.ts` using `prisma.lote.findMany({ orderBy: { createdAt: 'desc' } })` without estado filter; update `getLotes()` action in `src/presentation/actions/lotes.ts` to use `findAll()`

## Phase 2: Lotes Filters

- [x] 2.1 Add FK resolution map for proveedor (proveedorId → nombre) — build `Map<string, string>` from proveedores data in lotes page; pass to lote columns via `accessorFn` and filter config
- [x] 2.2 Add toolbar to lotes page — add `DataTableToolbar` with search placeholder "Buscar lotes...", producto filter (DOBLE_CREMA/SEMISALADO/Todos), estado filter (ACTIVO/AGOTADO/Todos), proveedor filter (dynamic names + Todos); convert page to client component wrapper pattern

## Phase 3: Clientes Filters

- [x] 3.1 Add toolbar to clientes page — add `DataTableToolbar` with search placeholder "Buscar clientes..." and tipo filter (MAYORISTA/MINORISTA/Todos)

## Phase 4: Ventas Filters

- [x] 4.1 Add FK resolution map for cliente (clienteId → nombre) — build `Map<string, string>` from clientes data in ventas page; pass to venta columns and filter config
- [x] 4.2 Add toolbar to ventas page — add `DataTableToolbar` with search placeholder "Buscar ventas..." (search on domiciliario), cliente filter (dynamic names + Todos), producto filter (DOBLE_CREMA/SEMISALADO/Todos)

## Phase 5: Gastos & Proveedores Filters

- [x] 5.1 Add toolbar to gastos page — add `DataTableToolbar` with search placeholder "Buscar gastos..." (search on concepto)
- [x] 5.2 Add toolbar to proveedores page — add `DataTableToolbar` with search placeholder "Buscar proveedores..." (search on nombre, telefono)

## Phase 6: Polish & Verification

- [x] 6.1 Ensure all filter Select components include "Todos" option that clears the column filter
- [x] 6.2 Run `npx tsc --noEmit` and verify zero type errors
- [x] 6.3 Run `npx vitest run` and verify all existing tests pass

## Review Workload Forecast

- Estimated changed lines: 300-500
- 400-line budget risk: Medium
- Chained PRs recommended: No
- Decision needed before apply: No
- Delivery strategy: single PR