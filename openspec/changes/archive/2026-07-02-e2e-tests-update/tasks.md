# Tasks: e2e-tests-update

**Project**: pagina-riquesos  
**Date**: 2026-07-02

---

## Phase 1: Fix Broken Tests

- [x] 1.1 Fix `auth-invalid.spec.ts` — replace `div.bg-red-50` CSS selector with `getByRole('alert')` in both test cases
- [x] 1.2 Fix empty state text in `lotes.spec.ts` ("No hay lotes activos" → "No hay lotes"), `ventas.spec.ts` ("período actual" → "período seleccionado"), `gastos.spec.ts` ("No hay gastos fijos registrados" → "No hay gastos en el período seleccionado")
- [x] 1.3 Fix `dashboard.spec.ts` — add `getByRole('link', { name: 'Proveedores' })` assertion to navigation test

## Phase 2: New E2E Tests

- [x] 2.1 Create `e2e/crud-forms.spec.ts` — test create dialog for Lote, Cliente, Venta, GastoFijo, Proveedor (open dialog, fill fields, submit, verify row appears)
- [x] 2.2 Create `e2e/pagination.spec.ts` — verify page size selector renders with options (10/20/50), verify pagination controls render on list pages
- [x] 2.3 Create `e2e/filters.spec.ts` — verify search input renders and filters rows on Clientes, verify tipo column filter on Clientes
- [x] 2.4 Create `e2e/dark-mode.spec.ts` — verify theme toggle button exists in sidebar, verify clicking it cycles dark class on html element
- [x] 2.5 Create `e2e/proveedores.spec.ts` — verify Proveedores page renders with heading, empty state text, and nav links

## Phase 3: Config & Verification

- [x] 3.1 Update `playwright.config.ts` — add `proveedores`, `crud-forms`, `pagination`, `filters`, `dark-mode` to authenticated project testMatch regex
- [ ] 3.2 Run `npx playwright test` and verify all E2E tests pass (blocked by SIGBUS infrastructure issue — cannot start Next.js dev server on this environment)

---

## Review Workload Forecast

- Estimated changed lines: 300-500
- 400-line budget risk: Low
- Chained PRs recommended: No
- Delivery strategy: single PR