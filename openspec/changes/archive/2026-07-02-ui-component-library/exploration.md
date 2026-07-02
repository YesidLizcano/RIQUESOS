# Exploration: ui-component-library

**Project**: pagina-riquesos
**Date**: 2026-07-01
**Change**: ui-component-library

---

## 1. Current UI State

### 1.1 Pages Overview

All 6 pages are thin Server Components that render raw data in basic HTML tables with Tailwind utility classes. There are **no shared UI components** — every page duplicates layout patterns (header, nav, auth guard).

| Page | Route | Type | Key Elements |
|------|-------|------|--------------|
| Dashboard | `/` | Server Component | 5 metric cards, inventory table, top clients table, lotes summary table, nav links |
| Login | `/login` | Client Component (`'use client'`) | Email/password form, error display, next-auth signIn |
| Lotes | `/lotes` | Server Component | Data table (7 columns), status badge, nav links |
| Ventas | `/ventas` | Server Component | Data table (7 columns), profit coloring, nav links |
| Clientes | `/clientes` | Server Component | Data table (4 columns), type badge, nav links |
| Gastos | `/gastos` | Server Component | Data table (3 columns), totals footer, nav links |

### 1.2 Critical Finding: Missing Tailwind CSS Pipeline

**The project has NO working Tailwind CSS setup.** Evidence:

- No `globals.css` file exists (not imported in layout.tsx)
- No `tailwind.config.ts` or `tailwind.config.js`
- No `postcss.config.mjs` or `postcss.config.js`
- No `@tailwindcss` packages in `node_modules`
- `layout.tsx` imports only the Inter font and renders `<body className={inter.className}>`
- Tailwind utility classes are used in JSX (`bg-gray-50`, `text-3xl`, `rounded-lg`, etc.) but are NOT being processed

This means **the current UI pages render unstyled or partially styled**. Adding shadcn/ui requires fixing the Tailwind CSS pipeline first, which shadcn/ui init handles automatically.

### 1.3 Project Dependencies (from package.json)

| Dependency | Version | Notes |
|------------|---------|-------|
| next | ^15.4.2 (installed 15.5.20) | App Router, React 19 |
| react | ^19.1.0 | React 19 |
| react-dom | ^19.1.0 | |
| next-auth | ^4.24.14 | Auth.js v4 |
| @prisma/client | ^6.13.0 | ORM |
| pino | ^9.7.0 | Logging |
| vitest | ^3.2.0 | Testing (no tests yet) |
| TypeScript | ^5.8.0 | |

**No UI library installed.** No `tailwindcss`, no `@radix-ui/*`, no `class-variance-authorce`, no `clsx`, no `tailwind-merge`.

### 1.4 Architecture

```
src/
  app/           # Next.js App Router pages (6 routes)
  application/   # Use cases (Clean Architecture)
  domain/        # Entities, value objects, enums
  infrastructure/ # Repos, auth, DB
  presentation/
    actions/     # Server Actions (6 files)
    dtos/        # DTO types
  middleware.ts  # Auth middleware
  __tests__/    # Test directory (empty)
```

Key architectural observations:
- **Clean Architecture**: Domain → Application → Infrastructure → Presentation layers
- **Server Actions** for all data mutations and queries
- **Server Components** for all data-display pages (except Login which is `'use client'`)
- **Auth guards** via `getServerSession` + `redirect` at page top, plus middleware
- **No shared components** directory exists yet (`src/components/` missing)
- **DTOs** are plain TypeScript interfaces in `presentation/dtos/`
- **Business logic in Spanish** (e.g., `crearLote`, `getMetricas`), code identifiers in English

### 1.5 Data Shapes (DTOs)

The Server Actions return typed DTOs that the UI pages consume. Key shapes:

- **LoteResponse**: id, producto, fechaIngreso, proveedorId, cantidadCompradaKg, precioCompraBaseKg, costoFlete, costoTajado, costoEmpaques, costoRealCalculadoKg, stockDisponibleKg, estado, version
- **VentaResponse**: id, fecha, clienteId, loteId, cantidadVendidaKg, precioVentaKg, ingresoTotal, gananciaBruta
- **ClienteResponse**: id, nombre, tipo, precioDobleCrema, precioSemisalado
- **GastoResponse**: id, concepto, valor, fecha
- **DashboardMetricasResponse**: periodo (financial summary), inventario (product stock array), topClientes (top clients array)

---

## 2. Component Library Comparison

### 2.1 shadcn/ui

**Approach**: Copy-paste component library built on Radix UI primitives + Tailwind CSS. Components are added to your project as source code (not npm dependencies), giving full ownership and customizability.

