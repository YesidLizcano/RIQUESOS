# Design: E2E Browser Tests

## Technical Approach

Add Playwright as a separate test runner alongside Vitest. A global setup resets/seeds SQLite, an auth setup project logs in once and saves JWT cookies to `.auth/admin.json`, and dependent spec files reuse that session. All tests run sequentially (`fullyParallel: false`) to avoid SQLite lock contention. The existing `e2e-verification.test.ts` (Vitest structural tests) remains untouched.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Test runner | Playwright | Cypress, Vitest browser mode | Playwright has first-class Next.js support, storageState projects, and parallelizes at file level; Cypress requires a Chrome extension; Vitest browser mode lacks auth fixtures |
| Server mode | `next dev` via webServer | `next build` + `next start` | `next build` can SIGBUS in CI on SQLite; dev server is simpler and matches existing workflow |
| Execution mode | `fullyParallel: false`, `workers: 1` | Parallel workers | SQLite cannot handle concurrent writes; sequential avoids lock errors |
| Auth reuse | Playwright `storageState` project dependency | Re-login per spec, custom auth cookie injection | Login once → save cookies/token → all specs reuse session; matches Playwright's recommended pattern for NextAuth JWT apps |
| Test data | Global reset+seed (`prisma db push --force-reset && prisma db seed`) before run | Per-test reset, Docker DB | SQLite file is fast to reset; no Docker overhead needed |
| Test location | `e2e/` at project root | `src/__tests__/e2e/`, `tests/e2e/` | Separates E2E from unit tests clearly; matches Playwright convention; `src/__tests__/` is Vitest territory |

## Data Flow

```
npx playwright test
       │
       ├─ 1. global-setup.ts
       │     └─ prisma db push --force-reset
       │     └─ prisma db seed (admin@riquesos.com + proveedores)
       │
       ├─ 2. auth.setup.ts (project: setup)
       │     └─ POST /api/auth/callback/credentials
       │     └─ Save cookies → .auth/admin.json
       │
       ├─ 3. auth.spec.ts (no storageState — unauthenticated)
       │     └─ Test: invalid credentials → error message
       │     └─ Test: unauthenticated → /login redirect
       │
       └─ 4. dashboard.spec.ts, lotes.spec.ts, etc. (storageState: .auth/admin.json)
             └─ Test: valid login flow (via setup state)
             └─ Test: page renders seeded data
             └─ Test: session persists across nav
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `playwright.config.ts` | Create | Playwright config: webServer (next dev), fullyParallel:false, projects (setup + dependent), storageState |
| `e2e/global-setup.ts` | Create | Reset SQLite DB + seed before test run |
| `e2e/auth.setup.ts` | Create | Login as admin, save storageState to `.auth/admin.json` |
| `e2e/auth.spec.ts` | Create | Unauthenticated tests: invalid credentials, protected route redirect |
| `e2e/dashboard.spec.ts` | Create | Authenticated: dashboard renders metrics, session nav |
| `e2e/lotes.spec.ts` | Create | Authenticated: lotes list renders seeded data |
| `e2e/ventas.spec.ts` | Create | Authenticated: ventas list renders seeded data |
| `e2e/clientes.spec.ts` | Create | Authenticated: clientes list renders seeded data |
| `e2e/gastos.spec.ts` | Create | Authenticated: gastos list renders seeded data |
| `package.json` | Modify | Add `@playwright/test` devDep + `test:e2e` script |
| `.gitignore` | Modify | Add `.auth/` and `test-results/` |
| `src/__tests__/e2e-verification.test.ts` | None | Keep as-is (structural Vitest tests) |

## Interfaces / Contracts

**playwright.config.ts projects:**

```ts
{
  name: 'setup',
  testMatch: /auth\.setup\.ts/,
},
{
  name: 'authenticated',
  testMatch: /.*\.spec\.ts/,
  dependencies: ['setup'],
  use: { storageState: '.auth/admin.json' },
}
```

**Key selectors** (from page source):
- Login error: `div.bg-red-50` (contains "Credenciales inválidas")
- Dashboard h1: text "Dashboard"
- Dashboard metrics: metric card `p.text-sm.text-gray-500` labels (Ingresos, etc.)
- Empty state text: `p.text-gray-500.text-center`
- List page h1: page name ("Lotes", "Ventas", "Clientes", "Gastos Fijos")

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | N/A (existing Vitest covers this) | Unchanged |
| Integration | Auth setup saves valid storageState | Assert `.auth/admin.json` exists and contains cookies after setup |
| E2E | Login flow: valid → redirect, invalid → error | Playwright unauthenticated spec |
| E2E | Protected route redirect | Navigate to `/` without session → expect `/login` |
| E2E | Session persistence | Navigate dashboard → lotes → back, still authenticated |
| E2E | Dashboard renders metrics | Verify metric labels and seeded values visible |
| E2E | List pages render data | Verify table rows with seeded data |
| E2E | Empty state display | After cleanup, verify "No hay …" messages |

## Migration / Rollout

No migration required. Additive only — new files and devDep. Rollback: remove `e2e/`, `playwright.config.ts`, `.auth/`; revert `package.json` and `.gitignore`.

## Open Questions

- [ ] Should E2E tests run against a separate test DB file (e.g., `test.db`) to avoid polluting dev data? The spec says `prisma db push --force-reset` which affects the default DB.