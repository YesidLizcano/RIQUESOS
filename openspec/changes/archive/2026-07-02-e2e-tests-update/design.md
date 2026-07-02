# Design: e2e-tests-update

**Project**: pagina-riquesos  
**Date**: 2026-07-02

---

## Architecture Decisions

### AD-01: Fix existing tests with role-based selectors

Replace CSS class assertions with Playwright's `getByRole('alert')` and `getByText()` patterns. This aligns with NFR-03 and makes tests resilient to shadcn class changes. Apply to `auth-invalid.spec.ts`, and update text assertions in `lotes.spec.ts`, `ventas.spec.ts`, `gastos.spec.ts`.

### AD-02: One test file per feature area

New test files organized by feature:
- `e2e/crud-forms.spec.ts` — create dialog tests for all 5 entities
- `e2e/pagination.spec.ts` — page size and navigation controls
- `e2e/filters.spec.ts` — search input and column filter selects
- `e2e/dark-mode.spec.ts` — theme toggle cycling
- `e2e/proveedores.spec.ts` — Proveedores page (new entity)

This keeps files focused and avoids monolithic test files. Each file belongs to the `authenticated` Playwright project.

### AD-03: Reuse auth setup for all new tests

All new test files use `storageState: '.auth/admin.json'` via the existing `authenticated` Playwright project. No separate auth setup needed.

### AD-04: CRUD create test pattern

Each CRUD create test follows this pattern:
1. Navigate to entity page
2. Click the "Crear {Entity}" button (using `getByRole('button')`)
3. Fill minimum required fields in the dialog (using `getByLabel()`)
4. Submit the form
5. Wait for toast notification or table row to appear
6. Verify the new row is visible in the table

No edit/delete/restore tests in this change — deferred to future iteration.

### AD-05: Pagination and filter tests are visual-only

Pagination tests verify that controls render and respond to clicks (page size selector shows options, next/prev buttons exist). Filter tests verify the search input renders and column filter dropdowns open. These tests do NOT verify data accuracy — only that the UI controls exist and respond to interaction.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `e2e/tests/auth-invalid.spec.ts` | MODIFY | Replace `div.bg-red-50` with `getByRole('alert')` |
| `e2e/tests/lotes.spec.ts` | MODIFY | Fix empty state text to "No hay lotes" |
| `e2e/tests/ventas.spec.ts` | MODIFY | Fix empty state text to "No hay ventas en el período seleccionado" |
| `e2e/tests/gastos.spec.ts` | MODIFY | Fix empty state text to "No hay gastos en el período seleccionado" |
| `e2e/tests/dashboard.spec.ts` | MODIFY | Add Proveedores nav link assertion |
| `playwright.config.ts` | MODIFY | Add `proveedores` to authenticated testMatch |
| `e2e/crud-forms.spec.ts` | NEW | Create dialog tests for Lote, Cliente, Venta, GastoFijo, Proveedor |
| `e2e/pagination.spec.ts` | NEW | Page size selector and navigation controls |
| `e2e/filters.spec.ts` | NEW | Search input and column filter tests |
| `e2e/dark-mode.spec.ts` | NEW | Theme toggle cycling test |
| `e2e/proveedores.spec.ts` | NEW | Proveedores page heading, empty state, nav links |

---

## Selector Strategy

All selectors use Playwright's role-based API:
- **Buttons**: `getByRole('button', { name: '...' })`
- **Links**: `getByRole('link', { name: '...' })`
- **Headings**: `getByRole('heading', { name: '...' })`
- **Alerts**: `getByRole('alert')` or `getByText('...')`
- **Form fields**: `getByLabel('...')`
- **Table rows**: `getByRole('row')` with text content assertions

No CSS class selectors (`div.bg-red-50`, etc.) in any test.

---

## Test Data Considerations

The seed creates 2 Proveedores but no Lotes/Clientes/Ventas/Gastos. CRUD create tests will create entities via the UI and verify they appear. No seed enrichment needed for this change — tests create their own data through the UI.

---

## Playwright Config Update

The `authenticated` project regex must include `proveedores`:

```typescript
testMatch: /(dashboard|lotes|ventas|clientes|gastos|proveedores|crud-forms|pagination|filters|dark-mode)\.spec\.ts/
```