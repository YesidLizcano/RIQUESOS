# Cliente Management Specification

## Purpose

Manage clients (Clientes) with differentiated pricing rules based on client type (MAYORISTA or MINORISTA).

## Requirements

### Requirement: Client Creation

The system SHALL create a Cliente with name, type (MAYORISTA or MINORISTA), and contact info. The system MUST validate that the type is one of the allowed enum values.

#### Scenario: Create MAYORISTA client

- GIVEN a valid name and type MAYORISTA
- WHEN creating a Cliente
- THEN the Cliente is persisted with type MAYORISTA

#### Scenario: Create MINORISTA client

- GIVEN a valid name and type MINORISTA
- WHEN creating a Cliente
- THEN the Cliente is persisted with type MINORISTA

#### Scenario: Reject invalid client type

- GIVEN a type value other than MAYORISTA or MINORISTA
- WHEN creating a Cliente
- THEN the system MUST reject with a validation error

### Requirement: MAYORISTA Pricing

For MAYORISTA clients, the system SHALL allow setting custom per-product prices (Precio_Asignado) that override standard pricing. Each MAYORISTA client MAY have a different price per product type.

#### Scenario: Set custom price for MAYORISTA

- GIVEN a MAYORISTA client and a product type with a custom price
- WHEN registering a Venta for this client
- THEN the sale uses the custom Precio_Asignado, not the standard price

#### Scenario: No custom price falls back to standard

- GIVEN a MAYORISTA client without a custom price for a given product type
- WHEN registering a Venta for this client
- THEN the system SHALL use the standard price for that product type

### Requirement: MINORISTA Pricing

For MINORISTA clients, the system SHALL use standard pricing per product type. Custom per-product prices MUST NOT apply to MINORISTA clients.

#### Scenario: MINORISTA uses standard price

- GIVEN a MINORISTA client and a product type with a standard price
- WHEN registering a Venta for this client
- THEN the sale uses the standard price

### Requirement: Client CRUD

The system SHALL support full CRUD operations on Clientes: create, read, update, and delete.

#### Scenario: Update client details

- GIVEN an existing Cliente
- WHEN updating the name or contact info
- THEN the Cliente is persisted with the updated fields

#### Scenario: Delete client with no sales

- GIVEN a Cliente with no associated Ventas
- WHEN deleting the Cliente
- THEN the Cliente is removed from the system