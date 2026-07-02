# Tasks: UI Component Library

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800–1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Data Display) → PR 3 (Auth UX + Polish) |
| Delivery strategy | size:exception (single PR, maintainer approved) |
| Chain strategy | N/A — size:exception approved |

Decision needed before apply: Resolved — size:exception approved by maintainer
Chained PRs recommended: Yes, but overridden by size:exception approval
Chain strategy: N/A
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fix Tailwind pipeline, shadcn init, shared layout, route group migration | PR 1 | Base: main; self-contained deployable |
| 2 | Replace raw HTML tables/cards with shadcn Table, Card, Badge, Data Table | PR 2 | Base: PR 1 branch or main after merge |
| 3 | Login page shadcn form, session expiry Alert, active nav state | PR 3 | Base: PR 2 branch or main after merge |

## Phase 1: Foundation — Tailwind + shadcn + Layout

- [x] 1.1 Run `npx shadcn@latest init` to create `globals.css`, `postcss.config.mjs`, `components.json`, `src/lib/utils.ts` — verify `npm run build` passes
- [x] 1.2 Install dependencies: `@tanstack/react-table`, `lucide-react`
- [x] 1.3 Run `npx shadcn@latest add card table badge button input label alert sidebar separator breadcrumb` to generate `src/components/ui/*`
- [x] 1.4 Create `src/app/(dashboard)/layout.tsx` with SidebarProvider, AppSidebar, Breadcrumb header
- [x] 1.5 Create `src/components/app-sidebar.tsx` with nav items (Dashboard, Lotes, Ventas, Clientes, Gastos) + sign-out trigger
- [x] 1.6 Move `src/app/page.tsx` → `src/app/(dashboard)/page.tsx`, remove old file
- [x] 1.7 Move `src/app/lotes/page.tsx` → `src/app/(dashboard)/lotes/page.tsx`, remove old file
- [x] 1.8 Move `src/app/ventas/page.tsx` → `src/app/(dashboard)/ventas/page.tsx`, remove old file
- [x] 1.9 Move `src/app/clientes/page.tsx` → `src/app/(dashboard)/clientes/page.tsx`, remove old file
- [x] 1.10 Move `src/app/gastos/page.tsx` → `src/app/(dashboard)/gastos/page.tsx`, remove old file
- [x] 1.11 Modify `src/app/layout.tsx` to import `globals.css` and wrap children with SidebarProvider
- [x] 1.12 Remove bottom navigation `<nav>` links from all 5 moved page files (sidebar replaces them)
- [x] 1.13 Verify: all 6 pages render correctly with sidebar layout, navigation works, `npm run build` passes

## Phase 2: Data Display — shadcn Components + Data Table

- [x] 2.1 Create `src/components/data-table.tsx` — generic TanStack wrapper with shadcn Table, accepts `columns` + `data`
- [x] 2.2 Create `src/components/dashboard-metric-card.tsx` — MetricCard with shadcn Card, title/value/description/variant
- [x] 2.3 Replace dashboard `page.tsx` metric divs with `<MetricCard>` components
- [x] 2.4 Replace dashboard inventory/top-clients tables with `<DataTable>` using TanStack columns
- [x] 2.5 Replace dashboard active-lotes table with `<DataTable>`, add Badge for estado column
- [x] 2.6 Replace `lotes/page.tsx` raw table with `<DataTable>`, add Badge for estado column
- [x] 2.7 Replace `ventas/page.tsx` raw table with `<DataTable>`, add conditional styling for gananciaBruta
- [x] 2.8 Replace `clientes/page.tsx` raw table with `<DataTable>`, add Badge for tipo column (MAYORISTA/MINORISTA)
- [x] 2.9 Replace `gastos/page.tsx` raw table with `<DataTable>`, add footer row for total
- [x] 2.10 Verify: each page renders data correctly, sorting works on column headers, badges display with correct variants

## Phase 3: Auth UX — Login + Session Feedback

- [x] 3.1 Replace `src/app/login/page.tsx` raw inputs/buttons with shadcn `<Input>`, `<Button>`, `<Label>`, `<Card>`
- [x] 3.2 Replace login error div with shadcn `<Alert variant="destructive">`
- [x] 3.3 Add session-expiry detection: render shadcn `<Alert>` when redirected from expired session (check URL params or session state)
- [x] 3.4 Verify: login form renders with shadcn components, error state shows Alert, session expiry shows feedback

## Phase 4: Polish — Navigation + Responsive

- [x] 4.1 Add active navigation state in `src/components/app-sidebar.tsx` using `usePathname()` to highlight current route
- [x] 4.2 Add Breadcrumb component to `(dashboard)/layout.tsx` showing current page context
- [x] 4.3 Add responsive tweaks: sidebar collapsible on mobile, content area padding adjustments
- [x] 4.4 Final build verification: `npm run build` passes, all pages render, navigation active state works