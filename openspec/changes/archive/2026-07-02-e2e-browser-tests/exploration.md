# Exploration: e2e-browser-tests

**Project**: pagina-riquesos  
**Date**: 2026-07-01  
**Explorer**: sdd-explore

---

## 1. Current State Analysis

### 1.1 Test Infrastructure

- **Unit/Integration**: Vitest 3.2+ with `vitest.config.ts`, 181 tests passing across 18 files
- **E2E**: Only `src/__tests__/e2e-verification.test.ts` — **structural checks** (file existence, regex on source code), NOT browser tests
- **No browser testing tooling** exists: no Playwright, no Cypress, no WebDriver

### 1.2 Existing E2E Structural Tests (to be replaced/augmented)

The current `e2e-verification.test.ts` checks:
1. Middleware file exists and references `getToken`/session/login/api-auth
2. Auth config has `CredentialsProvider` + bcrypt
3. NextAuth API route handler exists
4. Login page exists with form
5. Dashboard page exists and references metrics
6. Server Actions exist and reference `requireSession`
7. Seed script creates `admin@riquesos.com`

These are **structural smoke tests**, not behavioral. They validate code presence, not runtime behavior.

### 1.3 App Features Requiring E2E Coverage

| Feature | Route | Key Behavior |
|---------|-------|--------------|
| Login | `/login` | Email+password form, `signIn('credentials')`, error display, redirect on success |
| Protected routes | All except `/login`, `/api/auth/*` | Middleware redirects unauthenticated to `/login?callbackUrl=...` |
| Dashboard | `/` | Shows financial metrics, inventory table, top clients, active lotes |
| Lotes | `/lotes` | Lists active lotes, create lote form |
| Clientes | `/clientes` | Lists clients, CRUD operations |
| Ventas | `/ventas` | Lists current month ventas, register venta form |
| Gastos | `/gastos` | Lists gastos fijos, CRUD operations |

### 1.4 Authentication Architecture

- **Auth.js (next-auth v4)** with Credentials provider
- **JWT strategy** (not session-based — important for testing)
- **Middleware**: `src/middleware.ts` uses `getToken` from `next-auth/jwt` to check JWT
- **Login page**: Client component using `signIn('credentials', { redirect: false })` from `next-auth/react`
- **Session guard**: `requireSession()` in Server Actions uses `getServerSession(authOptions)`, redirects to `/login` if no session
- **Default admin**: `admin@riquesos.com` / password from `ADMIN_PASSWORD` env var (defaults to `admin123`)
- **NEXTAUTH_SECRET**: Required for JWT signing (from `.env`)

### 1.5 Database (SQLite + Prisma)

- Single SQLite database (WAL mode)
- No test database separation exists currently
- Seed script is idempotent (uses upsert)
- Models: Proveedor, Lote, Cliente, Venta, GastoFijo, Usuario

### 1.6 Server Actions Pattern

All Server Actions use `FormData` for mutations:
- `crearLote(formData)`, `registrarVenta(formData)`, `crearCliente(formData)`, etc.
- Read actions: `getLotes()`, `getVentas()`, `getClientes()`, `getGastos()`, `getMetricas()`
- All guarded by `await requireSession()` at the top

---

## 2. Playwright for Next.js 15 App Router — Analysis

### 2.1 Why Playwright over Cypress

| Criterion | Playwright | Cypress |
|-----------|-----------|---------|
| Next.js App Router support | Native, handles SSR/server components | Requires workarounds for server components |
| Multi-tab/multi-user testing | Native (browser contexts) | Not supported |
| Auto-wait mechanism | Auto-waiting for DOM/network | Flaky manual waits |
| Parallel execution | Built-in sharding | Requires paid parallelization |
| Test isolation | Built-in (`test.describe.configure({ mode: 'serial' })`) | Less granular |
| Speed | Faster (no DOM injection overhead) | Slower for complex apps |
| Community + Next.js docs | Official Next.js docs recommend Playwright | Less aligned |
| TypeScript | First-class | First-class |
| Bundle size | Larger binary but faster runtime | Smaller but slower |

**Recommendation**: Playwright. It's the de facto standard for Next.js E2E testing, recommended by the Next.js docs, and handles App Router + Server Actions natively.

### 2.2 Installation & Setup

```bash
npm install -D @playwright/test
npx playwright install
```

This adds:
- `@playwright/test` to devDependencies
- `playwright.config.ts` (to be created)
- Browser binaries (Chromium, Firefox, WebKit)