**Strengths**:
- **Perfect fit for this project**: Tailwind + Radix primitives align with the existing codebase style
- **Server Component friendly**: Shadcn/ui's base components (Card, Table, Badge, etc.) work in Server Components. Only interactive parts (Dialog, Select, Form) need `'use client'`
- **Backoffice-grade components**: Data Table (via TanStack Table), Sidebar, Card, Form, Dialog, Select, Badge, Toast/Sonner, Dropdown Menu
- **Full ownership**: Components live in your codebase, no version lock-in
- **Active ecosystem**: 60+ components, excellent docs, large community
- **Works with Next.js 15 + React 19**: Latest version explicitly supports this stack
- **Theming via CSS variables**: Easy to customize brand colors
- **Composable**: You add only what you need

**Weaknesses**:
- **Requires Tailwind CSS setup first** (which this project needs anyway)
- **Data Table is not a drop-in** — it's a pattern using TanStack Table + shadcn Table primitives
- **Client boundary**: Interactive components need `'use client'` directive
- **Bundle size**: Radix primitives add weight (but tree-shakeable)

### 2.2 Headless UI (by Tailwind Labs)

**Approach**: Unstyled, accessible UI components for React. Owned by the Tailwind CSS team.

**Strengths**:
- Made by the same team as Tailwind CSS
- Lightweight, accessible
- Good for simple interactive elements (Listbox, Switch, Dialog)

**Weaknesses**:
- **Far fewer components**: ~12 components vs shadcn/ui's 60+
- **No Table, Card, Badge, Sidebar, Toast, Tabs, etc.** — all critical for a backoffice
- **No Data Table pattern** — would need to build from scratch
- **No Sidebar component** — essential for backoffice navigation
- **No form integration** — no Field, Label, or form validation helpers
- **Verdict**: Too limited for a full backoffice UI. Would require building too many components from scratch.

### 2.3 Radix UI Primitives (direct)

**Approach**: Use `@radix-ui/*` packages directly with custom styling.

**Strengths**:
- Maximum flexibility, no opinionated styling
- Smaller bundles per component

**Weaknesses**:
- **Reinventing the wheel**: shadcn/ui IS Radix UI + Tailwind styling. Using Radix directly means writing all the Tailwind composition yourself
- **No pre-built patterns**: No Table, Sidebar, Data Table, Card, etc.
- **Much more work**: Every component needs custom styling from scratch
- **Verdict**: shadcn/ui is Radix UI + styling. Going direct adds no benefit and increases work significantly.

### 2.4 Plain Tailwind (no component library)

**Approach**: Build all UI elements using only Tailwind utility classes, no component abstraction.

**Strengths**:
- Zero extra dependencies
- Full control

**Weaknesses**:
- **No accessible primitives**: Tables, dialogs, selects, etc. need ARIA attributes, keyboard navigation, focus management — all built by hand
- **No composability**: Every page duplicates card, table, badge, button patterns
- **Enormous effort**: A backoffice needs 10-15 distinct UI patterns, all requiring accessibility
- **Verdict**: Current project IS effectively "plain Tailwind" and it shows — raw HTML tables, no navigation component, no form components, duplicated layout code.

### 2.5 Recommendation: shadcn/ui

**shadcn/ui is the clear choice for this project.** Reasons:

1. **Matches the stack**: Tailwind + Radix is exactly what shadcn/ui provides
2. **Backoffice-ready**: Data Table, Sidebar, Card, Dialog, Form, Badge, Toast — all present
3. **Server Component compatible**: Static components work in RSC; interactive ones use `'use client'` boundaries cleanly
4. **Existing pattern alignment**: The project already uses Tailwind classes — shadcn/ui extends this naturally
5. **Incremental adoption**: Add components as needed, no all-or-nothing commitment
6. **Fixes the CSS pipeline gap**: `npx shadcn@latest init` sets up Tailwind CSS v4, globals.css, and `components.json`

---

## 3. Required shadcn/ui Components

Based on the current UI pages and backoffice needs:

### 3.1 Core Infrastructure (must-have for setup)

| Component | Purpose | Priority |
|-----------|---------|----------|
| **Tailwind CSS setup** | Fix missing CSS pipeline (globals.css, postcss) | P0 — blocker |
| **`cn()` utility** | Class merging utility (clsx + tailwind-merge) | P0 — required by all components |

### 3.2 Layout & Navigation

| Component | Purpose | Replaces/Enhances | Priority |
|-----------|---------|-------------------|----------|
| **Sidebar** | App-wide backoffice navigation | Current `<nav>` links at page bottom | P0 |
| **Breadcrumb** | Page context within navigation | None (new) | P1 |
| **Separator** | Visual dividers | None (new) | P1 |

### 3.3 Data Display

