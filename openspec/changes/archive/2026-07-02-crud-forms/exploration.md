# Exploration: CRUD Forms for Pagina-Riquesos

**Change**: crud-forms
**Date**: 2026-07-01
**Status**: Complete

---

## 1. Current UI State

### 1.1 Dashboard Layout

- `src/app/(dashboard)/layout.tsx` — Client component with `SidebarProvider`, `AppSidebar`, `SidebarInset`, breadcrumbs. All routes under `(dashboard)/` share this shell.
- Sidebar nav items: Dashboard (`/`), Lotes (`/lotes`), Ventas (`/ventas`), Clientes (`/clientes`), Gastos Fijos (`/gastos`).

### 1.2 List Pages (All Read-Only)

Each page follows the same pattern:
1. Server Component that calls `getServerSession` + redirects if unauthenticated
2. Fetches data via Server Action
3. Renders `h1` title + `p` subtitle
4. Renders `Card` > `CardContent` > `DataTable` with static column definitions
5. No "Create" or "Edit" buttons exist anywhere
6. No action columns in tables (no edit/delete buttons)

| Page | File | Data Source | Columns |
|------|------|-------------|---------|
| Dashboard | `src/app/(dashboard)/page.tsx` | `getMetricas()`, `getLotes()` | MetricCards + 2 DataTables + Active Lotes table |
| Lotes | `src/app/(dashboard)/lotes/page.tsx` | `getLotes()` | producto, proveedorId, cantidadCompradaKg, precioCompraBaseKg, costoRealCalculadoKg, stockDisponibleKg, estado |
| Clientes | `src/app/(dashboard)/clientes/page.tsx` | `getClientes()` | nombre, tipo (Badge), precioDobleCrema, precioSemisalado |
| Ventas | `src/app/(dashboard)/ventas/page.tsx` | `getVentas()` | fecha, clienteId, loteId, cantidadVendidaKg, precioVentaKg, ingresoTotal, gananciaBruta |
| Gastos | `src/app/(dashboard)/gastos/page.tsx` | `getGastos()` | concepto, valor, fecha + footerRow with total |

### 1.3 Login Page

- `src/app/login/page.tsx` — Client component using `useState` for form state, `next-auth/react` `signIn`. Uses shadcn `Card`, `Input`, `Label`, `Button`, `Alert`.
- This is the ONLY form in the app currently. It uses controlled React state, NOT Server Actions.

### 1.4 Components

- `src/components/data-table.tsx` — Generic `DataTable<TData, TValue>` using `@tanstack/react-table`. Supports sorting and optional `footerRow`. No row actions or selection.
- `src/components/dashboard-metric-card.tsx` — Simple presentational card.
- `src/components/app-sidebar.tsx` — Sidebar navigation.

### 1.5 shadcn/ui Components Available

`src/components/ui/`: alert, avatar, badge, breadcrumb, button, card, dropdown-menu, input, label, separator, sheet, sidebar, skeleton, sonner, table, tooltip.

**Missing**: dialog, select, textarea, form, tabs, popover, command, calendar.

---

## 2. Server Actions Inventory

### 2.1 Lotes (`src/presentation/actions/lotes.ts`)

| Action | Signature | Notes |
|--------|-----------|-------|
| `crearLote` | `(formData: FormData) → { success, lote? }` | Takes `producto`, `proveedorId`, `cantidadCompradaKg`, `precioCompraBaseKg`, `costoFlete?`, `costoTajado?`, `costoEmpaques?` |
| `getLotes` | `() → { success, lotes }` | Fetches active lotes |
| `getLoteById` | `(id: string) → { success, lote? }` | Single lote fetch |

**Key**: `crearLote` accepts `FormData` — designed for native HTML form submission with `action` prop. No update/delete action exists.

### 2.2 Clientes (`src/presentation/actions/clientes.ts`)

