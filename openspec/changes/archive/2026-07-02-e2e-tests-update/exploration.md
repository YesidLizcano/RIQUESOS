# Exploration: e2e-tests-update

**Project**: pagina-riquesos  
**Date**: 2026-07-02  
**Explorer**: sdd-explore

---

## 1. Current E2E Test Inventory

### 1.1 Test Files (8 total)

| File | Project | What It Tests |
|------|---------|----------------|
| `e2e/auth.setup.ts` | setup | Authenticates as admin, saves storage state to `.auth/admin.json` |
| `e2e/global-setup.ts` | global-setup | Resets DB (`prisma db push --force-reset`) and seeds |
| `e2e/tests/auth-login.spec.ts` | unauthenticated | Valid login redirects to `/` |
| `e2e/tests/auth-invalid.spec.ts` | unauthenticated | Invalid password shows error, nonexistent email shows error |
| `e2e/tests/auth-redirect.spec.ts` | unauthenticated | Unauthenticated access to `/`, `/lotes`, `/ventas` redirects to `/login` |
| `e2e/tests/dashboard.spec.ts` | authenticated | Dashboard heading, metric labels, nav links, session persistence |
| `e2e/tests/lotes.spec.ts` | authenticated | Lotes heading, empty state ("No hay lotes activos"), nav links |
| `e2e/tests/ventas.spec.ts` | authenticated | Ventas heading, empty state, nav links |
| `e2e/tests/clientes.spec.ts` | authenticated | Clientes heading, empty state, nav links |
| `e2e/tests/gastos.spec.ts` | authenticated | Gastos heading, empty state, nav links |

### 1.2 Playwright Config Summary

```typescript
// playwright.config.ts
testDir: './e2e'
fullyParallel: false   // SQLite safe
workers: 1
retries: 0
projects:
  - setup:        auth.setup.ts
  - unauthenticated: auth-login, auth-invalid, auth-redirect
  - authenticated: dashboard, lotes, ventas, clientes, gastos (depends on setup)
webServer: npm run dev on localhost:3000, reuseExistingServer: true
```

### 1.3 Auth Setup Flow

1. Goes to `/login`
2. Fills `getByLabel('Email')` and `getByLabel('Contraseña')`
3. Clicks `getByRole('button', { name: 'Iniciar Sesión' })`
4. Waits for URL `/`
5. Asserts `heading 'Dashboard'` is visible
6. Saves storage state to `.auth/admin.json`

---

## 2. Failing / Outdated Tests — Detailed Analysis

### 2.1 auth.setup.ts — WILL FAIL

**Issue**: After login, asserts:
```typescript
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
```

The dashboard page now renders `DashboardClientPage` as a client component. The heading "Dashboard" still exists (line 211 of `dashboard-client-page.tsx`), but it's inside a `'use client'` component. This **should still work** because Playwright waits for hydration. However, there's a subtlety: the server component `page.tsx` also has `<h1>Dashboard</h1>` in the error state (line 68). The heading should still be findable.

**Verdict**: LIKELY STILL WORKS, but fragile — the heading moved from server-rendered to client-rendered.

### 2.2 auth-login.spec.ts — WILL FAIL

```typescript
await page.getByLabel('Email').fill('admin@riquesos.com');
await page.getByLabel('Contraseña').fill('admin123');
```

**Issue**: The login page now uses `<Label htmlFor="email">Email</Label>` + `<Input id="email">` and `<Label htmlFor="password">Contraseña</Label>` + `<Input id="password">`. The `getByLabel` selectors should still work because `<Label>` with `htmlFor` creates the proper aria association. **However**, the form now uses `onSubmit` handler and the button text changes to "Ingresando..." when loading. The test doesn't wait for loading state. This could cause a race condition but probably still works.

**Verdict**: LIKELY STILL WORKS, but should add loading state handling.

### 2.3 auth-invalid.spec.ts — WILL FAIL