### 2.3 Playwright Configuration for Next.js App Router

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,          // SQLite can't handle parallel writes
  retries: 1,                     // Flaky tolerance for timing issues
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Key considerations:
- `fullyParallel: false` — SQLite does NOT support concurrent writes. Running tests in parallel against the same DB causes lock contention.
- `webServer` — automatically starts the Next.js dev server before tests
- `baseURL` — sets the base URL so tests use `page.goto('/login')` instead of full URLs

### 2.4 Testing Server Actions

Playwright tests Server Actions through the browser — you fill in forms and submit them, just like a real user. There's no special API for calling Server Actions directly. This is actually ideal for E2E because it tests the entire stack:

1. Form renders in the page
2. User fills form fields
3. Form submits via native form action (Server Actions)
4. Page revalidates/reloads with new data

**No mocking needed.** Server Actions use `FormData`, which Playwright fills natively.

### 2.5 Testing Auth.js Authentication Flow

The login flow in this app:
1. Navigate to `/login`
2. Fill email (`#email`) and password (`#password`) inputs
3. Click submit button
4. Assert redirect to `/` (dashboard)
5. Assert dashboard content visible

Playwright handles this naturally. For tests that need authenticated state, we can use Playwright's **storage state** feature to save the auth cookies/JWT after login and reuse across tests:

```typescript
// e2e/auth.setup.ts — runs once before all tests
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@riquesos.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await page.context().storageState({ path: '.auth/admin.json' });
});
```

Then in `playwright.config.ts`:
```typescript
dependencies: ['setup'],
projects: [
  { name: 'setup', testDir: './e2e', testMatch: /auth\.setup\.ts/ },
  { name: 'authenticated', testDir: './e2e', use: { storageState: '.auth/admin.json' }, dependencies: ['setup'] },
],
```

### 2.6 Database Seeding & Reset Strategy

**Challenge**: SQLite doesn't support transaction rollback or per-test isolation natively. Options:

| Strategy | Pros | Cons |
|----------|------|------|
| **A: Seed once, reset before each suite** | Simple, predictable | Slower (full DB reset per suite) |
| **B: Seed once, use idempotent data** | Fastest, no resets | Tests can't assert on counts; stale data accumulates |
| **C: Copy DB file before each test** | Full isolation | Slow for many tests; file I/O overhead |
| **D: Use Prisma `deleteMany` + re-seed per test** | Clean state | Must manage model dependencies (ventas → lotes → clientes) |

**Recommendation**: Strategy A + D hybrid:
- **Global setup**: Run `npx prisma db push --force-reset && npx prisma db seed` once before the entire test suite
- **Per-test-file setup**: Use `deleteMany` in `beforeEach` to clear test-specific data, keeping the admin user
- **Alternative**: Create a script that resets to a known state with admin user + minimal seed data

### 2.7 Auth Session Reuse

**Approach**: Use Playwright's `storageState` to authenticate once and reuse across all authenticated tests.

1. Create `e2e/auth.setup.ts` that logs in and saves auth state to `.auth/admin.json`
2. Configure `playwright.config.ts` with a `setup` project that runs first
3. All authenticated tests use `storageState: '.auth/admin.json'`
4. Unauthenticated tests (redirect tests) run without storage state

This avoids logging in before every single test — significant speed gain.

---

## 3. Test Architecture Recommendations

### 3.1 Directory Structure

```
e2e/
├── auth.setup.ts          # Login once, save storage state
├── fixtures.ts             # Shared test helpers (seed data, page objects)
├── login.spec.ts           # Unauthenticated login flow tests
├── protected-routes.spec.ts # Redirect-to-login tests
├── dashboard.spec.ts        # Authenticated dashboard tests
├── lotes.spec.ts           # Lote CRUD tests
├── clientes.spec.ts        # Cliente CRUD tests
├── ventas.spec.ts          # Venta registration tests
├── gastos.spec.ts           # GastoFijo CRUD tests
└── concurrency.spec.ts      # Concurrency/race condition tests
```

