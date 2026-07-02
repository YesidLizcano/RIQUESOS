# Pagination — Design Document

## Architecture Decisions

### AD-01: Client-side pagination
TanStack Table `getPaginationRowModel()` handles all pagination logic in the browser. No backend changes. Data is still fetched in full via existing Server Actions. This is sufficient for current dataset sizes (<1K per entity).

### AD-02: DataTable optional pagination prop
DataTable gains a `pagination` prop typed `boolean` with default `true`. When `true`, `getPaginationRowModel()` is added to the table instance and pagination controls render. When `false`, the table behaves exactly as today — all rows, no controls. Dashboard passes `pagination={false}`.

### AD-03: Page size selector above table
A `Select` component (shadcn) positioned top-right above the table shows "Filas por página" with options {10, 20, 50}. Default is 20. This keeps the selector visually associated with the table without consuming vertical space below.

### AD-04: Pagination controls below table
shadcn `Pagination` component renders below the table: Previous (Anterior), page indicator "Página X de Y", Next (Siguiente). Uses TanStack Table's `table.getPageCount()`, `table.previousPage()`, `table.nextPage()`, `table.getCanPreviousPage()`, `table.getCanNextPage()`.

### AD-05: URL query param for page size
Page size persists via `?pageSize=20` URL parameter using Next.js `useSearchParams`. On load, DataTable reads `pageSize` from URL; if absent, defaults to 20. Size changes update the URL via `useRouter` push, preserving other params. This makes page size bookmarkable and shareable.

### AD-06: Gastos total across all pages
The Gastos page computes `totalGastos` from the full dataset before passing data to DataTable. The `footerRow` receives this pre-computed total, not the sum of the current page. No change to DataTable's footerRow logic — it already receives a React node.

### AD-07: Ventas column extraction
Ventas columns (lines 13-54 of `ventas/page.tsx`) are extracted to `src/components/columns/venta-columns.tsx`. Since Ventas columns have no action buttons (unlike other entities that use 'use client' for dialog triggers), the file exports a plain `ColumnDef` array without 'use client' directive.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/data-table.tsx` | Modified | Add pagination prop, getPaginationRowModel, page size state, controls |
| `src/components/ui/pagination.tsx` | Created | shadcn Pagination component |
| `src/components/columns/venta-columns.tsx` | Created | Extracted Ventas column definitions |
| `src/app/(dashboard)/ventas/page.tsx` | Modified | Import venta-columns, remove inline columns |
| `src/app/(dashboard)/gastos/page.tsx` | Modified | No change needed — total already computed from full dataset |
| `src/app/(dashboard)/lotes/page.tsx` | Minor | Works with default pagination=true |
| `src/app/(dashboard)/clientes/page.tsx` | Minor | Works with default pagination=true |
| `src/app/(dashboard)/proveedores/page.tsx` | Minor | Works with default pagination=true |
| `src/app/(dashboard)/page.tsx` | Modified | Pass `pagination={false}` to all 3 DataTable instances |

## Component Structure

```
DataTable (pagination=true, default)
├── PageSizeSelector (Select: 10/20/50, top-right)
├── Table (rows sliced by TanStack pagination model)
└── PaginationControls (Previous/Next, "Página X de Y")

DataTable (pagination=false)
└── Table (all rows, no controls — current behavior)
```