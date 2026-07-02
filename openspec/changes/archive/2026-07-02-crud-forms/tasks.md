# Tasks: crud-forms

**Change**: crud-forms
**Date**: 2026-07-01

---

## Review Workload Forecast

- Estimated changed lines: 500-800
- 400-line budget risk: Medium-High
- Delivery strategy: size:exception (approved for UI changes)
- Chained PRs recommended: No
- Decision needed before apply: No (size:exception approved)

---

## Phase 1: Proveedor Infrastructure

- [x] 1.1 Create `src/presentation/dtos/proveedor.dto.ts` with `CrearProveedorRequest` and `ProveedorResponse` types
- [x] 1.2 Create `src/application/use-cases/GestionarProveedores.ts` with `crear()`, `obtenerTodos()`, `obtenerPorId()` methods (pattern: `GestionarClientes.ts`)
- [x] 1.3 Create `src/presentation/validations/proveedor.schema.ts` with zod schema for Proveedor creation
- [x] 1.4 Create `src/presentation/actions/proveedores.ts` with `crearProveedor`, `getProveedores`, `getProveedorById` Server Actions (pattern: `gastos.ts`)
- [x] 1.5 Add `ProveedorResponse` to `src/presentation/dtos/index.ts` barrel export

## Phase 2: Validation Schemas

- [x] 2.1 Create `src/presentation/validations/lote.schema.ts` with zod schema for Lote creation (producto enum, proveedorId required, cantidadCompradaKg positive, precioCompraBaseKg non-negative, optional cost fields)
- [x] 2.2 Create `src/presentation/validations/cliente.schema.ts` with zod schema for Cliente creation (nombre required, tipo enum, conditional precio fields)
- [x] 2.3 Create `src/presentation/validations/venta.schema.ts` with zod schema for Venta registration (clienteId, loteId, cantidadVendidaKg, standardPricePerKg required)
- [x] 2.4 Create `src/presentation/validations/gasto-fijo.schema.ts` with zod schema for GastoFijo creation (concepto required, valor non-negative)
- [x] 2.5 Add zod validation to existing Server Actions: `crearLote`, `crearCliente`, `registrarVenta`, `crearGasto` — parse FormData with schema before constructing request

## Phase 3: Dependencies & shadcn Components

- [x] 3.1 Install `zod` dependency (`npm install zod`)
- [x] 3.2 Install shadcn `dialog` component (`npx shadcn@latest add dialog`)
- [x] 3.3 Install shadcn `select` component (`npx shadcn@latest add select`)

## Phase 4: Form Components

- [x] 4.1 Create `src/components/forms/crear-proveedor-dialog.tsx` — Client Component with Dialog, nombre input, telefono input, form action={crearProveedor}
- [x] 4.2 Create `src/components/forms/crear-gasto-fijo-dialog.tsx` — Client Component with Dialog, concepto input, valor input, form action={crearGasto}
- [x] 4.3 Create `src/components/forms/crear-cliente-dialog.tsx` — Client Component with Dialog, nombre input, tipo select (MAYORISTA/MINORISTA), conditional precio fields, form action={crearCliente}
- [x] 4.4 Create `src/components/forms/crear-lote-dialog.tsx` — Client Component with Dialog, producto select, proveedor select (props), cantidad/precio inputs, optional cost inputs, computed costoRealCalculadoKg preview, form action={crearLote}
- [x] 4.5 Create `src/components/forms/registrar-venta-dialog.tsx` — Client Component with Dialog, cliente select (props), lote select (props — filtered ACTIVO), cantidad input, precio input, domicilio fields, computed precio resuelto preview, form action={registrarVenta}

## Phase 5: Page Integration

- [x] 5.1 Create `src/app/(dashboard)/proveedores/page.tsx` — Server Component with Proveedor list DataTable + "Agregar Proveedor" button + CrearProveedorDialog
- [x] 5.2 Add Proveedores nav item to `src/components/app-sidebar.tsx`
- [x] 5.3 Modify `src/app/(dashboard)/lotes/page.tsx` — Add "Agregar Lote" button + CrearLoteDialog with proveedores prop
- [x] 5.4 Modify `src/app/(dashboard)/clientes/page.tsx` — Add "Agregar Cliente" button + CrearClienteDialog
- [x] 5.5 Modify `src/app/(dashboard)/ventas/page.tsx` — Add "Registrar Venta" button + RegistrarVentaDialog with clientes and lotes props
- [x] 5.6 Modify `src/app/(dashboard)/gastos/page.tsx` — Add "Agregar Gasto" button + CrearGastoFijoDialog

## Phase 6: Testing & Verification

- [x] 6.1 Verify all forms submit correctly via Server Actions (manual browser testing)
- [x] 6.2 Verify zod validation errors display via toast for each form
- [x] 6.3 Verify Proveedor CRUD works end-to-end (create, list)
- [x] 6.4 Verify "Agregar" buttons appear on all 5 list pages
- [x] 6.5 Verify computed previews work (Lote cost, Venta price)
- [x] 6.6 Run `npm run build` to confirm no type errors