```typescript
await expect(page.locator('div.bg-red-50')).toBeVisible();
await expect(page.getByText('Credenciales inválidas')).toBeVisible();
```

**Issue**: The error alert now uses shadcn's `<Alert variant="destructive">` component. The CSS class is no longer `div.bg-red-50` — it uses shadcn's styling classes. The text "Credenciales inválidas" is still present in the component (line 36 of login page), but the selector `div.bg-red-50` will FAIL.

**Verdict**: **WILL FAIL** — needs update to use `getByRole('alert')` or `getByText('Credenciales inválidas')`.

### 2.4 auth-redirect.spec.ts — LIKELY STILL WORKS

Tests redirect from `/`, `/lotes`, `/ventas` to `/login`. These routes are still protected by middleware. Should still pass.

### 2.5 dashboard.spec.ts — WILL FAIL (multiple issues)

**Test: renders dashboard heading and metric labels**
```typescript
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await expect(page.getByText('Ingresos')).toBeVisible();
await expect(page.getByText('Costo Mercancía')).toBeVisible();
await expect(page.getByText('Ganancia Bruta')).toBeVisible();
await expect(page.getByText('Gastos Fijos')).toBeVisible();
await expect(page.getByText('Ganancia Neta')).toBeVisible();
```

**Issues**:
1. The heading "Dashboard" is now inside a client component. Should still work.
2. The metric labels are rendered by `MetricCard` components inside `DashboardClientPage`. The labels "Ingresos", "Costo Mercancía", "Ganancia Bruta", "Gastos Fijos", "Ganancia Neta" ARE still present (lines 243-267 of `dashboard-client-page.tsx`). These should still be findable.
3. BUT — these are now client-rendered. On initial load, there might be a flash before hydration. The seed data only creates 2 proveedores and 0 lotes/clientes/ventas/gastos. The metrics will show zeros. The MetricCard titles should still render regardless.

**Verdict**: LIKELY WORKS for labels, but the dashboard now has MUCH more content that's NOT tested: period selector, export button, charts, alert section, inventory table, top clients table.

**Test: renders navigation links**
```typescript
await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Ventas' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Clientes' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Gastos Fijos' })).toBeVisible();
```

**Issues**: The sidebar now uses shadcn's `<SidebarMenuButton>` which renders `<Link>` internally. The sidebar is collapsible. The items are: Dashboard, Lotes, Ventas, Clientes, **Proveedores**, Gastos Fijos. 

- The test doesn't check for "Dashboard" link — but it should since it's in the nav
- The test doesn't check for "Proveedores" — NEW nav item
- The sidebar uses `SidebarMenuButton` with `render={<Link>}` which creates `<a>` tags, so `getByRole('link')` should still work
- But the sidebar might be collapsed by default on mobile! The `SidebarProvider` has no explicit `defaultOpen` prop.

**Verdict**: LIKELY WORKS but missing "Proveedores" assertion. May fail on mobile viewports if sidebar is collapsed.

**Test: session persists across navigation**
```typescript
await page.getByRole('link', { name: 'Lotes' }).click();
await expect(page.getByRole('heading', { name: 'Lotes' })).toBeVisible();
await page.getByRole('link', { name: 'Dashboard' }).click();
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
```

**Issues**: Navigation links are now in a sidebar (not simple `<a>` links in the main content area). The sidebar items use `SidebarMenuButton` with `render={<Link href={item.href} />}`. These should be clickable links. BUT the heading on the Lotes page now has a subtitle "Gestión de lotes de queso" below the h1. The heading "Lotes" still exists (line 129 of `lotes-client-page.tsx`). Should still work.

**Verdict**: LIKELY WORKS but fragile — clicking sidebar links may require sidebar to be open.

### 2.6 lotes.spec.ts — WILL FAIL

**Test: renders seeded proveedor data in table**
```typescript
await expect(page.getByText('No hay lotes activos')).toBeVisible();
```

