# Metodo Pago Abono Specification

## Purpose

Track the payment method for the initial abono on CREDITO ventas, and route that money to the correct liquidity bucket (Efectivo or Bancos) in the dashboard.

## Requirements

### Requirement: metodoPagoAbono Field on Venta

The system SHALL add a `metodoPagoAbono` property to the Venta entity. Values MUST be one of: `EFECTIVO`, `NEQUI`, `BRE_B`. The field MUST be nullable — it is only meaningful when `metodoPago === 'CREDITO'` and `abono > 0`.

#### Scenario: CREDITO venta with abono sets metodoPagoAbono

- GIVEN a Venta with metodoPago=CREDITO and abono=20000
- WHEN the venta is registered
- THEN metodoPagoAbono MUST be set to EFECTIVO, NEQUI, or BRE_B

#### Scenario: Non-CREDITO venta ignores metodoPagoAbono

- GIVEN a Venta with metodoPago=EFECTIVO
- WHEN the venta is registered
- THEN metodoPagoAbono MUST be null/undefined

#### Scenario: CREDITO venta with zero abono has null metodoPagoAbono

- GIVEN a Venta with metodoPago=CREDITO and abono=0
- WHEN the venta is registered
- THEN metodoPagoAbono MUST be null/undefined

### Requirement: Prisma Schema Column

The system SHALL add `metodoPagoAbono String?` to the Venta model in the Prisma schema. A database migration MUST be created. The column MUST be nullable since non-CREDITO ventas do not use it.

#### Scenario: Migration adds nullable column

- GIVEN the existing Venta table
- WHEN the migration runs
- THEN metodoPagoAbono column is added as nullable String

### Requirement: Zod Validation for metodoPagoAbono

The `registrarVentaSchema` SHALL accept `metodoPagoAbono` as an optional field. It MUST be one of `EFECTIVO | NEQUI | BRE_B`. It MUST NOT accept `CREDITO` as a value. When `metodoPago === 'CREDITO'` and `abono > 0`, `metodoPagoAbono` MUST be provided. When `metodoPago !== 'CREDITO'` or `abono === 0`, `metodoPagoAbono` MUST be ignored.

#### Scenario: Valid CREDITO venta with abono and metodoPagoAbono

- GIVEN input with metodoPago=CREDITO, abono=20000, metodoPagoAbono=EFECTIVO
- WHEN validated
- THEN the schema passes validation

#### Scenario: CREDITO venta with abono but no metodoPagoAbono is rejected

- GIVEN input with metodoPago=CREDITO, abono=20000, metodoPagoAbono=undefined
- WHEN validated
- THEN the schema MUST reject with a validation error

#### Scenario: metodoPagoAbono set to CREDITO is rejected

- GIVEN input with metodoPagoAbono=CREDITO
- WHEN validated
- THEN the schema MUST reject the value

#### Scenario: EFECTIVO venta with metodoPagoAbono is ignored

- GIVEN input with metodoPago=EFECTIVO, metodoPagoAbono=NEQUI
- WHEN validated
- THEN metodoPagoAbono is stripped/ignored

### Requirement: Abono Payment Method Selector in UI

The registrar-venta-dialog MUST show a "Método de pago del Abono" selector when `metodoPago === 'CREDITO'` AND `abono > 0`. Options MUST be: Efectivo, Nequi, Bre-B. The field MUST be required when visible. When `metodoPago` changes away from CREDITO or `abono` drops to 0, the selector MUST be hidden and its value reset.

#### Scenario: Selector appears for CREDITO with abono

- GIVEN the user selects metodoPago=CREDITO and enters abono=20000
- WHEN the form renders
- THEN a "Método de pago del Abono" selector appears with Efectivo, Nequi, Bre-B options

#### Scenario: Selector hidden when metodoPago is not CREDITO

- GIVEN the user selects metodoPago=EFECTIVO
- WHEN the form renders
- THEN the "Método de pago del Abono" selector is not shown

#### Scenario: Selector hidden when abono is zero

- GIVEN the user selects metodoPago=CREDITO and enters abono=0
- WHEN the form renders
- THEN the "Método de pago del Abono" selector is not shown

#### Scenario: Selector resets when metodoPago changes

- GIVEN the user has metodoPago=CREDITO, abono=20000, metodoPagoAbono=NEQUI
- WHEN the user changes metodoPago to EFECTIVO
- THEN metodoPagoAbono is reset to null/undefined and the selector is hidden

### Requirement: Label Mapping for metodoPagoAbono

The system SHALL provide label mappings for `metodoPagoAbono` display: EFECTIVO → "Efectivo", NEQUI → "Nequi", BRE_B → "Bre-B".

#### Scenario: Display label for metodoPagoAbono

- GIVEN a Venta with metodoPagoAbono=NEQUI
- WHEN rendering the label
- THEN the system displays "Nequi"