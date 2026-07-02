# Tasks: E2E Browser Tests

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300 (9 new files + 2 modifications) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always (C1) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full E2E Playwright setup + all specs | PR 1 | Single PR under 400 lines |

## Phase 1: Setup — Playwright Config, Auth Setup, Test Data Seed

- [x] 1.1 Install `@playwright/test` as devDependency and add `test:e2e` script to `package.json`
- [x] 1.2 Create `playwright.config.ts` with `next dev` webServer, `fullyParallel: false`, `workers: 1`, setup + authenticated projects, `storageState` path `.auth/admin.json`
- [x] 1.3 Add `.auth/` and `test-results/` to `.gitignore`
- [x] 1.4 Create `e2e/global-setup.ts` — run `prisma db push --force-reset` then `prisma db seed` before test run
- [x] 1.5 Create `e2e/auth.setup.ts` — navigate to `/login`, submit credentials `admin@riquesos.com`/`admin123`, assert redirect to `/`, save `storageState` to `.auth/admin.json`

## Phase 2: Auth E2E Tests

- [x] 2.1 Create `e2e/auth-login.spec.ts` — test: valid credentials → redirect to dashboard
- [x] 2.2 Create `e2e/auth-invalid.spec.ts` — test: invalid credentials → error message visible, stays on /login
- [x] 2.3 Create `e2e/auth-redirect.spec.ts` — test: unauthenticated navigate to protected routes → redirect to /login

## Phase 3: Page Rendering E2E Tests

- [x] 3.1 Create `e2e/dashboard.spec.ts` — assert h1 "Dashboard" visible, metric labels, nav links, session persistence
- [x] 3.2 Create `e2e/lotes.spec.ts` — assert h1 "Lotes" visible, empty state (no lotes seeded), nav links
- [x] 3.3 Create `e2e/ventas.spec.ts` — assert h1 "Ventas" visible, empty-state message, nav links
- [x] 3.4 Create `e2e/clientes.spec.ts` — assert h1 "Clientes" visible, empty-state message, nav links
- [x] 3.5 Create `e2e/gastos.spec.ts` — assert h1 "Gastos Fijos" visible, empty-state message, nav links

## Phase 4: CI Integration & Verification

- [x] 4.1 Install Playwright chromium browser binary
- [ ] 4.2 Run `npm run test:e2e` end-to-end and verify all specs pass (requires running app)
- [x] 4.3 Verify `.auth/admin.json` is gitignored and not tracked