**Issue**: The empty state text is now **"No hay lotes"** (line 138 of `lotes-client-page.tsx`), not "No hay lotes activos".

**Verdict**: **WILL FAIL** — wrong empty state text.

**Test: renders navigation links**
Same sidebar issues as dashboard.

### 2.7 ventas.spec.ts — WILL FAIL

**Test: shows empty state when no ventas seeded**
```typescript
await expect(page.getByText('No hay ventas en el período actual')).toBeVisible();
```

**Issue**: The empty state text is now **"No hay ventas en el período seleccionado"** (line 143 of `ventas-client-page.tsx`), not "en el período actual".

**Verdict**: **WILL FAIL** — wrong empty state text.

### 2.8 clientes.spec.ts — LIKELY WORKS

**Test: shows empty state when no clientes seeded**
```typescript
await expect(page.getByText('No hay clientes registrados')).toBeVisible();
```

**Issue**: The empty state text is "No hay clientes registrados" (line 81 of `clientes-client-page.tsx`). This matches.

**Verdict**: LIKELY WORKS.

### 2.9 gastos.spec.ts — WILL FAIL

**Test: shows empty state when no gastos seeded**
```typescript
await expect(page.getByText('No hay gastos fijos registrados')).toBeVisible();
```

**Issue**: The empty state text is now **"No hay gastos en el período seleccionado"** (line 113 of `gastos-client-page.tsx`), not "No hay gastos fijos registrados".

**Verdict**: **WILL FAIL** — wrong empty state text.

---

## 3. Summary of Failing Tests

| Test File | Test | Status | Reason |
|-----------|------|--------|--------|
| auth-invalid.spec.ts | shows error message | **FAIL** | `div.bg-red-50` selector no longer matches shadcn Alert |
| lotes.spec.ts | empty state text | **FAIL** | "No hay lotes activos" → "No hay lotes" |
| ventas.spec.ts | empty state text | **FAIL** | "período actual" → "período seleccionado" |
| gastos.spec.ts | empty state text | **FAIL** | "No hay gastos fijos registrados" → "No hay gastos en el período seleccionado" |
| dashboard.spec.ts | nav links | **INCOMPLETE** | Missing "Proveedores" nav item |
| auth.setup.ts | heading assertion | **FRAGILE** | Works but depends on client-rendered heading |

**4 tests WILL FAIL**, 1 test is INCOMPLETE, 1 is FRAGILE.

---

## 4. Features NOT Tested at All (Missing Coverage)

### 4.1 CRUD Forms (Create/Edit/Delete/Restore)

The app now has full CRUD for all entities via dialog forms:

| Entity | Create Form | Edit Form | Delete | Restore |
|--------|-------------|-----------|--------|---------|
| Lotes | `CrearLoteDialog` | `EditarLoteDialog` | `DeleteConfirmDialog` | Soft delete + restore |
| Ventas | `RegistrarVentaDialog` | — | — | — |
| Clientes | `CrearClienteDialog` | `EditarClienteDialog` | `DeleteConfirmDialog` | Soft delete + restore |
| Gastos | `CrearGastoFijoDialog` | `EditarGastoFijoDialog` | `DeleteConfirmDialog` | Soft delete + restore |
| Proveedores | `CrearProveedorDialog` | `EditarProveedorDialog` | `DeleteConfirmDialog` | Soft delete + restore |

**None of these CRUD operations are tested.** The original E2E tests were written before CRUD forms existed.

### 4.2 Pagination

The `DataTable` component now has built-in pagination with:
- Page size selector (10, 20, 50)
- Page navigation (Previous/Next buttons + numbered pages)
- URL-synced `pageSize` query param
- Footer showing "Página X de Y"

**No pagination tests exist.**

### 4.3 Filters & Search

Every entity page now has a `DataTableToolbar` with:
- Global search input (with clear button)
- Column-specific filters (dropdown selects for Producto, Estado, Proveedor, Cliente, Tipo)
- "Mostrar eliminados" checkbox for entities with soft delete

