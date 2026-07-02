# Proposal: e2e-tests-update

**Project**: pagina-riquesos  
**Date**: 2026-07-02  
**Status**: proposed

---

## Intent

Update and expand E2E tests to cover all current features of the backoffice. Four tests are broken (wrong selectors/text), one is incomplete (missing Proveedores nav check), and major feature areas have zero E2E coverage (CRUD forms, pagination, filters, dark mode, Proveedores page).

## Scope In

- Fix 4 broken tests: auth-invalid (CSS selector → role-based), lotes/ventas/gastos (empty state text)
- Fix incomplete dashboard test (add Proveedores nav check)
- Add E2E tests for CRUD forms (create dialog for each entity: Lote, Cliente, Venta, GastoFijo, Proveedor)
- Add E2E tests for pagination controls (page size selector, navigation)
- Add E2E tests for search and column filters
- Add E2E test for dark mode toggle (theme cycling)
- Add E2E tests for Proveedores page (new entity, full coverage)
- Update Playwright config to include `proveedores` in authenticated project match

## Scope Out

- Export to Excel (hard to verify file downloads in Playwright without extra setup)
- Mobile responsive / visual regression testing
- Chart content verification (visual, flaky)
- Performance and load testing
- Edit/delete/restore CRUD flows (defer to future iteration)
- Period selector (server action dependent, requires seed enrichment)

## Approach

Fix broken tests first (highest priority — CI is red). Then add essential new coverage for core workflows: CRUD create dialogs, pagination, search/filters, dark mode, and Proveedores page. All new tests follow existing patterns (Playwright, `fullyParallel: false`, role-based selectors).

## Rollback

Remove new test files (`crud-forms.spec.ts`, `pagination.spec.ts`, `filters.spec.ts`, `dark-mode.spec.ts`, `proveedores.spec.ts`), revert modified files to their original selectors/text. No database or app code changes.