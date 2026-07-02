# E2E Testing Specification

## Purpose

Validate auth flow and page rendering end-to-end via Playwright browser tests, ensuring runtime correctness beyond structural file checks.

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

The system SHALL verify login with valid credentials redirects to the dashboard, invalid credentials display an error, and unauthenticated access to protected routes redirects to `/login`. Session persistence across page navigation MUST be confirmed.

#### Scenario: Valid login redirects to dashboard

- GIVEN a seeded admin user with email admin@riquesos.com
- WHEN submitting valid credentials on the login page
- THEN the browser redirects to the dashboard

#### Scenario: Invalid credentials show error

- GIVEN a seeded admin user
- WHEN submitting an incorrect password on the login page
- THEN an authentication error message is displayed

#### Scenario: Unauthenticated access redirects to login

- GIVEN no active session
- WHEN navigating to a protected route directly
- THEN the browser redirects to `/login`

#### Scenario: Session persists across navigation

- GIVEN an authenticated session stored via storageState
- WHEN navigating between dashboard and list pages
- THEN the session remains active without re-authentication

### Requirement: Page Rendering E2E Tests

The system SHALL verify the dashboard renders metrics from seeded data, each list page (lotes, ventas, clientes, gastos) renders seeded records, and empty state displays correctly when no data exists.

#### Scenario: Dashboard renders seeded metrics

- GIVEN a database seeded with lotes, ventas, and gastos
- WHEN navigating to the dashboard
- THEN key metrics (totals, counts) are visible and match seeded data

#### Scenario: List pages render seeded data

- GIVEN a database seeded with records for each entity
- WHEN navigating to lotes, ventas, clientes, or gastos list pages
- THEN each page displays the corresponding seeded records

#### Scenario: Empty state displayed correctly

- GIVEN a freshly reset database with no entity records
- WHEN navigating to a list page
- THEN an appropriate empty-state message is shown

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