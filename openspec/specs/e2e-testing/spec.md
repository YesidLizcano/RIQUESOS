# E2E Testing Specification

## Purpose

Validate auth flow and page rendering end-to-end via Playwright browser tests, ensuring runtime correctness beyond structural file checks. All E2E tests SHALL use role-based selectors (`getByRole()`, `getByText()`, `getByLabel()`, `getByTestId()`) — NOT CSS class selectors — to remain resilient to UI library class changes.

## Requirements

### Requirement: Playwright Configuration

The system SHALL configure Playwright for Next.js App Router with a `next dev` webServer. Tests MUST run sequentially (`fullyParallel: false`) to prevent SQLite lock contention. An `auth.setup` project SHALL authenticate once and persist session state via Playwright `storageState` for reuse across dependent test specs.

#### Scenario: Sequential execution prevents SQLite locks

- GIVEN a Playwright test suite with multiple spec files
- WHEN running `npx playwright test`
- THEN tests execute sequentially without SQLite lock errors

#### Scenario: Authenticated state reused across specs

- GIVEN the auth setup project has saved session state to `.auth/admin.json`
- WHEN a dependent test spec runs
- THEN the spec uses the stored session without repeating login

### Requirement: Auth E2E Tests

The system SHALL verify login with valid credentials redirects to the dashboard, invalid credentials display an error using role-based selectors (`getByRole('alert')` or `getByText('Credenciales inválidas')`), and unauthenticated access to protected routes redirects to `/login`. Session persistence across page navigation MUST be confirmed. Tests MUST NOT depend on implementation-specific CSS classes like `div.bg-red-50`.

#### Scenario: Valid login redirects to dashboard

- GIVEN a seeded admin user with email admin@riquesos.com
- WHEN submitting valid credentials on the login page
- THEN the browser redirects to the dashboard

#### Scenario: Invalid credentials show alert

- GIVEN a seeded admin user
- WHEN submitting an incorrect password on the login page
- THEN an alert with `role="alert"` is visible
- AND the text "Credenciales inválidas" is displayed

#### Scenario: Unauthenticated access redirects to login

- GIVEN no active session
- WHEN navigating to a protected route directly
- THEN the browser redirects to `/login`

#### Scenario: Session persists across navigation

- GIVEN an authenticated session stored via storageState
- WHEN navigating between dashboard and list pages
- THEN the session remains active without re-authentication

### Requirement: Page Rendering E2E Tests

The system SHALL verify the dashboard renders metrics from seeded data, each list page (lotes, ventas, clientes, gastos, proveedores) renders seeded records, and empty state displays correctly when no data exists. Empty state text MUST match current application strings:
- Lotes: "No hay lotes"
- Ventas: "No hay ventas en el período seleccionado"
- Gastos: "No hay gastos en el período seleccionado"

The dashboard navigation test SHALL verify all 6 sidebar items: Dashboard, Lotes, Ventas, Clientes, Proveedores, and Gastos Fijos.

#### Scenario: Dashboard renders seeded metrics

- GIVEN a database seeded with lotes, ventas, and gastos
- WHEN navigating to the dashboard
- THEN key metrics (totals, counts) are visible and match seeded data

#### Scenario: List pages render seeded data

- GIVEN a database seeded with records for each entity
- WHEN navigating to lotes, ventas, clientes, gastos, or proveedores list pages
- THEN each page displays the corresponding seeded records

#### Scenario: Empty state displayed correctly

- GIVEN a freshly reset database with no entity records
- WHEN navigating to a list page
- THEN the correct empty-state message is shown

#### Scenario: Dashboard shows all nav items

- GIVEN an authenticated user on the dashboard
- WHEN the sidebar renders
- THEN links for Dashboard, Lotes, Ventas, Clientes, Proveedores, and Gastos Fijos are all visible

### Requirement: CRUD Form Create Tests

E2E tests SHALL verify that each entity's create dialog opens, accepts field input, and submits successfully. Entities: Lote, Cliente, Venta, GastoFijo, Proveedor. Each test SHALL:
- Open the create dialog
- Fill minimum required fields
- Submit the form
- Verify the new row appears in the table

#### Scenario: Create Lote via dialog

- GIVEN an authenticated user on /lotes
- WHEN they click "Crear Lote", fill required fields, and submit
- THEN the new lote row appears in the table

### Requirement: Pagination Controls

E2E tests SHALL verify that pagination controls render on list pages. The page size selector (10/20/50 rows) MUST be visible and functional on at least one entity page. Tests verify UI controls exist and respond to interaction, NOT data accuracy.

#### Scenario: Pagination controls visible

- GIVEN an authenticated user on any entity list page
- WHEN the page loads
- THEN the page size selector and page navigation are visible

### Requirement: Search and Column Filters

E2E tests SHALL verify that the search input renders and filters table rows. Column filter selects (e.g., Clientes tipo filter) SHALL be verified to render and respond to selection.

#### Scenario: Search filters rows

- GIVEN an authenticated user on /clientes with data present
- WHEN they type in the search input
- THEN the table rows are filtered to matching results

### Requirement: Dark Mode Toggle

An E2E test SHALL verify that the theme toggle exists in the sidebar and cycles through light → dark → system themes, adding/removing the `dark` CSS class on the `<html>` element.

#### Scenario: Dark mode toggle cycles themes

- GIVEN an authenticated user on any page
- WHEN they click the theme toggle
- THEN the `dark` class is toggled on the `<html>` element

### Requirement: Proveedores Page

E2E tests SHALL verify that the Proveedores page renders with its heading, empty state text, and navigation links.

### Requirement: Test Data Strategy

The system SHALL reset and seed the database once before the test run using `prisma db push --force-reset` followed by `prisma db seed`. Per-suite cleanup SHALL use `deleteMany` where needed. The `.auth/` directory and `test-results/` SHALL be gitignored.

#### Scenario: Database reset and seeded before test run

- GIVEN a Playwright global setup step
- WHEN the test run begins
- THEN the database is reset and seeded before any spec executes

#### Scenario: Per-suite cleanup isolates tests

- GIVEN a test suite that modifies data
- WHEN the suite finishes
- THEN cleanup removes modifications without affecting other suites