| Action | Signature | Notes |
|--------|-----------|-------|
| `crearCliente` | `(formData: FormData) → { success, cliente? }` | `nombre`, `tipo`, `precioDobleCrema?`, `precioSemisalado?` |
| `actualizarCliente` | `(formData: FormData) → { success, cliente? }` | `id`, `nombre?`, `precioDobleCrema?`, `precioSemisalado?` |
| `eliminarCliente` | `(formData: FormData) → { success }` | `id` |
| `getClientes` | `() → { success, clientes }` | All clients |
| `getClienteById` | `(id: string) → { success, cliente? }` | Single client |

**Key**: Full CRUD available. All mutations accept `FormData`.

### 2.3 Ventas (`src/presentation/actions/ventas.ts`)

| Action | Signature | Notes |
|--------|-----------|-------|
| `registrarVenta` | `(formData: FormData) → { success, venta? }` | `clienteId`, `loteId`, `cantidadVendidaKg`, `standardPricePerKg`, `valorDomicilio?`, `domiciliario?` |
| `getVentas` | `() → { success, ventas }` | Current month |
| `getVentasByDateRange` | `(inicio, fin) → { success, ventas }` | Custom range |

**Key**: Venta is immutable (no update/delete). `standardPricePerKg` is a required field — the UI needs to provide the standard price, and the use case resolves the actual price based on client type.

### 2.4 Gastos (`src/presentation/actions/gastos.ts`)

| Action | Signature | Notes |
|--------|-----------|-------|
| `crearGasto` | `(formData: FormData) → { success, gasto? }` | `concepto`, `valor` |
| `actualizarGasto` | `(formData: FormData) → { success, gasto? }` | `id`, `concepto?`, `valor?` |
| `eliminarGasto` | `(formData: FormData) → { success }` | `id` |
| `getGastos` | `() → { success, gastos }` | All gastos |
| `getResumenMensual` | `(inicio, fin) → { success, resumen? }` | Monthly summary |

**Key**: Full CRUD available. `fecha` is auto-set to `new Date()` on creation.

### 2.5 Proveedores — **NO SERVER ACTION EXISTS**

- Domain entity: `src/domain/entities/Proveedor.ts` — `nombre`, `telefono`
- Repository: `src/domain/ports/ProveedorRepository.ts` — `findById`, `findAll`, `save`, `delete`
- Infrastructure: `src/infrastructure/repositories/PrismaProveedorRepo.ts` — fully implemented
- **Missing**: `src/presentation/actions/proveedores.ts` and corresponding use case
- **Missing**: `src/presentation/dtos/proveedor.dto.ts`

---

## 3. DTOs Summary

| DTO | Fields |
|-----|--------|
| `CrearLoteRequest` | `producto: TipoProducto`, `proveedorId: string`, `cantidadCompradaKg: string`, `precioCompraBaseKg: string`, `costoFlete?: string`, `costoTajado?: string`, `costoEmpaques?: string` |
| `LoteResponse` | `id, producto, fechaIngreso, proveedorId, cantidadCompradaKg, precioCompraBaseKg, costoFlete, costoTajado, costoEmpaques, costoRealCalculadoKg, stockDisponibleKg, estado, version` |
| `CrearClienteRequest` | `nombre: string`, `tipo: TipoCliente`, `precioDobleCrema?: string`, `precioSemisalado?: string` |
| `ActualizarClienteRequest` | `id: string`, `nombre?: string`, `precioDobleCrema?: string`, `precioSemisalado?: string` |
| `ClienteResponse` | `id, nombre, tipo, precioDobleCrema (string|null), precioSemisalado (string|null)` |
| `RegistrarVentaRequest` | `clienteId: string`, `loteId: string`, `cantidadVendidaKg: string`, `standardPricePerKg: string`, `valorDomicilio?: string`, `domiciliario?: string` |
| `VentaResponse` | `id, fecha, clienteId, loteId, cantidadVendidaKg, precioVentaKg, ingresoTotal, costoAplicado, gananciaBruta, valorDomicilio, domiciliario` |
| `CrearGastoRequest` | `concepto: string`, `valor: string` |
| `ActualizarGastoRequest` | `id: string`, `concepto?: string`, `valor?: string` |
| `GastoResponse` | `id, fecha, concepto, valor` |

