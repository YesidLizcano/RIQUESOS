# Venta Management Specification

## Purpose

Register sales (Ventas) atomically: validate stock, calculate revenue/cost/profit, deduct inventory from Lotes.

## Requirements

### Requirement: Atomic Sale Registration

The system SHALL register a Venta as an atomic transaction. The system MUST validate stock availability, calculate financials, deduct stock, and persist the Venta — all or nothing.

#### Scenario: Successful sale registration

- GIVEN a Lote with sufficient stock and a valid Cliente
- WHEN registering a Venta with a specified quantity
- THEN the Venta is persisted, stock is deducted, and financials are calculated

#### Scenario: Rollback on stock validation failure

- GIVEN a Lote with insufficient stock
- WHEN registering a Venta
- THEN the system MUST reject the Venta and MUST NOT deduct stock or persist any record

### Requirement: Financial Calculation

The system MUST calculate financial fields on every Venta: `Ingreso_Total = Cantidad × Precio_Asignado`, `Costo_Mercancía = Cantidad × Costo_Real_Por_Kg`, `Ganancia_Bruta = Ingreso_Total − Costo_Mercancía`. All monetary values SHALL use Decimal precision.

#### Scenario: Calculate financials for a sale

- GIVEN Cantidad=10 Kg, Precio_Asignado=5000, Costo_Real_Por_Kg=3000
- WHEN the Venta is registered
- THEN Ingreso_Total=50000, Costo_Mercancía=30000, Ganancia_Bruta=20000

#### Scenario: Zero profit edge case

- GIVEN Cantidad=5 Kg, Precio_Asignado=3000, Costo_Real_Por_Kg=3000
- WHEN the Venta is registered
- THEN Ganancia_Bruta=0 (sale at cost)

### Requirement: Price Resolution

The system SHALL resolve Precio_Asignado based on client type: custom price for MAYORISTA if defined, otherwise standard price. For MINORISTA, the system SHALL always use standard price.

#### Scenario: MAYORISTA with custom price

- GIVEN a MAYORISTA client with a custom price of 4500 for the product type
- WHEN registering a Venta
- THEN Precio_Asignado = 4500

#### Scenario: MINORISTA uses standard price

- GIVEN a MINORISTA client and a standard price of 5000 for the product type
- WHEN registering a Venta
- THEN Precio_Asignado = 5000

### Requirement: Venta Listing

The system SHALL provide filtered Venta listings by date range, client, and Lote.

#### Scenario: List Ventas by date range

- GIVEN multiple Ventas across different dates
- WHEN requesting Ventas within a specific date range
- THEN only Ventas within that range are returned

### Requirement: Venta Immutability

The system MUST NOT allow modification or deletion of a registered Venta. Corrections SHALL be handled via separate adjustment records (out of scope for initial scaffold).

#### Scenario: Reject Venta update

- GIVEN an existing Venta
- WHEN attempting to modify its fields
- THEN the system MUST reject the request with an immutability error

### Requirement: Concurrent Sale Race Condition Protection

The system MUST prevent stock from going negative when concurrent sales target the same Lote. The system SHALL use optimistic locking or strict stock verification within a Prisma `$transaction` to ensure atomic stock deduction. If stock would fall below zero, the transaction MUST fail and the sale MUST be rejected.

#### Scenario: Concurrent sale rejected when stock insufficient

- GIVEN a Lote with 10 Kg available
- WHEN two sales of 8 Kg each arrive simultaneously for the same Lote
- THEN the first sale succeeds (stock becomes 2 Kg) and the second sale is rejected with a stock validation error

#### Scenario: Concurrent sale succeeds when stock sufficient

- GIVEN a Lote with 20 Kg available
- WHEN two sales of 5 Kg each arrive simultaneously for the same Lote
- THEN both sales succeed and stock becomes 10 Kg