**Why `e2e/` instead of `src/__tests__/e2e/`**: 
- E2E tests run against a live server, not imported by the app
- Playwright's default testDir is `./tests` or `./e2e`
- Separation from Vitest unit/integration tests is cleaner
- The `src/__tests__/e2e-verification.test.ts` structural tests should remain under Vitest (they're fast and useful)

### 3.2 Test Scenarios — Priority Matrix

#### P0 — Critical (must have)

| ID | Scenario | What it validates |
|----|----------|-------------------|
| E2E-01 | Login with valid credentials → redirect to dashboard | Auth flow works end-to-end |
| E2E-02 | Login with invalid credentials → error message shown | Auth rejects bad credentials |
| E2E-03 | Unauthenticated visit to `/` → redirect to `/login` | Middleware protection works |
| E2E-04 | Unauthenticated visit to `/lotes` → redirect to `/login` | All protected routes guarded |
| E2E-05 | Dashboard shows metrics after data exists | Dashboard renders Server Action data |
| E2E-06 | Create Lote → appears in lotes list | Full CRUD write path |
| E2E-07 | Register Venta → stock decreases | Critical business flow |

#### P1 — Important (should have)

| ID | Scenario | What it validates |
|----|----------|-------------------|
| E2E-08 | Create Cliente → appears in clientes list | Cliente write path |
| E2E-09 | Create GastoFijo → appears in gastos list | GastoFijo write path |
| E2E-10 | Dashboard shows empty state when no data | Zero-data rendering |
| E2E-11 | Logout → redirect to login, can't access dashboard | Session invalidation |
| E2E-12 | Venta with insufficient stock → error | Business rule enforcement |

#### P2 — Nice to have

| ID | Scenario | What it validates |
|----|----------|-------------------|
| E2E-13 | Concurrent Venta registration → no overselling | Race condition handling |
| E2E-14 | MAYORISTA pricing applied in Venta | Price resolution |
| E2E-15 | Delete Cliente with no sales → succeeds | CRUD delete path |
| E2E-16 | Delete GastoFijo → succeeds | CRUD delete path |

### 3.3 Key E2E Test Details

#### E2E-01: Login Flow
```typescript
test('login with valid credentials redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@riquesos.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

#### E2E-03: Protected Route Redirect
```typescript
test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
```

#### E2E-06: Create Lote
```typescript
test('create lote and verify it appears in list', async ({ page }) => {
  // Page is authenticated (storageState)
  await page.goto('/lotes');
  // Click "New Lote" button or similar
  // Fill form fields
  // Submit
  // Verify new lote appears in table
});
```

### 3.4 Handling the Form-Based Server Actions

All mutation actions use `FormData` submitted through HTML forms. The app does NOT currently have dedicated forms/pages for creating Lotas, Ventas, etc. — the existing pages are **read-only list views**.

**Important finding**: The current pages (`/lotes`, `/ventas`, `/clientes`, `/gastos`) only display data tables. There are no visible create/edit forms in the UI. The Server Actions exist but there's no UI to trigger them.

This means:
- E2E tests for CRUD operations can only test **read/list** behaviors via the browser
- Create/update/delete would need to call Server Actions programmatically (not pure E2E) OR require new UI components to be built first
- The auth flow (login, redirect, dashboard) is fully testable as-is

**Revised P0 E2E scope** (testing what exists NOW):
1. Auth: login, invalid credentials, protected routes
2. Dashboard: renders metrics, empty state
3. List pages: data appears after seed, empty state

**Deferred to when CRUD forms exist**:
- Create Lote via UI
- Register Venta via UI
- Create Cliente via UI
- Create Gasto via UI

### 3.5 Interaction with Existing Vitest Tests

- **Keep**: All 181 Vitest tests (unit + integration + structural E2E)
- **Keep**: `src/__tests__/e2e-verification.test.ts` — still useful as a fast structural check
- **Add**: `@playwright/test` as a separate devDependency
- **Add**: `e2e/` directory for Playwright browser tests
- **Add**: `playwright.config.ts` at project root
- **Add**: `"test:e2e": "playwright test"` script to package.json
- **Keep**: `"test": "vitest"` script for unit/integration tests

No conflicts. Vitest and Playwright run independently with separate configs and test directories.

---

## 4. Technical Considerations

### 4.1 SQLite Concurrency

SQLite with WAL mode supports concurrent reads but only one writer at a time. E2E tests MUST run **sequentially** (not in parallel) when hitting the same database. The Playwright config must set `fullyParallel: false`.

If tests become too slow, options include:
- Use a separate SQLite file for E2E tests (`test.db`)
- Run only read-heavy tests in parallel
- Use transaction-based cleanup with a custom Prisma test client

### 4.2 Environment Variables

The app requires:
- `DATABASE_URL` — SQLite connection string (default: `file:./dev.db`)
- `NEXTAUTH_SECRET` — JWT signing secret
- `ADMIN_PASSWORD` — Admin user password (defaults to `admin123`)

For E2E, we should:
- Use a dedicated `test.db` (or reset `dev.db` before each suite)
- Set a known `NEXTAUTH_SECRET` in E2E environment
- Use `admin123` as the test admin password

### 4.3 Next.js Dev Server vs Production Build

The verify report noted a SIGBUS crash on `next build`. This means:
- E2E tests should use `next dev` (development mode) for the webServer config
- CI/CD can attempt `next start` but it may fail in constrained environments
- The dev server is slower but reliable

### 4.4 Test Data Strategy

Recommended seed data for E2E:
- Admin user: `admin@riquesos.com` / `admin123`
- 2 Proveedores (already seeded)
- 2 Clientes (1 MAYORISTA, 1 MINORISTA) — to test pricing
- 2 Lotes (1 DOBLE_CREMA, 1 SEMISALADO) — to test ventas
- 1 Venta — to test dashboard metrics
- 1 GastoFijo — to test gastos page

This gives enough data to verify all read paths without needing UI forms for creation.

### 4.5 Playwright and Next.js App Router Compatibility

Playwright works well with App Router because:
- Server Components render on the server — Playwright sees the full HTML
- Client Components (like the login form) hydrate — Playwright can interact after hydration
- Server Actions are triggered by form submission — Playwright fills forms naturally
- `next-auth` JWT cookies are visible to Playwright via `storageState`

No special configuration needed beyond standard Playwright setup.

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No CRUD forms exist in UI — can't test write operations via browser | High | Scope P0 to auth + read paths; defer CRUD E2E until forms exist |
| SQLite lock contention with parallel tests | Medium | Set `fullyParallel: false`; run sequentially |
| `next build` SIGBUS in test environment | Low | Use `next dev` for E2E webServer |
| Test DB state pollution between runs | Medium | Reset DB before each suite with seed script |
| Flaky tests due to async Server Action responses | Medium | Use Playwright's auto-wait + `waitForURL` + explicit assertions |
| Auth.js session cookie format may change | Low | Use Playwright's `storageState` which captures all cookies/storage |

---

## 6. Recommendations Summary

1. **Install Playwright** (`@playwright/test`) as a devDependency
2. **Create `playwright.config.ts`** with sequential execution, `next dev` webServer, and storageState for auth
3. **Create `e2e/` directory** with:
   - `auth.setup.ts` — authenticate admin user, save storage state
   - `fixtures.ts` — shared helpers (seed data, DB reset)
   - `login.spec.ts` — auth flow (valid/invalid credentials)
   - `protected-routes.spec.ts` — redirect tests
   - `dashboard.spec.ts` — metrics display (with and without data)
   - `lotes.spec.ts` — list display
   - `clientes.spec.ts` — list display
   - `ventas.spec.ts` — list display
   - `gastos.spec.ts` — list display
4. **Keep existing structural E2E test** (`e2e-verification.test.ts`) under Vitest
5. **Add npm script**: `"test:e2e": "playwright test"`
6. **Scope P0** to auth flow + read-only page rendering (CRUD forms don't exist yet)
7. **Use separate test database** or reset before each suite
8. **Use Playwright storageState** to authenticate once per test suite
9. **Update `openspec/config.yaml`** testing section to reflect Playwright addition

---

## 7. Files to be Modified/Created

| Action | Path | Description |
|--------|------|-------------|
| CREATE | `playwright.config.ts` | Playwright configuration |
| CREATE | `e2e/auth.setup.ts` | Auth setup + storage state |
| CREATE | `e2e/fixtures.ts` | Shared test helpers |
| CREATE | `e2e/login.spec.ts` | Login flow tests |
| CREATE | `e2e/protected-routes.spec.ts` | Route protection tests |
| CREATE | `e2e/dashboard.spec.ts` | Dashboard rendering tests |
| CREATE | `e2e/lotes.spec.ts` | Lotes list page tests |
| CREATE | `e2e/clientes.spec.ts` | Clientes list page tests |
| CREATE | `e2e/ventas.spec.ts` | Ventas list page tests |
| CREATE | `e2e/gastos.spec.ts` | Gastos list page tests |
| MODIFY | `package.json` | Add `@playwright/test` devDep, `test:e2e` script |
| MODIFY | `.gitignore` | Add `.auth/` and `test-results/` |
| UPDATE | `openspec/config.yaml` | Update testing context |
