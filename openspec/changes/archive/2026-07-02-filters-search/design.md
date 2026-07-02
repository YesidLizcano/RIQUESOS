# Design: filters-search

## Architecture Decisions

### AD-01: Client-side filtering with TanStack Table

Use `getFilteredRowModel()` for all filtering. No backend changes except adding `findAll()` to the Lote repository. The dataset is small (<1000 records per entity), making client-side filtering instant with zero latency.

### AD-02: Toolbar pattern

Create a `DataTableToolbar` component that renders above `DataTable`. Each list page composes its own toolbar with entity-specific filter configuration. The toolbar receives the TanStack `Table` instance for state access.

```tsx
<DataTableToolbar table={table} searchPlaceholder="Buscar clientes..." filters={filterConfig} />
<DataTable table={table} />
```

The page component owns the `useReactTable` call and passes the instance down, enabling both toolbar and table to share filter state.

### AD-03: AND logic for combined filters

Row must match global search AND all active column filters. TanStack Table applies `globalFilter` first, then `columnFilters` — this naturally produces AND logic.

### AD-04: Global search uses TanStack Table `globalFilterFn`

Set `globalFilterFn: 'includesString'` (built-in, case-insensitive). The global search Input controls `globalFilter` state. Searchable columns are configured per entity in the page component by setting `columnDef.enableGlobalFilter` (defaults to `true`; explicitly set `false` on numeric/ID columns).

### AD-05: Select filters use column filters

Each Select dropdown calls `table.getColumn(id).setFilterValue(value)`. Selecting "Todos" sets the filter value to `undefined` (clears it). Options are derived from entity data already loaded for creation dialogs — no extra API calls.

### AD-06: FK resolution maps from existing dialog data

Pages that already fetch related entities for creation dialogs (Lotes fetches proveedores, Ventas fetches clientes+lotes) build `Map<id, nombre>` lookup maps. These maps are passed to column definitions via `accessorFn` for display, and to filter config for dropdown labels.

### AD-07: Lotes `findAll()` replaces `findActive()`

Add `findAll()` to `LoteRepository` port and `PrismaLoteRepo` implementation. The `getLotes()` server action switches to `findAll()`. This enables the estado filter to show AGOTADO lotes. Default estado filter value is "Todos" (show all), preserving current behavior where both statuses are visible.

### AD-08: Per-entity toolbar config

Each list page defines its own `FilterConfig[]` specifying which filters appear, their column keys, labels, and options. This keeps `DataTableToolbar` generic and reusable.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/components/data-table.tsx` | Modify | Accept `Table` instance as prop instead of creating internally; add `getFilteredRowModel`, `globalFilterFn`, column filter state |
| `src/components/data-table-toolbar.tsx` | Create | Search Input + dynamic Select filters, receives `Table` instance and `FilterConfig[]` |
| `src/domain/ports/LoteRepository.ts` | Modify | Add `findAll()` method |
| `src/infrastructure/repositories/PrismaLoteRepo.ts` | Modify | Implement `findAll()` — `findMany` without estado filter |
| `src/presentation/actions/lotes.ts` | Modify | Switch `getLotes()` to use `findAll()` |
| `src/app/(dashboard)/lotes/page.tsx` | Modify | Convert to client component wrapper, add toolbar with search, producto/estado/proveedor filters, pass proveedor map |
| `src/app/(dashboard)/clientes/page.tsx` | Modify | Add toolbar with search + tipo filter |
| `src/app/(dashboard)/ventas/page.tsx` | Modify | Add toolbar with search + cliente/producto filters, pass cliente map |
| `src/app/(dashboard)/gastos/page.tsx` | Modify | Add toolbar with search only |
| `src/app/(dashboard)/proveedores/page.tsx` | Modify | Add toolbar with search only |
| Column files (5) | Modify | Add `enableGlobalFilter: false` on non-searchable columns where needed |

## Key Patterns

**FilterConfig interface:**
```typescript
interface FilterConfig {
  columnId: string;
  label: string;
  type: 'select';
  options: { label: string; value: string }[];
}
```

**Page composition pattern:**
```tsx
// Each page extracts useReactTable to own the instance
const table = useReactTable({ data, columns, getFilteredRowModel, ... });
return (
  <>
    <DataTableToolbar table={table} searchPlaceholder="Buscar..." filters={configs} />
    <DataTable table={table} />
  </>
);
```

**FK resolution pattern:**
```typescript
const proveedorMap = new Map(proveedores.map(p => [p.id, p.nombre]));
// Used in column accessorFn and filter option labels
```