---

## 4. Domain Validation Rules

| Entity | Validation |
|--------|-----------|
| **Lote** | `proveedorId` required; `cantidadCompradaKg` cannot be zero; `precioCompraBaseKg` cannot be negative; `costoRealCalculadoKg` is auto-computed: `(precioBase × cantidad + flete + tajado + empaques) / cantidad` |
| **Cliente** | `nombre` required (non-empty); `tipo` must be valid `TipoCliente` enum; MAYORISTA can have custom `precioDobleCrema`/`precioSemisalado`; MINORISTA always uses standard price |
| **Venta** | `clienteId` required; `loteId` required; `cantidadVendidaKg` cannot be zero; `precioVentaKg` cannot be negative; IMMUTABLE (no update/delete); uses optimistic concurrency (3 retries) |
| **GastoFijo** | `concepto` required (non-empty); `valor` cannot be negative; `fecha` auto-set on creation |
| **Proveedor** | `nombre` required (non-empty); `telefono` optional |

### Domain Enums

```typescript
enum TipoProducto { DOBLE_CREMA, SEMISALADO }
enum TipoCliente { MAYORISTA, MINORISTA }
enum EstadoLote { ACTIVO, AGOTADO }
enum RolUsuario { ADMIN, USER }
```

---

## 5. Form Pattern Analysis

### 5.1 Current Server Action Pattern: Native FormData

ALL existing mutation actions accept `FormData` as the parameter, not typed objects. This is a deliberate design choice for Next.js Server Actions:

```typescript
export async function crearLote(formData: FormData) {
  const request: CrearLoteRequest = {
    producto: formData.get('producto') as TipoProducto,
    proveedorId: formData.get('proveedorId') as string,
    // ...
  };
}
```

This means the **simplest integration path** is native HTML `<form action={crearLote}>` with named `<input>` fields. No client-side state management is required for the basic case.

### 5.2 Form Approach Comparison

| Approach | Pros | Cons | Fit |
|----------|------|------|-----|
| **Native HTML form + action prop** | Simplest; works with RSC; zero client JS; progressive enhancement; matches existing action signatures | No client-side validation; limited UX (no real-time feedback, no dependent field calculations); FormData typing is unsafe (casts) | Good for simple forms (GastoFijo, Proveedor) |
| **react-hook-form + zod** | Robust validation; client-side feedback; TypeScript-safe; can handle complex interdependent fields | Additional deps needed; more boilerplate; need to bridge with Server Actions (either via FormData or `useFormState`) | Best for Lote (cost calculations), Venta (price resolution), Cliente (conditional fields) |
| **Conform** | Server-first; validates with zod on server; progressive enhancement; great DX for Server Actions | Newer library; smaller community; might conflict with existing FormData patterns | Good fit but would require refactoring existing action signatures |

**Recommendation**: Use a **hybrid approach**:
- Simple forms (GastoFijo, Proveedor): Native HTML `<form action={...}>` with basic client-side validation
- Complex forms (Lote, Cliente, Venta): `react-hook-form` + `zod` for client-side validation and interdependent field logic, submitting via Server Action with `useFormState` or wrapping in `startTransition`

### 5.3 Dialog vs Sheet vs Page Routes

| Pattern | Pros | Cons | Fit |
|---------|------|------|-----|
| **Dialog (Modal)** | Familiar UX; good for simple forms; context-preserving | Can feel cramped for complex forms; scrolling issues on mobile | Good for GastoFijo, simple edit forms |
| **Sheet (Side panel)** | Good use of horizontal space; doesn't block full screen; already in the project (`sheet.tsx`) | Can feel detached; limited width on desktop | Good for medium complexity forms |
| **Separate page routes** | Full page real estate; back button works naturally; easy to bookmark | Navigation away from list; need to implement back/redirect | Good for Lote (many fields + cost preview) and Venta (multi-step feel) |

