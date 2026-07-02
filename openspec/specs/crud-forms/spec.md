# Spec: crud-forms

**Change**: crud-forms
**Date**: 2026-07-01

---

## FR-01: Form Creation — Lote

**Given** the user is on the Lotes page, **When** they click "Agregar Lote", **Then** a Dialog opens with fields: producto (Select: DOBLE_CREMA/SEMISALADO), proveedorId (Select populated from Proveedores), cantidadCompradaKg (number), precioCompraBaseKg (number), costoFlete (number, optional), costoTajado (number, optional), costoEmpaques (number, optional).

**Given** the Lote form is open, **When** the user fills all required fields and submits, **Then** the form calls `crearLote` Server Action via `action` prop, zod validates the request, and on success the dialog closes and the table refreshes via `revalidatePath`.

**Given** the user enters cost component values, **When** any cost or quantity field changes, **Then** a computed "Costo Real Calculado" preview displays: `(precioBase × cantidad + flete + tajado + empaques) / cantidad`.

**Given** the user submits invalid data, **When** zod validation fails, **Then** the Server Action returns `{ success: false, error: "..." }` and a toast displays the error message in Spanish.

## FR-02: Form Creation — Cliente

**Given** the user is on the Clientes page, **When** they click "Agregar Cliente", **Then** a Dialog opens with fields: nombre (text), tipo (Select: MAYORISTA/MINORISTA).

**Given** the Cliente form has tipo=MAYORISTA selected, **When** the user views the form, **Then** precioDobleCrema and precioSemisalado fields appear. **When** tipo=MINORISTA is selected, those fields SHALL be hidden.

**Given** the user submits with valid data, **When** the `crearCliente` action succeeds, **Then** the dialog closes and the table refreshes.

## FR-03: Form Creation — Venta

**Given** the user is on the Ventas page, **When** they click "Registrar Venta", **Then** a Dialog opens with fields: clienteId (Select from clients), loteId (Select from ACTIVO lotes), cantidadVendidaKg (number), standardPricePerKg (number), valorDomicilio (number, optional), domiciliario (text, optional).

**Given** the Venta form has a client and lote selected, **When** the user views the form, **Then** a computed "Precio Resuelto" preview displays based on client type and custom prices.

**Given** the user selects a lote, **When** the lote has limited stock, **Then** the form SHALL display available stock as a hint.

**Given** the user submits valid data, **When** `registrarVenta` succeeds, **Then** the dialog closes and the table refreshes.

## FR-04: Form Creation — GastoFijo

**Given** the user is on the Gastos page, **When** they click "Agregar Gasto", **Then** a Dialog opens with fields: concepto (text), valor (number).

**Given** the user submits valid data, **When** `crearGasto` succeeds, **Then** the dialog closes and the gastos table refreshes with the new entry. The `fecha` field is auto-set server-side.

## FR-05: Form Creation — Proveedor

**Given** the user is on a page with Proveedor management, **When** they click "Agregar Proveedor", **Then** a Dialog opens with fields: nombre (text, required), telefono (text, optional).

**Given** the user submits valid data, **When** `crearProveedor` succeeds, **Then** the dialog closes and the Proveedor list refreshes.

## FR-06: Zod Validation — Server-Side Schemas

Each Server Action MUST validate its FormData using a zod schema BEFORE delegating to the use case. Schemas SHALL produce error messages in Spanish. Required fields use `z.string().min(1, "El campo es obligatorio")`. Numeric fields use `z.coerce.number().positive("Debe ser un número positivo")`. Enum fields use `z.nativeEnum()`. Optional fields use `.optional()`.

## FR-07: Proveedor Infrastructure

The system SHALL provide `crearProveedor(formData)` Server Action, `GestionarProveedores` use case with `crear()`, `obtenerTodos()`, `obtenerPorId()` methods, and `CrearProveedorRequest`/`ProveedorResponse` DTOs. `PrismaProveedorRepo` already implements all required methods.

## FR-08: Navigation — Add Buttons

Each list page (Lotes, Clientes, Ventas, Gastos) MUST display an "Agregar" Button next to the page title. A Proveedores section or management point MUST be accessible. Clicking the button opens the corresponding creation Dialog.