| Component | Purpose | Replaces/Enhances | Priority |
|-----------|---------|-------------------|----------|
| **Table** (primitive) | Base table styling | Raw `<table>` elements | P0 |
| **Data Table** (TanStack Table pattern) | Sortable, paginated, filterable tables | Raw `<table>` in Lotes, Ventas, Clientes, Gastos | P0 |
| **Card** | Dashboard metric cards, content sections | `<div className="bg-white rounded-lg shadow p-6">` | P0 |
| **Badge** | Status indicators (ACTIVO, MAYORISTA, etc.) | `<span className="inline-block px-2 py-1 text-xs rounded-full ...">` | P0 |
| **Pagination** | Table pagination controls | None (new) | P1 |

### 3.4 Forms & Input

| Component | Purpose | Replaces/Enhances | Priority |
|-----------|---------|-------------------|----------|
| **Button** | Primary action element | Raw `<button>` and `<a>` | P0 |
| **Input** | Text fields | Raw `<input>` in login | P0 |
| **Label** | Accessible form labels | Raw `<label>` | P0 |
| **Select** | Dropdown selections | None (needed for future forms) | P1 |
| **Textarea** | Multi-line input | None (needed for future forms) | P1 |
| **Dialog** | Modal forms (create lote, register venta, etc.) | None (new) | P1 |
| **Sheet** | Slide-over panels | None (new, alternative to Dialog) | P2 |
| **Form** (react-hook-form integration) | Form validation and submission | Raw `onSubmit` handlers | P2 |

### 3.5 Feedback

| Component | Purpose | Replaces/Enhances | Priority |
|-----------|---------|-------------------|----------|
| **Alert** | Error/info messages | `<div className="bg-yellow-50 border...">` | P0 |
| **Toast / Sonner** | Action feedback (create/update/delete confirmations) | None (new) | P1 |
| **Skeleton** | Loading placeholders | None (new) | P2 |

### 3.6 Additional Dependencies

| Package | Purpose | Required by |
|---------|---------|-------------|
| `@tanstack/react-table` | Data Table sorting, pagination, filtering | Data Table pattern |
| `lucide-react` | Icon library (used by shadcn/ui Sidebar, etc.) | Sidebar, Dropdown Menu, etc. |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form validation | Form component (P2) |
| `class-variance-authorce` | Component variant styling | All shadcn/ui components |
| `clsx` + `tailwind-merge` | Class merging (`cn()` utility) | All shadcn/ui components |

---

## 4. Server Component vs Client Component Boundaries

This is architecturally critical for Next.js App Router + shadcn/ui:

### 4.1 Server Components (no `'use client'`)

These shadcn/ui components work as Server Components:
- **Card** (static layout)
- **Table** primitives (Table, TableHeader, TableRow, TableHead, TableBody, TableCell)
- **Badge** (static display)
- **Separator** (static)
- **Skeleton** (static placeholder)

The current pages are Server Components that fetch data via Server Actions. **This pattern should be preserved.** The page fetches data, passes it to client components as props.

### 4.2 Client Components (requires `'use client'`)

These shadcn/ui components require client interactivity:
- **Data Table** (TanStack Table — state, sorting, filtering)
- **Sidebar** (toggle state, collapsible)
- **Dialog** (open/close state)
- **Select** (keyboard navigation, focus)
- **Form** (form state, validation)
- **Toast/Sonner** (imperative API)
- **Button** (onClick handlers)

### 4.3 Recommended Pattern

```
Server Component (page.tsx)
  └── fetch data via Server Action
  └── render static Card components (P0 metrics)
  └── pass data to Client Component as props
      └── DataTable (client) — sortable, filterable, paginated
  └── Sidebar layout (client) — wraps page content
```

This preserves the current architecture: pages are Server Components that call Server Actions, then pass serializable data to client-side interactive components.

---

## 5. Installation & Setup Plan

### 5.1 Prerequisites (blocking)

1. **Set up Tailwind CSS v4**: The project has no Tailwind CSS pipeline. shadcn/ui init will handle this.
2. **Create `src/app/globals.css`**: With `@import "tailwindcss"` and CSS variables for theming.
3. **Update `layout.tsx`**: Import `globals.css`.
4. **Create `src/lib/utils.ts`**: With `cn()` utility function.

### 5.2 shadcn/ui Init

```bash
npx shadcn@latest init
```

This will:
- Install Tailwind CSS v4 dependencies
- Create `globals.css` with CSS variables and `@import "tailwindcss"`
- Create `components.json` config
- Create `src/lib/utils.ts` with `cn()` helper
- Install `class-variance-authorce`, `clsx`, `tailwind-merge`, `lucide-react`

### 5.3 Component Installation (P0 batch)

```bash
npx shadcn@latest add table card badge button input label alert sidebar
```

Then install TanStack Table:
```bash
npm install @tanstack/react-table
```

### 5.4 Component Installation (P1 batch)

```bash
npx shadcn@latest add dialog select pagination separator breadcrumb sonner
```