**Recommendation**:
- **GastoFijo** and **Proveedor**: Dialog (simple 2-field forms)
- **Cliente**: Sheet (conditional fields for MAYORISTA pricing)
- **Lote**: Sheet or separate route (5+ fields, cost preview calculation)
- **Venta**: Sheet (requires dependent selects for client/lote, price preview)

The project already has `sheet.tsx` from shadcn, but does NOT have `dialog.tsx`. We'd need to install the Dialog component.

### 5.4 Key UX Considerations

1. **Lote Creation**: Needs a "cost calculator" preview — as the user fills in precioCompraBaseKg, cantidadCompradaKg, costoFlete, costoTajado, costoEmpaques, show the computed `costoRealCalculadoKg` in real-time. This requires client-side JS.

2. **Venta Registration**: Price resolution depends on client type (MAYORISTA uses custom price, MINORISTA uses standard). The form needs:
   - Select a client → determine client type
   - Select a lote → determine product type and available stock
   - Show the resolved price per Kg (or allow override for MINORISTA)
   - Show available stock for the selected lote
   - This is a complex dependent-fields scenario.

3. **Cliente Creation/Edit**: When `tipo = MAYORISTA`, show `precioDobleCrema` and `precioSemisalado` fields. When `tipo = MINORISTA`, hide them. This is a conditional field pattern.

4. **Proveedor Management**: No Server Action exists yet. Need to create it before building UI.

---

## 6. Missing Infrastructure

### 6.1 Proveedor Server Action (Required)

No `src/presentation/actions/proveedores.ts` exists. The Lote creation form needs to select a Proveedor from a dropdown. Options:
- **Option A**: Create a full Proveedor CRUD (Server Action + use case + DTO) — most complete
- **Option B**: Create only a `getProveedores()` read action — minimal, enough for the Lote form dropdown; manage Proveedores through Prisma Studio or seed

Given the context (cheese distributor backoffice), Option A is better — the user needs to add/remove Proveedores over time.

### 6.2 shadcn/ui Components to Install

Currently missing but needed:
- `dialog` — for GastoFijo and Proveedor forms
- `select` — for TipoProducto, TipoCliente, Proveedor, Cliente, Lote dropdowns
- `form` — shadcn's form wrapper (uses react-hook-form under the hood)
- `textarea` — potentially for domiciliario field
- `popover` + `command` — for searchable selects (clients, lotes)
- `calendar` + `popover` — for date range filters on Ventas page (future)

### 6.3 Additional Dependencies Needed

- `react-hook-form` — form state management
- `@hookform/resolvers` — for zod schema validation
- `zod` — schema validation (currently NOT in package.json)

---

## 7. Forms Needed — Detailed Breakdown

### 7.1 Lote Creation Form

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| producto | Select (TipoProducto) | Yes | DOBLE_CREMA or SEMISALADO |
| proveedorId | Select (Proveedor) | Yes | Needs `getProveedores()` action |
| cantidadCompradaKg | Number input | Yes | Must be > 0 |
| precioCompraBaseKg | Number input | Yes | Must be >= 0 |
| costoFlete | Number input | No | Defaults to 0 |
| costoTajado | Number input | No | Defaults to 0 |
| costoEmpaques | Number input | No | Defaults to 0 |

**Computed Preview**: `costoRealCalculadoKg = (precioBase × cantidad + flete + tajado + empaques) / cantidad`

**Action**: `crearLote(formData)` — no update action exists yet

### 7.2 Cliente Creation/Edit Form

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| nombre | Text input | Yes | Non-empty string |
| tipo | Select (TipoCliente) | Yes | MAYORISTA or MINORISTA |
| precioDobleCrema | Number input | Conditional | Shown only when tipo = MAYORISTA |
| precioSemisalado | Number input | Conditional | Shown only when tipo = MAYORISTA |

