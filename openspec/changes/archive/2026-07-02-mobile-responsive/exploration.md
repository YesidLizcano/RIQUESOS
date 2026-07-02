# Mobile Responsive — Exploration Document

## Summary

The backoffice currently targets desktop (≥1024px) and has **no mobile-specific styles beyond a few Tailwind breakpoints** already in the dashboard layout. The shadcn/ui Sidebar component **already has built-in mobile support** via a Sheet overlay, but most content-area components will break or become unusable on viewports <768px.

---

## Current State Analysis

### What Works on Mobile Today

| Component | Status | Details |
|-----------|--------|---------|
| **Sidebar** | ✅ Already responsive | shadcn/ui `<Sidebar>` uses `useIsMobile()` hook (breakpoint: 768px). On mobile it renders as a `<Sheet>` (slide-in overlay) instead of a fixed sidebar. `SidebarTrigger` shows/hides it. |
| **Dashboard layout padding** | ✅ Partially | `layout.tsx` line 51: `p-4 md:p-6` — smaller padding on mobile |
| **Dashboard MetricCards grid** | ✅ Already responsive | `grid-cols-1 md:grid-cols-3 lg:grid-cols-5` — stacks on mobile |
| **Dashboard chart grids** | ✅ Already responsive | `grid-cols-1 md:grid-cols-2` — charts stack vertically on mobile |
| **DataTableToolbar** | ⚠️ Partially | Uses `flex-wrap` with `min-w-[200px]` on search, but Select filters are `w-[160px]` fixed — will overflow or wrap awkwardly on narrow screens |
| **Dialog forms** | ✅ Mostly OK | `DialogContent` has `max-w-[calc(100%-2rem)]` and `sm:max-w-sm`, so they center and don't overflow mobile |

### What Breaks on Mobile

| Component | Problem | Severity |
|-----------|---------|----------|
| **DataTable** | 🔴 No horizontal scroll wrapper. Tables with 7+ columns (ventas: 8 cols, lotes: 8 cols) overflow off-screen with no way to scroll | **Critical** |
| **Page headers** | 🟡 `flex items-center justify-between` with PeriodSelector + action button on same row as title — will overflow on mobile (~320-400px) | **Medium** |
| **DataTableToolbar filters** | 🟡 Multiple Select dropdowns (w-[160px] each) + checkbox + export button in a flex-wrap row — on narrow screens this becomes a messy multi-line toolbar | **Medium** |
| **Pagination** | 🟡 Page number buttons can overflow on very narrow screens with many pages | **Low** |
| **PeriodSelector** | 🟡 Two Select dropdowns (w-[140px] + w-[100px]) inline — works but tight on mobile | **Low** |
| **Recharts** | 🟡 Charts use `h-[300px] w-full` with `ChartContainer`. `w-full` makes them responsive in width, but YAxis labels with `formatCurrency` on horizontal BarCharts can clip. Vertical BarCharts use `width={140}` and `width={120}` for YAxis labels — these are fixed widths that may be too much on small screens | **Medium** |
| **Dashboard Export button** | 🟡 Export + PeriodSelector in a `flex items-center gap-3` — will overflow on very narrow screens | **Low** |

---

## Component-by-Component Mobile Audit

### 1. Sidebar — `app-sidebar.tsx` + `ui/sidebar.tsx`

**Status: ✅ Already mobile-ready**

The shadcn/ui Sidebar component already handles mobile via:
- `useIsMobile()` hook at 768px breakpoint (`src/hooks/use-mobile.ts`)
- On mobile: renders as a `<Sheet>` overlay (slide-in drawer) instead of a fixed sidebar
- `SidebarTrigger` (hamburger icon) is always visible in the header
- `SidebarInset` correctly takes full width on mobile

The `AppSidebar` component uses `<Sidebar>` with default `collapsible="offcanvas"`, which means on desktop the sidebar can collapse to zero-width. The `SidebarTrigger` in the header allows toggling on both mobile and desktop.

**No changes needed** for the sidebar itself.

### 2. Dashboard Layout — `layout.tsx`

**Status: ✅ Adequate**

```tsx
<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
  <SidebarTrigger />
  <Separator orientation="vertical" className="h-4" />
  <DashboardBreadcrumb />
</header>
<div className="flex-1 p-4 md:p-6">{children}</div>
```

- Header uses `flex` with `gap-2` — works on mobile
- Content padding is `p-4` on mobile, `md:p-6` on desktop — good
- Breadcrumb is minimal (just "Riquesos" link) — fine on mobile

### 3. Dashboard Page — `dashboard-client-page.tsx`

**Status: ⚠️ Needs fixes**

**Header row (line 207-232):**
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1>Dashboard</h1>
    <p>Resumen de métricas...</p>
  </div>
  <div className="flex items-center gap-3">
    <PeriodSelector ... />
    <Button>Exportar Excel</Button>
  </div>