**No filter/search tests exist.**

### 4.4 Dashboard Enhancements

The dashboard now includes:
- **Period Selector** (month/year dropdowns)
- **Export Excel button** (on dashboard + all entity pages)
- **10 metric cards** (5 financial + 5 operational: Inventario Valor, Ventas count, Clientes Activos, Kg Vendidos, Lotes Activos)
- **5 charts**: Revenue Composition (Bar), Daily Sales (Area), Top 5 Clients (Bar), Inventory by Type (Donut), Revenue by Client Type (Donut)
- **Alert Section** (stock alerts for low/critical stock and old/very old lotes)
- **Inventory Table** (lotes with product, stock, cost)
- **Top Clients Table**

The current test only checks 5 metric labels. None of the above are tested.

### 4.5 Date Range Filters (Period Selector)

Ventas, Gastos, and Dashboard pages now have `PeriodSelector` components for month/year selection. **Not tested.**

### 4.6 Dark Mode Toggle

The sidebar footer has a `ThemeToggle` that cycles light → dark → system. **Not tested.**

### 4.7 Export to Excel

Every entity page toolbar + dashboard has an "Exportar Excel" button. **Not tested.**

### 4.8 Soft Delete & Restore

All entities (Lotes, Clientes, Gastos, Proveedores) have soft delete with a "Mostrar eliminados" checkbox and restore buttons. **Not tested.**

### 4.9 Proveedores Page

An entirely new entity page exists at `/proveedores` with CRUD, search, filters, pagination, export, and soft delete. **Not tested at all.**

### 4.10 Mobile Responsive Layout

The sidebar collapses on mobile. The dashboard layout adapts with `md:` and `lg:` breakpoints. **Not tested.**

### 4.11 Session Timeout

The login page now shows a session expired alert when redirected with `?error=SessionExpired`. **Not tested.**

---

## 5. New Test Scenarios Needed

### Priority 0 — Fix Broken Tests (MUST DO)

| ID | File | Fix |
|----|------|-----|
| FIX-1 | auth-invalid.spec.ts | Replace `div.bg-red-50` with `getByRole('alert')` or `getByText('Credenciales inválidas')` |
| FIX-2 | lotes.spec.ts | Change "No hay lotes activos" → "No hay lotes" |
| FIX-3 | ventas.spec.ts | Change "No hay ventas en el período actual" → "No hay ventas en el período seleccionado" |
| FIX-4 | gastos.spec.ts | Change "No hay gastos fijos registrados" → "No hay gastos en el período seleccionado" |
| FIX-5 | dashboard.spec.ts | Add "Proveedores" nav link assertion |

### Priority 1 — Essential New Coverage (SHOULD DO)

| ID | Scenario | Description |
|----|----------|-------------|
| E2E-01 | Proveedores page | New entity page — heading, empty state, nav |
| E2E-02 | Create Lote via dialog | Open `CrearLoteDialog`, fill form, submit, verify in table |
| E2E-03 | Create Cliente via dialog | Open `CrearClienteDialog`, fill form, submit, verify in table |
| E2E-04 | Create Gasto via dialog | Open `CrearGastoFijoDialog`, fill form, submit, verify in table |
| E2E-05 | Create Proveedor via dialog | Open `CrearProveedorDialog`, fill form, submit, verify in table |
| E2E-06 | Register Venta via dialog | Open `RegistrarVentaDialog`, fill form, submit, verify in table |
| E2E-07 | Soft delete (Lote) | Click delete icon, confirm in `DeleteConfirmDialog`, verify row disappears from active view |
| E2E-08 | Soft delete + restore (Cliente) | Delete, toggle "Mostrar eliminados", verify row appears, click restore icon |
| E2E-09 | Edit entity (Lote) | Click edit icon, modify fields, submit, verify changes |
| E2E-10 | Dashboard period selector | Change month/year, verify metrics update |
| E2E-11 | Dashboard charts render | Verify chart containers are present (at least for seeded data) |
| E2E-12 | Dashboard alerts | With seeded data that has alerts, verify alert section renders |
| E2E-13 | Export Excel button | Verify button exists and is clickable on each entity page |
| E2E-14 | Session expired alert | Navigate to `/login?error=SessionExpired`, verify alert message |
| E2E-15 | Sidebar navigation | Click each sidebar item, verify page loads |

