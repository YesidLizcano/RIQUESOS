# Mobile Responsive — Design

**Change**: mobile-responsive  
**Date**: 2026-07-02  

## Architecture Decisions

### AD-01: DataTable overflow-x-auto wrapper

Wrap `<TableUI>` in `<div className="overflow-x-auto">` inside the existing `rounded-md border` container. This enables horizontal scrolling on mobile without affecting desktop. Add `shadow-right` or border-right visual indicator when content overflows via CSS.

**Rationale**: Minimal change, preserves table readability, standard mobile table pattern.

### AD-02: Page headers — flex-col on mobile, flex-row on desktop

Change page header containers from `flex items-center justify-between` to `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`. This stacks title above actions on mobile while keeping the desktop layout unchanged.

**Rationale**: Single class change per page, no structural refactor needed.

### AD-03: DataTableToolbar — flex-wrap with responsive widths

Change the toolbar from `flex flex-wrap items-center gap-3` to `flex flex-wrap items-center gap-2 sm:gap-3`. Change filter `w-[160px]` to `w-full sm:w-[160px]` so selects stack full-width on mobile. Change search `max-w-sm` to `max-w-full sm:max-w-sm`.

**Rationale**: Filters and search naturally wrap on narrow screens. Full-width on mobile is standard for form controls.

### AD-04: Dialog forms — max-height with overflow

Add `max-h-[85vh] overflow-y-auto` to `DialogContent` in `dialog.tsx`. This ensures tall forms (e.g., Venta creation with 6 fields) scroll within the dialog on mobile viewports without exceeding the screen height.

**Rationale**: Global change in the Dialog component benefits all forms. 85vh leaves room for the overlay and margins.

### AD-05: Charts — ResponsiveContainer with reduced YAxis width

Verify all charts use `<ChartContainer>` (which wraps `ResponsiveContainer`). For vertical BarCharts, reduce YAxis `width` from 140/120 to 60 on mobile using a responsive approach: conditionally render shorter labels or reduce `width` prop. For the revenue composition and top clients charts, truncate long labels on mobile.

**Rationale**: Charts already use `w-full` via ChartContainer. YAxis fixed widths are the main mobile issue.

### AD-06: Scroll indicator for DataTable

Use a CSS-only approach: `relative` positioning on the scroll container with a `::after` pseudo-element gradient on the right side that fades when scrolled to end. Implemented via a Tailwind `group` class on the wrapper.

**Rationale**: Visual hint without JavaScript. Simple CSS approach.

## File Changes

| File | Change | Lines |
|------|--------|-------|
| `src/components/data-table.tsx` | ADD `overflow-x-auto` wrapper around `<TableUI>`, scroll shadow indicator | ~10 |
| `src/components/data-table-toolbar.tsx` | CHANGE responsive widths on search and filters | ~5 |
| `src/components/ui/dialog.tsx` | ADD `max-h-[85vh] overflow-y-auto` to DialogContent | ~1 |
| `src/app/(dashboard)/dashboard-client-page.tsx` | CHANGE header to responsive flex, reduce YAxis widths | ~10 |
| `src/app/(dashboard)/clientes/clientes-client-page.tsx` | CHANGE header to responsive flex | ~2 |
| `src/app/(dashboard)/proveedores/proveedores-client-page.tsx` | CHANGE header to responsive flex | ~2 |
| `src/app/(dashboard)/lotes/lotes-client-page.tsx` | CHANGE header to responsive flex | ~2 |
| `src/app/(dashboard)/ventas/ventas-client-page.tsx` | CHANGE header to responsive flex | ~2 |
| `src/app/(dashboard)/gastos/gastos-client-page.tsx` | CHANGE header to responsive flex | ~2 |

**Total**: ~9 files, ~36 changed lines. No new files.

## Risks

| Risk | Mitigation |
|------|------------|
| Dialog scroll conflicts with page scroll | `overflow-y-auto` inside `max-h` is standard pattern — tested in shadcn/ui |
| YAxis width reduction may clip labels on some datasets | Use 60px as minimum — enough for abbreviated currency |
| `overflow-x-auto` may affect pagination below table | Pagination is outside the scroll wrapper — no conflict |