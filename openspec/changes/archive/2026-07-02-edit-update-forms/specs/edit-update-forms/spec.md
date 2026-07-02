# Spec: edit-update-forms

**Version:** 1.0 | **Date:** 2026-07-01

---

## FR-01: Edit Cliente

**Given** a user viewing the Clientes list page, **when** they click the edit action on a row, **then** an Edit Dialog opens pre-populated with the client's current nombre, precioDobleCrema, and precioSemisalado. The tipo field SHALL be displayed as read-only (immutable).

**Given** an open Edit Cliente Dialog, **when** the user submits valid data, **then** the system SHALL validate via `actualizarClienteSchema` (id required, nombre optional non-empty string, precios optional non-negative numbers), update the record, close the Dialog, and show a success toast. On validation failure, an error message SHALL be shown inline.

## FR-02: Edit GastoFijo

**Given** a user viewing the Gastos list page, **when** they click the edit action, **then** an Edit Dialog opens pre-populated with concepto and valor. The fecha field SHALL be read-only (immutable creation timestamp).

**Given** an open Edit GastoFijo Dialog, **when** the user submits valid data, **then** the system SHALL validate via `actualizarGastoFijoSchema` (id required, concepto optional non-empty string, valor optional non-negative number), update the record, close the Dialog, and show a success toast.

## FR-03: Edit Proveedor

**Given** a user viewing the Proveedores list page, **when** they click the edit action, **then** an Edit Dialog opens pre-populated with nombre and telefono.

**Given** an open Edit Proveedor Dialog, **when** the user submits valid data, **then** the system SHALL validate via `actualizarProveedorSchema` (id required, nombre optional non-empty string, telefono optional string), delegate to `GestionarProveedores.actualizar()`, close the Dialog, and show a success toast. The use case and Server Action MUST be created as they do not yet exist.

## FR-04: Edit Lote (Cost Correction)

**Given** a user viewing the Lotes list page, **when** they click the edit action, **then** an Edit Dialog opens pre-populated with editable cost fields only: precioCompraBaseKg, cantidadCompradaKg, costoFlete, costoTajado, costoEmpaques. The fields producto and proveedorId SHALL be displayed as read-only (immutable). A hidden `version` field SHALL track the current version for optimistic locking.

**Given** an open Edit Lote Dialog, **when** the user submits valid data, **then** the system SHALL validate via `actualizarLoteSchema` (id + version required, cost fields optional non-negative numbers, cantidadCompradaKg optional positive number), delegate to the new `ModificarLote` use case which SHALL: (1) fetch the Lote, (2) verify version matches, (3) call `lote.updateCosts()` which returns a new Lote with recalculated `costoRealCalculadoKg`, (4) save with version increment. On version mismatch, a `ConcurrencyError` SHALL be caught and a user-friendly Spanish error message displayed.

## FR-05: Delete with Confirmation

**Given** a user viewing any of the four list pages, **when** they click the delete action, **then** a confirmation AlertDialog SHALL appear with "¿Estás seguro?" message and Cancel/Confirm buttons.

**Given** a confirmed delete, **when** the Server Action succeeds, **then** the list SHALL be revalidated and the row removed. **When** a Prisma FK constraint error occurs (P2003 or P2016), the system SHALL catch it and display a user-friendly Spanish message (e.g., "No se puede eliminar un proveedor con lotes asociados"). GastoFijo deletes have no FK constraints and SHALL always succeed if the record exists.

## FR-06: DataTable Action Columns

**Given** any of the four list pages (Clientes, Gastos, Proveedores, Lotes), **when** rendered, **then** each DataTable SHALL display an Actions column with a Pencil icon (edit) and Trash2 icon (delete). Edit opens the entity's Edit Dialog. Delete opens the confirmation AlertDialog. The Venta list page is excluded.

## FR-07: Zod Validation for Updates

**Given** any update Server Action (actualizarCliente, actualizarGasto, actualizarProveedor, modificarLote), **when** called, **then** the action SHALL validate input via a dedicated Zod schema BEFORE processing. Existing update actions (actualizarCliente, actualizarGasto) that currently parse FormData raw MUST be refactored to use Zod schemas. Update schemas SHALL differ from create schemas where field rules differ (e.g., tipo excluded from Cliente update, version required for Lote update).

---

## Non-Functional Requirements

- NFR-01: All error messages displayed to users SHALL be in Spanish.
- NFR-02: Edit Dialogs SHALL match the visual style and structure of existing CrearDialogs.
- NFR-03: The Actions column SHALL use lucide-react icons (Pencil, Trash2).