---

## 6. Architectural Impact Assessment

### 6.1 What Changes

| Area | Current | After |
|------|---------|-------|
| CSS Pipeline | **Broken** (no Tailwind setup) | Working (Tailwind v4 + globals.css) |
| Component Library | None (raw HTML + Tailwind classes) | shadcn/ui (Radix + Tailwind) |
| Page Layout | Duplicated header/nav on each page | Shared Sidebar layout |
| Data Tables | Raw `<table>` HTML | TanStack Table + shadcn/ui Table |
| Forms | Raw `<form>` + `<input>` | shadcn/ui Input/Button/Label |
| Status Indicators | Hand-crafted badge spans | shadcn/ui Badge |
| Navigation | `<a>` links at page bottom | Sidebar with active state |
| Error Feedback | Inline `<div>` | shadcn/ui Alert + Sonner |
| Directory Structure | No `src/components/` | `src/components/ui/` for shadcn primitives, `src/components/` for composed components |

### 6.2 What Stays the Same

- **Clean Architecture layers** (domain, application, infrastructure) — untouched
- **Server Actions** — unchanged, they return DTOs
- **Auth flow** — unchanged (next-auth + middleware)
- **Data flow** — Server Components still fetch via Server Actions, pass data to client components
- **Route structure** — same 6 routes

### 6.3 New Directories

```
src/
  components/
    ui/           # shadcn/ui primitives (auto-generated)
    app-sidebar.tsx  # Composed sidebar navigation
    data-table.tsx    # Reusable DataTable wrapper
    dashboard-metric-card.tsx  # Composed metric display
  lib/
    utils.ts      # cn() utility (auto-generated by shadcn)
  app/
    globals.css   # Tailwind v4 + CSS variables (new)
    layout.tsx    # Updated: import globals.css + SidebarProvider
```

---

## 7. Open Questions

1. **Sidebar vs Top Navigation**: Should the backoffice use a Sidebar (recommended for data-heavy apps) or keep the current top/simple nav? Recommendation: Sidebar for scalability.

2. **Dark Mode**: shadcn/ui includes dark mode theming. Should it be enabled from the start or deferred? Recommendation: Defer to a future change.

3. **Form Library**: Should forms use react-hook-form + zod validation (shadcn/ui's recommended approach) or keep the current raw `FormData` pattern in Server Actions? Recommendation: Start with shadcn/ui form components for presentation, keep Server Actions for mutation. Add react-hook-form + zod in P2 when creating create/edit forms.

4. **Data Table Complexity**: Should all tables get full TanStack Table features (sorting, filtering, pagination) from the start, or start simple and enhance? Recommendation: Start with basic Data Table (sorting + pagination), add filtering in P2.

5. **Mobile Responsiveness**: The backoffice is primarily used on desktop (LAN deployment), but should the Sidebar be responsive? Recommendation: Yes, use shadcn/ui Sidebar's built-in mobile support.

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tailwind CSS setup breaks existing styles | Medium | High | shadcn/ui init handles this; verify all pages render correctly after setup |
| React 19 compatibility issues | Low | Medium | shadcn/ui latest explicitly supports React 19; verify with `npm install` |
| Server/Client boundary confusion | Medium | High | Follow strict pattern: Server Component pages pass data to Client Component tables |
| Bundle size increase | Low | Low | Tree-shaking + lazy loading; Radix primitives are small |
| Over-engineering UI before features are stable | Medium | Medium | Phase P0 is minimal (replace what exists); P1/P2 are additive |

---

## 9. Phased Implementation Recommendation

### Phase 0 — Foundation (blocker, must be first)
- Fix Tailwind CSS pipeline via `npx shadcn@latest init`
- Create `globals.css`, `lib/utils.ts`, update `layout.tsx`
- Verify all existing pages render correctly with working Tailwind

### Phase 1 — Replace Current UI (P0)
- Add: table, card, badge, button, input, label, alert, sidebar
- Replace Dashboard metric cards with shadcn Card
- Replace all raw `<table>` with shadcn Table primitives
- Replace status badges with shadcn Badge
- Add Sidebar layout to replace bottom nav links
- Replace Login form inputs with shadcn Input/Button/Label
- Replace error messages with shadcn Alert

### Phase 2 — Enhanced Functionality (P1)
- Add Data Table (TanStack Table) with sorting and pagination
- Add Dialog for create/edit modals
- Add Select for dropdowns
- Add Sonner (toast) for action feedback
- Add Breadcrumb for navigation context
- Add Pagination component

### Phase 3 — Forms & Validation (P2)
- Add Form component with react-hook-form + zod
- Add create/edit forms for Lotes, Ventas, Clientes, Gastos
- Add Sheet for slide-over detail views
- Add Skeleton for loading states
