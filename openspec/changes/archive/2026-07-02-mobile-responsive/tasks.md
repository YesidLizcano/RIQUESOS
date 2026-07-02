# Mobile Responsive — Tasks

**Change**: mobile-responsive  
**Date**: 2026-07-02  

## Review Workload Forecast

- Estimated changed lines: 100–200
- 400-line budget risk: Very Low
- Delivery strategy: single PR

## Phase 1: DataTable

- [x] 1.1 Add `overflow-x-auto` wrapper to DataTable around `<TableUI>` with scroll shadow indicator
  - File: `src/components/data-table.tsx`
  - Wrap `<TableUI>` in `<div className="overflow-x-auto">` inside the `rounded-md border` container

## Phase 2: Page Headers

- [x] 2.1 Make dashboard-client-page header responsive
  - File: `src/app/(dashboard)/dashboard-client-page.tsx`
  - Change header from `flex items-center justify-between` to `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`

- [x] 2.2 Make clientes-client-page header responsive
  - File: `src/app/(dashboard)/clientes/clientes-client-page.tsx`
  - Same pattern as 2.1

- [x] 2.3 Make proveedores-client-page header responsive
  - File: `src/app/(dashboard)/proveedores/proveedores-client-page.tsx`
  - Same pattern as 2.1

- [x] 2.4 Make lotes-client-page header responsive
  - File: `src/app/(dashboard)/lotes/lotes-client-page.tsx`
  - Same pattern as 2.1

- [x] 2.5 Make ventas-client-page header responsive
  - File: `src/app/(dashboard)/ventas/ventas-client-page.tsx`
  - Same pattern as 2.1

- [x] 2.6 Make gastos-client-page header responsive
  - File: `src/app/(dashboard)/gastos/gastos-client-page.tsx`
  - Same pattern as 2.1

## Phase 3: DataTableToolbar

- [x] 3.1 Add responsive layout to DataTableToolbar
  - File: `src/components/data-table-toolbar.tsx`
  - Change search to `max-w-full sm:max-w-sm`
  - Change filter SelectTrigger to `w-full sm:w-[160px]`

## Phase 4: Dialog Forms

- [x] 4.1 Add `max-h-[85vh] overflow-y-auto` to DialogContent
  - File: `src/components/ui/dialog.tsx`
  - Add to DialogContent className

## Phase 5: Charts

- [x] 5.1 Make dashboard charts responsive — reduce YAxis width on mobile
  - File: `src/app/(dashboard)/dashboard-client-page.tsx`
  - Revenue composition YAxis: `width={140}` → keep 140 on desktop, reduce for mobile
  - Top clients YAxis: `width={120}` → same approach
  - Use `useIsMobile()` hook (already available) to conditionally set YAxis width

## Phase 6: Verification

- [x] 6.1 Run `npx tsc --noEmit` and `npx vitest run` to verify no regressions