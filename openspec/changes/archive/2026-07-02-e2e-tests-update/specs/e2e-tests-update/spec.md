# Spec: e2e-tests-update

**Project**: pagina-riquesos  
**Date**: 2026-07-02

---

## Requirements

### FR-01: Fix broken auth-invalid test

The `auth-invalid.spec.ts` test SHALL use role-based selectors (`getByRole('alert')` or `getByText('Credenciales inválidas')`) instead of the CSS class selector `div.bg-red-50`. The shadcn Alert component renders with `role="alert"`; the test MUST NOT depend on implementation-specific CSS classes.

### FR-02: Fix empty state text assertions

Tests for Lotes, Ventas, and Gastos SHALL assert the current empty state text:
- Lotes: `"No hay lotes"`
- Ventas: `"No hay ventas en el período seleccionado"`
- Gastos: `"No hay gastos en el período seleccionado"`

The previous texts ("No hay lotes activos", "No hay ventas en el período actual", "No hay gastos fijos registrados") MUST NOT be used.

### FR-03: Dashboard navigation completeness

The dashboard navigation test SHALL verify all 6 sidebar items: Dashboard, Lotes, Ventas, Clientes, Proveedores, and Gastos Fijos.

### FR-04: CRUD form create tests

E2E tests SHALL verify that each entity's create dialog opens, accepts field input, and submits successfully. Entities: Lote, Cliente, Venta, GastoFijo, Proveedor. Each test SHALL:
- Open the create dialog
- Fill minimum required fields
- Submit the form
- Verify the new row appears in the table

### FR-05: Pagination controls

E2E tests SHALL verify that pagination controls render on list pages. The page size selector (10/20/50 rows) MUST be visible and functional on at least one entity page.

### FR-06: Search and column filters

E2E tests SHALL verify that the search input renders and filters table rows. Column filter selects (e.g., Clientes tipo filter) SHALL be verified to render and respond to selection.

### FR-07: Dark mode toggle

An E2E test SHALL verify that the theme toggle exists in the sidebar and cycles through light → dark → system themes, adding/removing the `dark` CSS class on the `<html>` element.

### FR-08: Proveedores page

E2E tests SHALL verify that the Proveedores page renders with its heading, empty state text, and navigation links.

### NFR-01: Playwright with next dev

Tests SHALL use Playwright with `next dev` as `webServer` (to avoid SIGBUS from `next start` with SQLite).

### NFR-02: No parallel execution

Tests SHALL run with `fullyParallel: false` (SQLite WAL mode requirement).

### NFR-03: Role-based selectors

All test assertions SHALL use `getByRole()`, `getByText()`, `getByLabel()`, or `getByTestId()` — NOT CSS class selectors.

---

## Scenarios

### SC-01: Invalid login shows alert

**Given** a user is on the login page  
**When** they submit invalid credentials  
**Then** an alert with role="alert" is visible  
**And** the text "Credenciales inválidas" is displayed

### SC-02: Lotes empty state

**Given** no lotes exist in the database  
**When** the user navigates to /lotes  
**Then** the text "No hay lotes" is visible

### SC-03: Ventas empty state

**Given** no ventas exist for the selected period  
**When** the user navigates to /ventas  
**Then** the text "No hay ventas en el período seleccionado" is visible

### SC-04: Gastos empty state

**Given** no gastos exist for the selected period  
**When** the user navigates to /gastos  
**Then** the text "No hay gastos en el período seleccionado" is visible

### SC-05: Dashboard shows all nav items

**Given** an authenticated user on the dashboard  
**When** the sidebar renders  
**Then** links for Dashboard, Lotes, Ventas, Clientes, Proveedores, and Gastos Fijos are all visible

### SC-06: Create Lote via dialog

**Given** an authenticated user on /lotes  
**When** they click "Crear Lote", fill required fields, and submit  
**Then** the new lote row appears in the table

### SC-07: Pagination controls visible

**Given** an authenticated user on any entity list page  
**When** the page loads  
**Then** the page size selector and page navigation are visible

### SC-08: Search filters rows

**Given** an authenticated user on /clientes with data present  
**When** they type in the search input  
**Then** the table rows are filtered to matching results

### SC-09: Dark mode toggle cycles themes

**Given** an authenticated user on any page  
**When** they click the theme toggle  
**Then** the `dark` class is toggled on the `<html>` element