</div>
```
- On mobile (<640px), PeriodSelector + Export button will overflow beside the title
- **Fix**: Stack vertically on mobile: `flex-col sm:flex-row` or wrap actions below title

**MetricCards (lines 239-295):**
- Row 1: `grid-cols-1 md:grid-cols-3 lg:grid-cols-5` ✅ Already stacks
- Row 2: Same grid pattern ✅ Already stacks

**Charts (lines 298-439):**
- Revenue composition: full-width Card ✅
- Daily sales + Top clients: `grid-cols-1 md:grid-cols-2` ✅ Stacks on mobile
- Inventory donut + Client type donut: `grid-cols-1 md:grid-cols-2` ✅ Stacks on mobile
- **Issue**: YAxis labels on vertical BarCharts use fixed widths (140px, 120px) which reduce usable chart area on mobile
- **Issue**: `h-[300px]` fixed height — acceptable but could be shorter on mobile

**Tables (lines 443-469):**
- `grid-cols-1 lg:grid-cols-2` — stacks on mobile ✅
- But DataTables inside have no horizontal scroll 🔴

### 4. List Pages (Clientes, Ventas, Lotes, Gastos, Proveedores)

**Status: ⚠️ Needs fixes**

All list pages share this pattern:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Title</h1>
    <p>Subtitle</p>
  </div>
  <div className="flex items-center gap-3">
    <PeriodSelector ... />  {/* ventas, gastos, dashboard */}
    <CreateDialogButton />
  </div>
</div>
```

On mobile, the right-side actions overflow. Need to stack vertically.

### 5. DataTable — `data-table.tsx`

**Status: 🔴 Critical fix needed**

Current structure:
```tsx
<div className="space-y-3">
  {/* page size selector */}
  <div className="rounded-md border">
    <TableUI>...</TableUI>
  </div>
  {/* pagination */}
</div>
```

**Problems:**
1. **No horizontal overflow handling** — The `<TableUI>` is inside a `<div className="rounded-md border">` with no `overflow-x-auto`. Tables with 7-8 columns will overflow off-screen.
2. **Page size controls** — `flex items-center justify-end gap-2` with text + Select works on mobile
3. **Pagination** — `flex items-center justify-between` — page numbers can overflow on narrow screens

**Column counts per entity:**
- Clientes: 4 columns (Nombre, Tipo, Precios, Acciones) — might fit on mobile
- Ventas: 8 columns (Fecha, Cliente, Domiciliario, Producto, Cantidad, Precio, Ingreso, Ganancia) — **definitely overflows**
- Lotes: 8 columns (Producto, Proveedor, Cant. Comprada, Precio Base, Costo Real, Stock, Estado, Acciones) — **definitely overflows**
- Gastos: 4 columns (Concepto, Valor, Fecha, Acciones) — might fit
- Proveedores: ~5 columns — borderline

### 6. DataTableToolbar — `data-table-toolbar.tsx`

**Status: ⚠️ Needs improvement**

```tsx
<div className="flex flex-wrap items-center gap-3">
  <div className="relative flex-1 min-w-[200px] max-w-sm">Search</div>
  {filters.map(...) => <SelectTrigger className="w-[160px]">}
  {checkbox}
  {export button className="ml-auto"}
</div>
```

- `flex-wrap` is good — items will wrap
- But `min-w-[200px]` on search takes half a 375px screen — leaves little room for filters
- Filters are fixed `w-[160px]` each — 2 filters = 320px just for selects
- On a 375px phone, after search takes ~200px, nothing else fits on the same line
- **Fix**: Stack search and filters vertically on mobile, or use a collapsible filter panel

### 7. Dialog Forms — `crear-cliente-dialog.tsx`, `registrar-venta-dialog.tsx`, etc.

**Status: ✅ Mostly OK**

`DialogContent` has:
```tsx
className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm ... sm:max-w-sm"
```

- `max-w-[calc(100%-2rem)]` ensures it never exceeds viewport width
- `sm:max-w-sm` constrains on larger screens
- Forms use `space-y-4` vertical layout — stacks naturally
- Selects are `w-full` — good for mobile
- **Potential issue**: Venta form has 6 fields — may need scrolling inside dialog on short viewports
- **Potential issue**: Dialog doesn't have `max-h` or overflow handling — very tall forms could overflow the viewport

### 8. Metric Cards — `dashboard-metric-card.tsx`

**Status: ✅ Responsive**

Simple card with title, value, description. No width constraints. The grid in the dashboard already handles responsive stacking.

### 9. PeriodSelector — `period-selector.tsx`

**Status: ⚠️ Tight on mobile**

```tsx
<div className="flex items-center gap-3">
  <SelectTrigger className="w-[140px]">  {/* Month */}
  <SelectTrigger className="w-[100px]">  {/* Year */}
</div>
```
Total width: 240px + 12px gap = 252px. Fits on 320px but leaves no margin. When paired with an action button in the header, it overflows.

### 10. Theme Toggle

