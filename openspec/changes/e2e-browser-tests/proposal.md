# Proposal: E2E Browser Tests

## Intent

Replace structural E2E tests (file-existence checks) with real Playwright browser tests that validate auth flow and page rendering end-to-end. The current `e2e-verification.test.ts` only checks source code patterns — it cannot catch runtime regressions.

## Scope

### In Scope
- Install `@playwright/test` and configure for Next.js App Router
- Create auth E2E tests: valid login → dashboard, invalid credentials → error, unauthenticated → `/login` redirect
- Create page rendering E2E tests: dashboard metrics, lotes list, ventas list, clientes list, gastos list (all with seeded data)
- Configure sequential execution (`fullyParallel: false`) for SQLite compatibility
- Add `auth.setup.ts` with Playwright storageState for session reuse
- Add `test:e2e` npm script

### Out of Scope
- CRUD form E2E tests (no create/edit forms exist in UI yet — deferred until UI adds them)
- Visual regression testing
- Performance/load testing
- Concurrency race-condition E2E tests (deferred to P2)

## Capabilities

### New Capabilities
- `e2e-testing`: Playwright browser test infrastructure, auth setup with storageState, and E2E test specs for login flow, protected routes, and read-only page rendering

### Modified Capabilities
None — existing specs (`auth`, `data-seed`, `dashboard-metrics`, `lote-management`, etc.) remain unchanged; this change adds a testing layer without altering requirements.

## Approach

1. Install `@playwright/test`, create `playwright.config.ts` with `next dev` webServer, sequential execution, and storageState project dependency
2. Create `e2e/auth.setup.ts` — log in as admin, save JWT session to `.auth/admin.json`
3. Create unauthenticated test specs (login, protected routes) and authenticated test specs (dashboard, lotes, clientes, ventas, gastos) using storageState
4. Use `npx prisma db push --force-reset && npx prisma db seed` in global setup; `deleteMany` cleanup per suite where needed
5. Keep existing Vitest structural tests untouched

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `e2e/` (new) | New | All Playwright test files and auth setup |
| `playwright.config.ts` (new) | New | Playwright configuration |
| `package.json` | Modified | Add `@playwright/test` devDep + `test:e2e` script |
| `.gitignore` | Modified | Add `.auth/` and `test-results/` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No CRUD forms in UI — write-path E2E impossible | High | Scope P0 to auth + read-only; defer CRUD |
| SQLite lock contention under parallel tests | Medium | `fullyParallel: false` |
| `next build` SIGBUS in CI | Low | Use `next dev` for webServer |
| Test DB state pollution | Medium | Reset + seed before each suite |

## Rollback Plan

Remove `e2e/` directory, `playwright.config.ts`, `.auth/` directory. Revert `package.json` and `.gitignore` changes. Existing Vitest tests remain unaffected.

## Dependencies

- `@playwright/test` npm package
- Playwright browser binaries (Chromium)

## Success Criteria

- [ ] `npx playwright test` passes all auth and rendering specs
- [ ] Login with valid credentials redirects to dashboard
- [ ] Login with invalid credentials shows error message
- [ ] Unauthenticated access to protected routes redirects to `/login`
- [ ] Dashboard renders metrics from seeded data
- [ ] List pages (lotes, ventas, clientes, gastos) render seeded data
- [ ] Tests run sequentially without SQLite lock errors