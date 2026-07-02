# Pagination — Task Breakdown

## Review Workload Forecast
- Estimated changed lines: 200-350
- 400-line budget risk: Low
- Delivery strategy: single PR

---

## Phase 1: Infrastructure

- [x] 1.1 Install shadcn Pagination component (`npx shadcn@latest add pagination`)
- [x] 1.2 Extract Ventas inline columns to `src/components/columns/venta-columns.tsx`
- [x] 1.3 Verify TanStack Table v8.21.3 supports `getPaginationRowModel()` (check exports in package)

## Phase 2: DataTable Enhancement

- [x] 2.1 Add `pagination` prop to DataTable (boolean, default: true); conditionally include `getPaginationRowModel()` in table options
- [x] 2.2 Add page size state to DataTable (`pageSize` initialized from URL param `pageSize` or default 20); wire `onPaginationChange` and `state.pagination`
- [x] 2.3 Add page size selector above table (shadcn Select with "Filas por página" label, options 10/20/50, positioned top-right)
- [x] 2.4 Add pagination controls below table (Previous "Anterior", Next "Siguiente", page indicator "Página X de Y") using shadcn Pagination; hide when `pagination={false}` or data fits in one page

## Phase 3: Page Integration

- [x] 3.1 Update `lotes/page.tsx` — DataTable works with default pagination=true; verify
- [x] 3.2 Update `clientes/page.tsx` — verify DataTable pagination works
- [x] 3.3 Update `ventas/page.tsx` — import `ventaColumns` from extracted file, remove inline columns, verify pagination
- [x] 3.4 Update `gastos/page.tsx` — verify `footerRow` total displays sum of ALL expenses across all pages (total is already computed from full dataset)
- [x] 3.5 Update `proveedores/page.tsx` — verify DataTable pagination works

## Phase 4: Dashboard Exemption

- [x] 4.1 Update `page.tsx` (dashboard) — pass `pagination={false}` to all 3 DataTable instances

## Phase 5: Polish

- [x] 5.1 Add Spanish labels to all pagination controls: "Página X de Y", "Anterior", "Siguiente", "Filas por página"
- [x] 5.2 Add URL query param persistence for `pageSize` via `useSearchParams` — reading on load, updating on change

## Phase 6: Verification

- [x] 6.1 Run `npx tsc --noEmit` — zero type errors
- [x] 6.2 Run `npx vitest run` — all tests pass