Not read directly, but present in `SidebarFooter`. On mobile the sidebar is a Sheet, so the theme toggle will be inside the slide-in menu. This is fine.

---

## Breakpoint Strategy

The project uses Tailwind v4 with standard breakpoints. The `useIsMobile` hook uses **768px** (matching Tailwind's `md`).

| Breakpoint | Tailwind | Usage |
|-----------|----------|-------|
| <640px | `sm:` default | Mobile phones (portrait) |
| 640-767px | `sm:` | Large phones (landscape), small tablets |
| 768-1023px | `md:` | Tablets |
| 1024px+ | `lg:` | Desktop |

**Recommended strategy:**
- **<768px (mobile)**: Stack headers, collapsible filters, horizontal-scroll tables, simplified pagination
- **768-1023px (tablet)**: Current layout works, minor adjustments
- **1024px+ (desktop)**: No changes needed

---

## Recommended Approach

### Priority 1 — Critical (must fix for basic mobile usability)

1. **DataTable horizontal scroll**: Wrap `<TableUI>` in `<div className="overflow-x-auto">` inside the bordered container
2. **Page headers**: Change from `flex justify-between` to responsive layout that stacks title above actions on mobile:
   ```tsx
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
   ```

### Priority 2 — Important (improves mobile UX significantly)

3. **DataTableToolbar**: On mobile, stack vertically or use a collapsible filter section:
   - Search bar full-width on mobile
   - Filters + actions in a second row or a Sheet/Drawer
4. **Dialog forms**: Add `max-h-[85vh] overflow-y-auto` to DialogContent to handle tall forms
5. **Recharts YAxis widths**: Reduce fixed widths on mobile or use responsive values

### Priority 3 — Nice to have

6. **Pagination**: Hide page numbers on mobile, show only prev/next
7. **Chart heights**: Reduce `h-[300px]` to `h-[250px]` on mobile
8. **DataTable page size selector**: Move below table on mobile or hide

---

## Risks and Constraints

| Risk | Impact | Mitigation |
|------|--------|------------|
| Recharts fixed YAxis widths | Charts clip on narrow viewports | Use responsive width values or hide YAxis labels on mobile |
| Dialog forms without scroll | Tall forms (venta with 6 fields) may overflow viewport | Add `max-h` with overflow to DialogContent |
| DataTable pagination overflow | Many page numbers overflow narrow screens | Show fewer page numbers or hide on mobile |
| Sidebar mobile Sheet already works | Low risk, tested pattern | No changes needed |
| Tailwind v4 compatibility | Some class names may differ from v3 | Already using v4 syntax throughout, consistent |
| `useIsMobile` uses 768px | Matches `md:` breakpoint | Consistent with existing approach |

---

## Estimated Scope

| Area | Effort | Files |
|------|--------|-------|
| DataTable overflow-x | Small | `data-table.tsx` |
| Page header layouts (5 pages + dashboard) | Small-Medium | 6 client pages |
| DataTableToolbar responsive | Medium | `data-table-toolbar.tsx` |
| Dialog max-height/scroll | Small | `dialog.tsx` (global) or per-form |
| Recharts responsive widths | Small-Medium | `dashboard-client-page.tsx` |
| Pagination mobile | Small | `data-table.tsx` |
| PeriodSelector compact | Small | `period-selector.tsx` |

**Total estimate: ~2-3 days of focused work**

---

## Files Examined

- `src/app/(dashboard)/layout.tsx` — Dashboard layout with SidebarProvider + SidebarInset
- `src/components/app-sidebar.tsx` — Sidebar navigation with mobile Sheet support
- `src/components/ui/sidebar.tsx` — shadcn/ui Sidebar (723 lines) with full mobile support
- `src/hooks/use-mobile.ts` — `useIsMobile()` hook, breakpoint at 768px
- `src/app/(dashboard)/dashboard-client-page.tsx` — Dashboard with MetricCards, charts, tables
- `src/app/(dashboard)/clientes/clientes-client-page.tsx` — List page pattern
- `src/app/(dashboard)/ventas/ventas-client-page.tsx` — List page with PeriodSelector
- `src/app/(dashboard)/gastos/gastos-client-page.tsx` — List page with PeriodSelector + showDeleted
- `src/components/data-table.tsx` — Table with pagination, no overflow handling
- `src/components/data-table-toolbar.tsx` — Search + filters + export, flex-wrap
- `src/components/dashboard-metric-card.tsx` — Simple card, responsive
- `src/components/period-selector.tsx` — Two Select dropdowns inline
- `src/components/forms/crear-cliente-dialog.tsx` — Dialog form pattern
- `src/components/forms/registrar-venta-dialog.tsx` — Complex form (6 fields)
- `src/components/ui/dialog.tsx` — Dialog with `max-w-[calc(100%-2rem)]`
- `src/components/columns/venta-columns.tsx` — 8 columns
- `src/components/columns/lote-columns.tsx` — 8 columns
- `src/app/globals.css` — Tailwind v4, no custom responsive styles