### Priority 2 — Important Coverage (NICE TO HAVE)

| ID | Scenario | Description |
|----|----------|-------------|
| E2E-16 | Table search/filter | Type in search box, verify filtering works |
| E2E-17 | Column filter dropdowns | Select a filter value, verify table updates |
| E2E-18 | Pagination | Create enough data, verify pagination controls work |
| E2E-19 | Dark mode toggle | Click theme toggle, verify dark class is added to html |
| E2E-20 | Mobile viewport | Test sidebar collapse/expand on narrow viewport |
| E2E-21 | Edit Proveedor | Edit proveedor via dialog |
| E2E-22 | Edit Cliente | Edit cliente via dialog |
| E2E-23 | Edit Gasto | Edit gasto via dialog |
| E2E-24 | Delete confirm dialog cancel | Open delete dialog, cancel, verify entity not deleted |
| E2E-25 | Invalid form submission | Submit empty/invalid form in create dialog, verify validation errors |

---

## 6. Auth Flow Changes

### Current Auth Setup

The auth setup uses `getByLabel('Email')` and `getByLabel('Contraseña')`. The login form now uses:
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" ... />
<Label htmlFor="password">Contraseña</Label>
<Input id="password" ... />
```

This should still work with `getByLabel` because `<Label htmlFor="email">` creates a proper label association. The button text is still "Iniciar Sesión" (with loading state "Ingresando...").

### Session Timeout Feature

The login page now shows an amber alert when `?error=SessionExpired`:
```tsx
{sessionExpired && (
  <Alert className="mb-4 border-amber-200 bg-amber-50 ...">
    <Clock />
    <AlertDescription>Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.</AlertDescription>
  </Alert>
)}
```

This needs a test: navigate to `/login?error=SessionExpired` and verify the amber alert appears.

---

## 7. Playwright Config Assessment

### Current Config Issues

1. **No mobile project**: No mobile viewport testing despite mobile responsive being implemented
2. **No `timeout` setting**: Uses Playwright defaults (30s) which may be too short for CI with SQLite
3. **No `expect` timeout**: Default 5s may be tight for client-rendered content
4. **No screenshot on failure**: Not configured
5. **`webServer.command`**: Uses `npm run dev` — correct for dev but should use `next build && next start` in CI
6. **Missing `proveedores` in project match**: The `authenticated` project regex `(dashboard|lotes|ventas|clientes|gastos)` doesn't include `proveedores`

### Recommended Config Updates

```typescript
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'unauthenticated', testMatch: /auth-(login|invalid|redirect)\.spec\.ts/ },
  { name: 'authenticated', 
    testMatch: /(dashboard|lotes|ventas|clientes|gastos|proveedores)\.spec\.ts/,
    dependencies: ['setup'],
    use: { storageState: '.auth/admin.json' }
  },
  // Optional: mobile project
  { name: 'mobile', 
    testMatch: /(dashboard|lotes|ventas|clientes|gastos|proveedores)\.spec\.ts/,
    dependencies: ['setup'],
    use: { 
      storageState: '.auth/admin.json',
      viewport: { width: 375, height: 667 },
      isMobile: true,
    }
  },
],
```

---

## 8. Database Seed Assessment

The current seed creates:
- 1 admin user (`admin@riquesos.com` / `admin123`)
- 2 Proveedores (Doble Crema, Semisalado)

It does NOT create:
- Any Lotes (empty state)
- Any Clientes (empty state)
- Any Ventas (empty state)
- Any Gastos (empty state)

This means:
- All entity pages show empty state
- Dashboard shows zeros for all metrics
- No charts have data
- No alerts are triggered

**For CRUD and feature testing, the seed needs enrichment** or tests need to create data via the UI before asserting.

---

## 9. Estimated Scope

### Phase 1 — Fix Broken Tests (1-2 hours)
- Fix 4 failing selectors (auth-invalid, lotes, ventas, gastos)
- Add Proveedores nav link assertion to dashboard
- Update auth.setup.ts if needed
- Verify all existing tests pass

### Phase 2 — Essential New Tests (4-6 hours)
- Proveedores page test (new entity)
- CRUD create tests for each entity (5 dialogs)
- Soft delete + restore test (at least one entity)
- Edit entity test (at least one entity)
- Dashboard period selector test
- Dashboard charts render test
- Session expired alert test
- Sidebar navigation test (all items)

### Phase 3 — Extended Coverage (3-4 hours)
- Search/filter tests
- Pagination tests
- Dark mode toggle test
- Mobile viewport tests
- Export button existence test
- Invalid form submission tests
- Delete confirm cancel test

### Total Estimated Effort: 8-12 hours

---

## 10. Files to Modify/Create

| Action | Path | Description |
|--------|------|-------------|
| MODIFY | `e2e/tests/auth-invalid.spec.ts` | Fix error alert selector |
| MODIFY | `e2e/tests/dashboard.spec.ts` | Add Proveedores nav assertion, expand metric coverage |
| MODIFY | `e2e/tests/lotes.spec.ts` | Fix empty state text, add CRUD tests |
| MODIFY | `e2e/tests/ventas.spec.ts` | Fix empty state text, add CRUD tests |
| MODIFY | `e2e/tests/clientes.spec.ts` | Add CRUD tests |
| MODIFY | `e2e/tests/gastos.spec.ts` | Fix empty state text, add CRUD tests |
| MODIFY | `playwright.config.ts` | Add proveedores to testMatch, add mobile project |
| CREATE | `e2e/tests/proveedores.spec.ts` | New entity page tests |
| CREATE | `e2e/tests/crud.spec.ts` | (or inline in each entity file) CRUD flow tests |
| CREATE | `e2e/tests/dashboard-enhanced.spec.ts` | Period selector, charts, alerts, export |
| MODIFY | `e2e/tests/auth-redirect.spec.ts` | Add proveedores route redirect test |
| MODIFY | `e2e/auth.setup.ts` | Consider waiting for client hydration more robustly |

---

## 11. Key Technical Notes

1. **All entity pages are now `'use client'` components** — headings and content render client-side. Tests must wait for hydration. Use `await expect()` with appropriate timeouts rather than immediate assertions.

2. **Dialog-based CRUD** — All create/edit/delete operations happen in shadcn Dialog components. Tests need to:
   - Click a button to open the dialog
   - Fill form fields within the dialog
   - Submit and wait for the dialog to close
   - Verify the table updates

3. **Server Actions for mutations** — Forms use Server Actions with `FormData`. After form submission, the page revalidates. Tests should wait for:
   - Toast notifications (sonner): `await expect(page.getByText('Lote creado exitosamente')).toBeVisible()`
   - Table content update
   - Dialog close

4. **Soft delete UI** — The "Mostrar eliminados" checkbox calls a server action to fetch deleted records. Tests need to:
   - Toggle the checkbox
   - Wait for data refresh
   - Verify deleted records appear/disappear

5. **Period selector** — Uses `getVentasByDateRange` and `getGastosByDateRange` server actions. Changing the month/year triggers a loading state. Tests should wait for:
   - Loading message to appear/disappear
   - Table data to update

6. **Sidebar navigation** — Uses shadcn Sidebar components. On mobile, the sidebar may be collapsed by default. Tests on desktop viewport should be fine.