**Actions**: `crearCliente(formData)`, `actualizarCliente(formData)`, `eliminarCliente(formData)`

### 7.3 Venta Registration Form

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| clienteId | Select (Cliente) | Yes | Searchable dropdown |
| loteId | Select (Lote) | Yes | Only ACTIVO lotes; show available stock |
| cantidadVendidaKg | Number input | Yes | Must be > 0 and <= selected lote's stock |
| standardPricePerKg | Number input | Yes | Standard price per Kg |
| valorDomicilio | Number input | No | Delivery cost |
| domiciliario | Text input | No | Delivery person name |

**Computed Preview**: After selecting client + lote, show resolved `precioVentaKg` (based on client type and custom prices)

**Action**: `registrarVenta(formData)` — Venta is immutable, no edit/delete

### 7.4 GastoFijo Creation/Edit Form

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| concepto | Text input | Yes | Non-empty string |
| valor | Number input | Yes | Must be >= 0 |

**Actions**: `crearGasto(formData)`, `actualizarGasto(formData)`, `eliminarGasto(formData)`

### 7.5 Proveedor Creation/Edit Form (NEW)

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| nombre | Text input | Yes | Non-empty string |
| telefono | Text input | No | Optional phone number |

**Actions**: NEED TO CREATE — `crearProveedor(formData)`, `actualizarProveedor(formData)`, `eliminarProveedor(formData)`, `getProveedores()`, `getProveedorById()`

---

## 8. Architecture Decisions to Make

### 8.1 Client vs Server Components for Forms

All form pages are currently **Server Components** (no `'use client'`). Forms need `'use client'` for interactivity (state, validation, conditional fields). Options:
- **Option A**: Create separate client form components (e.g., `LoteForm.tsx`, `ClienteForm.tsx`) and embed them in Server Component pages
- **Option B**: Convert pages to client components (loses RSC benefits)

**Recommendation**: Option A — keep pages as Server Components for data fetching, extract forms into Client Components. This is the standard Next.js App Router pattern.

### 8.2 Toast Notifications for Success/Error

The project already has `sonner.tsx` in `src/components/ui/`. Use `toast` from `sonner` for success/error notifications after Server Action calls.

### 8.3 Optimistic Updates vs Full Revalidation

Current actions use `revalidatePath` after mutations. This is sufficient — no need for optimistic updates in a backoffice app. The data refreshes after the action completes.

### 8.4 Delete Confirmation

For `eliminarCliente` and `eliminarGasto`, a confirmation dialog should be shown before deletion. Will need the Dialog component or a custom confirm approach.

---

## 9. Summary of Gaps

1. **No form UI exists** — all pages are read-only DataTable views
2. **No Proveedor Server Action** — needed for Lote creation dropdown
3. **No Proveedor DTO** — needed for Proveedor CRUD
4. **No Proveedor use case** — needed for Proveedor management (repository exists)
5. **Missing shadcn components**: dialog, select, form, textarea, popover, command
6. **Missing npm dependencies**: zod, react-hook-form, @hookform/resolvers
7. **No update/delete for Lotes** — only `crearLote` exists (Lote status transition is via stock deduction, but no explicit "edit lote" action)
8. **No "add" buttons** on any list page
9. **No action columns** in DataTable (no edit/delete row actions)
10. **No form state management pattern** established yet

---

## 10. Recommended Implementation Order

1. **Install dependencies**: `zod`, `react-hook-form`, `@hookform/resolvers`, shadcn `dialog`, `select`, `form`
2. **Create Proveedor CRUD**: Server Action + use case + DTO
3. **Build GastoFijo form** (simplest — good starting point to establish patterns)
4. **Build Cliente form** (introduces conditional fields)
5. **Build Lote form** (introduces computed fields + Proveedor dropdown)
6. **Build Venta form** (most complex — dependent selects + price resolution)
7. **Add DataTable action columns** (edit/delete buttons)
8. **Add "Create" buttons** to each list page header
