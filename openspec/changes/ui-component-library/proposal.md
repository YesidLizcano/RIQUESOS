# Proposal: UI Component Library

## Intent

The project's Tailwind CSS pipeline is broken (no globals.css, no tailwind.config, no postcss.config) — utility classes in JSX are not processed. All 6 pages use raw HTML elements with duplicated layout, auth guards, and navigation. Replace placeholder UI with shadcn/ui components to establish a proper backoffice interface with accessible, composable, production-grade components.

## Scope

### In Scope
- Fix Tailwind CSS pipeline via `npx shadcn@latest init` (P0 blocker)
- Create `src/app/globals.css`, `src/lib/utils.ts`, update `layout.tsx`
- Install and configure shadcn/ui (components.json, Tailwind v4, CSS variables)
- Create shared layout: Sidebar navigation replacing duplicated page-level nav
- Replace Dashboard metric cards with shadcn Card
- Replace all raw `<table>` with shadcn Table + TanStack Data Table (sorting, pagination)
- Replace status badges with shadcn Badge
- Replace Login form inputs with shadcn Input/Button/Label
- Replace error messages with shadcn Alert
- Add Breadcrumb, Separator for navigation context

### Out of Scope
- Form validation with react-hook-form + zod (deferred to future change)
- CRUD create/edit Dialog forms for Lotes, Ventas, Clientes, Gastos
- Dark mode theming
- Mobile responsiveness polish
- Sheet slide-over panels
- Skeleton loading states

## Capabilities

### New Capabilities
- `ui-framework`: shadcn/ui component library setup, shared layout (Sidebar, Breadcrumb), CSS pipeline, and base component primitives (Card, Table, Badge, Button, Input, Label, Alert)

### Modified Capabilities
None — UI was never specified in existing specs; this is new capability.

## Approach

**Phase 0** — Fix the Tailwind CSS pipeline (blocker). Run `npx shadcn@latest init` to create globals.css, components.json, utils.ts, and install dependencies. **Phase 1** — Replace current placeholder UI: add P0 shadcn components (table, card, badge, button, input, label, alert, sidebar), build shared Sidebar layout, replace Dashboard cards, replace raw tables with shadcn Table, replace Login form elements. **Phase 2** — Enhanced components: TanStack Data Table with sorting/pagination, Dialog, Select, Sonner toast, Breadcrumb. Preserve Server Component architecture: pages fetch data via Server Actions, pass DTOs as props to Client Component tables.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/globals.css` | New | Tailwind v4 + CSS variables (created by shadcn init) |
| `src/app/layout.tsx` | Modified | Import globals.css, add SidebarProvider |
| `src/lib/utils.ts` | New | cn() utility (created by shadcn init) |
| `src/components/ui/` | New | shadcn/ui primitives (auto-generated) |
| `src/components/app-sidebar.tsx` | New | Shared sidebar navigation |
| `src/components/data-table.tsx` | New | Reusable Data Table wrapper |
| `src/components/dashboard-metric-card.tsx` | New | Composed metric card |
| `src/app/(dashboard)/page.tsx` | Modified | Replace raw cards/tables with shadcn |
| `src/app/(Dashboard)/lotes/page.tsx` | Modified | Replace raw table with Data Table |
| `src/app/(Dashboard)/ventas/page.tsx` | Modified | Replace raw table with Data Table |
| `src/app/(Dashboard)/clientes/page.tsx` | Modified | Replace raw table with Data Table |
| `src/app/(Dashboard)/gastos/page.tsx` | Modified | Replace raw table with Data Table |
| `src/app/login/page.tsx` | Modified | Replace raw form with shadcn Input/Button/Label |
| `components.json` | New | shadcn/ui configuration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tailwind v4 setup breaks existing class rendering | Medium | shadcn init handles setup; verify all pages render after Phase 0 |
| Server/Client boundary confusion | Medium | Strict pattern: RSC pages → fetch data → pass DTOs as props to Client Components |
| Bundle size increase from Radix primitives | Low | Tree-shakeable; add only needed components |
| Over-engineering before features stabilize | Medium | P0 replaces what exists; P1/P2 are additive and deferrable |

## Rollback Plan

1. Remove all `src/components/ui/*` shadcn primitives
2. Remove `src/components/app-sidebar.tsx`, `data-table.tsx`, `dashboard-metric-card.tsx`
3. Revert `layout.tsx` to original import (remove globals.css, SidebarProvider)
4. Remove `globals.css`, `lib/utils.ts`, `components.json`
5. Revert page files to raw HTML tables and placeholder elements
6. Remove shadcn/radix dependencies from package.json

## Dependencies

- Tailwind CSS v4 (installed by shadcn init)
- @tanstack/react-table (Data Table)
- lucide-react (icons for Sidebar)
- class-variance-authority, clsx, tailwind-merge (cn utility)

## Success Criteria

- [ ] All 6 pages render correctly with working Tailwind CSS
- [ ] Sidebar navigation replaces bottom-of-page links
- [ ] Dashboard displays metric cards via shadcn Card
- [ ] Lotes, Ventas, Clientes, Gastos tables use shadcn Table with sorting
- [ ] Login page uses shadcn Input/Button/Label
- [ ] Status indicators use shadcn Badge
- [ ] Error messages use shadcn Alert
- [ ] Server Component data-fetching pattern preserved