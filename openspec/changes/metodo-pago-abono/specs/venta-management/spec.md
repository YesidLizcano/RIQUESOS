# Delta for Venta Management

## MODIFIED Requirements

### Requirement: Atomic Sale Registration

The system SHALL register a Venta as an atomic transaction. The system MUST validate stock availability, calculate financials, deduct stock, and persist the Venta — all or nothing. When `metodoPago === 'CREDITO'` and `abono > 0`, the system MUST also validate that `metodoPagoAbono` is provided and is one of `EFECTIVO | NEQUI | BRE_B`.
(Previously: Atomic registration did not validate metodoPagoAbono)

#### Scenario: Successful sale registration

- GIVEN a Lote with sufficient stock and a valid Cliente
- WHEN registering a Venta with a specified quantity
- THEN the Venta is persisted, stock is deducted, and financials are calculated

#### Scenario: Rollback on stock validation failure

- GIVEN a Lote with insufficient stock
- WHEN registering a Venta
- THEN the system MUST reject the Venta and MUST NOT deduct stock or persist any record

#### Scenario: CREDITO venta with abono requires metodoPagoAbono

- GIVEN a valid Venta with metodoPago=CREDITO and abono > 0
- WHEN registering the Venta without metodoPagoAbono
- THEN the system MUST reject the Venta with a validation error

#### Scenario: CREDITO venta with abono and valid metodoPagoAbono succeeds

- GIVEN a valid Venta with metodoPago=CREDITO, abono=20000, metodoPagoAbono=EFECTIVO
- WHEN registering the Venta
- THEN the Venta is persisted with metodoPagoAbono=EFECTIVO

### Requirement: Venta Immutability

The system MUST NOT allow modification or deletion of a registered Venta. Corrections SHALL be handled via separate adjustment records (out of scope for initial scaffold). The exception is `metodoPagoAbono`: editing a CREDITO Venta MAY update `metodoPagoAbono`.
(Previously: Venta was fully immutable with no exceptions)

#### Scenario: Reject Venta update

- GIVEN an existing Venta
- WHEN attempting to modify its financial fields
- THEN the system MUST reject the request with an immutability error

#### Scenario: Update metodoPagoAbono on CREDITO Venta

- GIVEN an existing CREDITO Venta with metodoPagoAbono=EFECTIVO
- WHEN editing the Venta to set metodoPagoAbono=NEQUI
- THEN the system MUST persist the updated metodoPagoAbono

## ADDED Requirements

### Requirement: EditarVenta Supports metodoPagoAbono

The `EditarVenta` use case SHALL accept `metodoPagoAbono` as an optional input. When the Venta's `metodoPago === 'CREDITO'` and `abono > 0`, `metodoPagoAbono` MUST be provided and valid. When `metodoPago !== 'CREDITO'` or `abono === 0`, `metodoPagoAbono` MUST be set to null.

#### Scenario: Edit metodoPagoAbono on CREDITO Venta

- GIVEN an existing CREDITO Venta with abono=20000 and metodoPagoAbono=EFECTIVO
- WHEN editing with metodoPagoAbono=NEQUI
- THEN the Venta is updated with metodoPagoAbono=NEQUI

#### Scenario: Clear metodoPagoAbono when metodoPago changes away from CREDITO

- GIVEN an existing CREDITO Venta with metodoPagoAbono=NEQUI
- WHEN editing to change metodoPago to EFECTIVO
- THEN metodoPagoAbono is set to null